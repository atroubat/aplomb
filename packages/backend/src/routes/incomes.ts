import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { toMonthlyAmount, getEffectiveMonthlyIncome, getMissingVariableIncomeIds } from '../utils/monthly-calc.js';
import { isActiveInMonth } from '../utils/monthly-calc.js';

const IncomeSchema = z.object({
  personId: z.number().int().positive(),
  label: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  isVariable: z.number().int().min(0).max(1).optional().default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const OverrideSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().min(0),
  note: z.string().optional().nullable(),
});

type IncomeRow = {
  id: number;
  person_id: number;
  label: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  account_id: number | null;
  is_active: number;
  is_variable: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export async function incomesRoutes(app: FastifyInstance, db: Database.Database) {
  // ── INCOMES CRUD ──────────────────────────────────────────────────────────

  app.get('/api/incomes', async (req) => {
    const { person_id } = req.query as { person_id?: string };
    if (person_id) {
      return db.prepare('SELECT * FROM incomes WHERE person_id = ? ORDER BY id').all(Number(person_id));
    }
    return db.prepare('SELECT * FROM incomes ORDER BY person_id, id').all();
  });

  app.post('/api/incomes', async (req, reply) => {
    const b = IncomeSchema.parse(req.body);
    const result = db.prepare(
      `INSERT INTO incomes (person_id, label, amount, frequency, account_id, is_active, is_variable, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(b.personId, b.label, b.amount, b.frequency, b.accountId ?? null, b.isActive, b.isVariable, b.startDate ?? null, b.endDate ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM incomes WHERE id = ?').get(result.lastInsertRowid));
  });

  app.put('/api/incomes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = IncomeSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM incomes WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Income not found' });
    const colMap: Record<string, string> = {
      personId: 'person_id', accountId: 'account_id',
      isActive: 'is_active', isVariable: 'is_variable',
      startDate: 'start_date', endDate: 'end_date'
    };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE incomes SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM incomes WHERE id = ?').get(Number(id));
  });

  app.delete('/api/incomes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM incomes WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });

  // ── INCOME OVERRIDES ──────────────────────────────────────────────────────

  // List overrides for an income (optionally filtered by year)
  app.get('/api/incomes/:id/overrides', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { year } = req.query as { year?: string };
    const income = db.prepare('SELECT id FROM incomes WHERE id = ?').get(Number(id));
    if (!income) return reply.code(404).send({ error: 'Income not found' });
    if (year) {
      return db.prepare(
        'SELECT * FROM income_overrides WHERE income_id = ? AND year = ? ORDER BY month'
      ).all(Number(id), Number(year));
    }
    return db.prepare(
      'SELECT * FROM income_overrides WHERE income_id = ? ORDER BY year DESC, month DESC'
    ).all(Number(id));
  });

  // Upsert override (create or update) for a specific income/year/month
  app.post('/api/incomes/:id/overrides', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = OverrideSchema.parse(req.body);
    const income = db.prepare('SELECT id FROM incomes WHERE id = ?').get(Number(id));
    if (!income) return reply.code(404).send({ error: 'Income not found' });
    db.prepare(
      `INSERT INTO income_overrides (income_id, year, month, amount, note)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(income_id, year, month) DO UPDATE SET amount = excluded.amount, note = excluded.note`
    ).run(Number(id), b.year, b.month, b.amount, b.note ?? null);
    const row = db.prepare(
      'SELECT * FROM income_overrides WHERE income_id = ? AND year = ? AND month = ?'
    ).get(Number(id), b.year, b.month);
    return reply.code(201).send(row);
  });

  app.put('/api/income-overrides/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = OverrideSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM income_overrides WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Override not found' });
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE income_overrides SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM income_overrides WHERE id = ?').get(Number(id));
  });

  app.delete('/api/income-overrides/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM income_overrides WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });

  // ── INCOME HISTORY ENDPOINT ───────────────────────────────────────────────

  /**
   * GET /api/incomes/history?year_from=&month_from=&year_to=&month_to=&person_id=
   * Returns pre-computed monthly income totals over a date range.
   * Useful for trend charts without requiring per-month frontend requests.
   */
  app.get('/api/incomes/history', async (req, reply) => {
    const { year_from, month_from, year_to, month_to, person_id } = req.query as {
      year_from?: string; month_from?: string;
      year_to?: string; month_to?: string;
      person_id?: string;
    };

    const now = new Date();
    const yFrom = year_from  ? Number(year_from)  : now.getFullYear() - 1;
    const mFrom = month_from ? Number(month_from) : now.getMonth() + 1;
    const yTo   = year_to    ? Number(year_to)    : now.getFullYear();
    const mTo   = month_to   ? Number(month_to)   : now.getMonth() + 1;

    if ([yFrom, mFrom, yTo, mTo].some(isNaN)) {
      return reply.code(400).send({ error: 'Paramètres de date invalides.' });
    }

    const pid = person_id ? Number(person_id) : undefined;
    const allIncomes = db.prepare<[], IncomeRow>('SELECT * FROM incomes WHERE is_active = 1').all();
    const history: Array<{ year: number; month: number; person_id?: number; total: number }> = [];

    let cy = yFrom; let cm = mFrom;
    while (cy < yTo || (cy === yTo && cm <= mTo)) {
      const filtered = pid ? allIncomes.filter(r => r.person_id === pid) : allIncomes;
      const active = filtered.filter(r =>
        isActiveInMonth({ isActive: r.is_active, startDate: r.start_date, endDate: r.end_date }, cy, cm)
      );
      const total = active.reduce((s, r) => s + getEffectiveMonthlyIncome(db, {
        id: r.id, amount: r.amount, frequency: r.frequency, is_variable: r.is_variable,
      }, cy, cm), 0);

      history.push({ year: cy, month: cm, ...(pid ? { person_id: pid } : {}), total: Math.round(total * 100) / 100 });

      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }

    return { history };
  });

  // ── EFFECTIVE INCOME ENDPOINT ─────────────────────────────────────────────

  /**
   * GET /api/incomes/effective?year=&month=&person_id=
   * Returns per-person effective monthly income totals for the given month.
   * Also returns a list of variable income IDs that are missing overrides.
   */
  app.get('/api/incomes/effective', async (req) => {
    const { year, month, person_id } = req.query as {
      year?: string; month?: string; person_id?: string;
    };
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;

    let incomes: IncomeRow[];
    if (person_id) {
      incomes = db.prepare<[number], IncomeRow>(
        'SELECT * FROM incomes WHERE person_id = ? AND is_active = 1'
      ).all(Number(person_id));
    } else {
      incomes = db.prepare<[], IncomeRow>('SELECT * FROM incomes WHERE is_active = 1').all();
    }

    // Filter to active in month
    const active = incomes.filter(inc =>
      isActiveInMonth({ isActive: inc.is_active, startDate: inc.start_date, endDate: inc.end_date }, y, m)
    );

    // Group by person
    const byPerson: Record<number, number> = {};
    const perIncome: Array<{ id: number; personId: number; label: string; effectiveAmount: number; isVariable: number }> = [];
    for (const inc of active) {
      const eff = getEffectiveMonthlyIncome(db, {
        id: inc.id, amount: inc.amount, frequency: inc.frequency, is_variable: inc.is_variable
      }, y, m);
      byPerson[inc.person_id] = (byPerson[inc.person_id] ?? 0) + eff;
      perIncome.push({ id: inc.id, personId: inc.person_id, label: inc.label, effectiveAmount: eff, isVariable: inc.is_variable });
    }

    const missingVariableIds = getMissingVariableIncomeIds(db, y, m);

    return {
      year: y,
      month: m,
      byPerson,
      perIncome,
      missingVariableIds,
      total: Object.values(byPerson).reduce((s, v) => s + v, 0),
    };
  });
}
