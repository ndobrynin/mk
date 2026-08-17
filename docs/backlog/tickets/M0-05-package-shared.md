---
id: M0-05
title: packages/shared заглушка
status: todo
milestone: M0
blocked_by: [M0-02]
unblocks: [M0-06, M0-08, M0-09]
estimate: S
fast_track: true
min_tests: 0
---

# M0-05 — `packages/shared`

## Зачем

Общие типы и константа `protocolVersion` до протокола сокетов.

## Скоуп

Сделать пакет `@kidagrad/shared`: `package.json`, `src/index.ts` с `export const protocolVersion = 1`.

Не делать Zod-схемы комнат, карт, сокетов.

## Контекст

- `docs/architecture.md` §2, §6 (версия протокола)

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/shared/package.json` | создать, name `@kidagrad/shared`, `main`/`types` на `src/index.ts` |
| `packages/shared/tsconfig.json` | create, strict |
| `packages/shared/src/index.ts` | создать |

TypeScript как `typescript` в devDependencies пакета или корня — один раз, не дублировать три версии.

## Критерии приёмки

- [ ] `pnpm install` в корне ок
- [ ] Из пакета экспортируется `protocolVersion === 1`

## Проверка

```bash
pnpm install
node -e "const p=require('./packages/shared/package.json'); if(p.name!=='@kidagrad/shared') process.exit(1)"
grep -q 'protocolVersion' packages/shared/src/index.ts
# ожидание: exit 0
```
