#!/usr/bin/env python3
"""Next Kidagrad ticket from YAML frontmatter only. Status is never read from README."""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TICKETS = ROOT / "docs" / "backlog" / "tickets"


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    body = text[4:end]
    data: dict[str, str] = {}
    for line in body.splitlines():
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


def load_tickets() -> dict[str, dict]:
    by_id: dict[str, dict] = {}
    for path in sorted(TICKETS.glob("*.md")):
        if path.name.startswith("TEMPLATE"):
            continue
        fm = parse_frontmatter(path.read_text(encoding="utf-8"))
        tid = fm.get("id")
        if not tid:
            continue
        by_id[tid] = {
            "id": tid,
            "status": fm.get("status", "todo"),
            "blocked_by": parse_list(fm.get("blocked_by", "[]")),
            "title": fm.get("title", ""),
            "path": str(path.relative_to(ROOT)),
            "fast_track": fm.get("fast_track", "false"),
        }
    return by_id


def next_ticket(tickets: dict[str, dict]) -> dict | None:
    def done(i: str) -> bool:
        t = tickets.get(i)
        return bool(t) and t["status"] == "done"

    candidates = []
    for t in tickets.values():
        if t["status"] != "todo":
            continue
        if all(done(b) for b in t["blocked_by"]):
            candidates.append(t)
    candidates.sort(key=lambda x: x["id"])
    return candidates[0] if candidates else None


def main() -> int:
    tickets = load_tickets()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "next"
    if cmd == "next":
        n = next_ticket(tickets)
        if not n:
            print("NO_TICKET")
            return 1
        print(f"{n['id']}\t{n['path']}\tfast_track={n['fast_track']}\t{n['title']}")
        return 0
    if cmd == "list":
        for tid in sorted(tickets):
            t = tickets[tid]
            print(f"{t['status']}\t{tid}\t{t['title']}")
        return 0
    print("usage: backlog-next.py [next|list]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
