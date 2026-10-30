import type Database from 'better-sqlite3';

/** Children can own accounts and savings, but never participate in the budget. */
export const BUDGET_PERSON_IDS = "SELECT id FROM persons WHERE role = 'adult'";
export const BUDGET_SAVINGS_IDS = `SELECT id FROM savings WHERE
  is_common = 1 OR person_id IS NULL OR person_id IN (${BUDGET_PERSON_IDS})`;

/** Gifts stay in product balances/history without consuming monthly income. */
export const BUDGET_DEPOSIT_FILTER = `is_excluded_from_budget = 0
  AND savings_id IN (${BUDGET_SAVINGS_IDS})
  AND (person_id IS NULL OR person_id IN (${BUDGET_PERSON_IDS}))`;

export function isBudgetPerson(db: Database.Database, id: number): boolean {
  return !!db.prepare(`SELECT id FROM persons WHERE id = ? AND role = 'adult'`).get(id);
}

/** Balance history, including gifts; child-owned products are opt-in. */
export function getSavingsEvolution(db: Database.Database, year: number, month: number, personId?: number, includeChildren = false) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    const period = date.toISOString().slice(0, 7);
    const scope = personId
      ? 'savings_id IN (SELECT id FROM savings WHERE person_id = ? AND (is_common = 0 OR is_common IS NULL))'
      : includeChildren ? '1 = 1' : `savings_id IN (${BUDGET_SAVINGS_IDS})`;
    const row = db.prepare(`SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS total
      FROM savings_transactions WHERE date <= ? AND ${scope}`)
      .get(...(personId ? [`${period}-31`, personId] : [`${period}-31`])) as { total: number };
    return { month: period, total: row.total };
  });
}
