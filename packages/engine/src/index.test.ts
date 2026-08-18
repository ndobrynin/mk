import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  apply,
  setup,
  type Command,
  type Establishment,
  type GameState,
  type Landmark,
  type Player,
  type Rng,
} from './index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): GameState {
  const raw = readFileSync(path.join(dirname, '..', 'test', 'fixtures', name), 'utf-8');
  return JSON.parse(raw) as GameState;
}

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
];

type PlayerSpec = {
  id: string;
  coins: number;
  establishments?: Establishment[];
  built?: string[];
  ventureFundTokens?: number;
};

function makePlayer(spec: PlayerSpec): Player {
  const landmarks: Landmark[] = LANDMARK_IDS.map((id) => ({
    id,
    constructed: (spec.built ?? []).includes(id),
  }));
  const player: Player = {
    id: spec.id,
    coins: spec.coins,
    establishments: spec.establishments ?? [],
    landmarks,
  };
  if (spec.ventureFundTokens !== undefined) player.ventureFundTokens = spec.ventureFundTokens;
  return player;
}

function makeState(
  players: PlayerSpec[],
  opts?: { activeIndex?: number; phase?: string; market?: Record<string, number> },
): GameState {
  return {
    version: 1,
    phase: opts?.phase ?? 'rolling',
    activeIndex: opts?.activeIndex ?? 0,
    market: opts?.market ?? {},
    players: players.map(makePlayer),
  };
}

/** Returns fixed values from `values` for successive `nextInt` calls, in order. */
function seqRng(values: number[]): Rng {
  let i = 0;
  return {
    nextInt: () => {
      if (i >= values.length) throw new Error(`rng exhausted after ${i} calls`);
      const v = values[i];
      i += 1;
      return v;
    },
  };
}

function constRng(value: number): Rng {
  return { nextInt: () => value };
}

function players(state: GameState): Player[] {
  return state.players as Player[];
}

describe('@kidagrad/engine', () => {
  it('exports apply', () => {
    expect(typeof apply).toBe('function');
  });

  it('apply rolls one die from rolling phase, using rng and ignoring extra command fields', () => {
    const state = setup(['a', 'b']);
    const rng: Rng = { nextInt: () => 0 };

    const result = apply(state, { type: 'roll', value: 6 } as Command, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.events).toEqual([
      { type: 'diceRolled', dice: [1] },
      { type: 'coinsGained', playerId: 'a', amount: 1, cardId: 'wheat-field' },
      { type: 'coinsGained', playerId: 'b', amount: 1, cardId: 'wheat-field' },
    ]);
    expect((result.state as GameState & { lastRoll: { dice: number[] } }).lastRoll).toEqual({
      dice: [1],
    });
    expect(result.state.phase).toBe('build');
  });

  it('setup creates two players with 3 coins each, no RNG involved', () => {
    const state = setup(['p1', 'p2']);

    expect(state.version).toBe(1);
    expect(state.phase).toBe('rolling');
    expect(state.players).toHaveLength(2);

    for (const player of players(state)) {
      expect(player.coins).toBe(3);
    }
  });

  it('setup gives each player wheat-field and bakery establishments', () => {
    const state = setup(['p1', 'p2']);

    for (const player of players(state)) {
      expect(player.establishments).toEqual([{ id: 'wheat-field' }, { id: 'bakery' }]);
    }
  });

  it('setup gives each player 9 unconstructed landmarks', () => {
    const state = setup(['p1', 'p2']);

    for (const player of players(state)) {
      expect(player.landmarks).toHaveLength(9);
      expect(player.landmarks.map((l) => l.id)).toEqual(LANDMARK_IDS);
      expect(player.landmarks.every((l) => l.constructed === false)).toBe(true);
    }
  });

  it('setup creates three players, each with 3 coins, establishments, and 9 landmarks', () => {
    const state = setup(['p1', 'p2', 'p3']);

    expect(state.players).toHaveLength(3);
    expect(players(state).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    for (const player of players(state)) {
      expect(player.coins).toBe(3);
      expect(player.establishments).toEqual([{ id: 'wheat-field' }, { id: 'bakery' }]);
      expect(player.landmarks).toHaveLength(9);
      expect(player.landmarks.every((l) => l.constructed === false)).toBe(true);
    }
  });

  it('setup creates four players, each with 3 coins, establishments, and 9 landmarks', () => {
    const state = setup(['p1', 'p2', 'p3', 'p4']);

    expect(state.players).toHaveLength(4);
    expect(players(state).map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    for (const player of players(state)) {
      expect(player.coins).toBe(3);
      expect(player.establishments).toEqual([{ id: 'wheat-field' }, { id: 'bakery' }]);
      expect(player.landmarks).toHaveLength(9);
      expect(player.landmarks.every((l) => l.constructed === false)).toBe(true);
    }
  });

  it('setup throws for 0 playerIds', () => {
    expect(() => setup([])).toThrow();
  });

  it('setup throws for 1 playerId', () => {
    expect(() => setup(['p1'])).toThrow();
  });

  it('setup throws for 5 playerIds', () => {
    expect(() => setup(['p1', 'p2', 'p3', 'p4', 'p5'])).toThrow();
  });

  it('rng 0 (die 1): wheat-field pays both players, both go 3 -> 4', () => {
    const state = setup(['a', 'b']);
    const result = apply(state, { type: 'roll' }, constRng(0));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([4, 4]);
    expect(result.state.phase).toBe('build');
  });

  it('rng 1 (die 2): bakery pays only the active player, 3 -> 4, opponent stays 3', () => {
    const state = setup(['a', 'b']);
    const result = apply(state, { type: 'roll' }, constRng(1));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([4, 3]);
    expect(result.state.phase).toBe('build');
  });

  it('rng 3 (die 4): no wheat-field/bakery/cafe income, both players stay at 3', () => {
    const state = setup(['a', 'b']);
    const result = apply(state, { type: 'roll' }, constRng(3));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([3, 3]);
    expect(result.state.phase).toBe('build');
  });

  it('cafe income (die 3): active pays cafe owner in full, from cafe-one-coin.json fixture', () => {
    const state = loadFixture('cafe-one-coin.json');
    const result = apply(state, { type: 'roll' }, constRng(2));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([1, 4]);
  });

  it('cafe income (die 3): debt beyond active coins burns, from cafe-zero-coins.json fixture', () => {
    const state = loadFixture('cafe-zero-coins.json');
    const result = apply(state, { type: 'roll' }, constRng(2));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([1, 3]);
  });

  it('setup -> roll -> passBuild: turn passes to player 1, activeIndex wraps 0 -> 1 -> 0', () => {
    const initial = setup(['a', 'b']);
    const rng = constRng(3);

    const rolled = apply(initial, { type: 'roll' }, rng);
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;

    const afterFirstPass = apply(rolled.state, { type: 'passBuild' }, rng);
    expect(afterFirstPass.ok).toBe(true);
    if (!afterFirstPass.ok) return;

    expect((afterFirstPass.state as GameState & { activeIndex: number }).activeIndex).toBe(1);
    expect(afterFirstPass.state.phase).toBe('rolling');
    expect(afterFirstPass.events).toEqual([
      { type: 'turnEnded', playerId: 'a' },
      { type: 'turnStarted', playerId: 'b' },
    ]);

    const rolledAgain = apply(afterFirstPass.state, { type: 'roll' }, rng);
    expect(rolledAgain.ok).toBe(true);
    if (!rolledAgain.ok) return;

    const afterSecondPass = apply(rolledAgain.state, { type: 'passBuild' }, rng);
    expect(afterSecondPass.ok).toBe(true);
    if (!afterSecondPass.ok) return;

    expect((afterSecondPass.state as GameState & { activeIndex: number }).activeIndex).toBe(0);
  });

  it('passBuild from rolling phase returns ok: false', () => {
    const state: GameState = { version: 1, phase: 'rolling', players: [] };
    const result = apply(state, { type: 'passBuild' }, constRng(0));
    expect(result.ok).toBe(false);
  });

  // ---------------------------------------------------------------------
  // Blue establishments (any player's turn, bank-funded)
  // ---------------------------------------------------------------------

  it('wheat-field (die 1): any owner gains 1, even on the opponent turn', () => {
    const state = makeState([
      { id: 'a', coins: 0 },
      { id: 'b', coins: 0, establishments: [{ id: 'wheat-field' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(1);
  });

  it('farm (die 2): owner gains 1', () => {
    const state = makeState([
      { id: 'a', coins: 0 },
      { id: 'b', coins: 0, establishments: [{ id: 'farm' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(1);
  });

  it('corn-field (die 3): fires when owner has <= 1 constructed landmark', () => {
    const state = makeState([
      { id: 'a', coins: 0 },
      { id: 'b', coins: 0, establishments: [{ id: 'corn-field' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(1);
  });

  it('flower-garden (die 4): owner gains 1', () => {
    const state = makeState([
      { id: 'a', coins: 0 },
      { id: 'b', coins: 0, establishments: [{ id: 'flower-garden' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(1);
  });

  it('nature-preserve (die 5): owner gains 1', () => {
    const state = makeState([
      { id: 'a', coins: 0 },
      { id: 'b', coins: 0, establishments: [{ id: 'nature-preserve' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(4));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(1);
  });

  it('vineyard (die 7, via station + 2 dice): owner gains 3', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'vineyard' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([0, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phase).toBe('build');
    expect(players(result.state)[1].coins).toBe(3);
  });

  it('fishing-boat (die 8): needs the owner to have harbor', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'fishing-boat' }], built: ['harbor'] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([1, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(3);
  });

  it('mine (die 9): owner gains 5', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'mine' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([2, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(5);
  });

  it('apple-orchard (die 10): owner gains 3', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'apple-orchard' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([3, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[1].coins).toBe(3);
  });

  it('trawler (die 12): active rolls 2 extra dice; owners with harbor gain the sum', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'trawler' }], built: ['harbor'] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    // initial dice: 6 + 6 = 12 (seq [5,5]); trawler extra dice: 3 + 4 = 7 (seq [2,3])
    const result = apply(chosen.state, { type: 'roll' }, seqRng([5, 5, 2, 3]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.some((e) => (e as { type: string }).type === 'trawlerRoll')).toBe(true);
    expect(players(result.state)[1].coins).toBe(7);
  });

  // ---------------------------------------------------------------------
  // Green establishments (active player's own turn, bank-funded)
  // ---------------------------------------------------------------------

  it('convenience-store (die 2): fires when active has <= 1 constructed landmark', () => {
    const state = makeState([{ id: 'a', coins: 0, establishments: [{ id: 'convenience-store' }] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'roll' }, constRng(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(2);
  });

  it('bakery (die 3): active gains 1', () => {
    const state = makeState([{ id: 'a', coins: 0, establishments: [{ id: 'bakery' }] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'roll' }, constRng(2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(1);
  });

  it('supermarket (die 4): active gains 3', () => {
    const state = makeState([{ id: 'a', coins: 0, establishments: [{ id: 'supermarket' }] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'roll' }, constRng(3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(3);
  });

  it('demolition-company (die 4): demolishes a constructed landmark, then +8', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'demolition-company' }], built: ['harbor'] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = players(result.state)[0];
    expect(a.coins).toBe(8);
    expect(a.landmarks.find((l) => l.id === 'harbor')?.constructed).toBe(false);
  });

  it('demolition-company: skipped entirely (no +8) when active has no constructed landmark', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'demolition-company' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(0);
  });

  it('loan-office: -2 per turn from the bank, regardless of the die', () => {
    const state = makeState([{ id: 'a', coins: 5, establishments: [{ id: 'loan-office' }] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'roll' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(3);
  });

  it('loan-office: purchase would grant +5, but cost is unknown (never guessed) so the build is rejected', () => {
    const state = makeState([{ id: 'a', coins: 5 }, { id: 'b', coins: 0 }], {
      phase: 'build',
      market: { 'loan-office': 6 },
    });
    const result = apply(state, { type: 'buildEstablishment', cardId: 'loan-office' }, constRng(0));
    // Cost for loan-office was not transcribed from Figma this session -> build must be rejected, not guessed.
    expect(result.ok).toBe(false);
  });

  it('flower-shop (die 6): +1 per owned flower-garden', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'flower-shop' }, { id: 'flower-garden' }, { id: 'flower-garden' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(5));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(2);
  });

  it('cheese-factory (die 7): +3 per owned cow-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'cheese-factory' }, { id: 'farm' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([0, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(3);
  });

  it('furniture-factory (die 8): +3 per owned mountain-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'furniture-factory' }, { id: 'nature-preserve' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([1, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(3);
  });

  it('winery (die 9): +6 per owned vineyard, then goes into repair', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'winery' }, { id: 'vineyard' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([2, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = players(result.state)[0];
    expect(a.coins).toBe(6);
    expect(a.establishments.find((e) => e.id === 'winery')?.repaired).toBe(false);
  });

  it('moving-company (die 10): pauses for a target player and a card, then +4', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'moving-company' }, { id: 'corn-field' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([3, 5]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('pickMovingCompanyPlayer');

    const pickedPlayer = apply(rolled.state, { type: 'pickPlayer', playerId: 'b' }, constRng(0));
    expect(pickedPlayer.ok).toBe(true);
    if (!pickedPlayer.ok) return;
    expect(pickedPlayer.state.phase).toBe('pickMovingCompanyCard');

    const pickedCard = apply(pickedPlayer.state, { type: 'pickCard', cardId: 'corn-field' }, constRng(0));
    expect(pickedCard.ok).toBe(true);
    if (!pickedCard.ok) return;
    expect(pickedCard.state.phase).toBe('build');
    const [a, b] = players(pickedCard.state);
    expect(a.coins).toBe(4);
    expect(a.establishments.some((e) => e.id === 'corn-field')).toBe(false);
    expect(b.establishments.some((e) => e.id === 'corn-field')).toBe(true);
  });

  it('moving-company: skipped entirely when active has nothing eligible to give away', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'moving-company' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([3, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phase).toBe('build');
    expect(players(result.state)[0].coins).toBe(0);
  });

  it('beverage-factory (die 11): +1 per owned cup-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'beverage-factory' }, { id: 'cafe' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([4, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(1);
  });

  it('produce-market (die 12): +2 per owned wheat-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'produce-market' }, { id: 'wheat-field' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([5, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(2);
  });

  it('grocery-warehouse (die 12): +2 per owned cup-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'grocery-warehouse' }, { id: 'cafe' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([5, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(2);
  });

  // ---------------------------------------------------------------------
  // Red establishments (opponent's turn, funded by active, debt burns)
  // ---------------------------------------------------------------------

  it('sushi-bar (die 1): needs the owner to have harbor', () => {
    const state = makeState([
      { id: 'a', coins: 10 },
      { id: 'b', coins: 0, establishments: [{ id: 'sushi-bar' }], built: ['harbor'] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([7, 3]);
  });

  it('restaurant (die 5): fires only if active has >= 2 constructed landmarks', () => {
    const state = makeState([
      { id: 'a', coins: 10, built: ['harbor', 'station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'restaurant' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(4));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // sum=5 also triggers harbor's decideHarbor pause path only if sum >= 10, so it's not relevant here.
    expect(players(result.state).map((p) => p.coins)).toEqual([5, 5]);
  });

  it('restaurant: does not fire when active has < 2 constructed landmarks', () => {
    const state = makeState([
      { id: 'a', coins: 10 },
      { id: 'b', coins: 0, establishments: [{ id: 'restaurant' }] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(4));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([10, 0]);
  });

  it('pizzeria (die 7): takes 1 from active', () => {
    const state = makeState([
      { id: 'a', coins: 10, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'pizzeria' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([0, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([9, 1]);
  });

  it('burger-joint (die 8): takes 1 from active', () => {
    const state = makeState([
      { id: 'a', coins: 10, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'burger-joint' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([1, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([9, 1]);
  });

  it('diner (die 9): takes 2 from active', () => {
    const state = makeState([
      { id: 'a', coins: 10, built: ['station'] },
      { id: 'b', coins: 0, establishments: [{ id: 'diner' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([2, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([8, 2]);
  });

  it('exclusive-bar (die 12): takes ALL of active coins if active has >= 3 constructed landmarks', () => {
    const state = makeState([
      { id: 'a', coins: 7, built: ['station', 'mall', 'tv-tower'] },
      { id: 'b', coins: 0, establishments: [{ id: 'exclusive-bar' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([5, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([0, 7]);
  });

  // ---------------------------------------------------------------------
  // Purple establishments (active's own turn, unique)
  // ---------------------------------------------------------------------

  it('stadium (die 6): +2 from each opponent', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'stadium' }] },
      { id: 'b', coins: 5 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(5));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([2, 3]);
  });

  it('tv-station (die 6): pauses to pick an opponent, then takes up to 5', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'tv-station' }] },
      { id: 'b', coins: 10 },
    ]);
    const rolled = apply(state, { type: 'roll' }, constRng(5));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('pickTvStationPlayer');

    const picked = apply(rolled.state, { type: 'pickPlayer', playerId: 'b' }, constRng(0));
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    expect(picked.state.phase).toBe('build');
    expect(players(picked.state).map((p) => p.coins)).toEqual([5, 5]);
  });

  it('business-center (die 6): pauses for opponent, own card, their card, then trades', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'business-center' }, { id: 'corn-field' }] },
      { id: 'b', coins: 0, establishments: [{ id: 'flower-garden' }] },
    ]);
    const rolled = apply(state, { type: 'roll' }, constRng(5));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('pickBusinessCenterPlayer');

    const pickedPlayer = apply(rolled.state, { type: 'pickPlayer', playerId: 'b' }, constRng(0));
    expect(pickedPlayer.ok).toBe(true);
    if (!pickedPlayer.ok) return;
    expect(pickedPlayer.state.phase).toBe('pickBusinessCenterOwnCard');

    const pickedOwn = apply(pickedPlayer.state, { type: 'pickCard', cardId: 'corn-field' }, constRng(0));
    expect(pickedOwn.ok).toBe(true);
    if (!pickedOwn.ok) return;
    expect(pickedOwn.state.phase).toBe('pickBusinessCenterTheirCard');

    const traded = apply(pickedOwn.state, { type: 'pickCard', cardId: 'flower-garden' }, constRng(0));
    expect(traded.ok).toBe(true);
    if (!traded.ok) return;
    expect(traded.state.phase).toBe('build');
    const [a, b] = players(traded.state);
    expect(a.establishments.some((e) => e.id === 'flower-garden')).toBe(true);
    expect(a.establishments.some((e) => e.id === 'corn-field')).toBe(false);
    expect(b.establishments.some((e) => e.id === 'corn-field')).toBe(true);
  });

  it('business-center: skipped when no legal trade exists on either side', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'business-center' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(5));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phase).toBe('build');
  });

  it('publisher (die 7): each opponent pays 1 per their cup/shop-icon card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'publisher' }] },
      { id: 'b', coins: 5, establishments: [{ id: 'bakery' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([0, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([1, 4]);
  });

  it('renovation-company (die 8): pauses for a type, breaks it everywhere, pays per card', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'renovation-company' }] },
      { id: 'b', coins: 0, establishments: [{ id: 'cafe' }] },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([1, 5]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('pickRenovationType');

    const picked = apply(rolled.state, { type: 'pickEstablishmentType', cardId: 'cafe' }, constRng(0));
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    expect(picked.state.phase).toBe('build');
    const [a, b] = players(picked.state);
    expect(a.coins).toBe(1);
    expect(b.establishments.find((e) => e.id === 'cafe')?.repaired).toBe(false);
  });

  it('tax-office (die 9): players with >= 10 coins pay half to the owner', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'tax-office' }] },
      { id: 'b', coins: 10 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([2, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([5, 5]);
  });

  it('venture-fund (die 10): takes tokens-worth of coins from each opponent', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'venture-fund' }], ventureFundTokens: 3 },
      { id: 'b', coins: 10 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([3, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([3, 7]);
  });

  it('venture-fund: deposit at end of turn increases the token count', () => {
    const state = makeState(
      [{ id: 'a', coins: 5, establishments: [{ id: 'venture-fund' }] }, { id: 'b', coins: 0 }],
      { phase: 'endOfTurn' },
    );
    const result = apply(state, { type: 'ventureFundDeposit' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = players(result.state)[0];
    expect(a.coins).toBe(4);
    expect(a.ventureFundTokens).toBe(1);
    expect(result.state.phase).toBe('rolling');
  });

  it('conference-center (die 10): pauses for own type, re-triggers it, then returns to market', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station'], establishments: [{ id: 'conference-center' }, { id: 'wheat-field' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([3, 5]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('pickConferenceType');

    const picked = apply(rolled.state, { type: 'pickEstablishmentType', cardId: 'wheat-field' }, constRng(0));
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    expect(picked.state.phase).toBe('build');
    const a = players(picked.state)[0];
    expect(a.coins).toBe(1);
    expect(a.establishments.some((e) => e.id === 'conference-center')).toBe(false);
    expect(picked.state.market?.['conference-center']).toBe(1);
  });

  it('park (die 11): pools all coins and redistributes evenly, bank covers the shortfall', () => {
    const state = makeState([
      { id: 'a', coins: 1, built: ['station'], establishments: [{ id: 'park' }] },
      { id: 'b', coins: 9 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const result = apply(chosen.state, { type: 'roll' }, seqRng([4, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state).map((p) => p.coins)).toEqual([5, 5]);
  });

  // ---------------------------------------------------------------------
  // Ordering, player count, and general turn mechanics
  // ---------------------------------------------------------------------

  it('reds resolve before blues: a red debt burns even though the active player gets blue income the same roll', () => {
    const state = makeState([
      { id: 'a', coins: 0, establishments: [{ id: 'wheat-field' }] },
      { id: 'c', coins: 0, establishments: [{ id: 'sushi-bar' }], built: ['harbor'] },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a, c] = players(result.state);
    // If blue resolved first, `a` would have 1 coin and `c` would receive 1 (not 0).
    expect(c.coins).toBe(0);
    expect(a.coins).toBe(1);
  });

  it('3-4 players: red income is collected counterclockwise from the active player', () => {
    const state = makeState(
      [
        { id: 'a', coins: 1 },
        { id: 'b', coins: 0 },
        { id: 'c', coins: 0, establishments: [{ id: 'cafe' }] },
        { id: 'd', coins: 0, establishments: [{ id: 'cafe' }] },
      ],
      { activeIndex: 0 },
    );
    const result = apply(state, { type: 'roll' }, constRng(2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a, b, c, d] = players(result.state);
    // ccw order from index 0 with 4 players is [d, c, b]: d is paid first, exhausting active's 1 coin.
    expect(a.coins).toBe(0);
    expect(d.coins).toBe(1);
    expect(c.coins).toBe(0);
    expect(b.coins).toBe(0);
  });

  it('buildEstablishment: pays cost, decrements supply, adds the card', () => {
    const state = makeState([{ id: 'a', coins: 5 }, { id: 'b', coins: 0 }], {
      phase: 'build',
      market: { 'apple-orchard': 2 },
    });
    const result = apply(state, { type: 'buildEstablishment', cardId: 'apple-orchard' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = players(result.state)[0];
    expect(a.coins).toBe(4);
    expect(a.establishments.some((e) => e.id === 'apple-orchard')).toBe(true);
    expect(result.state.market?.['apple-orchard']).toBe(1);
  });

  it('illegal build: not enough supply returns ok: false and leaves state untouched', () => {
    const state = makeState([{ id: 'a', coins: 5 }, { id: 'b', coins: 0 }], {
      phase: 'build',
      market: { 'apple-orchard': 0 },
    });
    const before = JSON.parse(JSON.stringify(state));
    const result = apply(state, { type: 'buildEstablishment', cardId: 'apple-orchard' }, constRng(0));
    expect(result.ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('illegal build: not enough coins returns ok: false', () => {
    const state = makeState([{ id: 'a', coins: 0 }, { id: 'b', coins: 0 }], {
      phase: 'build',
      market: { 'apple-orchard': 6 },
    });
    const result = apply(state, { type: 'buildEstablishment', cardId: 'apple-orchard' }, constRng(0));
    expect(result.ok).toBe(false);
  });

  it('illegal build: unknown cost (not transcribed from Figma) returns ok: false, never guesses', () => {
    const state = makeState([{ id: 'a', coins: 999 }, { id: 'b', coins: 0 }], {
      phase: 'build',
      market: { 'flower-garden': 6 },
    });
    const result = apply(state, { type: 'buildEstablishment', cardId: 'flower-garden' }, constRng(0));
    expect(result.ok).toBe(false);
  });

  it('buildLandmark: completing the last landmark wins immediately', () => {
    const state = makeState(
      [
        {
          id: 'a',
          coins: 5,
          built: ['station', 'mall', 'tv-tower', 'amusement-park', 'aqua-park', 'airport', 'bank', 'city-hall'],
        },
        { id: 'b', coins: 0 },
      ],
      { phase: 'build' },
    );
    const result = apply(state, { type: 'buildLandmark', landmarkId: 'harbor' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phase).toBe('gameOver');
    expect((result.state as GameState & { winnerId: string }).winnerId).toBe('a');
    expect(result.events.some((e) => (e as { type: string }).type === 'gameOver')).toBe(true);
  });

  it('illegal command in gameOver phase returns ok: false', () => {
    const state = makeState([{ id: 'a', coins: 0 }, { id: 'b', coins: 0 }], { phase: 'gameOver' });
    const result = apply(state, { type: 'roll' }, constRng(0));
    expect(result.ok).toBe(false);
  });

  it('chooseDiceCount(2) is illegal without station or aqua-park', () => {
    const state = makeState([{ id: 'a', coins: 0 }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(result.ok).toBe(false);
  });

  it('chooseDiceCount(3) is illegal without aqua-park, even with station', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['station'] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'chooseDiceCount', count: 3 }, constRng(0));
    expect(result.ok).toBe(false);
  });

  it('aqua-park: roll 3 dice, keep 2 of 3', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['aqua-park'] }, { id: 'b', coins: 0 }]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 3 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([1, 3, 5]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('chooseTwoOfThree');

    const kept = apply(rolled.state, { type: 'keepTwo', indices: [0, 2] }, constRng(0));
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect((kept.state as GameState & { lastRoll: { dice: number[] } }).lastRoll).toEqual({ dice: [2, 6] });
    expect(kept.state.phase).toBe('build');
  });

  it('amusement-park: reroll once, then no second reroll offer', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['amusement-park'] }, { id: 'b', coins: 0 }]);
    const rolled = apply(state, { type: 'roll' }, seqRng([2]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('decideReroll');

    const rerolled = apply(rolled.state, { type: 'reroll' }, seqRng([4]));
    expect(rerolled.ok).toBe(true);
    if (!rerolled.ok) return;
    expect(rerolled.state.phase).toBe('build');
    expect((rerolled.state as GameState & { lastRoll: { dice: number[] } }).lastRoll).toEqual({ dice: [5] });
  });

  it('amusement-park: keepRoll proceeds without rerolling', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['amusement-park'] }, { id: 'b', coins: 0 }]);
    const rolled = apply(state, { type: 'roll' }, seqRng([2]));
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('decideReroll');

    const kept = apply(rolled.state, { type: 'keepRoll' }, constRng(0));
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.state.phase).toBe('build');
    expect((kept.state as GameState & { lastRoll: { dice: number[] } }).lastRoll).toEqual({ dice: [3] });
  });

  it('harbor: pauses when sum >= 10, harborAdd applies +2 before income', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station', 'harbor'], establishments: [{ id: 'apple-orchard' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([3, 5])); // 4 + 6 = 10
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('decideHarbor');

    const added = apply(rolled.state, { type: 'harborAdd' }, constRng(0));
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.state.phase).toBe('build');
    // sum becomes 12: apple-orchard (die 10) should NOT fire since the final sum is 12.
    expect(players(added.state)[0].coins).toBe(0);
  });

  it('harbor: harborSkip keeps the original sum', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['station', 'harbor'], establishments: [{ id: 'apple-orchard' }] },
      { id: 'b', coins: 0 },
    ]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([3, 5])); // 4 + 6 = 10
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;

    const skipped = apply(rolled.state, { type: 'harborSkip' }, constRng(0));
    expect(skipped.ok).toBe(true);
    if (!skipped.ok) return;
    expect(skipped.state.phase).toBe('build');
    // sum stays 10: apple-orchard (die 10) fires, unlike the harborAdd case where sum becomes 12.
    expect(players(skipped.state)[0].coins).toBe(3);
  });

  it('mall: +1 income for cup/shop-icon establishments', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['mall'], establishments: [{ id: 'bakery' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, constRng(2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(2); // 1 base + 1 mall bonus
  });

  it('tv-tower: doubles on kept dice grant one extra turn, no chain', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['station', 'tv-tower'] }, { id: 'b', coins: 0 }]);
    const chosen = apply(state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const rolled = apply(chosen.state, { type: 'roll' }, seqRng([2, 2])); // 3 + 3, a double
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.state.phase).toBe('build');

    const passed = apply(rolled.state, { type: 'passBuild' }, constRng(0));
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    expect(passed.state.phase).toBe('rolling');
    expect((passed.state as GameState & { activeIndex: number }).activeIndex).toBe(0);
    expect(passed.events.some((e) => (e as { type: string }).type === 'extraTurn')).toBe(true);

    // Second double in the extra turn must NOT grant a second extra turn (no chain).
    const chosenAgain = apply(passed.state, { type: 'chooseDiceCount', count: 2 }, constRng(0));
    expect(chosenAgain.ok).toBe(true);
    if (!chosenAgain.ok) return;
    const rolledAgain = apply(chosenAgain.state, { type: 'roll' }, seqRng([2, 2]));
    expect(rolledAgain.ok).toBe(true);
    if (!rolledAgain.ok) return;
    const passedAgain = apply(rolledAgain.state, { type: 'passBuild' }, constRng(0));
    expect(passedAgain.ok).toBe(true);
    if (!passedAgain.ok) return;
    expect((passedAgain.state as GameState & { activeIndex: number }).activeIndex).toBe(1);
    expect(passedAgain.events.some((e) => (e as { type: string }).type === 'extraTurn')).toBe(false);
  });

  it('airport: passBuild grants +10 coins', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['airport'] }, { id: 'b', coins: 0 }], { phase: 'build' });
    const result = apply(state, { type: 'passBuild' }, constRng(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(players(result.state)[0].coins).toBe(10);
  });

  it('city-hall: +1 when active enters build with 0 coins', () => {
    const state = makeState([{ id: 'a', coins: 0, built: ['city-hall'] }, { id: 'b', coins: 0 }]);
    const result = apply(state, { type: 'roll' }, constRng(5)); // die 6, nothing owned matches
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phase).toBe('build');
    expect(players(result.state)[0].coins).toBe(1);
  });

  it('bank: 1/10000 edge event skips normal income and pays the owner +3', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['bank'], establishments: [{ id: 'wheat-field' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, seqRng([0, 0])); // die 1, then the edge check returns 0
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.some((e) => (e as { type: string }).type === 'bankEdge')).toBe(true);
    expect(players(result.state)[0].coins).toBe(3);
  });

  it('bank: without the 1/10000 edge, normal income still applies', () => {
    const state = makeState([
      { id: 'a', coins: 0, built: ['bank'], establishments: [{ id: 'wheat-field' }] },
      { id: 'b', coins: 0 },
    ]);
    const result = apply(state, { type: 'roll' }, seqRng([0, 1])); // die 1, edge check returns 1 (no edge)
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.some((e) => (e as { type: string }).type === 'bankEdge')).toBe(false);
    expect(players(result.state)[0].coins).toBe(1); // wheat-field fires normally
  });
});
