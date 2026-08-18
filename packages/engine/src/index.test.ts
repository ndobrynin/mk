import { describe, expect, it } from 'vitest';
import { apply, type GameState, type Rng } from './index.js';

describe('@kidagrad/engine', () => {
  it('exports apply', () => {
    expect(typeof apply).toBe('function');
  });

  it('apply returns not implemented for any command', () => {
    const state: GameState = { version: 1, phase: 'rolling', players: [] };
    const rng: Rng = { nextInt: () => 0 };

    const result = apply(state, { type: 'roll' }, rng);

    expect(result).toEqual({ ok: false, error: 'not implemented' });
  });
});
