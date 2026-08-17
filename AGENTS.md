# Агенты Кидаграда

Следующий тикет: `python3 scripts/backlog-next.py`. Статус только в YAML карточки.

Субагенты `.cursor/agents/`: `architect`, `developer`, `tester`. Skill: `run-ticket`.

- `fast_track: true` — без полного плана.
- Модели: architect/review и обычный developer — Sonnet (`claude-sonnet-5-thinking-high`); tester и fast-track developer — Composer (`composer-2.5-fast`). Не `inherit`. Нарезка пачек тикетов — Opus, в родительском чате.
- Parent не пишет код. Если субагенты не запускаются — остановиться и сказать об этом.
- Ветка `kg/{id}`. Порты: `docs/local-dev.md`.
