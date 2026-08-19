# Кидаград

Сетевая браузерная игра: бросайте кубики, собирайте предприятия и первым достройте все достопримечательности своего города.

Игра запускается как обычный сайт, VK Mini App и Яндекс Игры. Комнаты на 2–4 игрока, пустые слоты можно заполнить ботами.

## Макет

[Figma](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=75-39) — актуальные экраны: [меню](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=206-10913), [регистрация локальных игроков](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=206-7287), стол на 4, магазин, карты.

## Документы

- [Правила](docs/rules.md) — как играть, фазы хода, каталог карт
- [Архитектура](docs/architecture.md) — клиент, сервер, движок, платформы
- [Локальная среда и порты](docs/local-dev.md) — Docker, Postgres, Redis; **не занимать чужие порты**
- [Бэклог](docs/backlog/README.md) — мелкие тикеты; флоу architect → developer → tester

Следующая задача: `python3 scripts/backlog-next.py`. Ветка `kg/{id}`. Статус только в YAML тикета.

## Стек

React (Vite) + NestJS. Игровой движок — чистый TypeScript, сервер считает кубики и эффекты.

## Запуск локально

```bash
pnpm infra:up    # Postgres 5435, Redis 6380
pnpm dev:api     # http://127.0.0.1:4010
pnpm dev:web     # http://127.0.0.1:5173
```

Подробности и запрещённые порты — [docs/local-dev.md](docs/local-dev.md).

## Локальные порты Кидаграда

На машине уже крутятся чужие Postgres (`5432`, `5433`, `5434`) и Redis (`6379`). Этот проект **не** садится на них.

| Сервис | Хост |
| --- | --- |
| Postgres | `5435` |
| Redis | `6380` |
| API (Nest) | `4010` |
| Web (Vite) | `5173` |

Подробности и запрещённые порты — в [docs/local-dev.md](docs/local-dev.md).

## Статус

Сейчас в репозитории спецификации. Код приложений ещё не начат.
