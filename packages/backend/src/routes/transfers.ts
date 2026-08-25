import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const TransferBaseSchema = z.object({
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  amount: z.number().positive(),
  date: z.string().min(1),
  label: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const TransferSchema = TransferBaseSchema.refine(d => d.fromAccountId !== d.toAccountId, {
  message: 'Les comptes source et destination doivent être différents.',
});

type TransferRow = {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  label: string | null;
  note: string | null;
  created_at: string;
};

export async function transfersRoutes(app: FastifyInstance, db: Database.Database) {
  // List transfers — optionally filtered by account or date range
  app.get('/api/transfers', async (req) => {
    const { account_id, from_date, to_date } = req.query as {
      account_id?: string;
      from_date?: string;
      to_date?: string;
    };

    let sql = 'SELECT * FROM transfers WHERE 1=1';
    const params: unknown[] = [];

    if (account_id) {
      const aid = Number(account_id);
      sql += ' AND (from_account_id = ? OR to_account_id = ?)';
      params.push(aid, aid);
    }
    if (from_date) { sql += ' AND date >= ?'; params.push(from_date); }
    if (to_date)   { sql += ' AND date <= ?'; params.push(to_date); }
    sql += ' ORDER BY date DESC, id DESC';

    return db.prepare<unknown[], TransferRow>(sql).all(...params);
  });

  app.get('/api/transfers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare<[number], TransferRow>('SELECT * FROM transfers WHERE id = ?').get(Number(id));
    if (!row) return reply.code(404).send({ error: 'Virement introuvable.' });
    return row;
  });

  app.post('/api/transfers', async (req, reply) => {
    const b = TransferSchema.parse(req.body);

    // Verify accounts exist
    const fromAcc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(b.fromAccountId);
    const toAcc   = db.prepare('SELECT id FROM accounts WHERE id = ?').get(b.toAccountId);
    if (!fromAcc) return reply.code(400).send({ error: 'Compte source introuvable.' });
    if (!toAcc)   return reply.code(400).send({ error: 'Compte destination introuvable.' });

    const result = db.prepare(
      `INSERT INTO transfers (from_account_id, to_account_id, amount, date, label, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(b.fromAccountId, b.toAccountId, b.amount, b.date, b.label ?? null, b.note ?? null);

    return reply.code(201).send(
      db.prepare<[number | bigint], TransferRow>('SELECT * FROM transfers WHERE id = ?').get(result.lastInsertRowid)
    );
  });

  app.put('/api/transfers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = TransferBaseSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM transfers WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Virement introuvable.' });

    const colMap: Record<string, string> = {
      fromAccountId: 'from_account_id',
      toAccountId: 'to_account_id',
    };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE transfers SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    return db.prepare('SELECT * FROM transfers WHERE id = ?').get(Number(id));
  });

  app.delete('/api/transfers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.prepare('SELECT id FROM transfers WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Virement introuvable.' });
    db.prepare('DELETE FROM transfers WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });
}
