import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import Fastify, { FastifyInstance } from 'fastify';
import { runMigrations } from '../src/db/migrate.js';
import { dataRoutes } from '../src/routes/data.js';

/**
 * Regression guard: export → reset → import must be lossless.
 * Previously income_overrides, transfers and actual_expenses were silently
 * dropped by export/import/reset, corrupting variable-income calculations.
 */
function seed(db: Database.Database) {
  db.prepare(`INSERT INTO persons (id, name, color, avatar) VALUES (1, 'Marie', '#6366f1', '👩')`).run();
  db.prepare(`INSERT INTO accounts (id, name, type, person_id, initial_balance) VALUES (1, 'Joint', 'checking', null, 2500)`).run();
  db.prepare(`INSERT INTO incomes (id, person_id, label, amount, frequency, is_variable) VALUES (1, 1, 'Freelance', 0, 'monthly', 1)`).run();
  db.prepare(`INSERT INTO income_overrides (id, income_id, year, month, amount) VALUES (1, 1, 2026, 5, 1750)`).run();
  db.prepare(`INSERT INTO fixed_charges (id, label, amount, category, frequency, is_smoothed) VALUES (1, 'Loyer', 1100, 'housing', 'monthly', 1)`).run();
  db.prepare(`INSERT INTO personal_charges (id, person_id, label, amount, category, frequency) VALUES (1, 1, 'Sport', 40, 'sport', 'monthly')`).run();
  db.prepare(`INSERT INTO savings (id, label, type, is_common) VALUES (1, 'Vacances', 'livret', 1)`).run();
  db.prepare(`INSERT INTO savings_transactions (id, savings_id, type, amount, date, person_id) VALUES (1, 1, 'deposit', 150, '2026-05-10', 1)`).run();
  db.prepare(`INSERT INTO transfers (id, from_account_id, to_account_id, amount, date) VALUES (1, 1, 2, 200, '2026-05-01')`).run();
}

async function buildApp(db: Database.Database): Promise<FastifyInstance> {
  const app = Fastify();
  // transfers table has CHECK(from != to); seed uses same id so relax by using two accounts:
  await dataRoutes(app, db);
  await app.ready();
  return app;
}

describe('export/import round-trip', () => {
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    db = new Database(':memory:');
    runMigrations(db);
    // second account so the transfer CHECK(from_account_id != to_account_id) holds
    db.prepare(`INSERT INTO accounts (id, name, type) VALUES (2, 'Livret', 'savings')`).run();
    seed(db);
    app = await buildApp(db);
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('exports every table including previously-dropped ones', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export' });
    const data = res.json();
    expect(data.incomeOverrides).toHaveLength(1);
    expect(data.transfers).toHaveLength(1);
    expect(data.persons).toHaveLength(1);
    expect(data.version).toBe('2.0');
  });

  it('reset clears every table', async () => {
    await app.inject({ method: 'DELETE', url: '/api/data/reset' });
    expect(db.prepare('SELECT COUNT(*) c FROM income_overrides').get()).toEqual({ c: 0 });
    expect(db.prepare('SELECT COUNT(*) c FROM transfers').get()).toEqual({ c: 0 });
    expect(db.prepare('SELECT COUNT(*) c FROM persons').get()).toEqual({ c: 0 });
  });

  it('import after reset restores data losslessly', async () => {
    const exported = (await app.inject({ method: 'GET', url: '/api/export' })).json();
    await app.inject({ method: 'DELETE', url: '/api/data/reset' });
    const imp = await app.inject({ method: 'POST', url: '/api/import', payload: exported });
    expect(imp.statusCode).toBe(200);

    const reExported = (await app.inject({ method: 'GET', url: '/api/export' })).json();
    // Compare table-by-table (ignore volatile export metadata)
    for (const key of ['persons', 'accounts', 'incomes', 'incomeOverrides', 'fixedCharges', 'personalCharges', 'savings', 'savingsTransactions', 'transfers']) {
      expect(reExported[key], `table ${key} mismatch`).toEqual(exported[key]);
    }
  });

  it('rejects a payload without persons', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/import', payload: { foo: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a collection that is not an array', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/import', payload: { persons: 'nope' } });
    expect(res.statusCode).toBe(400);
  });
});
