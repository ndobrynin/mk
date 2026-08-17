---
id: TEMPLATE
title: Краткий заголовок
status: todo
milestone: M0
blocked_by: []
unblocks: []
estimate: S
fast_track: false
min_tests: 1
---

# {id} — заголовок

`status`: `todo` | `in_progress` | `done` | `blocked` — только здесь, не в README бэклога.

`fast_track: true` только для S без правки уже существующего приложения (новые мелкие файлы).

Ветка: `kg/{id}`. Повторный прогон: если AC уже выполнены → `already-done`, ничего не ломать.

## Зачем

Одно-два предложения.

## Скоуп

Сделать:

- …

Не делать:

- …

## Контекст (единственные файлы для чтения сверх тикета)

- …

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `path` | создать / изменить |

Это и есть Touches. Другие файлы в диффе = Fail (кроме `pnpm-lock.yaml`).

## Критерии приёмки

- [ ] наблюдаемый факт

## Проверка

Только команды, которые агент может прогнать **без** долгоживущего `listen` + `curl`.

HTTP: `pnpm --filter @kidagrad/api test` (supertest).

Движок: `pnpm --filter @kidagrad/engine test` и `min_tests`.

```bash
command
# ожидание: exit 0, passed ≥ min_tests
```

## Для дешёвой модели

- Strict TS, без `any`, без зависимостей вне тикета.
- Не менять `packages/engine/CONTRACT.md`, если тикет этого не просит.
