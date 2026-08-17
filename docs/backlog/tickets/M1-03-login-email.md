---
id: M1-03
title: POST /auth/login
status: todo
milestone: M1
blocked_by: [M1-02]
unblocks: [M1-04]
estimate: S
fast_track: false
min_tests: 2
---

# M1-03 — логин по почте

## Зачем

Вернуть access JWT (короткий TTL). Refresh — следующий тикет; здесь access достаточно, refresh можно не выдавать.

## Скоуп

`POST /auth/login` `{ email, password }`:

- 200 `{ accessToken }` (JWT)
- 401 неверный пароль / нет пользователя (один ответ, без утечки «email не найден»)

Не делать refresh rotation, `/me`. Не curl.

## Контекст

- `docs/architecture.md` §8 JWT

## Ожидаемые файлы

Тесты supertest in-process, БД 5435.

## Критерии приёмки

- [ ] После register+login JSON содержит `accessToken` с двумя точками
- [ ] Неверный пароль 401 (тот же текст, что и «нет пользователя»)

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 2, есть сценарии login ok и 401
```
