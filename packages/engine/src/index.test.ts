import { describe, expect, it } from 'vitest';
import { apply } from './index.js';

describe('@kidagrad/engine', () => {
  it('exports apply', () => {
    expect(typeof apply).toBe('function');
  });
});
