export type Command = { type: 'roll' } | { type: 'passBuild' };

export type GameState = { version: 1; phase: string; players: unknown[] };

export type Rng = { nextInt(maxExclusive: number): number };

export function apply(
  state: GameState,
  command: Command,
  rng: Rng,
): { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string } {
  return { ok: false, error: 'not implemented' };
}
