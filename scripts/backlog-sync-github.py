#!/usr/bin/env python3
"""One-way mirror: docs/backlog/tickets → GitHub Issues.

Never writes ticket YAML. Status in git remains the source of truth.
Match existing issues by `<!-- kidagrad-ticket: {id} -->` in the body.
"""

from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
TICKETS = ROOT / "docs" / "backlog" / "tickets"
MARKER = "<!-- kidagrad-ticket: {id} -->"
API = "https://api.github.com"

LABELS = {
    "backlog": ("6e7781", "Зеркало docs/backlog/tickets"),
    "status:todo": ("8c959f", "В файле: todo"),
    "status:in_progress": ("fbca04", "В файле: in_progress"),
    "status:blocked": ("d73a4a", "В файле: blocked"),
    "M0": ("1f883d", "Веха M0 — каркас"),
    "M1": ("0969da", "Веха M1 — auth"),
    "M2": ("8250df", "Веха M2 — движок"),
    "M3": ("1d4ed8", "Веха M3 — комнаты"),
    "fast-track": ("9a6700", "fast_track: true"),
}

MILESTONES = {
    "M0": "M0 — каркас",
    "M1": "M1 — auth",
    "M2": "M2 — движок",
    "M3": "M3 — комнаты",
}

STATUS_LABEL = {
    "todo": "status:todo",
    "in_progress": "status:in_progress",
    "blocked": "status:blocked",
}


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    data: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        data[key.strip()] = val.strip().strip('"').strip("'")
    return data


def parse_list(raw: str) -> list[str]:
    raw = raw.strip()
    if raw in ("", "[]"):
        return []
    inner = raw[1:-1] if raw.startswith("[") else raw
    return [p.strip().strip('"').strip("'") for p in inner.split(",") if p.strip()]


def section(text: str, heading: str) -> str:
    needle = f"## {heading}"
    start = text.find(needle)
    if start < 0:
        return ""
    start = text.find("\n", start)
    if start < 0:
        return ""
    rest = text[start + 1 :]
    nxt = rest.find("\n## ")
    body = rest if nxt < 0 else rest[:nxt]
    return " ".join(body.split()).strip()


def load_tickets() -> list[dict]:
    out: list[dict] = []
    for path in sorted(TICKETS.glob("*.md")):
        if path.name.startswith("TEMPLATE"):
            continue
        text = path.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        tid = fm.get("id")
        if not tid:
            continue
        out.append(
            {
                "id": tid,
                "title": fm.get("title", tid),
                "status": fm.get("status", "todo"),
                "milestone": fm.get("milestone", ""),
                "estimate": fm.get("estimate", ""),
                "fast_track": fm.get("fast_track", "false").lower() == "true",
                "blocked_by": parse_list(fm.get("blocked_by", "[]")),
                "unblocks": parse_list(fm.get("unblocks", "[]")),
                "path": path.relative_to(ROOT).as_posix(),
                "why": section(text, "Зачем"),
            }
        )
    return out


def token() -> str:
    for key in ("GITHUB_TOKEN", "GH_TOKEN"):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    try:
        proc = subprocess.run(
            ["gh", "auth", "token"],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return ""
    if proc.returncode == 0:
        return proc.stdout.strip()
    return ""


def repo_slug() -> str:
    env = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if env:
        return env
    proc = subprocess.run(
        ["git", "-C", str(ROOT), "remote", "get-url", "origin"],
        check=True,
        capture_output=True,
        text=True,
    )
    url = proc.stdout.strip()
    if url.endswith(".git"):
        url = url[:-4]
    if url.startswith("git@github.com:"):
        return url.split(":", 1)[1]
    if "github.com/" in url:
        return url.split("github.com/", 1)[1].rstrip("/")
    raise SystemExit(f"cannot parse origin: {url}")


class Github:
    def __init__(self, repo: str, tok: str, dry: bool) -> None:
        self.repo = repo
        self.tok = tok
        self.dry = dry

    def request(self, method: str, path: str, body: dict | None = None):
        url = f"{API}{path}"
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("Authorization", f"Bearer {self.tok}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise SystemExit(f"{method} {path} → {exc.code}: {detail}") from exc

    def paginate(self, path: str) -> list:
        items: list = []
        parsed = urllib.parse.urlparse(path)
        q = urllib.parse.parse_qs(parsed.query)
        q["per_page"] = ["100"]
        page = 1
        while True:
            q["page"] = [str(page)]
            query = urllib.parse.urlencode(q, doseq=True)
            chunk = self.request("GET", f"{parsed.path}?{query}")
            if not chunk:
                break
            items.extend(chunk)
            if len(chunk) < 100:
                break
            page += 1
        return items


def issue_body(ticket: dict, repo: str) -> str:
    blocked = ", ".join(ticket["blocked_by"]) or "—"
    unblocks = ", ".join(ticket["unblocks"]) or "—"
    why = ticket["why"] or "—"
    ft = "да" if ticket["fast_track"] else "нет"
    file_url = f"https://github.com/{repo}/blob/main/{ticket['path']}"
    return "\n".join(
        [
            MARKER.format(id=ticket["id"]),
            "",
            "Зеркало бэклога. **Статус и AC только в файле**, не в этом Issue.",
            "",
            f"- Файл: [`{ticket['path']}`]({file_url})",
            f"- Статус: `{ticket['status']}`",
            f"- Оценка: {ticket['estimate'] or '—'}",
            f"- fast_track: {ft}",
            f"- blocked_by: {blocked}",
            f"- unblocks: {unblocks}",
            "",
            "## Зачем",
            "",
            why,
            "",
        ]
    )


def ticket_labels(ticket: dict) -> list[str]:
    labels = ["backlog"]
    ms = ticket["milestone"]
    if ms in LABELS:
        labels.append(ms)
    status = STATUS_LABEL.get(ticket["status"])
    if status:
        labels.append(status)
    if ticket["fast_track"]:
        labels.append("fast-track")
    return labels


def parse_marker(body: str | None) -> str | None:
    if not body:
        return None
    start = body.find("<!-- kidagrad-ticket: ")
    if start < 0:
        return None
    start += len("<!-- kidagrad-ticket: ")
    end = body.find(" -->", start)
    if end < 0:
        return None
    return body[start:end].strip() or None


def labels_of(issue: dict) -> list[str]:
    return [item["name"] for item in issue.get("labels", [])]


def same_labels(left: list[str], right: list[str]) -> bool:
    return sorted(left) == sorted(right)


def sync(dry: bool) -> int:
    tickets = load_tickets()
    tok = token()
    repo = repo_slug()
    if not tok:
        print(
            "Нет токена. Запусти в GitHub Actions или:\n"
            "  brew install gh && gh auth login\n"
            "  GH_TOKEN=$(gh auth token) python3 scripts/backlog-sync-github.py",
            file=sys.stderr,
        )
        return 2

    gh = Github(repo, tok, dry)
    print(f"repo={repo} tickets={len(tickets)} dry_run={dry}")

    if not dry:
        existing_labels = {item["name"] for item in gh.paginate(f"/repos/{repo}/labels")}
        for name, (color, desc) in LABELS.items():
            if name in existing_labels:
                continue
            gh.request(
                "POST",
                f"/repos/{repo}/labels",
                {"name": name, "color": color, "description": desc},
            )
            print(f"label created: {name}")

        existing_ms = {
            item["title"]: item["number"]
            for item in gh.paginate(f"/repos/{repo}/milestones?state=all")
        }
        for key, title in MILESTONES.items():
            if title in existing_ms:
                continue
            created = gh.request(
                "POST",
                f"/repos/{repo}/milestones",
                {"title": title, "description": f"Тикеты {key} из docs/backlog"},
            )
            existing_ms[title] = created["number"]
            print(f"milestone created: {title}")
    else:
        existing_ms = {title: 0 for title in MILESTONES.values()}

    issues = gh.paginate(f"/repos/{repo}/issues?state=all")
    by_id: dict[str, dict] = {}
    for issue in issues:
        if issue.get("pull_request"):
            continue
        tid = parse_marker(issue.get("body"))
        if tid:
            by_id[tid] = issue

    created = updated = skipped = 0
    for ticket in tickets:
        title = f"{ticket['id']} — {ticket['title']}"
        body = issue_body(ticket, repo)
        labels = ticket_labels(ticket)
        state = "closed" if ticket["status"] == "done" else "open"
        ms_title = MILESTONES.get(ticket["milestone"])
        ms_number = existing_ms.get(ms_title) if ms_title else None
        issue = by_id.get(ticket["id"])

        payload = {
            "title": title,
            "body": body,
            "labels": labels,
            "state": state,
        }
        if ms_number:
            payload["milestone"] = ms_number

        if issue is None:
            print(f"create {ticket['id']}  {state}  {title}")
            created += 1
            if not dry:
                gh.request("POST", f"/repos/{repo}/issues", payload)
            continue

        current_ms = (issue.get("milestone") or {}).get("number")
        unchanged = (
            issue.get("title") == title
            and (issue.get("body") or "") == body
            and issue.get("state") == state
            and same_labels(labels_of(issue), labels)
            and current_ms == ms_number
        )
        if unchanged:
            skipped += 1
            continue
        print(f"update {ticket['id']}  {state}  #{issue['number']}")
        updated += 1
        if not dry:
            gh.request("PATCH", f"/repos/{repo}/issues/{issue['number']}", payload)

    print(f"created={created} updated={updated} unchanged={skipped}")
    print(f"https://github.com/{repo}/issues?q=is%3Aissue+label%3Abacklog")
    print(f"https://github.com/{repo}/milestones")
    return 0


def main() -> int:
    dry = "--dry-run" in sys.argv
    return sync(dry)


if __name__ == "__main__":
    raise SystemExit(main())
