---
id: M2-03
title: Команда roll — один кубик
status: todo
milestone: M2
blocked_by: [M2-02]
unblocks: [M2-04]
estimate: S
fast_track: false
min_tests: 1
---

# M2-03 — бросок одного кубика

## Зачем

Серверный бросок: значение только из `rng`, не из команды.

## Скоуп

`apply(state, { type: 'roll' }, rng)` из фазы `rolling`:

- `rng.nextInt(6)` → значение 0..5, на кубике `+1` (1..6)
- записать `lastRoll: { dice: [n] }`
- событие `{ type: 'diceRolled', dice: [n] }`
- перейти в фазу `income` (ещё без начисления — можно оставить income no-op, начисление в M2-04)

Если command содержит поле `value` — **игнорировать**. Тест: rng всегда 0 → выпала 1.

Не делать 2–3 кубика, переброс, порт.

## Контекст

- `docs/rules.md` §5.2
- `docs/architecture.md` §4
- `packages/engine/CONTRACT.md`

## Критерии приёмки

- [ ] Тест с fake rng: последовательность фиксирована
- [ ] В state есть lastRoll
- [ ] Command `{ type: 'roll', value: 6 }` не ставит шестёрку, если rng даёт другое

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 1
```
