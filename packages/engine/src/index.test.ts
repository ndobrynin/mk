import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { apply, setup, type Command, type GameState, type Player, type Rng } from './index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): GameState {
  const raw = readFileSync(path.join(dirname, '..', 'test', 'fixtures', name), 'utf-8');
  return JSON.parse(raw) as GameState;
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

    expect(result.events).toEqual([{ type: 'diceRolled', dice: [1] }]);
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

    const players = state.players as Player[];
    for (const player of players) {
      expect(player.coins).toBe(3);
    }
  });

  it('setup gives each player wheat-field and bakery establishments', () => {
    const state = setup(['p1', 'p2']);
    const players = state.players as Player[];

    for (const player of players) {
      expect(player.establishments).toEqual(['wheat-field', 'bakery']);
    }
  });

  it('setup gives each player 9 unconstructed landmarks', () => {
    const state = setup(['p1', 'p2']);
    const players = state.players as Player[];

    for (const player of players) {
      expect(player.landmarks).toHaveLength(9);
      expect(player.landmarks.map((l) => l.id)).toEqual([
        'harbor',
        'station',
        'mall',
        'tv-tower',
        'amusement-park',
        'aqua-park',
        'airport',
        'bank',
        'city-hall',
      ]);
      expect(player.landmarks.every((l) => l.constructed === false)).toBe(true);
    }
  });

  it('setup creates three players, each with 3 coins, establishments, and 9 landmarks', () => {
    const state = setup(['p1', 'p2', 'p3']);

    expect(state.players).toHaveLength(3);

    const players = state.players as Player[];
    expect(players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    for (const player of players) {
      expect(player.coins).toBe(3);
      expect(player.establishments).toEqual(['wheat-field', 'bakery']);
      expect(player.landmarks).toHaveLength(9);
      expect(player.landmarks.every((l) => l.constructed === false)).toBe(true);
    }
  });

  it('setup creates four players, each with 3 coins, establishments, and 9 landmarks', () => {
    const state = setup(['p1', 'p2', 'p3', 'p4']);

    expect(state.players).toHaveLength(4);

    const players = state.players as Player[];
    expect(players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    for (const player of players) {
      expect(player.coins).toBe(3);
      expect(player.establishments).toEqual(['wheat-field', 'bakery']);
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
    const rng: Rng = { nextInt: () => 0 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const players = result.state.players as Player[];
    expect(players.map((p) => p.coins)).toEqual([4, 4]);
    expect(result.state.phase).toBe('build');
  });

  it('rng 1 (die 2): bakery pays only the active player, 3 -> 4, opponent stays 3', () => {
    const state = setup(['a', 'b']);
    const rng: Rng = { nextInt: () => 1 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const players = result.state.players as Player[];
    expect(players.map((p) => p.coins)).toEqual([4, 3]);
    expect(result.state.phase).toBe('build');
  });

  it('rng 3 (die 4): no wheat-field/bakery/cafe income, both players stay at 3', () => {
    const state = setup(['a', 'b']);
    const rng: Rng = { nextInt: () => 3 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const players = result.state.players as Player[];
    expect(players.map((p) => p.coins)).toEqual([3, 3]);
    expect(result.state.phase).toBe('build');
  });

  it('cafe income (die 3): active pays cafe owner in full, from cafe-one-coin.json fixture', () => {
    const state = loadFixture('cafe-one-coin.json');
    const rng: Rng = { nextInt: () => 2 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const players = result.state.players as Player[];
    expect(players.map((p) => p.coins)).toEqual([1, 4]);
  });

  it('cafe income (die 3): debt beyond active coins burns, from cafe-zero-coins.json fixture', () => {
    const state = loadFixture('cafe-zero-coins.json');
    const rng: Rng = { nextInt: () => 2 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const players = result.state.players as Player[];
    expect(players.map((p) => p.coins)).toEqual([1, 3]);
  });

  it('setup -> roll -> passBuild: turn passes to player 1, activeIndex wraps 0 -> 1 -> 0', () => {
    const initial = setup(['a', 'b']);
    const rng: Rng = { nextInt: () => 3 };

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
    const rng: Rng = { nextInt: () => 0 };

    const result = apply(state, { type: 'passBuild' }, rng);

    expect(result.ok).toBe(false);
  });
});
