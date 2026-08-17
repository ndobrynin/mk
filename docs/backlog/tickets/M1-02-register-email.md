---
id: M1-02
title: POST /auth/register почта
status: todo
milestone: M1
blocked_by: [M1-01]
unblocks: [M1-03]
estimate: S
fast_track: false
min_tests: 3
---

# M1-02 — регистрация по почте

## Зачем

Создать пользователя email+пароль. Без JWT (это M1-03/04).

## Скоуп

`POST /auth/register` body `{ "email", "password" }`:

- 201 + `{ id, email }` без `passwordHash`
- 409 если email занят
- пароль ≥ 8, hash bcrypt/argon2
- identity не обязателен

Не делать login, cookies, OAuth. Не использовать curl как гейт.

## Контекст

- `docs/architecture.md` §8 сайт: почта

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/api/src/**` | register endpoint |
| `apps/api/test/auth-register.e2e.spec.ts` (или `src/**/*.spec.ts`) | 3 теста supertest |

Тесты: Nest `createTestingModule` / `app.init()` + `request(app.getHttpServer())`. БД — `DATABASE_URL` на **5435**. Если Postgres не поднят → tester BLOCKED, не мигрировать на 5432.

## Критерии приёмки

- [ ] 201, в теле `id` и `email`, нет `passwordHash`
- [ ] повтор email → 409
- [ ] короткий пароль → 400
- [ ] hash в БД ≠ plaintext

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 3
```
