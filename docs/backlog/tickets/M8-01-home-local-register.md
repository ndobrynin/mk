---
id: M8-01
title: Меню и регистрация локальных игроков
status: done
milestone: M8
blocked_by: [M4-01]
unblocks: []
estimate: M
fast_track: false
min_tests: 3
---

# M8-01 — меню Кидаграда

## Зачем

Первый экран по макету: выбрать локальную игру. Сетевая кнопка есть, но недоступна. Локальная открывает регистрацию имён за одним столом.

## Скоуп

Верстка desktop landscape по Figma, без Tailwind (в проекте инлайн/CSS, как остальные страницы). Строки из `ru`.

1. **Меню** [Figma 206-10913](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=206-10913): маршрут `/` (без JWT). Кнопки «Локальная игра» и «Сетевая игра». Сетевая **disabled** / `aria-disabled`, клик ничего не делает. Локальная ведёт на `/local`. Обработчиков сети, логина, комнат с этого экрана нет.

2. **Регистрация игроков** [Figma 206-7287](https://www.figma.com/design/I1NOY3anFnhayDXTVwUHbw/Untitled?node-id=206-7287): `/local`. Фон-город + синяя панель, «Меню» → `/`, заголовок, поле «Имя», «Добавить». Добавленные имена видны списком на панели (2–4, лишние не добавлять). Старт партии / engine / сокет / hotseat `apply` — **не** делать.

Ассеты из Figma скачать в `apps/web/public/` (URL MCP живут ~7 дней). Не рисовать SVG руками. Шрифт Banana Brick — если файла нет, display-fallback; Montserrat можно с Google Fonts.

`get_design_context` для 206-10913 может упереться в квоту Figma Starter; тогда меню верстать по соседнему 206-7287 (тот же городской фон) и подписям кнопок из макета.

Не делать: сетевые комнаты с меню, VK/Яндекс (M6), таймеры (M7), стол, ботов, PixiJS, смену API/`apply`.

## Контекст

- `apps/web/src/App.tsx`, `i18n/ru.ts`
- Figma: 206-10913, 206-7287 (файл `I1NOY3anFnhayDXTVwUHbw`)

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `apps/web/src/App.tsx` | изменить (`/` и `/local`) |
| `apps/web/src/pages/HomePage.tsx` | создать |
| `apps/web/src/pages/HomePage.test.tsx` | создать |
| `apps/web/src/pages/LocalPlayersPage.tsx` | создать |
| `apps/web/src/pages/LocalPlayersPage.test.tsx` | создать |
| `apps/web/src/i18n/ru.ts` | изменить |
| `apps/web/index.html` | изменить (шрифт при необходимости) |
| `apps/web/public/` | создать ассеты фона/панели |
| `README.md` | изменить (эти фреймы больше не «устаревший hotseat») |

## Критерии приёмки

- [ ] `/` показывает кнопки локальной и сетевой игры; сетевая недоступна
- [ ] Локальная открывает `/local` с заголовком регистрации игроков
- [ ] «Добавить» с именем показывает игрока в списке; «Меню» возвращает на `/`
- [ ] Нет Tailwind как новой зависимости

## Проверка

```bash
pnpm --filter @kidagrad/web test
# ожидание: exit 0, passed ≥ 3
pnpm --filter @kidagrad/web build
# ожидание: exit 0
```
