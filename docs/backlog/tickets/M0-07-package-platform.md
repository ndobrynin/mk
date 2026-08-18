---
id: M0-07
title: packages/platform заглушка
status: done
milestone: M0
blocked_by: [M0-02]
unblocks: [M0-09]
estimate: S
fast_track: true
min_tests: 0
---

# M0-07 — `packages/platform`

## Зачем

Место под адаптеры web/vk/yandex. Сейчас только `getLaunchContext(): 'web'`.

## Скоуп

Пакет `@kidagrad/platform`, функция `getLaunchContext()` всегда возвращает `'web'`.

Не делать VK Bridge, YaGames, storage.

## Контекст

- `docs/architecture.md` §10

## Ожидаемые файлы

| Путь | Действие |
| --- | --- |
| `packages/platform/package.json` | создать |
| `packages/platform/tsconfig.json` | создать |
| `packages/platform/src/index.ts` | создать |

## Критерии приёмки

- [ ] Экспорт `getLaunchContext` есть
- [ ] Возвращает `'web'`

## Проверка

```bash
grep -q "getLaunchContext" packages/platform/src/index.ts
grep -q "'web'" packages/platform/src/index.ts
# ожидание: exit 0
```
