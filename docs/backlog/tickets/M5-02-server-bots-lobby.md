---
id: M5-02
title: Боты в лобби и ходы на сервере
status: todo
milestone: M5
blocked_by: [M5-01, M3-02, M4-02]
unblocks: []
estimate: L
fast_track: false
min_tests: 3
---

# M5-02 — боты за столом

## Зачем

Один человек может начать партию: пустые слоты занимает серверный бот, он ходит через engine-политику.

## Скоуп

Бот живёт только на сервере, отдельного socket-клиента нет. Слот комнаты как у человека (`RoomSeat` + user). Пометить бота явно (поле seats / user / identity `provider: bot`) — клиент рисует бейдж.

Хост в лобби: добавить бота на свободное место; опция при создании комнаты «заполнить ботами» пустые слоты до `maxSeats` (хотя бы перед start). Старт при ≥ 2 участниках, человек + бот достаточно. Боты ready не ждут.

После успешного `apply` / `start`: если активный seat — бот, планировщик через **0.8–1.5 с** вызывает `chooseBotCommand` и тот же `apply`, шлёт `game.snapshot` / `game.events` в комнату. Пока `gameOver` или активный человек — не ходить.

Лобби web: кнопка добавить бота, строки из `ru`. Стол уже рендерит snapshot — отдельный UI бота не нужен, кроме бейджа в лобби.

Не делать: таймер хода человека и замена дисконнекта ботом (M7), VK/Яндекс (M6), PixiJS, клиентский бросок/доход, смена `apply` signature.

## Контекст

- `docs/architecture.md` §6, §9
- `apps/api/src/game/game.service.ts`, `game.gateway.ts`
- `apps/api/src/rooms/`
- `apps/web/src/pages/RoomLobbyPage.tsx`
- `packages/engine` политика M5-01

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/api/prisma/schema.prisma` | изменить (если нужна метка бота) |
| `apps/api/src/rooms/` | изменить (add bot / fill) |
| `apps/api/src/game/` | изменить (планировщик хода бота) |
| `apps/api/test/` | изменить или создать сокет/REST тесты бота |
| `apps/web/src/pages/RoomLobbyPage.tsx` | изменить |
| `apps/web/src/pages/RoomLobbyPage.test.tsx` | изменить |
| `apps/web/src/pages/RoomsPage.tsx` | изменить (опция заполнить ботами, если в скоупе) |
| `apps/web/src/lib/api.ts` | изменить |
| `apps/web/src/i18n/ru.ts` | изменить |
| `pnpm-lock.yaml` | lockfile при миграции |

## Критерии приёмки

- [ ] Хост добавляет бота; start с 1 человеком + 1 ботом отдаёт snapshot на 2 игроков
- [ ] После `roll` человека, когда ход бота, сервер сам делает легальный ход (не клиент бота)
- [ ] Нелегальная команда человека по-прежнему ошибка и не меняет state
- [ ] Нет портов 6379 / 3000 / 5432; Redis только 6380

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 3
pnpm --filter @kidagrad/web test
# ожидание: exit 0
pnpm --filter @kidagrad/web build
# ожидание: exit 0
```
