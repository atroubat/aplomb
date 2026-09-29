import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { runMigrations } from '../src/db/migrate.js';
import { incomesRoutes } from '../src/routes/incomes.js';
import { savingsRoutes } from '../src/routes/savings.js';
import { getEffectiveMonthlyIncome } from '../src/utils/monthly-calc.js';

describe('income revisions and savings transaction corrections', () => {
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    db = new Database(':memory:');
    runMigrations(db);
    db.prepare(`INSERT INTO persons (id, name, color) VALUES (1, 'Rouné', '#6366f1')`).run();
    app = Fastify();
    await incomesRoutes(app, db);
    await savingsRoutes(app, db);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('versions an income from the selected month without changing past calculations', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/incomes',
      payload: {
        personId: 1, label: 'Salaire', amount: 2500, frequency: 'monthly',
        isActive: 1, isVariable: 0,
      },
    });
    const income = created.json() as { id: number };

    const revision = await app.inject({
      method: 'POST',
      url: `/api/incomes/${income.id}/revisions`,
      payload: {
        personId: 1, label: 'Salaire', amount: 2700, frequency: 'monthly',
        isActive: 1, isVariable: 0, effectiveFrom: '2026-09',
      },
    });

    expect(revision.statusCode).toBe(201);
    const revised = revision.json() as { id: number; start_date: string };
    expect(revised.start_date).toBe('2026-09-01');

    const previous = db.prepare(`SELECT * FROM incomes WHERE id = ?`).get(income.id) as {
      end_date: string; amount: number; frequency: 'monthly'; is_variable: number;
    };
    expect(previous.end_date).toBe('2026-08-31');
    expect(getEffectiveMonthlyIncome(db, { id: income.id, amount: previous.amount, frequency: previous.frequency, is_variable: previous.is_variable }, 2026, 8)).toBe(2500);
    expect(getEffectiveMonthlyIncome(db, { id: revised.id, amount: 2700, frequency: 'monthly', is_variable: 0 }, 2026, 9)).toBe(2700);
  });

  it('allows correcting the date of an existing savings transaction', async () => {
    const savings = await app.inject({
      method: 'POST',
      url: '/api/savings',
      payload: { label: 'Livret A', type: 'livret', isCommon: 0, personId: 1 },
    });
    const savingsId = (savings.json() as { id: number }).id;
    const transaction = await app.inject({
      method: 'POST',
      url: `/api/savings/${savingsId}/transactions`,
      payload: { type: 'deposit', amount: 150, date: '2026-08-01' },
    });
    const transactionId = (transaction.json() as { id: number }).id;

    const corrected = await app.inject({
      method: 'PUT',
      url: `/api/savings/transactions/${transactionId}`,
      payload: { date: '2026-08-15' },
    });

    expect(corrected.statusCode).toBe(200);
    expect((corrected.json() as { date: string }).date).toBe('2026-08-15');
    expect(db.prepare(`SELECT date FROM savings_transactions WHERE id = ?`).get(transactionId)).toEqual({ date: '2026-08-15' });
  });
});
