---
id: M2-05
title: Красные раньше синих при нехватке монет
status: todo
milestone: M2
blocked_by: [M2-04]
unblocks: [M2-06]
estimate: S
fast_track: false
min_tests: 2
---

# M2-05 — порядок красных

## Зачем

Красные снимают с активного до синего дохода. Долг сверх монет сгорает.

## Скоуп

Минимальный фикстурный state (не только setup):

- активный игрок A, 1 монета
- соперник B имеет 1× `cafe` (кубик 3, +1 с активного)
- A имеет wheat-field
- бросок 3

Ожидание: A платит 1 B (становится 0), затем bakery если 3 — A +1 за пекарню в свой ход → A заканчивает с 1, B с 3+1=4 если у B старт 3.

Уточнить в тесте: B стартовые 3 + 1 с кафе = 4; A: 1 - 1 + 1 bakery = 1.

Если у A 0 монет и кафе: A остаётся 0, B не получает, затем bakery +1 → A=1.

Не делать полный каталог красных — только `cafe`.

## Контекст

- `docs/rules.md` §5.5 порядок, нехватка денег
- `packages/engine/CONTRACT.md`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/test/fixtures/cafe-one-coin.json` | создать |
| `packages/engine/test/fixtures/cafe-zero-coins.json` | создать |
| `packages/engine/src/*.test.ts` | тесты читают фикстуры |

`cafe-one-coin.json` — state перед `roll` (или сразу `lastRoll: { dice: [3] }` + фаза `income`, как удобнее по CONTRACT):

- `activeIndex: 0`
- players[0]: `coins: 1`, establishments `wheat-field`, `bakery`
- players[1]: `coins: 3`, establishments `cafe` ×1 плюс стартовые если нужны тесту

После apply дохода ожидаемые монеты **в ассертах теста**, не в прозе: A `1`, B `4` (3 + 1 с кафе, A: 1 − 1 + 1 bakery).

`cafe-zero-coins.json`: A `coins: 0`, остальное как выше → после дохода A `1`, B `3`.

## Критерии приёмки

- [ ] Два теста, данные из JSON, не захардкоженный роман в expect без фикстуры
- [ ] Долг сверх монет сгорает

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 2
```
