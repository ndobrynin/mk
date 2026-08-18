# @kidagrad/engine — contract

Frozen as of M2-01. See `docs/architecture.md` §4 for the design rationale.

```ts
export type Command = { type: 'roll' } | { type: 'passBuild' };

export type GameState = { version: 1; phase: string; players: unknown[] };

export type Rng = { nextInt(maxExclusive: number): number };

export function apply(state: GameState, command: Command, rng: Rng):
  { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string };
```

## Rule

Later tickets may expand the `Command` union or `GameState` fields **only** via an explicit
scope item in the ticket. The `apply` signature itself must not change.
