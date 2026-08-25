import type Database from 'better-sqlite3';

export type Frequency = 'monthly' | 'quarterly' | 'yearly';

export function toMonthlyAmount(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

/**
 * Returns the charge amount to use for a given month.
 *
 * - is_smoothed = 1 (default): always returns the monthly equivalent via toMonthlyAmount.
 * - is_smoothed = 0 (cash-flow mode): returns the full amount only in the month(s) the
 *   charge actually falls, 0 otherwise.  The anchor month is derived from start_date if
 *   present, otherwise defaults to January (month 1).
 */
export function getChargeAmountForMonth(
  charge: { amount: number; frequency: Frequency; is_smoothed?: number; start_date?: string | null },
  year: number,
  month: number
): number {
  if ((charge.is_smoothed ?? 1) === 1) {
    return toMonthlyAmount(charge.amount, charge.frequency);
  }

  // Cash-flow mode: charge only in falling months
  if (charge.frequency === 'monthly') return charge.amount;

  const anchorMonth = charge.start_date
    ? (new Date(charge.start_date).getMonth() + 1)  // getMonth() is 0-based
    : 1;

  if (charge.frequency === 'yearly') {
    return month === anchorMonth ? charge.amount : 0;
  }

  if (charge.frequency === 'quarterly') {
    // Falls every 3 months from the anchor month
    const diff = ((month - anchorMonth) % 12 + 12) % 12;
    return diff % 3 === 0 ? charge.amount : 0;
  }

  return toMonthlyAmount(charge.amount, charge.frequency);
}

export function isActiveInMonth(
  item: { isActive: number | null; startDate: string | null; endDate: string | null },
  year: number,
  month: number
): boolean {
  if (!item.isActive) return false;
  const date = new Date(year, month - 1, 1);
  if (item.startDate) {
    const start = new Date(item.startDate);
    if (date < new Date(start.getFullYear(), start.getMonth(), 1)) return false;
  }
  if (item.endDate) {
    const end = new Date(item.endDate);
    if (date > new Date(end.getFullYear(), end.getMonth(), 1)) return false;
  }
  return true;
}

/**
 * Returns the effective monthly income amount for a given income record.
 * If an override exists for (year, month), uses override.amount; otherwise uses base amount
 * converted to monthly equivalent.
 */
export function getEffectiveMonthlyIncome(
  db: Database.Database,
  income: { id: number; amount: number; frequency: Frequency; is_variable?: number },
  year: number,
  month: number
): number {
  const override = db.prepare<[number, number, number], { amount: number }>(
    `SELECT amount FROM income_overrides WHERE income_id = ? AND year = ? AND month = ?`
  ).get(income.id, year, month);
  if (override) return override.amount;
  if (income.is_variable) return 0;
  return toMonthlyAmount(income.amount, income.frequency);
}

/**
 * Returns savings deposits for a person in a given month.
 *
 * Rules:
 *  1. Personal savings (products owned by the person) — full amount.
 *  2. Common savings transactions explicitly attributed to the person (person_id = personId).
 *  3. Unattributed transactions (person_id IS NULL) are ignored — not counted for anyone.
 */
export function getPersonMonthSavings(
  db: Database.Database,
  year: number,
  month: number,
  personId: number,
  _proRataRatio: number,
): number {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end   = `${year}-${String(month).padStart(2, '0')}-31`;

  // 1. Personal savings products owned by this person
  const personalIds = (db.prepare<[number], { id: number }>(
    `SELECT id FROM savings WHERE person_id = ? AND (is_common = 0 OR is_common IS NULL)`
  ).all(personId)).map(r => r.id);

  let personal = 0;
  if (personalIds.length > 0) {
    const ph = personalIds.map(() => '?').join(',');
    personal = (db.prepare<unknown[], { total: number }>(`
      SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END), 0) as total
      FROM savings_transactions WHERE savings_id IN (${ph}) AND date >= ? AND date <= ?
    `).get(...personalIds, start, end))?.total ?? 0;
  }

  // 2 & 3. Common savings: attributed vs unattributed
  const commonIds = (db.prepare<[], { id: number }>(
    `SELECT id FROM savings WHERE is_common = 1`
  ).all()).map(r => r.id);

  let commonAttributed = 0;
  let commonUnattributed = 0;
  if (commonIds.length > 0) {
    const ph = commonIds.map(() => '?').join(',');
    commonAttributed = (db.prepare<unknown[], { total: number }>(`
      SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END), 0) as total
      FROM savings_transactions
      WHERE savings_id IN (${ph}) AND person_id = ? AND date >= ? AND date <= ?
    `).get(...commonIds, personId, start, end))?.total ?? 0;

  }

  return personal + commonAttributed;
}

/**
 * Returns variable income IDs missing an override for (year, month).
 * Single LEFT JOIN — no N+1 per variable income.
 */
export function getMissingVariableIncomeIds(
  db: Database.Database,
  year: number,
  month: number
): number[] {
  const rows = db.prepare<[number, number], { id: number }>(
    `SELECT i.id
     FROM incomes i
     LEFT JOIN income_overrides o
       ON o.income_id = i.id AND o.year = ? AND o.month = ?
     WHERE i.is_variable = 1 AND i.is_active = 1 AND o.id IS NULL`
  ).all(year, month);
  return rows.map(r => r.id);
}
