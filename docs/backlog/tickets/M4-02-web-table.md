---
id: M4-02
title: Стол, магазин и партия по сокету
status: done
milestone: M4
blocked_by: [M4-01, M3-02]
unblocks: []
estimate: L
fast_track: false
min_tests: 3
---

# M4-02 — стол Кидаграда

## Зачем

Играть партию в браузере: снимок с сервера, команды на сервер, без клиентского подсчёта дохода.

## Скоуп

Ландшафт desktop по [Figma](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=75-39): своё поле снизу, соперники по краям, рынок в центре. Магазин-оверлей. Результат партии (`game.over`).

Сокет: handshake `{ token, roomId }`. Лобби: `room.setReady`, `room.start`. Игра: команды как в API (`roll`, `passBuild`, `buildEstablishment`, …). Рендер из `game.snapshot` + `game.events` для подсветки; клиент **не** считает доход и **не** бросает кубик.

Строки из словаря `ru`. Карточка — один компонент из каталога (id карт как в engine). CORS/Socket.IO для 5173, если ещё не открыто.

Не делать: портретный VK/Яндекс (M6), ботов (M5), таймеры (M7), полный PixiJS стол, hotseat.

## Контекст

- `docs/architecture.md` §5, §6, §12
- `apps/api/src/game/game.gateway.ts`
- `packages/engine` типы state
- тикет M4-01 (роутер, JWT)

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/web/` | стол, магазин, socket-клиент, тесты |
| `apps/web/package.json` | socket.io-client при необходимости |
| `apps/api/src/main.ts` | CORS сокета, если нужно |
| `pnpm-lock.yaml` | lockfile |

## Критерии приёмки

- [ ] После start стол показывает 2 города из snapshot
- [ ] Кнопка броска шлёт `roll`, не число кубика
- [ ] Нелегальная команда не ломает UI (ошибка с сервера)
- [ ] Тесты с моком socket/snapshot, без curl живого сервера

## Проверка

```bash
pnpm --filter @kidagrad/web test
# ожидание: exit 0, passed ≥ 3
pnpm --filter @kidagrad/web build
# ожидание: exit 0
```
