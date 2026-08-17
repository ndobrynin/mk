---
id: M0-06
title: packages/engine заглушка и один тест
status: todo
milestone: M0
blocked_by: [M0-02, M0-05]
unblocks: [M2-01]
estimate: S
fast_track: true
min_tests: 1
---

# M0-06 — `packages/engine`

## Зачем

Пакет движка без Nest/React. Заглушка `apply` + тест, что пакет тестируется изолированно.

## Скоуп

- `@kidagrad/engine`
- `src/index.ts`: `export function apply() { throw new Error('not implemented') }` пока достаточно **или** `export const engineName = 'kidagrad'`
- один тест vitest/node:assert, что экспорт существует
- в `package.json` **нет** зависимостей `nestjs`, `react`, `@nestjs/*`

Не делать FSM, карты, RNG.

## Контекст

- `docs/architecture.md` §4: engine без Nest/React

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/package.json` | создать |
| `packages/engine/tsconfig.json` | создать, strict |
| `packages/engine/src/index.ts` | создать |
| `packages/engine/src/index.test.ts` | создать |

Тест-раннер: `vitest` в этом пакете или корне. Скрипт `"test"` в `packages/engine`.

## Критерии приёмки

- [ ] `pnpm --filter @kidagrad/engine test` exit 0
- [ ] В package.json engine нет nest/react

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 1
! grep -E '@nestjs|\"react\"|\"react-dom\"' packages/engine/package.json
# ожидание: exit 0 (нет совпадений)
```
