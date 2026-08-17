---
id: M2-02
title: setup() на двух игроков
status: todo
milestone: M2
blocked_by: [M2-01]
unblocks: [M2-03]
estimate: S
fast_track: false
min_tests: 1
---

# M2-02 — начальное состояние на 2 игроков

## Зачем

Детерминированный старт партии по правилам, без сети.

## Скоуп

`setup(playerIds: [string, string]): GameState`

Каждый игрок:

- `coins: 3`
- предприятия: по одной карте `wheat-field`, `bakery` (id строками)
- `landmarks`: 9 id из правил, все `constructed: false`
- `phase: 'chooseDiceCount'` или `'rolling'` если выбор кубиков ещё не нужен — **зафиксировать `'rolling'`** (вокзала нет, 1 кубик)
- `activeIndex: 0`

Не делать roll/доход.

## Контекст

- `packages/engine/CONTRACT.md`
- `docs/rules.md` §3 Подготовка, §7 список достопримечательностей

Не менять сигнатуру `apply`.

Landmark ids (стабильные): `harbor`, `station`, `mall`, `tv-tower`, `amusement-park`, `aqua-park`, `airport`, `bank`, `city-hall`.

## Критерии приёмки

- [ ] Два игрока, у каждого 3 монеты
- [ ] У каждого wheat-field и bakery
- [ ] 9 landmarks unconstructed
- [ ] Тест без RNG

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 1
```
