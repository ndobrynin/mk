---
name: run-ticket
description: Runs one Kidagrad backlog ticket through architect → developer → architect review → tester. Use when the user says взять задачу, next ticket, or names a ticket id like M0-01.
---

# Run one backlog ticket

Parent **must not** implement, edit production code, or rewrite the ticket. Dispatch only.

## Pick the ticket

- Named id → `docs/backlog/tickets/{id}-*.md`
- «next» → `python3 scripts/backlog-next.py` (reads **only** ticket YAML). Do not use status from `docs/backlog/README.md`.

Read that one ticket. Do not load the whole backlog.

Work branch: `kg/{id}` from current `main` (create if missing). Do not mix two ids on one branch.

## Fast-track

If frontmatter `fast_track: true` **and** `estimate: S`:

1. Skip plan. Write `docs/backlog/plans/{id}.md` with only `Verdict: valid` and `Touches` copied from «Ожидаемые файлы» (max 15 lines).
2. Launch **developer** (ticket + that stub plan).
3. Launch **architect** review (not a full plan pass).
4. Then tester as below.

If `fast_track` but files from «Ожидаемые файлы» already satisfy AC → architect `already-done`, stop.

## Full loop

1. **architect** — plan only. Plan file **≤ 40 lines**. If steps would copy the ticket, write `Steps: as in ticket`.
2. Stop unless verdict is `valid`.
3. **developer** — ticket + plan.
4. **architect** review vs plan `Touches` + ticket AC.
5. Fail → developer **only** the review list (max 2 rounds).
6. **tester**.
7. PASS → set **only** ticket YAML `status: done`. Never edit status in the backlog README.
8. FAIL/BLOCKED → `status: in_progress`. Paste tester report.

If custom subagents `architect` / `developer` / `tester` cannot be launched, say so and stop. Do not silently play all three roles in the parent.
