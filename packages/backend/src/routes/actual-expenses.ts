import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const ActualExpenseSchema = z.object({
  personId: z.number().int().positive().optional().nullable(),
  category: z.string().min(1),
  amount: z.number().min(0),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  label: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

type ActualExpenseRow = {
  id: number;
  person_id: number | null;
  category: string;
  amount: number;
  year: number;
  month: number;
  label: string | null;
  note: string | null;
  created_at: string;
};

export async function actualExpensesRoutes(app: FastifyInstance, db: Database.Database) {
  // List actual expenses for a given month (with optional person filter)
  app.get('/api/actual-expenses', async (req, reply) => {
    const { year, month, person_id } = req.query as {
      year?: string; month?: string; person_id?: string;
    };

    const y = year ? Number(year) : undefined;
    const m = month ? Number(month) : undefined;

    if ((year && isNaN(y!)) || (month && isNaN(m!))) {
      return reply.code(400).send({ error: 'Paramètres year/month invalides.' });
    }

    let sql = 'SELECT * FROM actual_expenses WHERE 1=1';
    const params: unknown[] = [];

    if (y) { sql += ' AND year = ?'; params.push(y); }
    if (m) { sql += ' AND month = ?'; params.push(m); }
    if (person_id) { sql += ' AND (person_id = ? OR person_id IS NULL)'; params.push(Number(person_id)); }
    sql += ' ORDER BY year DESC, month DESC, id DESC';

    return db.prepare<unknown[], ActualExpenseRow>(sql).all(...params);
  });

  // Summary: budget (planned) vs actual, per category for a month
  app.get('/api/actual-expenses/summary', async (req, reply) => {
    const { year, month, person_id } = req.query as {
      year?: string; month?: string; person_id?: string;
    };

    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return reply.code(400).send({ error: 'Paramètres year/month invalides.' });
    }

    // Actual expenses aggregated by category
    let actualSql = 'SELECT category, SUM(amount) as actual FROM actual_expenses WHERE year = ? AND month = ?';
    const params: unknown[] = [y, m];
    if (person_id) {
      actualSql += ' AND (person_id = ? OR person_id IS NULL)';
      params.push(Number(person_id));
    }
    actualSql += ' GROUP BY category';

    const actuals = db.prepare<unknown[], { category: string; actual: number }>(actualSql).all(...params);

    // Planned expenses (fixed + personal charges) for the same month
    const fixedRows = db.prepare<[], { category: string; amount: number; frequency: string; is_active: number; is_smoothed: number; start_date: string | null; end_date: string | null }>(
      'SELECT category, amount, frequency, is_active, COALESCE(is_smoothed, 1) as is_smoothed, start_date, end_date FROM fixed_charges'
    ).all();

    const personalRows = db.prepare<[], { category: string; amount: number; frequency: string; is_active: number; person_id: number; start_date: string | null; end_date: string | null }>(
      'SELECT category, amount, frequency, is_active, person_id, start_date, end_date FROM personal_charges'
    ).all();

    const plannedMap: Record<string, number> = {};

    for (const r of fixedRows) {
      if (!r.is_active) continue;
      const monthly = r.frequency === 'monthly' ? r.amount : r.frequency === 'quarterly' ? r.amount / 3 : r.amount / 12;
      plannedMap[r.category] = (plannedMap[r.category] || 0) + monthly;
    }

    const pidNum = person_id ? Number(person_id) : undefined;
    for (const r of personalRows) {
      if (!r.is_active) continue;
      if (pidNum && r.person_id !== pidNum) continue;
      const monthly = r.frequency === 'monthly' ? r.amount : r.frequency === 'quarterly' ? r.amount / 3 : r.amount / 12;
      plannedMap[r.category] = (plannedMap[r.category] || 0) + monthly;
    }

    // Merge actuals with planned
    const allCategories = new Set([...Object.keys(plannedMap), ...actuals.map(a => a.category)]);
    const summary = Array.from(allCategories).map(cat => {
      const planned = plannedMap[cat] || 0;
      const actual = actuals.find(a => a.category === cat)?.actual || 0;
      return {
        category: cat,
        planned: Math.round(planned * 100) / 100,
        actual: Math.round(actual * 100) / 100,
        variance: Math.round((actual - planned) * 100) / 100,
        // positive variance = over budget; negative = under budget
        status: actual > planned * 1.1 ? 'over' : actual < planned * 0.9 ? 'under' : 'ok',
      };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    return { year: y, month: m, summary };
  });

  app.post('/api/actual-expenses', async (req, reply) => {
    const b = ActualExpenseSchema.parse(req.body);
    const result = db.prepare(
      `INSERT INTO actual_expenses (person_id, category, amount, year, month, label, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(b.personId ?? null, b.category, b.amount, b.year, b.month, b.label ?? null, b.note ?? null);
    return reply.code(201).send(
      db.prepare<[number | bigint], ActualExpenseRow>('SELECT * FROM actual_expenses WHERE id = ?').get(result.lastInsertRowid)
    );
  });

  app.put('/api/actual-expenses/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = ActualExpenseSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM actual_expenses WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Dépense introuvable.' });
    const colMap: Record<string, string> = { personId: 'person_id' };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE actual_expenses SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM actual_expenses WHERE id = ?').get(Number(id));
  });

  app.delete('/api/actual-expenses/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.prepare('SELECT id FROM actual_expenses WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Dépense introuvable.' });
    db.prepare('DELETE FROM actual_expenses WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}
