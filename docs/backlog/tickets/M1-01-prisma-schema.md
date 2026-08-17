---
id: M1-01
title: Prisma schema users и identities
status: todo
milestone: M1
blocked_by: [M0-03, M0-04, M0-08]
unblocks: [M1-02]
estimate: S
fast_track: false
min_tests: 0
---

# M1-01 — Prisma: users + identities

## Зачем

Таблицы аккаунта без HTTP-ручек.

## Скоуп

- Prisma в `apps/api`
- модели `User`, `Identity` (`provider`, `providerId`, unique pair)
- `prisma migrate` на **5435** / БД `kidagrad`
- скрипт generate

Не делать register/login, seed пользователей.

## Контекст

- `docs/architecture.md` §8, §11
- `docs/local-dev.md` DATABASE_URL порт 5435

## Ожидаемые файлы

`apps/api/prisma/schema.prisma`, первая миграция, datasource url из env.

Поля User минимум: `id` uuid, `email` nullable unique, `passwordHash` nullable, `createdAt`.
Identity: `id`, `userId`, `provider` (string), `providerId`, unique `[provider, providerId]`.

## Критерии приёмки

- [ ] `prisma validate` ок
- [ ] Миграция применяется к `127.0.0.1:5435`
- [ ] Нет подключения к 5432 в schema/env примерах api

## Проверка

```bash
# Postgres kidagrad должен быть up на 5435
pnpm --filter @kidagrad/api exec prisma validate
pnpm --filter @kidagrad/api exec prisma migrate deploy
# ожидание: exit 0
```

BLOCKED если compose не поднят — не мигрировать на чужой Postgres.
