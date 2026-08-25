import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const FixedChargeSchema = z.object({
  label: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum(['housing', 'energy', 'food', 'insurance', 'credit', 'subscription', 'tax', 'transport', 'health', 'childcare', 'other']),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  isSmoothed: z.number().int().min(0).max(1).optional().default(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const colMap: Record<string, string> = {
  accountId: 'account_id',
  isActive: 'is_active',
  isSmoothed: 'is_smoothed',
  startDate: 'start_date',
  endDate: 'end_date',
};

export async function fixedChargesRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/fixed-charges', async () => {
    return db.prepare('SELECT * FROM fixed_charges ORDER BY id').all();
  });

  app.post('/api/fixed-charges', async (req, reply) => {
    const b = FixedChargeSchema.parse(req.body);
    const result = db.prepare(
      'INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active, is_smoothed, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(b.label, b.amount, b.category, b.frequency, b.accountId ?? null, b.isActive, b.isSmoothed, b.startDate ?? null, b.endDate ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM fixed_charges WHERE id = ?').get(result.lastInsertRowid));
  });

  app.put('/api/fixed-charges/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = FixedChargeSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM fixed_charges WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Fixed charge not found' });
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE fixed_charges SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM fixed_charges WHERE id = ?').get(Number(id));
  });

  app.delete('/api/fixed-charges/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM fixed_charges WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}
