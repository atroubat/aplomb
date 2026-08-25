import { describe, it, expect } from 'vitest';
import { computeAdvice } from '../src/utils/budget-methods.js';

describe('computeAdvice', () => {
  it('computes theoretical targets for 50-30-20', () => {
    const a = computeAdvice('50-30-20', 3000, 1500, 900, 600);
    expect(a.theoretical.needs.amount).toBe(1500);
    expect(a.theoretical.wants.amount).toBe(900);
    expect(a.theoretical.savings.amount).toBe(600);
    expect(a.gaps.needs.status).toBe('ok');
    expect(a.gaps.savings.status).toBe('ok');
  });

  it('computes theoretical targets for 75-15-10', () => {
    const a = computeAdvice('75-15-10', 2000, 0, 0, 0);
    expect(a.theoretical.needs.amount).toBe(1500);
    expect(a.theoretical.wants.amount).toBe(200);
    expect(a.theoretical.savings.amount).toBe(300);
  });

  it('flags over-budget needs and under-target savings', () => {
    const a = computeAdvice('50-30-20', 2000, 1400, 500, 100);
    expect(a.gaps.needs.status).toBe('over');    // 1400 > 1000 target
    expect(a.gaps.savings.status).toBe('over');  // 100 < 400 target => flagged
    expect(a.tips.length).toBeGreaterThan(0);
  });

  it('avoids division by zero when income is 0', () => {
    const a = computeAdvice('50-30-20', 0, 0, 0, 0);
    expect(a.actual.needs.percentage).toBe(0);
    expect(a.tips.length).toBeGreaterThan(0);
  });

  it('congratulates when savings exceed target', () => {
    const a = computeAdvice('50-30-20', 2000, 800, 400, 800);
    expect(a.gaps.savings.amount).toBeGreaterThan(0);
    expect(a.tips.some((t) => /Bravo/i.test(t))).toBe(true);
  });
});
