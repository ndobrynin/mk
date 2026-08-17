---
id: M0-04
title: .env.example
status: todo
milestone: M0
blocked_by: [M0-03]
unblocks: [M0-08, M1-01]
estimate: S
fast_track: true
min_tests: 0
---

# M0-04 — `.env.example`

## Зачем

Один канонический набор переменных под порты Кидаграда.

## Скоуп

Сделать `.env.example` в корне. Не делать `.env` с секретами в git.

## Контекст

- `docs/local-dev.md` секция «Порты Кидаграда» и примеры URL

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `.env.example` | создать |

Минимум ключей:

```
DATABASE_URL=postgresql://kidagrad:kidagrad@127.0.0.1:5435/kidagrad
REDIS_URL=redis://127.0.0.1:6380
PORT=4010
VITE_API_URL=http://127.0.0.1:4010
KIDAGRAD_POSTGRES_PASSWORD=kidagrad
```

JWT_SECRET можно заглушкой `change-me`.

## Критерии приёмки

- [ ] Файл в корне
- [ ] Порты 5435, 6380, 4010 присутствуют
- [ ] Нет 5432 и 6379

## Проверка

```bash
grep -q '5435' .env.example && grep -q '6380' .env.example && grep -q '4010' .env.example
! grep -E '5432|6379' .env.example
# ожидание: первая команда exit 0, вторая exit 0 (нет совпадений)
```
