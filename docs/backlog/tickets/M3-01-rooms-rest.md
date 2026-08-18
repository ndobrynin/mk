---
id: M3-01
title: REST комнаты — create/join/list/leave
status: done
milestone: M3
blocked_by: [M1-05, M2-05]
unblocks: [M3-02]
estimate: M
fast_track: false
min_tests: 4
---

# M3-01 — лобби по HTTP

## Зачем

Создать и собрать комнату на 2–4 игрока до сокета. JWT как у `GET /me`.

## Скоуп

Prisma на **5435**: `Room`, `RoomSeat`. Поля минимум:

- Room: `id` uuid, `code` unique, `hostUserId`, `maxSeats` 2–4, `isPublic`, `status` (`waiting` | `playing` | `finished`), `createdAt`
- RoomSeat: `id`, `roomId`, `userId`, `seatIndex`, unique `[roomId, userId]`, unique `[roomId, seatIndex]`

REST (все с Bearer, иначе 401):

- `POST /rooms` body `{ maxSeats, isPublic }` → 201, хост сразу на месте 0, `code` короткий уникальный
- `GET /rooms` → публичные со `status: waiting`
- `GET /rooms/:id` → комната и места; 404 если нет
- `POST /rooms/:id/join` → сесть на первый свободный индекс; 409 если полная / уже играет / уже внутри
- `POST /rooms/join` body `{ code }` → то же по коду; 404 если код неизвестен
- `POST /rooms/:id/leave` → выйти; если вышел хост и комната `waiting` — комната `finished` или удаляется (зафиксировать одно в тесте)

Не делать: Socket.IO, `start`, ботов, Redis, движок, UI.

## Контекст

- `docs/architecture.md` §9, §11
- `docs/local-dev.md` (5435 / 4010, не 5432)
- `apps/api/src/auth/jwt-auth.guard.ts`
- `apps/api/prisma/schema.prisma`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/api/prisma/schema.prisma` | изменить |
| `apps/api/prisma/migrations/` | создать миграцию |
| `apps/api/src/app.module.ts` | изменить |
| `apps/api/src/rooms/` | создать модуль/контроллер/сервис |
| `apps/api/test/rooms.e2e.spec.ts` | создать |

## Критерии приёмки

- [ ] Хост создаёт комнату на 2–4, виден в `GET /rooms` если public
- [ ] Второй игрок join по id и по code
- [ ] Пятый на maxSeats=4 → 409; без JWT → 401
- [ ] Миграция на 5435, не 5432

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 4
```
