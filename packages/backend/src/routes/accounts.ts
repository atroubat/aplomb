import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'investment']),
  personId: z.number().int().positive().optional().nullable(),
  initialBalance: z.number().optional().default(0),
  icon: z.string().optional().nullable(),
});

const UpdateAccountSchema = CreateAccountSchema.partial();

export async function accountsRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/accounts', async (req) => {
    const { person_id } = req.query as { person_id?: string };
    if (person_id) {
      return db.prepare('SELECT * FROM accounts WHERE person_id = ? OR person_id IS NULL ORDER BY id').all(Number(person_id));
    }
    return db.prepare('SELECT * FROM accounts ORDER BY id').all();
  });

  app.post('/api/accounts', async (req, reply) => {
    const body = CreateAccountSchema.parse(req.body);
    const result = db.prepare(
      'INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)'
    ).run(body.name, body.type, body.personId ?? null, body.initialBalance, body.icon ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid));
  });

  app.put('/api/accounts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateAccountSchema.parse(req.body);
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Account not found' });
    const map: Record<string, string> = { personId: 'person_id', initialBalance: 'initial_balance' };
    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${map[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE accounts SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(id));
  });

  app.delete('/api/accounts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM accounts WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}
