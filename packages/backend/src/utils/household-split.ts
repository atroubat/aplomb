import { round2 } from './money.js';

/**
 * Pro-rata household charge splitting with largest-remainder rounding.
 *
 * Each person pays a share of common fixed charges proportional to their
 * income relative to total household income.
 * If totalHouseholdIncome = 0, charges are split equally.
 *
 * Largest-remainder ensures the sum of all commonChargeShare values equals
 * totalCommonCharges exactly (no floating-point drift accumulation).
 */

export interface PersonSplit {
  personId: number;
  name: string;
  color: string;
  avatar: string | null;
  effectiveIncome: number;
  sharePercent: number;      // 0–100, display only
  commonChargeShare: number; // amount they owe toward fixed charges
}

export interface HouseholdSplit {
  totalHouseholdIncome: number;
  totalCommonCharges: number;
  persons: PersonSplit[];
}

export function computeHouseholdSplit(
  persons: Array<{ id: number; name: string; color: string; avatar: string | null; effectiveIncome: number }>,
  totalCommonCharges: number
): HouseholdSplit {
  const totalHouseholdIncome = persons.reduce((s, p) => s + p.effectiveIncome, 0);

  // Step 1 — compute raw (unrounded) ratio per person
  const rawShares = persons.map(p =>
    totalHouseholdIncome > 0
      ? p.effectiveIncome / totalHouseholdIncome
      : persons.length > 0 ? 1 / persons.length : 0
  );

  // Step 2 — largest-remainder algorithm to distribute cents exactly
  const targetCents = Math.round(totalCommonCharges * 100);
  const exactCents = rawShares.map(s => s * totalCommonCharges * 100);
  const floors = exactCents.map(c => Math.floor(c));
  const remainders = exactCents.map((c, i) => c - floors[i]);

  let leftover = targetCents - floors.reduce((a, b) => a + b, 0);
  const order = remainders
    .map((r, i) => ({ i, r }))
    .sort((a, b) => b.r - a.r);

  const centShares = [...floors];
  for (const { i } of order) {
    if (leftover <= 0) break;
    centShares[i]++;
    leftover--;
  }

  const personSplits: PersonSplit[] = persons.map((p, idx) => ({
    personId: p.id,
    name: p.name,
    color: p.color,
    avatar: p.avatar,
    effectiveIncome: round2(p.effectiveIncome),
    // Percentage is for display only — round after ratio computation, not before
    sharePercent: Math.max(0, Math.min(100, round2(rawShares[idx] * 100))),
    // Financial share derived from largest-remainder cents to ensure sum = totalCommonCharges
    commonChargeShare: round2(centShares[idx] / 100),
  }));

  return {
    totalHouseholdIncome: round2(totalHouseholdIncome),
    totalCommonCharges: round2(totalCommonCharges),
    persons: personSplits,
  };
}
