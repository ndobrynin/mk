---
id: M2-06
title: passBuild и смена хода
status: todo
milestone: M2
blocked_by: [M2-04]
unblocks: []
estimate: S
fast_track: false
min_tests: 2
---

# M2-06 — пропуск строительства

## Зачем

Закончить ход без покупки. Аэропорт пока не реализовывать.

## Скоуп

Из фазы `build`: `{ type: 'passBuild' }`

- монеты не меняются
- `activeIndex` = следующий по кругу
- `phase: 'rolling'`
- событие `turnEnded` / `turnStarted`

Нелегальный passBuild из `rolling` → `{ ok: false }`.

Не делать buildEstablishment, Airport +10.

## Контекст

- `docs/rules.md` §5.7 пропуск (без аэропорта)
- `packages/engine/CONTRACT.md`

## Критерии приёмки

- [ ] После setup → roll → income → passBuild ход у игрока 1
- [ ] passBuild в rolling → error
- [ ] Два игрока: индекс 0→1→0

## Проверка

```bash
pnpm --filter @kidagrad/engine test
# ожидание: exit 0, passed ≥ 2
```
