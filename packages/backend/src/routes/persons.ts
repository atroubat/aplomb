import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const CreatePersonSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  avatar: z.string().optional(),
});

const UpdatePersonSchema = CreatePersonSchema.partial();

export async function personsRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/persons', async () => {
    return db.prepare('SELECT * FROM persons ORDER BY id').all();
  });

  app.post('/api/persons', async (req, reply) => {
    const body = CreatePersonSchema.parse(req.body);
    const stmt = db.prepare('INSERT INTO persons (name, color, avatar) VALUES (?, ?, ?)');
    const result = stmt.run(body.name, body.color, body.avatar ?? null);
    return reply.code(201).send(db.prepare('SELECT * FROM persons WHERE id = ?').get(result.lastInsertRowid));
  });

  app.put('/api/persons/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdatePersonSchema.parse(req.body);
    const existing = db.prepare('SELECT * FROM persons WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Person not found' });
    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${toSnake(k)} = ?`).join(', ');
    db.prepare(`UPDATE persons SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM persons WHERE id = ?').get(Number(id));
  });

  app.delete('/api/persons/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM persons WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
}
