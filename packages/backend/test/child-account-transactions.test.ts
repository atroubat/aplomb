import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { runMigrations } from '../src/db/migrate.js';
import { savingsRoutes } from '../src/routes/savings.js';
import { dashboardRoutes } from '../src/routes/dashboard.js';
import { adviceRoutes } from '../src/routes/advice.js';
import { dataRoutes } from '../src/routes/data.js';

describe('movements on a child account entered in Settings', () => {
  let db: Database.Database;
  let app: FastifyInstance;
  const firstMovement = (payload: object = {}, accountId = 1) => app.inject({ method: 'POST', url: `/api/accounts/${accountId}/savings-transactions`,
    payload: { type: 'deposit', amount: 100, date: '2026-10-30', personId: 1, ...payload } });

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.exec(`INSERT INTO persons (id, name, color, role) VALUES (1, 'Adult', '#4F55F1', 'adult'), (2, 'Child', '#007BC2', 'child');
      INSERT INTO accounts (id, name, type, person_id, initial_balance) VALUES (1, 'Child book', 'savings', 2, 1375), (2, 'Adult account', 'savings', 1, 500);
      INSERT INTO incomes (person_id, label, amount, frequency) VALUES (1, 'Salary', 2500, 'monthly');`);
    app = Fastify();
    app.setErrorHandler((error, _req, reply) => reply.code(error.name === 'ZodError' ? 400 : 500).send({ error: error.message }));
    for (const routes of [savingsRoutes, dashboardRoutes, adviceRoutes, dataRoutes]) await routes(app, db);
    await app.ready();
  });
  afterEach(async () => { await app.close(); db.close(); });

  it('preserves the opening balance separately and records only the new deposit', async () => {
    const result = await firstMovement();
    expect(result.statusCode).toBe(201);
    const { savings, transaction } = result.json();
    expect(savings).toMatchObject({ account_id: 1, person_id: 2, is_common: 0, opening_balance: 1375, opening_balance_date: '2026-10-30', balance: 1475 });
    expect(transaction).toMatchObject({ savings_id: savings.id, type: 'deposit', amount: 100 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings_transactions').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT initial_balance FROM accounts WHERE id = 1').get()).toEqual({ initial_balance: 1375 });
  });

  it('reuses the linked product and never copies the opening balance twice', async () => {
    const first = (await firstMovement()).json();
    const second = (await firstMovement({ amount: 25 })).json();
    expect(second.savings.id).toBe(first.savings.id);
    expect(second.savings.balance).toBe(1500);
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings_transactions').get()).toEqual({ n: 2 });
  });

  it('allows withdrawals and corrections using the full opening-plus-movements balance', async () => {
    const { savings } = (await firstMovement()).json();
    const withdrawal = await app.inject({ method: 'POST', url: `/api/savings/${savings.id}/transactions`, payload: { type: 'withdrawal', amount: 1400, date: '2026-10-30' } });
    expect(withdrawal.statusCode).toBe(201);
    const edited = await app.inject({ method: 'PUT', url: `/api/savings/transactions/${withdrawal.json().id}`, payload: { amount: 1450 } });
    expect(edited.statusCode).toBe(200);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().balance).toBe(25);
    expect((await app.inject({ method: 'PUT', url: `/api/savings/transactions/${withdrawal.json().id}`, payload: { amount: 1476 } })).statusCode).toBe(400);
  });

  it('does not activate tracking when a first withdrawal exceeds the entered balance', async () => {
    expect((await firstMovement({ type: 'withdrawal', amount: 1376 })).statusCode).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings_transactions').get()).toEqual({ n: 0 });
    const success = await firstMovement({ type: 'withdrawal', amount: 75 });
    expect(success.statusCode).toBe(201);
    expect(success.json().savings.balance).toBe(1300);
  });

  it('leaves adult and household budgets and advice unchanged', async () => {
    const urls = ['/api/dashboard?year=2026&month=10', '/api/dashboard?year=2026&month=10&person_id=1', '/api/advice?year=2026&month=10&person_id=1'];
    const before = await Promise.all(urls.map(async url => (await app.inject(url)).json()));
    await firstMovement();
    const after = await Promise.all(urls.map(async url => (await app.inject(url)).json()));
    expect(after).toEqual(before);
  });

  it('includes the opening balance in Savings history without backfilling older periods', async () => {
    const { savings, transaction } = (await firstMovement()).json();
    const history = (await app.inject('/api/savings/evolution?year=2026&month=10')).json();
    expect(history.at(-2).total).toBe(0);
    expect(history.at(-1).total).toBe(1475);
    // Correcting the first movement to an earlier month moves the start of known history too.
    expect((await app.inject({ method: 'PUT', url: `/api/savings/transactions/${transaction.id}`, payload: { date: '2026-09-30' } })).statusCode).toBe(200);
    const corrected = (await app.inject('/api/savings/evolution?year=2026&month=10')).json();
    expect(corrected.at(-2).total).toBe(1475);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().balance).toBe(1475);
  });

  it('retains the opening balance after deleting the actual deposit', async () => {
    const { savings, transaction } = (await firstMovement()).json();
    expect((await app.inject({ method: 'DELETE', url: `/api/savings/transactions/${transaction.id}` })).statusCode).toBe(204);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().balance).toBe(1375);
  });

  it('preserves opening balances through backups and accepts old exports without the new fields', async () => {
    const { savings } = (await firstMovement()).json();
    const exported = (await app.inject('/api/export')).json();
    expect((await app.inject({ method: 'POST', url: '/api/import', payload: exported })).statusCode).toBe(200);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().balance).toBe(1475);
    delete exported.savings[0].opening_balance;
    delete exported.savings[0].opening_balance_date;
    expect((await app.inject({ method: 'POST', url: '/api/import', payload: exported })).statusCode).toBe(200);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().opening_balance).toBe(0);
  });

  it('rejects invalid accounts, dates, and conflicting ownership without creating products', async () => {
    expect((await firstMovement({}, 999)).statusCode).toBe(404);
    expect((await firstMovement({}, 2)).statusCode).toBe(400);
    expect((await firstMovement({ date: '2026-02-30' })).statusCode).toBe(400);
    db.exec(`INSERT INTO savings (label, type, account_id, person_id, is_common) VALUES ('Conflicting', 'livret', 1, 1, 0)`);
    expect((await firstMovement()).statusCode).toBe(409);
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings_transactions').get()).toEqual({ n: 0 });
  });

  it('rolls back product creation if the transaction cannot be stored', async () => {
    expect((await firstMovement({ personId: 999 })).statusCode).toBe(500);
    expect(db.prepare('SELECT COUNT(*) AS n FROM savings').get()).toEqual({ n: 0 });
  });

  it('rejects a correction or deletion that would make the remaining balance negative', async () => {
    const { savings, transaction } = (await firstMovement()).json();
    await app.inject({ method: 'POST', url: `/api/savings/${savings.id}/transactions`, payload: { type: 'withdrawal', amount: 1450, date: '2026-10-30' } });
    expect((await app.inject({ method: 'PUT', url: `/api/savings/transactions/${transaction.id}`, payload: { amount: 10 } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'DELETE', url: `/api/savings/transactions/${transaction.id}` })).statusCode).toBe(400);
    expect((await app.inject(`/api/savings/${savings.id}`)).json().balance).toBe(25);
  });
});
