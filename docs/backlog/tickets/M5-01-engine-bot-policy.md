---
id: M5-01
title: Политика бота в engine
status: done
milestone: M5
blocked_by: [M2-05, M4-02]
unblocks: [M5-02]
estimate: M
fast_track: false
min_tests: 3
---

# M5-01 — политика бота

## Зачем

Сервер сможет ходить за бота тем же `apply`, без отдельного клиента и без HTTP в движке.

## Скоуп

В `packages/engine`: функция политики v1 (эвристика, не ML). По `GameState` и `playerId` активного игрока возвращает одну `Command`, для которой `apply(state, command, rng)` даёт `{ ok: true }`.

Правила v1 из `docs/architecture.md` §9: только легальные команды; в `rolling` — `roll` без числа кубика; в `build` — достопримечательность, если хватает монет и город уже «кормит», иначе заведение по EV/стоимости, иначе `passBuild`; интерактивные фазы (`pickPlayer`, `pickCard`, …) — первый легальный вариант; `decideReroll` / `decideHarbor` — безопасный skip/keep.

Можно добавить хелпер списка легальных команд. Сигнатура `apply` **не** меняется. В `CONTRACT.md` — только секция bot policy, без правки frozen `apply`.

Не делать: Nest/React, сокет, планировщик задержки, таймеры хода (M7), UI лобби, OAuth, заполнение слотов комнаты.

## Контекст

- `docs/architecture.md` §4, §9
- `packages/engine/CONTRACT.md`
- `packages/engine/src/index.ts` (`apply`, `Command`, фазы)

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/engine/src/bot.ts` | создать (политика + легальные ходы) |
| `packages/engine/src/bot.test.ts` | создать |
| `packages/engine/src/index.ts` | изменить (реэкспорт) |
| `packages/engine/CONTRACT.md` | изменить (секция bot policy) |

## Критерии приёмки

- [ ] `chooseBotCommand(state, playerId)` на ходе этого игрока возвращает команду, которую `apply` принимает
- [ ] С фазы `rolling` политика выбирает `roll`, не число кубика
- [ ] С фазы `build` без доступной покупки — `passBuild`
- [ ] Нет импортов nest/react в `packages/engine`

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 3
```
