import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const PersonalChargeSchema = z.object({
  personId: z.number().int().positive(),
  label: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum(['health', 'sport', 'subscription', 'transport', 'education', 'food', 'clothing', 'credit', 'telecom', 'other']),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const colMap: Record<string, string> = { personId: 'person_id', accountId: 'account_id', isActive: 'is_active', startDate: 'start_date', endDate: 'end_date' };

export async function personalChargesRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/personal-charges', async (req) => {
    const { person_id } = req.query as { person_id?: string };
    if (person_id) {
      return db.prepare('SELECT * FROM personal_charges WHERE person_id = ? ORDER BY id').all(Number(person_id));
    }
    return db.prepare('SELECT * FROM personal_charges ORDER BY person_id, id').all();
  });

  app.post('/api/personal-charges', async (req, reply) => {
    const b = PersonalChargeSchema.parse(req.body);
    const result = db.prepare(
      'INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(b.personId, b.label, b.amount, b.category, b.frequency, b.accountId ?? null, b.isActive, b.startDate ?? null, b.endDate ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM personal_charges WHERE id = ?').get(result.lastInsertRowid));
  });

  app.put('/api/personal-charges/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = PersonalChargeSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM personal_charges WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Personal charge not found' });
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE personal_charges SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM personal_charges WHERE id = ?').get(Number(id));
  });

  app.delete('/api/personal-charges/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM personal_charges WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}
