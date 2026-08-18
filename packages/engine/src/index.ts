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

type InternalState = GameState & {
  activeIndex: number;
  players: Player[];
  lastRoll?: { dice: number[] };
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

  const state: InternalState = {
    version: 1,
    phase: 'rolling',
    activeIndex: 0,
    players,
  };

  return state;
}

function countEstablishment(player: Player, id: string): number {
  return player.establishments.filter((establishment) => establishment === id).length;
}

/**
 * Order to collect from for red-card income: starting from the player right
 * before the active player (going backwards around the table), excluding
 * the active player itself.
 */
function counterclockwiseOrder(activeIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let step = 1; step < playerCount; step += 1) {
    order.push((activeIndex - step + playerCount) % playerCount);
  }
  return order;
}

function applyCafeIncome(players: Player[], activeIndex: number): void {
  const active = players[activeIndex];
  const order = counterclockwiseOrder(activeIndex, players.length);

  for (const ownerIndex of order) {
    const owner = players[ownerIndex];
    const copies = countEstablishment(owner, 'cafe');
    if (copies === 0) continue;

    const amount = copies;
    const paid = Math.min(active.coins, amount);
    active.coins -= paid;
    owner.coins += paid;
  }
}

function applyWheatFieldIncome(players: Player[]): void {
  for (const player of players) {
    const copies = countEstablishment(player, 'wheat-field');
    if (copies > 0) player.coins += copies;
  }
}

function applyBakeryIncome(active: Player): void {
  const copies = countEstablishment(active, 'bakery');
  if (copies > 0) active.coins += copies;
}

export function apply(
  state: GameState,
  command: Command,
  rng: Rng,
): { ok: true; state: GameState; events: unknown[] } | { ok: false; error: string } {
  const current = state as InternalState;

  if (command.type === 'roll' && current.phase === 'rolling') {
    const n = rng.nextInt(6) + 1;
    const players: Player[] = current.players.map((player) => ({ ...player }));

    if (n === 3) {
      applyCafeIncome(players, current.activeIndex);
    }
    if (n === 1) {
      applyWheatFieldIncome(players);
    }
    if (n === 2 || n === 3) {
      applyBakeryIncome(players[current.activeIndex]);
    }

    const nextState: InternalState = {
      ...current,
      players,
      phase: 'build',
      lastRoll: { dice: [n] },
    };

    return {
      ok: true,
      state: nextState,
      events: [{ type: 'diceRolled', dice: [n] }],
    };
  }

  if (command.type === 'passBuild' && current.phase === 'build') {
    const playerCount = current.players.length;
    const previousPlayer = current.players[current.activeIndex];
    const nextActiveIndex = (current.activeIndex + 1) % playerCount;
    const nextPlayer = current.players[nextActiveIndex];

    const nextState: InternalState = {
      ...current,
      phase: 'rolling',
      activeIndex: nextActiveIndex,
    };

    return {
      ok: true,
      state: nextState,
      events: [
        { type: 'turnEnded', playerId: previousPlayer.id },
        { type: 'turnStarted', playerId: nextPlayer.id },
      ],
    };
  }

  return { ok: false, error: `cannot apply "${command.type}" in phase "${current.phase}"` };
}
