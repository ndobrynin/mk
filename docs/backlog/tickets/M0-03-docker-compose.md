---
id: M0-03
title: Docker Compose Postgres 5435 и Redis 6380
status: done
milestone: M0
blocked_by: [M0-01]
unblocks: [M0-04, M1-01]
estimate: S
fast_track: false
min_tests: 0
---

# M0-03 — Docker Compose

## Зачем

Свои Postgres и Redis, не конфликтуя с уже поднятыми `5432`–`5434` и `6379`.

## Скоуп

Сделать:

- `infra/docker-compose.yml` с `name: kidagrad`
- сервисы postgres и redis как в спеке портов

Не делать:

- приложение API в compose
- pgAdmin
- порты 5432 / 5433 / 5434 / 6379

## Контекст

- **Обязательно** `docs/local-dev.md` целиком

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `infra/docker-compose.yml` | создать |
| `infra/.dockerignore` | опционально |

Требования:

- `container_name: kidagrad-postgres`, `kidagrad-redis`
- `5435:5432`, `6380:6379`
- тома `kidagrad_pgdata`, `kidagrad_redis`
- Postgres 16, Redis 7 alpine
- healthcheck у обоих
- POSTGRES_DB/USER `kidagrad`, пароль из env `KIDAGRAD_POSTGRES_PASSWORD` с дефолтом только для local (например `kidagrad`)

## Критерии приёмки

- [ ] `docker compose -f infra/docker-compose.yml config` exit 0
- [ ] В YAML нет `5432`, `5433`, `5434`, `6379` как **host** портов
- [ ] После `up -d` (если Docker доступен): `5435` и `6380` слушают, контейнеры `kidagrad-*`

## Проверка

```bash
docker compose -f infra/docker-compose.yml config
# ожидание: exit 0, в выводе 5435 и 6380, нет публикации 5432/6379 на хост

# если разрешён docker up:
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
# ожидание: оба healthy/up
lsof -nP -iTCP:5435,6380 -sTCP:LISTEN
# ожидание: docker слушает эти порты
```

Если `up` нельзя в среде агента — config + grep портов достаточно, в отчёте tester указать BLOCKED на up, не PASS по up.
