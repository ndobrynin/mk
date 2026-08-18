---
id: M2-04
title: Доход wheat/bakery/cafe и passBuild
status: done
milestone: M2
blocked_by: [M2-03]
unblocks: []
estimate: M
fast_track: false
min_tests: 7
---

# M2-04 — доход старта, кафе и пропуск стройки

Бывшие M2-04 + M2-05 + M2-06 в одном тикете.

## Зачем

Закрыть минимальный ход: бросок → доход (красные, потом синие/зелёные) → пропуск строительства → следующий игрок.

## Скоуп

`apply(roll)` из `rolling` (кубик как в M2-03: только `rng`, `value` игнорировать):

1. Красные раньше банка. Только `cafe` (кубик 3, +1 с активного, не в свой ход). Порядок: против часовой от активного. Долг сверх монет сгорает.
2. Затем wheat-field: выпало **1** — каждый с картой +1 из банка за копию.
3. Затем bakery: выпало **2** или **3** — только активный +1 за копию.
4. Фаза сразу `build` (income авто, отдельной команды нет). Существующий тест M2-03 на `phase: 'income'` обновить.

`apply({ type: 'passBuild' })` из `build`:

- монеты не меняются; аэропорт не делать
- `activeIndex` = следующий по кругу (двое: 0→1→0)
- `phase: 'rolling'`
- события `turnEnded` / `turnStarted`
- passBuild не из `build` → `{ ok: false }`

Не делать: остальные карты, Торговый центр, `buildEstablishment`, 2–3 кубика, переброс, порт.

## Контекст

- `docs/rules.md` §2 цвета, §5.5 порядок и нехватка, §5.7 пропуск, §8 поле / пекарня / кафе
- `packages/engine/CONTRACT.md`

Не менять сигнатуру `apply`. Не менять `CONTRACT.md`.

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/src/index.ts` | изменить |
| `packages/engine/src/index.test.ts` | изменить |
| `packages/engine/test/fixtures/cafe-one-coin.json` | создать |
| `packages/engine/test/fixtures/cafe-zero-coins.json` | создать |

Кафе-фикстуры — state **перед** `roll`. Ассерты монет **в тесте**:

- `cafe-one-coin.json`: A `coins: 1` (wheat-field + bakery), B `coins: 3` + `cafe`×1; бросок 3 → A `1`, B `4`
- `cafe-zero-coins.json`: A `coins: 0`, иначе как выше; бросок 3 → A `1`, B `3`

## Критерии приёмки

- [ ] Кубик 1 (rng 0): оба игрока 3→4 (wheat-field)
- [ ] Кубик 2 (rng 1): активный 3→4, соперник 3 (bakery)
- [ ] Кубик 4 (rng 3): оба остаются на 3
- [ ] Два кафе-теста читают JSON-фикстуры; долг сверх монет сгорает
- [ ] setup → roll → passBuild: ход у игрока 1; двое: индекс 0→1→0
- [ ] passBuild из `rolling` → `{ ok: false }`

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 7
```
