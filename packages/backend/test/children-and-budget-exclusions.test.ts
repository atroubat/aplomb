import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { runMigrations } from '../src/db/migrate.js';
import { personsRoutes } from '../src/routes/persons.js';
import { accountsRoutes } from '../src/routes/accounts.js';
import { savingsRoutes } from '../src/routes/savings.js';
import { dashboardRoutes } from '../src/routes/dashboard.js';
import { adviceRoutes } from '../src/routes/advice.js';
import { incomesRoutes } from '../src/routes/incomes.js';
import { dataRoutes } from '../src/routes/data.js';

describe('children and savings outside the budget', () => {
  let db: Database.Database;
  let app: FastifyInstance;
  const dashboard = (personId?: number) => app.inject(`/api/dashboard?year=2026&month=10${personId ? `&person_id=${personId}` : ''}`);
  const advice = () => app.inject('/api/advice?year=2026&month=10&person_id=1');
  const deposit = (savingsId: number, amount: number, extra: object = {}) => app.inject({
    method: 'POST', url: `/api/savings/${savingsId}/transactions`,
    payload: { type: 'deposit', amount, date: '2026-10-10', ...extra },
  });

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.exec(`
      INSERT INTO persons (id, name, color, role) VALUES
        (1, 'Adult A', '#4F55F1', 'adult'), (2, 'Adult B', '#E61E49', 'adult'), (3, 'Child', '#007BC2', 'child');
      INSERT INTO incomes (id, person_id, label, amount, frequency) VALUES
        (1, 1, 'Salary', 2000, 'monthly'), (2, 2, 'Salary', 2000, 'monthly');
      INSERT INTO fixed_charges (label, amount, category, frequency) VALUES ('Rent', 1000, 'housing', 'monthly');
      INSERT INTO savings (id, label, type, person_id, is_common, target_amount) VALUES
        (1, 'Personal', 'livret', 1, 0, NULL), (2, 'Common', 'livret', NULL, 1, NULL),
        (3, 'Child savings', 'livret', 3, 0, 12000);
    `);
    app = Fastify();
    app.setErrorHandler((error, _req, reply) => reply.code(error.name === 'ZodError' ? 400 : 500).send({ error: error.message }));
    for (const routes of [personsRoutes, accountsRoutes, savingsRoutes, dashboardRoutes, adviceRoutes, incomesRoutes, dataRoutes]) {
      await routes(app, db);
    }
    await app.ready();
  });

  afterEach(async () => { await app.close(); db.close(); });

  it('creates a child and assigns accounts and savings without changing budget or advice', async () => {
    const before = (await dashboard()).json();
    const beforeAdvice = (await advice()).json();
    const person = await app.inject({ method: 'POST', url: '/api/persons', payload: { name: 'Baby', color: '#007BC2', role: 'child' } });
    expect(person.statusCode).toBe(201);
    expect(person.json().role).toBe('child');
    const pid = person.json().id;
    const account = await app.inject({ method: 'POST', url: '/api/accounts', payload: { name: 'Baby account', type: 'savings', personId: pid } });
    expect(account.statusCode).toBe(201);
    expect(account.json().person_id).toBe(pid);
    const product = await app.inject({ method: 'POST', url: '/api/savings', payload: { label: 'Baby book', type: 'livret', personId: pid, accountId: account.json().id } });
    expect(product.statusCode).toBe(201);
    await deposit(product.json().id, 300, { personId: 1 });
    expect((await dashboard()).json()).toEqual(before);
    expect((await advice()).json()).toEqual(beforeAdvice);
    const products = (await app.inject('/api/savings')).json();
    expect(products.find((p: { id: number }) => p.id === product.json().id).balance).toBe(300);
  });

  it('defaults existing/new people to adults and preserves a child role in partial updates', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/persons', payload: { name: 'Adult C', color: '#007BC2' } });
    expect(created.json().role).toBe('adult');
    const edited = await app.inject({ method: 'PUT', url: '/api/persons/3', payload: { name: 'New child name' } });
    expect(edited.json().role).toBe('child');
    expect((await app.inject({ method: 'POST', url: '/api/persons', payload: { name: 'Invalid', color: '#007BC2', role: 'unknown' } })).statusCode).toBe(400);
  });

  it('excludes child income, charges, alerts and goals even in legacy/imported data', async () => {
    const before = (await dashboard()).json();
    const beforeAdvice = (await advice()).json();
    db.exec(`
      INSERT INTO incomes (person_id, label, amount, frequency) VALUES (3, 'Child income', 500, 'monthly');
      INSERT INTO incomes (person_id, label, amount, frequency, is_variable) VALUES (3, 'Child variable', 100, 'monthly', 1);
      INSERT INTO personal_charges (person_id, label, amount, category, frequency) VALUES (3, 'Child charge', 100, 'health', 'monthly');
    `);
    await deposit(3, 500, { personId: 1 });
    await deposit(2, 50, { personId: 3 });
    const after = (await dashboard()).json();
    expect(after.kpis).toEqual(before.kpis);
    expect(after.household_split).toEqual(before.household_split);
    expect(after.household_split.persons.map((p: { personId: number }) => p.personId)).toEqual([1, 2]);
    expect(after.savings_goal_progress).toEqual(before.savings_goal_progress);
    expect(after.missing_variable_income_ids).toEqual([]);
    expect((await advice()).json()).toEqual(beforeAdvice);
    expect((await app.inject('/api/incomes/effective?year=2026&month=10')).json().total).toBe(4000);
    expect((await app.inject('/api/incomes/history?year_from=2026&month_from=10&year_to=2026&month_to=10')).json().history[0].total).toBe(4000);
    expect((await dashboard(3)).statusCode).toBe(400);
    expect((await app.inject('/api/advice?person_id=3')).statusCode).toBe(400);
  });

  it('counts normal personal/common deposits but not gifts in monthly budgets or advice', async () => {
    await deposit(1, 100);
    await deposit(2, 80, { personId: 1 });
    await deposit(2, 40);
    const personalBefore = (await dashboard(1)).json();
    const householdBefore = (await dashboard()).json();
    const adviceBefore = (await advice()).json();
    expect(personalBefore.kpis.total_savings).toBe(180);
    expect(householdBefore.kpis.total_savings).toBe(220);
    await deposit(1, 1000, { isExcludedFromBudget: 1 });
    await deposit(2, 600, { personId: 1, isExcludedFromBudget: 1 });
    await deposit(2, 400, { isExcludedFromBudget: 1 });
    expect((await dashboard(1)).json().kpis).toEqual(personalBefore.kpis);
    expect((await dashboard()).json().kpis).toEqual(householdBefore.kpis);
    expect((await advice()).json()).toEqual(adviceBefore);
    expect((await app.inject('/api/savings/1')).json().balance).toBe(1100);
    expect((await dashboard(1)).json().savings_evolution.at(-1).total).toBe(1100);
  });

  it('can toggle an existing deposit out of and back into the budget without changing balance', async () => {
    const tx = (await deposit(1, 200)).json();
    expect(tx.is_excluded_from_budget).toBe(0);
    await app.inject({ method: 'PUT', url: `/api/savings/transactions/${tx.id}`, payload: { isExcludedFromBudget: 1 } });
    expect((await dashboard(1)).json().kpis.total_savings).toBe(0);
    const edited = await app.inject({ method: 'PUT', url: `/api/savings/transactions/${tx.id}`, payload: { date: '2026-10-12' } });
    expect(edited.json().is_excluded_from_budget).toBe(1);
    expect((await app.inject('/api/savings/1')).json().balance).toBe(200);
    await app.inject({ method: 'PUT', url: `/api/savings/transactions/${tx.id}`, payload: { isExcludedFromBudget: 0 } });
    expect((await dashboard(1)).json().kpis.total_savings).toBe(200);
  });

  it('keeps gifts withdrawable and prevents overdrawing the full product balance', async () => {
    await deposit(1, 200, { isExcludedFromBudget: 1 });
    const withdraw = (amount: number) => app.inject({ method: 'POST', url: '/api/savings/1/transactions', payload: { type: 'withdrawal', amount, date: '2026-10-12' } });
    expect((await withdraw(50)).statusCode).toBe(201);
    expect((await withdraw(151)).statusCode).toBe(400);
    expect((await app.inject('/api/savings/1')).json().balance).toBe(150);
  });

  it('includes children in the savings page history, not the budget history', async () => {
    await deposit(1, 100);
    await deposit(3, 500);
    const history = (await app.inject('/api/savings/evolution?year=2026&month=10')).json();
    expect(history).toHaveLength(12);
    expect(history[0].month).toBe('2025-11');
    expect(history.at(-1)).toEqual({ month: '2026-10', total: 600 });
    expect((await dashboard()).json().savings_evolution.at(-1).total).toBe(100);
  });

  it('round-trips child roles and excluded deposits and accepts old exports', async () => {
    await deposit(1, 400, { isExcludedFromBudget: 1 });
    const exported = (await app.inject('/api/export')).json();
    expect((await app.inject({ method: 'POST', url: '/api/import', payload: exported })).statusCode).toBe(200);
    const restored = (await app.inject('/api/export')).json();
    expect(restored.persons).toEqual(exported.persons);
    expect(restored.savingsTransactions).toEqual(exported.savingsTransactions);
    for (const row of exported.persons) delete row.role;
    for (const row of exported.savingsTransactions) delete row.is_excluded_from_budget;
    expect((await app.inject({ method: 'POST', url: '/api/import', payload: exported })).statusCode).toBe(200);
    expect((await app.inject('/api/persons')).json().every((p: { role: string }) => p.role === 'adult')).toBe(true);
    expect((await app.inject('/api/savings/1/transactions')).json()[0].is_excluded_from_budget).toBe(0);
  });

  it('migrates an old database without changing existing people or deposits', () => {
    const legacy = new Database(':memory:');
    try {
      legacy.exec(`CREATE TABLE persons (id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, avatar TEXT, created_at TEXT);
        INSERT INTO persons VALUES (1, 'Original', '#007BC2', NULL, '2026-01-01');
        CREATE TABLE savings_transactions (id INTEGER PRIMARY KEY, savings_id INTEGER, type TEXT, amount REAL, date TEXT, reason TEXT, note TEXT, created_at TEXT);
        INSERT INTO savings_transactions VALUES (1, 1, 'deposit', 123, '2026-01-01', NULL, NULL, NULL);`);
      runMigrations(legacy);
      runMigrations(legacy);
      expect(legacy.prepare('SELECT name, role FROM persons').get()).toEqual({ name: 'Original', role: 'adult' });
      expect(legacy.prepare('SELECT amount, is_excluded_from_budget FROM savings_transactions').get()).toEqual({ amount: 123, is_excluded_from_budget: 0 });
    } finally { legacy.close(); }
  });
});
