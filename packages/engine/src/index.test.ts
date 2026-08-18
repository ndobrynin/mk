import { describe, expect, it } from 'vitest';
import { apply, setup, type Command, type GameState, type Player, type Rng } from './index.js';

describe('@kidagrad/engine', () => {
  it('exports apply', () => {
    expect(typeof apply).toBe('function');
  });

  it('apply returns not implemented for passBuild', () => {
    const state: GameState = { version: 1, phase: 'rolling', players: [] };
    const rng: Rng = { nextInt: () => 0 };

    const result = apply(state, { type: 'passBuild' }, rng);

    expect(result).toEqual({ ok: false, error: 'not implemented' });
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
    expect(result.state.phase).toBe('income');
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
});
