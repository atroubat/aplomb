/**
 * Financial rounding utilities.
 *
 * SQLite stores amounts as REAL (IEEE 754 double).  Pro-rata divisions and
 * floating-point arithmetic can produce values like 1049.9999999998.
 * Always pass results through `round2` before sending them to the frontend.
 *
 * Number.EPSILON ensures that values like 1.005 round to 1.01 rather than 1.00,
 * which is a known edge-case with naive Math.round.
 */

/** Round a financial value to 2 decimal places. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Clamp a percentage between 0 and 100 and round to 2 decimal places. */
export function roundPercent(value: number): number {
  return round2(Math.max(0, Math.min(100, value)));
}
