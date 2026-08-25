import { describe, it, expect } from 'vitest';
import { computeHouseholdSplit } from '../src/utils/household-split.js';

const mkPerson = (id: number, income: number) => ({
  id, name: `P${id}`, color: '#000', avatar: null, effectiveIncome: income,
});

describe('computeHouseholdSplit', () => {
  it('splits proportionally to income', () => {
    const res = computeHouseholdSplit([mkPerson(1, 3000), mkPerson(2, 1000)], 800);
    expect(res.totalHouseholdIncome).toBe(4000);
    expect(res.persons[0].sharePercent).toBe(75);
    expect(res.persons[1].sharePercent).toBe(25);
    expect(res.persons[0].commonChargeShare).toBe(600);
    expect(res.persons[1].commonChargeShare).toBe(200);
  });

  it('splits equally when total income is zero', () => {
    const res = computeHouseholdSplit([mkPerson(1, 0), mkPerson(2, 0)], 100);
    expect(res.persons[0].commonChargeShare).toBe(50);
    expect(res.persons[1].commonChargeShare).toBe(50);
  });

  it('largest-remainder: shares always sum exactly to total charges', () => {
    // 100 / 3 = 33.33... — naive rounding would drift; largest-remainder must not.
    const res = computeHouseholdSplit(
      [mkPerson(1, 1000), mkPerson(2, 1000), mkPerson(3, 1000)],
      100,
    );
    const sum = res.persons.reduce((s, p) => s + p.commonChargeShare, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('handles the classic 0.01 cent-distribution case', () => {
    const res = computeHouseholdSplit(
      [mkPerson(1, 1), mkPerson(2, 1), mkPerson(3, 1)],
      0.1,
    );
    const cents = res.persons.map((p) => Math.round(p.commonChargeShare * 100));
    expect(cents.reduce((a, b) => a + b, 0)).toBe(10); // 10 cents distributed exactly
  });

  it('returns empty split for no persons', () => {
    const res = computeHouseholdSplit([], 500);
    expect(res.persons).toHaveLength(0);
    expect(res.totalCommonCharges).toBe(500);
  });
});
