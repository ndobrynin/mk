---
id: M4-01
title: Вход и лобби комнат в web
status: done
milestone: M4
blocked_by: [M1-05, M3-01]
unblocks: [M4-02]
estimate: M
fast_track: false
min_tests: 3
---

# M4-01 — сайт: аккаунт и лобби

## Зачем

Собрать комнату в браузере на **5173**, без стола и без сокета партии.

## Скоуп

`apps/web`: React Router. Экраны:

- вход / регистрация (`POST /auth/login`, `POST /auth/register`), access+refresh в памяти/localStorage
- список публичных комнат, создать (`maxSeats` 2–4, public), join по коду
- лобби комнаты: места, код, выйти; **не** ready/start (это сокет, M4-02)

API **4010** через `VITE_API_URL`. CORS на API: origin `http://127.0.0.1:5173` (и localhost). Строки UI из словаря `ru`, ключи стабильные, без сырого текста в JSX (кроме тестов).

Тесты: Vitest + Testing Library, **мок fetch**, без живого listen API. CI: `pnpm --filter @kidagrad/web test` до build.

Не делать: Socket.IO, стол, магазин, ботов, VK/Яндекс, портрет, PixiJS.

## Контекст

- `docs/architecture.md` §5 экраны, §8 auth
- `docs/local-dev.md` 5173 / 4010
- `apps/api` REST auth и rooms
- `.env.example` `VITE_API_URL`

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/web/` | router, страницы, словарь, тесты, vitest |
| `apps/web/package.json` | зависимости |
| `apps/api/src/main.ts` | CORS 5173 |
| `.github/workflows/test.yml` | шаг web test |
| `pnpm-lock.yaml` | lockfile |

## Критерии приёмки

- [ ] Регистрация и логин в UI (мок): после успеха виден список комнат
- [ ] Создание комнаты и join по коду (мок) открывают лобби с кодом
- [ ] Все пользовательские строки из словаря `ru`
- [ ] Порт Vite 5173, CORS не на 3000

## Проверка

```bash
pnpm --filter @kidagrad/web test
# ожидание: exit 0, passed ≥ 3
pnpm --filter @kidagrad/web build
# ожидание: exit 0
```
