---
id: M2-02
title: setup() на 2–4 игроков
status: done
milestone: M2
blocked_by: [M2-01]
unblocks: [M2-03]
estimate: S
fast_track: false
min_tests: 1
---

# M2-02 — начальное состояние на 2–4 игроков

## Зачем

Детерминированный старт партии по правилам, без сети. Число игроков — как в правилах: 2–4.

## Скоуп

`setup(playerIds: string[]): GameState`

Длина `playerIds` — 2, 3 или 4. Иначе **бросить** (не `apply`-result): это фабрика, не команда. Порядок id сохраняется; `players[0]` — первый активный.

Каждый игрок:

- `id` из соответствующего элемента `playerIds`
- `coins: 3`
- предприятия: по одной карте `wheat-field`, `bakery` (id строками)
- `landmarks`: 9 id из правил, все `constructed: false`
- `phase: 'rolling'` (вокзала нет, 1 кубик)
- `activeIndex: 0`

Не делать roll/доход. Не сужать тип до кортежа `[string, string]`.

## Контекст

- `packages/engine/CONTRACT.md`
- `docs/rules.md` §3 Подготовка, §7 список достопримечательностей

Не менять сигнатуру `apply`. Не менять `CONTRACT.md`.

Landmark ids (стабильные): `harbor`, `station`, `mall`, `tv-tower`, `amusement-park`, `aqua-park`, `airport`, `bank`, `city-hall`.

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/src/index.ts` | изменить |
| `packages/engine/src/index.test.ts` | изменить |

## Критерии приёмки

- [ ] 2, 3 и 4 игрока: у каждого 3 монеты, wheat-field и bakery, 9 landmarks unconstructed
- [ ] 0, 1 и 5 id — бросает, не возвращает state
- [ ] Тест без RNG
- [ ] Сигнатура `setup(playerIds: string[])`, не кортеж из двух

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 1
```
