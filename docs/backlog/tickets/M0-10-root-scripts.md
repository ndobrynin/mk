---
id: M0-10
title: Скрипты корня и how-to-run в README
status: done
milestone: M0
blocked_by: [M0-03, M0-08, M0-09]
unblocks: [M0-11]
estimate: S
fast_track: true
min_tests: 0
---

# M0-10 — скрипты корня

## Зачем

Из корня можно поднять инфраструктуру и прочитать, как запустить web/api.

## Скоуп

В корневом `package.json`:

- `"dev:api"` / `"dev:web"` через pnpm filter
- `"infra:up"` / `"infra:down"` → docker compose `-f infra/docker-compose.yml`

В README секция «Запуск локально»: порты 5435, 6380, 4010, 5173, ссылка на `docs/local-dev.md`. Не удалять ссылку на Figma.

Не делать CI.

## Контекст

- `README.md` текущий
- `docs/local-dev.md`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `package.json` | скрипты |
| `README.md` | секция запуска |

## Критерии приёмки

- [ ] Скрипты `infra:up`, `dev:api`, `dev:web` есть
- [ ] README содержит 4010 и 5173 и 5435

## Проверка

```bash
node -e "const s=require('./package.json').scripts; for (const k of ['infra:up','dev:api','dev:web']) if(!s[k]) process.exit(1)"
grep -q '4010' README.md && grep -q '5173' README.md && grep -q '5435' README.md
# ожидание: exit 0
```
