---
id: M0-01
title: Корневой .gitignore
status: done
milestone: M0
blocked_by: []
unblocks: [M0-02]
estimate: S
fast_track: true
min_tests: 0
---

# M0-01 — корневой `.gitignore`

## Зачем

Чтобы `node_modules`, env и Docker-тома не попали в git до появления пакетов.

## Скоуп

Сделать:

- файл `.gitignore` в корне репозитория

Не делать:

- другие файлы, GitHub Actions, `.dockerignore`

## Контекст

- В репо пока только `README.md`, `docs/`, `AGENTS.md`, `.cursor/`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `.gitignore` | создать |

## Содержимое (минимум, можно чуть шире по стандартному Node)

```
node_modules
dist
build
coverage
.env
.env.local
*.log
.DS_Store
.turbo
.pnpm-store
infra/.data
```

## Критерии приёмки

- [ ] Файл существует в корне
- [ ] Есть `node_modules`, `.env`, `dist`
- [ ] Нет игнора всего `docs/` или `.cursor/`

Повторный прогон: если AC уже верны — не переписывать файл ради отличий в комментариях.

## Проверка

```bash
test -f .gitignore && grep -q '^node_modules$' .gitignore && grep -q '^\.env$' .gitignore
# ожидание: exit 0
```
