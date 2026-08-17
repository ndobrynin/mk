# Агенты Кидаграда

Следующий тикет: `python3 scripts/backlog-next.py`. Статус только в YAML карточки.

Субагенты `.cursor/agents/`: `architect`, `developer`, `tester`. Skill: `run-ticket`.

- `fast_track: true` — без полного плана.
- Parent не пишет код. Если субагенты не запускаются — остановиться и сказать об этом.
- Ветка `kg/{id}`. Порты: `docs/local-dev.md`.
