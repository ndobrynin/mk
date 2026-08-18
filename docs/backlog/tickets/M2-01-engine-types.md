---
id: M2-01
title: Типы движка и apply stub
status: done
milestone: M2
blocked_by: [M0-06]
unblocks: [M2-02]
estimate: S
fast_track: false
min_tests: 1
---

# M2-01 — типы state/command + apply stub

## Зачем

Контракт `apply(state, command, rng)` до правил карт.

## Скоуп

В `@kidagrad/engine`:

```ts
export type Command = { type: 'roll' } | { type: 'passBuild' };
export type GameState = { version: 1; phase: string; players: unknown[] };
export type Rng = { nextInt(maxExclusive: number): number };
export function apply(state: GameState, command: Command, rng: Rng):
  { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string };
```

Пока `apply` на любой command возвращает `{ ok: false, error: 'not implemented' }`.

Добавить `packages/engine/CONTRACT.md` с этими типами и правилом: **следующие тикеты расширяют union `Command` / поля state только явным пунктом скоупа; сигнатуру `apply` не менять.**

Тест: вызов возвращает `ok: false`.

Не делать кубик, доход, setup.

## Контекст

- `docs/architecture.md` §4 сигнатура apply

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/src/index.ts` | типы + stub |
| `packages/engine/src/index.test.ts` | тест stub |
| `packages/engine/CONTRACT.md` | замороженный контракт |

## Критерии приёмки

- [ ] Типы экспортируются из пакета
- [ ] Тест на stub `not implemented`
- [ ] `CONTRACT.md` содержит `apply(` и `Command`
- [ ] Нет импорта nest/react

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 1
test -f packages/engine/CONTRACT.md
```
