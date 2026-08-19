# @kidagrad/engine — contract

Frozen as of M2-01. See `docs/architecture.md` §4 for the design rationale.

```ts
export function apply(state: GameState, command: Command, rng: Rng):
  { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string };
```

The `apply` signature above is frozen and must not change.

## Command (extended in M2-05)

```ts
export type Command =
  | { type: 'roll' }
  | { type: 'chooseDiceCount'; count: 1 | 2 | 3 }
  | { type: 'keepTwo'; indices: [number, number] }
  | { type: 'reroll' }
  | { type: 'keepRoll' }
  | { type: 'harborAdd' }
  | { type: 'harborSkip' }
  | { type: 'pickPlayer'; playerId: string }
  | { type: 'pickCard'; cardId: string }
  | { type: 'pickEstablishmentType'; cardId: string }
  | { type: 'buildEstablishment'; cardId: string }
  | { type: 'buildLandmark'; landmarkId: string }
  | { type: 'passBuild' }
  | { type: 'ventureFundDeposit' }
  | { type: 'skip' };
```

An illegal command for the current phase returns `{ ok: false, error }` and leaves `state`
untouched. `setup` still throws for an invalid player count (not 2–4); `apply` itself never throws.

## GameState (extended in M2-05)

```ts
export type GameState = {
  version: 1;
  phase: string;
  players: unknown[];
  activeIndex?: number;
  market?: Record<string, number>;
  diceCount?: 1 | 2 | 3;
  threeDice?: number[];
  pendingSum?: number;
  lastRoll?: { dice: number[] };
  turnFlags?: { rerolled: boolean; usedExtraTurn: boolean };
  pending?: unknown; // opaque income-queue resume data, see src/index.ts
  winnerId?: string;
};

export type Establishment = { id: string; repaired?: boolean };
export type Landmark = { id: string; constructed: boolean };
export type Player = {
  id: string;
  coins: number;
  establishments: Establishment[];
  landmarks: Landmark[];
  ventureFundTokens?: number;
};
```

`Player.establishments` moved from `string[]` to `Establishment[]` in M2-05 (a card can be
`repaired: false`, meaning it is damaged and produces no income and does not count toward
icon/type multipliers, until some other effect fixes it).

## Phases

`rolling → [chooseTwoOfThree] → [decideReroll] → [decideHarbor] → income (auto, or paused on
pick*/pickPlayer/pickCard/pickEstablishmentType phases such as pickMovingCompanyPlayer,
pickTvStationPlayer, pickBusinessCenterPlayer/OwnCard/TheirCard, pickRenovationType,
pickConferenceType) → build → [endOfTurn, only if the active player can deposit into
venture-fund] → rolling (next player, or the same player again after a Телебашня double, without
chaining) → … → gameOver`. See `docs/architecture.md` §4.1.

## Rule

Later tickets may expand the `Command` union or `GameState` fields **only** via an explicit
scope item in the ticket. The `apply` signature itself must not change.

## Card catalog

`packages/engine/src/catalog.ts` holds establishment and landmark data (id, color, activation
numbers, icons, cost, unique, supply, effect). Effects are interpreted by `apply`, not by
per-card functions. `cost: null` on a catalog entry means the cost was not yet transcribed from
the Figma card visuals — `buildEstablishment` / `buildLandmark` reject such ids with
`{ ok: false }` rather than guessing a price. See `docs/rules.md` for the cost table and
provenance notes.

## Bot policy (M5-01)

`chooseBotCommand(state, playerId): Command` returns one command for the active player's current
phase such that `apply(state, command, rng)` yields `{ ok: true }`. The frozen `apply` signature
above is unchanged.

v1 is a heuristic (not ML), using only legal commands (optional helper: probe `apply` with a stub
rng):

- `rolling` → `{ type: 'roll' }` only (never `chooseDiceCount`).
- `decideReroll` → `keepRoll`.
- `decideHarbor` → `harborSkip`.
- pick* / `endOfTurn` → first legal command.
- `build`: a landmark if it is affordable (`cost !== null`) and the city already feeds
  (`city-hall` constructed, or `establishments.length > 2`); otherwise the market establishment
  with maximum EV/cost using 1d6 activation probabilities (`cost: null` skipped); otherwise
  `passBuild`.

