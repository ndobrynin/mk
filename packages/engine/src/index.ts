export type Command = { type: 'roll' } | { type: 'passBuild' };

export type GameState = { version: 1; phase: string; players: unknown[] };

export type Rng = { nextInt(maxExclusive: number): number };

export type Landmark = { id: string; constructed: boolean };

export type Player = {
  id: string;
  coins: number;
  establishments: string[];
  landmarks: Landmark[];
};

const LANDMARK_IDS = [
  'harbor',
  'station',
  'mall',
  'tv-tower',
  'amusement-park',
  'aqua-park',
  'airport',
  'bank',
  'city-hall',
] as const;

function createLandmarks(): Landmark[] {
  return LANDMARK_IDS.map((id) => ({ id, constructed: false }));
}

function createPlayer(id: string): Player {
  return {
    id,
    coins: 3,
    establishments: ['wheat-field', 'bakery'],
    landmarks: createLandmarks(),
  };
}

export function setup(playerIds: string[]): GameState {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error('setup requires 2, 3, or 4 playerIds');
  }

  const players: Player[] = playerIds.map((id) => createPlayer(id));

  const state: GameState & { activeIndex: number } = {
    version: 1,
    phase: 'rolling',
    activeIndex: 0,
    players,
  };

  return state;
}

export function apply(
  state: GameState,
  command: Command,
  rng: Rng,
): { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string } {
  return { ok: false, error: 'not implemented' };
}
