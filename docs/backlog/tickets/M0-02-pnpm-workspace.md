---
id: M0-02
title: pnpm workspace
status: done
milestone: M0
blocked_by: [M0-01]
unblocks: [M0-05, M0-06, M0-07, M0-08, M0-09]
estimate: S
fast_track: true
min_tests: 0
---

# M0-02 — pnpm workspace

## Зачем

Монорепо: `apps/*` и `packages/*` как workspace, пакетный менеджер только pnpm.

## Скоуп

Сделать:

- `package.json` корня (`private: true`, `packageManager` pnpm)
- `pnpm-workspace.yaml` с `apps/*` и `packages/*`
- `engines.node` >= 20

Не делать:

- приложения, зависимости Nest/React, Turborepo, Nx
- `npm` lockfile

## Контекст

- `docs/architecture.md` §2 монорепозиторий

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `package.json` | создать |
| `pnpm-workspace.yaml` | создать |
| `pnpm-lock.yaml` | появится после `pnpm install` |

`package.json` scripts пока можно пустые или `"test": "echo skip"`.

## Критерии приёмки

- [ ] `pnpm-workspace.yaml` содержит `apps/*` и `packages/*`
- [ ] `package.json` имеет `"private": true`
- [ ] `pnpm install` в корне завершается 0 (workspace может быть пустым)

## Проверка

```bash
pnpm install
# ожидание: exit 0
test -f pnpm-workspace.yaml && grep -q 'apps/\*' pnpm-workspace.yaml
```
