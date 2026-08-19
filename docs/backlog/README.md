# Бэклог

Карточка: `tickets/{id}-*.md`. **Статус только в YAML тикета** (`todo` | `in_progress` | `done` | `blocked`). Эта таблица без колонки status.

Следующая: `python3 scripts/backlog-next.py`

Флоу: skill `run-ticket`. Ветка `kg/{id}`. Модели субагентов — в skill. Новые пачки тикетов (каталог карт, сокеты) нарезает Opus (`claude-opus-5-thinking-high`) пачкой в родительском чате, не субагент «на лету».

Issues на GitHub — одностороннее зеркало файлов (статус по-прежнему только в YAML). [Все тикеты](https://github.com/ndobrynin/mk/issues?q=is%3Aissue+label%3Abacklog), [в работе](https://github.com/ndobrynin/mk/issues?q=is%3Aissue+label%3Astatus%3Ain_progress), [вехи M0–M2](https://github.com/ndobrynin/mk/milestones). Синк: `python3 scripts/backlog-sync-github.py` (и workflow при пуше тикетов).

## M0 — каркас

| id | title | fast_track |
| --- | --- | --- |
| [M0-01](tickets/M0-01-gitignore.md) | `.gitignore` | да |
| [M0-02](tickets/M0-02-pnpm-workspace.md) | pnpm workspace | да |
| [M0-03](tickets/M0-03-docker-compose.md) | Docker 5435 + 6380 | нет |
| [M0-04](tickets/M0-04-env-example.md) | `.env.example` | да |
| [M0-05](tickets/M0-05-package-shared.md) | `packages/shared` | да |
| [M0-06](tickets/M0-06-package-engine.md) | `packages/engine` + тест | да |
| [M0-07](tickets/M0-07-package-platform.md) | `packages/platform` | да |
| [M0-08](tickets/M0-08-app-api.md) | Nest API, health-тест | нет |
| [M0-09](tickets/M0-09-app-web.md) | Vite React 5173 | нет |
| [M0-10](tickets/M0-10-root-scripts.md) | скрипты корня | да |
| [M0-11](tickets/M0-11-ci.md) | CI: pnpm test | нет |

## M1 — auth

| id | title |
| --- | --- |
| [M1-01](tickets/M1-01-prisma-schema.md) | Prisma: users + identities |
| [M1-02](tickets/M1-02-register-email.md) | POST /auth/register |
| [M1-03](tickets/M1-03-login-email.md) | POST /auth/login |
| [M1-04](tickets/M1-04-refresh.md) | refresh JWT |
| [M1-05](tickets/M1-05-me.md) | GET /me |

OAuth VK/Yandex — отдельные файлы тикетов после M1-05, не «заодно».

## M2 — движок

После M2-01 не менять `packages/engine/CONTRACT.md` без нового тикета.

| id | title |
| --- | --- |
| [M2-01](tickets/M2-01-engine-types.md) | типы + `apply` stub + CONTRACT |
| [M2-02](tickets/M2-02-setup-two-players.md) | `setup()` на 2–4 игроков |
| [M2-03](tickets/M2-03-roll-one-die.md) | `roll` — один кубик |
| [M2-04](tickets/M2-04-income-wheat-bakery.md) | доход wheat/bakery/cafe + `passBuild` |
| [M2-05](tickets/M2-05-full-engine.md) | полный движок: каталог, ход, все карты |

## M3 — комнаты

| id | title |
| --- | --- |
| [M3-01](tickets/M3-01-rooms-rest.md) | REST комнаты: create/join/list/leave |
| [M3-02](tickets/M3-02-socket-game.md) | Socket.IO: start, apply, Redis snapshot |

## M4 — стол

| id | title |
| --- | --- |
| [M4-01](tickets/M4-01-web-auth-lobby.md) | вход и лобби комнат |
| [M4-02](tickets/M4-02-web-table.md) | стол, магазин, партия по сокету |

## M5 — боты

| id | title |
| --- | --- |
| [M5-01](tickets/M5-01-engine-bot-policy.md) | политика бота в engine |
| [M5-02](tickets/M5-02-server-bots-lobby.md) | боты в лобби и ходы на сервере |

## M8 — меню и локальный стол (UI)

| id | title |
| --- | --- |
| [M8-01](tickets/M8-01-home-local-register.md) | меню и регистрация локальных игроков |

## Позже

M6 VK/Яндекс · M7 таймеры. Не брать без файла тикета.

Новый тикет = `TEMPLATE.md`. `S` = одна ветка, один набор тестов.
