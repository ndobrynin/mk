---
id: M3-02
title: Socket.IO лобби, start и apply
status: done
milestone: M3
blocked_by: [M3-01]
unblocks: []
estimate: L
fast_track: false
min_tests: 3
---

# M3-02 — партия по сокету

## Зачем

Сервер — источник истины: старт `setup()`, команды в `apply`, клиент получает snapshot и events.

## Скоуп

Socket.IO на том же Nest **4010**. Handshake: access JWT (как REST). Redis **6380** — snapshot комнаты в партии.

События клиента → сервер (лобби/игра из `docs/architecture.md` §6): `room.setReady`, `room.start`, игровые команды движка (`roll`, `passBuild`, `chooseDiceCount`, …). Нелегальная команда: ошибка, state не меняется.

Сервер → клиент: `room.state`, `game.snapshot`, `game.events`, `game.over`.

`room.start`: комната `waiting`, ≥ 2 занятых места, только хост; затем `setup(playerIds по seatIndex)`, `status: playing`, snapshot в Redis.

Реконнект: тот же `userId` получает актуальный snapshot.

CI: сервис Redis на **6380** + `REDIS_URL`, плюс уже существующий Postgres 5435.

Не делать: ботов и политику engine, таймеры хода, UI, OAuth, смену `apply` signature / CONTRACT.md.

## Контекст

- `docs/architecture.md` §3, §6, §7, §9
- `docs/local-dev.md` (6380, не 6379)
- `packages/engine` (`setup`, `apply`)
- `packages/shared` (`protocolVersion`)
- тикет M3-01 (REST комнаты)

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/api/src/` | gateway / game module |
| `apps/api/package.json` | socket.io / redis зависимости |
| `apps/api/test/` | in-process сокет-тесты |
| `.github/workflows/test.yml` | Redis 6380 |
| `packages/shared/src/index.ts` | Zod/DTO протокола по необходимости |
| `pnpm-lock.yaml` | lockfile |

Тесты: Nest testing + клиент socket.io **без** долгого `listen`+`curl`.

## Критерии приёмки

- [ ] Два JWT-клиента: join REST → socket ready → host start → snapshot с 2 игроками
- [ ] `roll` от активного меняет state; чужой `roll` → ошибка, snapshot тот же
- [ ] Реконнект после disconnect получает тот же snapshot
- [ ] Нет портов 6379 / 3000 / 5432 в compose/CI/коде api

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 3
```
