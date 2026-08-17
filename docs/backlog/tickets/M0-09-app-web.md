---
id: M0-09
title: Vite React на 5173
status: todo
milestone: M0
blocked_by: [M0-02, M0-04]
unblocks: [M0-10]
estimate: S
fast_track: false
min_tests: 0
---

# M0-09 — `apps/web` Vite

## Зачем

Клиент на Vite + React, dev-сервер **5173**.

## Скоуп

- `apps/web` Vite + React + TypeScript
- стартовая страница с текстом «Кидаград» (можно в `index.html` или App)
- `server.port: 5173` в `vite.config.ts`
- не PixiJS, не роутер, не UI кита

Не делать логин, стол, Figma-вёрстку.

## Контекст

- `docs/local-dev.md` Vite 5173
- `docs/architecture.md` §5, §12 (React, не полный Pixi)

## Ожидаемые файлы

`apps/web/package.json` name `@kidagrad/web`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`.

## Критерии приёмки

- [ ] `pnpm --filter @kidagrad/web build` exit 0
- [ ] В `vite.config.ts` port 5173
- [ ] В сборке/исходниках есть строка «Кидаград»

## Проверка

```bash
pnpm --filter @kidagrad/web build
# ожидание: exit 0
grep -q '5173' apps/web/vite.config.ts
grep -q 'Кидаград' apps/web/src/App.tsx apps/web/index.html
# ожидание: grep находит хотя бы в одном файле
```
