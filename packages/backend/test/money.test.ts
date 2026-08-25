import { describe, it, expect } from 'vitest';
import { round2, roundPercent } from '../src/utils/money.js';

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(1049.9999999998)).toBe(1050);
    expect(round2(1.005)).toBe(1.01); // Number.EPSILON edge case
    expect(round2(2.675)).toBe(2.68);
    expect(round2(0)).toBe(0);
    expect(round2(-3.144)).toBe(-3.14);
  });
});

describe('roundPercent', () => {
  it('clamps to [0, 100]', () => {
    expect(roundPercent(150)).toBe(100);
    expect(roundPercent(-10)).toBe(0);
    expect(roundPercent(33.3333)).toBe(33.33);
  });
});
