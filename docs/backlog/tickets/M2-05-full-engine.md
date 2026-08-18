---
id: M2-05
title: Полный движок — каталог, ход, все карты
status: done
milestone: M2
blocked_by: [M2-04]
unblocks: []
estimate: L
fast_track: false
min_tests: 40
---

# M2-05 — полный движок

Один тикет на остаток M2: каталог данных, весь ход, все карты из `docs/rules.md`. Не по одной карте. Сеть, UI, боты — не здесь.

## Зачем

`apply` должен уметь провести партию до победы по правилам, без Nest/React.

## Скоуп

Сигнатура `apply(state, command, rng)` **не менять**. `Command` и поля `GameState` — **можно** расширить; обновить `packages/engine/CONTRACT.md`.

### Каталог

Карты — данные, не `applyCafeIncome` / `applyWheatFieldIncome` / `applyBakeryIncome`. Поля: `id`, `color`, `activation[]`, `icons[]`, `cost`, `unique`, `supply`, `effect`. Торговый центр — модификатор чашка/магазин, не карта дохода.

Стоимости — с визуала [Figma](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=75-39), таблица в `docs/rules.md` (новый §). Если на макете нет размера стопки: обычные **6**, фиолетовые **5**, стартовые wheat-field / bakery — отдельные стопки. Не выдумывать цены.

Стабильные id предприятий: `wheat-field`, `farm`, `corn-field`, `flower-garden`, `nature-preserve`, `vineyard`, `fishing-boat`, `mine`, `apple-orchard`, `trawler`, `convenience-store`, `bakery`, `supermarket`, `demolition-company`, `loan-office`, `flower-shop`, `cheese-factory`, `furniture-factory`, `winery`, `moving-company`, `beverage-factory`, `produce-market`, `grocery-warehouse`, `sushi-bar`, `cafe`, `restaurant`, `pizzeria`, `burger-joint`, `diner`, `exclusive-bar`, `stadium`, `tv-station`, `business-center`, `publisher`, `renovation-company`, `tax-office`, `venture-fund`, `conference-center`, `park`.

Достопримечательности (уже в setup): `harbor`, `station`, `mall`, `tv-tower`, `amusement-park`, `aqua-park`, `airport`, `bank`, `city-hall`.

`establishments` игрока: `{ id, repaired?: boolean }[]` (не голые строки). Wheat/bakery/cafe тесты M2-04 починить под это.

### Ход

Фазы как `docs/architecture.md` §4.1. Income авто, пока нет выбора цели — тогда пауза, пока не придёт `pick*`.

Команды ( besides существующие `roll` / `passBuild` ): `chooseDiceCount`, `keepTwo`, `reroll`, `keepRoll`, `harborAdd`, `harborSkip`, `pickPlayer`, `pickCard`, `pickEstablishmentType`, `buildEstablishment`, `buildLandmark`, `ventureFundDeposit`, `skip`. Нелегальная команда → `{ ok: false }`, state без изменений.

`setup` кладёт рынок по `supply`. `buildEstablishment` / `buildLandmark`: запас, монеты, уникальность. Победа сразу после полного набора достопримечательностей. Ратуша: 0 монет перед стройкой → +1. Аэропорт: passBuild → +10. Кредитное бюро: +5 при покупке, −2 каждый свой ход.

Эффекты карт — строго `docs/rules.md` §5–8 и §11 (траулер, снос, ремонт, конференц-центр, венчур, банк 1/10000, телебашня без цепочки доп. ходов).

Не делать: Socket.IO, UI, политику бота, OAuth.

## Контекст

- `docs/rules.md` целиком
- `docs/architecture.md` §4, §6 команды, §14 фикстуры
- `packages/engine/CONTRACT.md`
- `packages/engine/src/index.ts`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/CONTRACT.md` | изменить (Command / GameState) |
| `packages/engine/src/index.ts` | изменить |
| `packages/engine/src/catalog.ts` | создать |
| `packages/engine/src/index.test.ts` | изменить |
| `packages/engine/test/fixtures/` | создать фикстуры карт |
| `docs/rules.md` | изменить (стоимости и стопки) |

## Критерии приёмки

- [ ] Нет трёх именных income-функций на cafe/wheat/bakery; доход идёт через каталог
- [ ] У каждой карты из списка id есть хотя бы один тест (фикстура + фиксированный rng)
- [ ] setup → полный ход с 2 кубиками / 3-из-2 / переброс / порт покрыты тестами
- [ ] Красные раньше синих; долг сгорает; 3–4 игрока против часовой
- [ ] Покупка с рынка, стройка достопримечательности, победа, нелегальный build → `{ ok: false }`
- [ ] Выбор цели: нет легальной цели → эффект пропускается, ход идёт дальше
- [ ] Старые тесты M2-02…04 зелёные по смыслу (фаза после roll может быть `build` или пауза цели)

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 40
```
