import { describe, expect, it } from 'vitest';
import { apply, chooseBotCommand, setup, type GameState, type Landmark, type Player, type Rng } from './index.js';

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

function makePlayer(id: string, coins: number): Player {
  const landmarks: Landmark[] = LANDMARK_IDS.map((landmarkId) => ({
    id: landmarkId,
    constructed: false,
  }));
  return {
    id,
    coins,
    establishments: [{ id: 'wheat-field' }, { id: 'bakery' }],
    landmarks,
  };
}

function makeBuildState(coins: number, market: Record<string, number> = {}): GameState {
  return {
    version: 1,
    phase: 'build',
    activeIndex: 0,
    market,
    players: [makePlayer('a', coins), makePlayer('b', 3)],
  };
}

function constRng(value: number): Rng {
  return { nextInt: () => value };
}

describe('chooseBotCommand', () => {
  it('returns a command that apply accepts on the active player turn', () => {
    const state = setup(['a', 'b']);
    const command = chooseBotCommand(state, 'a');
    const result = apply(state, command, constRng(0));
    expect(result.ok).toBe(true);
  });

  it('from rolling chooses roll, not a dice count', () => {
    const state = setup(['a', 'b']);
    expect(chooseBotCommand(state, 'a')).toEqual({ type: 'roll' });
  });

  it('from build with no affordable buy chooses passBuild', () => {
    const state = makeBuildState(0);
    const command = chooseBotCommand(state, 'a');
    expect(command).toEqual({ type: 'passBuild' });
    const result = apply(state, command, constRng(0));
    expect(result.ok).toBe(true);
  });
});
