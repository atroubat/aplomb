import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate.js';
import {
  toMonthlyAmount,
  getChargeAmountForMonth,
  isActiveInMonth,
  getEffectiveMonthlyIncome,
  getMissingVariableIncomeIds,
  getPersonMonthSavings,
} from '../src/utils/monthly-calc.js';

describe('toMonthlyAmount', () => {
  it('converts frequencies to monthly', () => {
    expect(toMonthlyAmount(100, 'monthly')).toBe(100);
    expect(toMonthlyAmount(300, 'quarterly')).toBe(100);
    expect(toMonthlyAmount(1200, 'yearly')).toBe(100);
  });
});

describe('common savings attribution', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    db.prepare(`INSERT INTO persons (id, name, color) VALUES (1, 'A', '#000'), (2, 'B', '#fff')`).run();
    db.prepare(`INSERT INTO savings (id, label, type, is_common) VALUES (1, 'Commun', 'livret', 1)`).run();
  });

  it('does not count a household deposit in either personal total', () => {
    db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, person_id) VALUES (1, 'deposit', 300, '2026-08-10', NULL)`).run();
    expect(getPersonMonthSavings(db, 2026, 8, 1, 0)).toBe(0);
    expect(getPersonMonthSavings(db, 2026, 8, 2, 0)).toBe(0);
  });

  it('counts an explicitly attributed common deposit only for that person', () => {
    db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, person_id) VALUES (1, 'deposit', 125, '2026-08-10', 1)`).run();
    expect(getPersonMonthSavings(db, 2026, 8, 1, 0)).toBe(125);
    expect(getPersonMonthSavings(db, 2026, 8, 2, 0)).toBe(0);
  });
});

describe('getChargeAmountForMonth', () => {
  it('smoothed (default) returns monthly equivalent every month', () => {
    const c = { amount: 1200, frequency: 'yearly' as const };
    expect(getChargeAmountForMonth(c, 2026, 3)).toBe(100);
    expect(getChargeAmountForMonth(c, 2026, 7)).toBe(100);
  });

  it('cash-flow yearly falls only on the anchor month', () => {
    const c = { amount: 1200, frequency: 'yearly' as const, is_smoothed: 0, start_date: '2025-04-15' };
    expect(getChargeAmountForMonth(c, 2026, 4)).toBe(1200);
    expect(getChargeAmountForMonth(c, 2026, 5)).toBe(0);
  });

  it('cash-flow quarterly falls every 3 months from anchor', () => {
    const c = { amount: 300, frequency: 'quarterly' as const, is_smoothed: 0, start_date: '2025-02-01' };
    expect(getChargeAmountForMonth(c, 2026, 2)).toBe(300);  // anchor
    expect(getChargeAmountForMonth(c, 2026, 5)).toBe(300);  // +3
    expect(getChargeAmountForMonth(c, 2026, 3)).toBe(0);
  });

  it('cash-flow yearly defaults to January when no start_date', () => {
    const c = { amount: 600, frequency: 'yearly' as const, is_smoothed: 0 };
    expect(getChargeAmountForMonth(c, 2026, 1)).toBe(600);
    expect(getChargeAmountForMonth(c, 2026, 2)).toBe(0);
  });
});

describe('isActiveInMonth', () => {
  it('respects isActive flag', () => {
    expect(isActiveInMonth({ isActive: 0, startDate: null, endDate: null }, 2026, 6)).toBe(false);
    expect(isActiveInMonth({ isActive: 1, startDate: null, endDate: null }, 2026, 6)).toBe(true);
  });

  it('respects start and end bounds (inclusive on the anchor month)', () => {
    const item = { isActive: 1, startDate: '2026-03-01', endDate: '2026-08-01' };
    expect(isActiveInMonth(item, 2026, 2)).toBe(false); // before start
    expect(isActiveInMonth(item, 2026, 3)).toBe(true);  // start month
    expect(isActiveInMonth(item, 2026, 8)).toBe(true);  // end month
    expect(isActiveInMonth(item, 2026, 9)).toBe(false); // after end
  });
});

describe('income helpers (db-backed)', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    db.prepare(`INSERT INTO persons (id, name, color) VALUES (1, 'A', '#000')`).run();
  });

  it('fixed income returns monthly equivalent', () => {
    const income = { id: 1, amount: 1200, frequency: 'yearly' as const, is_variable: 0 };
    expect(getEffectiveMonthlyIncome(db, income, 2026, 5)).toBe(100);
  });

  it('fixed income can be temporarily overridden for one month', () => {
    db.prepare(`INSERT INTO incomes (id, person_id, label, amount, frequency, is_variable) VALUES (12, 1, 'Salaire', 2400, 'monthly', 0)`).run();
    db.prepare(`INSERT INTO income_overrides (income_id, year, month, amount) VALUES (12, 2026, 8, 1650)`).run();
    const income = { id: 12, amount: 2400, frequency: 'monthly' as const, is_variable: 0 };
    expect(getEffectiveMonthlyIncome(db, income, 2026, 8)).toBe(1650);
    expect(getEffectiveMonthlyIncome(db, income, 2026, 9)).toBe(2400);
  });

  it('variable income with no override for the month returns 0', () => {
    const income = { id: 1, amount: 999, frequency: 'monthly' as const, is_variable: 1 };
    expect(getEffectiveMonthlyIncome(db, income, 2026, 5)).toBe(0);
  });

  it('variable income uses the override amount when present', () => {
    db.prepare(`INSERT INTO incomes (id, person_id, label, amount, frequency, is_variable) VALUES (10, 1, 'Freelance', 0, 'monthly', 1)`).run();
    db.prepare(`INSERT INTO income_overrides (income_id, year, month, amount) VALUES (10, 2026, 5, 1750)`).run();
    const income = { id: 10, amount: 0, frequency: 'monthly' as const, is_variable: 1 };
    expect(getEffectiveMonthlyIncome(db, income, 2026, 5)).toBe(1750);
    expect(getEffectiveMonthlyIncome(db, income, 2026, 6)).toBe(0);
  });

  it('getMissingVariableIncomeIds lists variable incomes lacking an override', () => {
    db.prepare(`INSERT INTO incomes (id, person_id, label, amount, frequency, is_variable, is_active) VALUES (10, 1, 'Var', 0, 'monthly', 1, 1)`).run();
    db.prepare(`INSERT INTO incomes (id, person_id, label, amount, frequency, is_variable, is_active) VALUES (11, 1, 'Fixed', 2000, 'monthly', 0, 1)`).run();
    expect(getMissingVariableIncomeIds(db, 2026, 5)).toEqual([10]);
    db.prepare(`INSERT INTO income_overrides (income_id, year, month, amount) VALUES (10, 2026, 5, 500)`).run();
    expect(getMissingVariableIncomeIds(db, 2026, 5)).toEqual([]);
  });
});
