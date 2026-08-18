---
id: M0-08
title: Nest API слушает 4010
status: done
milestone: M0
blocked_by: [M0-02, M0-04, M0-05]
unblocks: [M0-10, M1-01]
estimate: S
fast_track: false
min_tests: 1
---

# M0-08 — `apps/api` Nest hello

## Зачем

Пустое Nest-приложение на порту **4010**, health без БД.

## Скоуп

- NestJS в `apps/api`
- `GET /health` → `{ "ok": true }`
- listen `process.env.PORT ?? 4010` (не 3000)
- зависимость на `@kidagrad/shared` опциональна (можно не импортировать)

Не делать Prisma, auth, Socket.IO, подключение к Postgres.

## Контекст

- `docs/local-dev.md` порт API 4010
- `docs/architecture.md` apps/api

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/api/src/main.ts` | listen PORT \|\| 4010 |
| `apps/api/src/app.module.ts` | модуль |
| `apps/api/src/health.controller.ts` (или app.controller) | GET /health |
| `apps/api/src/health.controller.spec.ts` (или test/*.spec.ts) | supertest, без listen |

## Критерии приёмки

- [ ] В `main.ts` listen `process.env.PORT ?? 4010`, нет литерала `3000`
- [ ] In-process тест: GET `/health` → 200 `{ ok: true }` (Nest + supertest, **без** `app.listen` в тесте)

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 1
```

Не поднимать dev-сервер и не использовать curl как гейт.
