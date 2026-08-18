---
id: M1-04
title: Refresh JWT
status: done
milestone: M1
blocked_by: [M1-03]
unblocks: [M1-05]
estimate: S
fast_track: false
min_tests: 2
---

# M1-04 — refresh token

## Зачем

Короткий access + refresh с хранением hash в `refresh_tokens`.

## Скоуп

- таблица/модель RefreshToken: `id`, `userId`, `tokenHash`, `expiresAt`
- login и register (если ещё не) отдают `{ accessToken, refreshToken }`
- `POST /auth/refresh` `{ refreshToken }` → новая пара, старый refresh невалиден (rotation)
- повтор использованного refresh → 401

Не делать logout всех устройств, OAuth. Не curl.

## Контекст

- `docs/architecture.md` §8, §11 `refresh_tokens`

## Критерии приёмки

- [ ] login отдаёт `accessToken` и `refreshToken`
- [ ] refresh выдаёт новый access
- [ ] повтор того же refresh → 401

## Проверка

```bash
pnpm --filter @kidagrad/api test
# ожидание: exit 0, passed ≥ 2 (rotation + reuse 401)
```
