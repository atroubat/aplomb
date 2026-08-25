import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';

const SavingsSchema = z.object({
  label: z.string().min(1),
  type: z.enum(['livret', 'pea', 'assurance_vie', 'crypto', 'other']),
  targetAmount: z.number().positive().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
  // Ownership: isCommon=1 means household savings, personId means personal
  personId: z.number().int().positive().optional().nullable(),
  isCommon: z.number().int().min(0).max(1).optional().default(0),
  // Physical hosting: which person's account physically holds it
  hostedByPersonId: z.number().int().positive().optional().nullable(),
});

const TransactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().positive(),
  date: z.string(),
  reason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  personId: z.number().int().positive().optional().nullable(),
});

function getBalance(db: Database.Database, savingsId: number): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) as balance
    FROM savings_transactions WHERE savings_id = ?
  `).get(savingsId) as { balance: number };
  return row.balance;
}

export async function savingsRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/savings', async (req) => {
    const { person_id, common } = req.query as { person_id?: string; common?: string };
    let rows: Array<{ id: number }>;

    if (common === '1') {
      // All common household savings
      rows = db.prepare('SELECT * FROM savings WHERE is_common = 1 ORDER BY id').all() as Array<{ id: number }>;
    } else if (person_id) {
      // Personal savings for a specific person
      rows = db.prepare(
        'SELECT * FROM savings WHERE person_id = ? AND (is_common = 0 OR is_common IS NULL) ORDER BY id'
      ).all(Number(person_id)) as Array<{ id: number }>;
    } else {
      // All savings
      rows = db.prepare('SELECT * FROM savings ORDER BY id').all() as Array<{ id: number }>;
    }

    return rows.map(r => ({ ...r, balance: getBalance(db, r.id) }));
  });

  app.get('/api/savings/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM savings WHERE id = ?').get(Number(id));
    if (!row) return reply.code(404).send({ error: 'Savings not found' });
    return { ...(row as object), balance: getBalance(db, Number(id)) };
  });

  app.post('/api/savings', async (req, reply) => {
    const b = SavingsSchema.parse(req.body);
    const result = db.prepare(
      `INSERT INTO savings (label, type, target_amount, target_date, account_id, person_id, is_common, hosted_by_person_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      b.label, b.type, b.targetAmount ?? null, b.targetDate ?? null,
      b.accountId ?? null, b.personId ?? null, b.isCommon ?? 0, b.hostedByPersonId ?? null
    );
    const row = db.prepare('SELECT * FROM savings WHERE id = ?').get(result.lastInsertRowid);
    return reply.code(201).send({ ...(row as object), balance: 0 });
  });

  app.put('/api/savings/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = SavingsSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM savings WHERE id = ?').get(Number(id));
    if (!existing) return reply.code(404).send({ error: 'Savings not found' });
    const colMap: Record<string, string> = {
      targetAmount: 'target_amount',
      targetDate: 'target_date',
      accountId: 'account_id',
      personId: 'person_id',
      isCommon: 'is_common',
      hostedByPersonId: 'hosted_by_person_id',
    };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return { ...(existing as object), balance: getBalance(db, Number(id)) };
    const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
    db.prepare(`UPDATE savings SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(id));
    const updated = db.prepare('SELECT * FROM savings WHERE id = ?').get(Number(id));
    return { ...(updated as object), balance: getBalance(db, Number(id)) };
  });

  app.delete('/api/savings/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    db.prepare('DELETE FROM savings_transactions WHERE savings_id = ?').run(Number(id));
    db.prepare('DELETE FROM savings WHERE id = ?').run(Number(id));
    return reply.code(204).send();
  });

  // ── TRANSACTIONS ──────────────────────────────────────────────────────────

  app.get('/api/savings/:id/transactions', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { type } = req.query as { type?: string };
    let rows: unknown[];
    if (type) {
      rows = db.prepare(
        'SELECT * FROM savings_transactions WHERE savings_id = ? AND type = ? ORDER BY date DESC'
      ).all(Number(id), type);
    } else {
      rows = db.prepare(
        'SELECT * FROM savings_transactions WHERE savings_id = ? ORDER BY date DESC'
      ).all(Number(id));
    }
    return rows;
  });

  app.post('/api/savings/:id/transactions', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = TransactionSchema.parse(req.body);
    const savingsRow = db.prepare('SELECT * FROM savings WHERE id = ?').get(Number(id));
    if (!savingsRow) return reply.code(404).send({ error: 'Savings not found' });
    if (b.type === 'withdrawal') {
      const balance = getBalance(db, Number(id));
      if (b.amount > balance) {
        return reply.code(400).send({ error: `Solde insuffisant. Solde disponible : ${balance.toFixed(2)} €` });
      }
    }
    const result = db.prepare(
      'INSERT INTO savings_transactions (savings_id, type, amount, date, reason, note, person_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(Number(id), b.type, b.amount, b.date, b.reason ?? null, b.note ?? null, b.personId ?? null);
    return reply.code(201).send(
      db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(result.lastInsertRowid)
    );
  });

  app.put('/api/savings/transactions/:txId', async (req, reply) => {
    const { txId } = req.params as { txId: string };
    const existing = db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(Number(txId)) as { savings_id: number; type: string; amount: number } | undefined;
    if (!existing) return reply.code(404).send({ error: 'Transaction not found' });
    const b = TransactionSchema.partial().parse(req.body);
    if (b.type === 'withdrawal' || existing.type === 'withdrawal') {
      const newAmount = b.amount ?? existing.amount;
      const newType = b.type ?? existing.type;
      if (newType === 'withdrawal') {
        const balanceExcludingThis = (db.prepare(`
          SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) as bal
          FROM savings_transactions WHERE savings_id = ? AND id != ?
        `).get(existing.savings_id, Number(txId)) as { bal: number }).bal;
        if (newAmount > balanceExcludingThis) {
          return reply.code(400).send({ error: `Solde insuffisant. Solde disponible : ${balanceExcludingThis.toFixed(2)} €` });
        }
      }
    }
    const colMap: Record<string, string> = { personId: 'person_id' };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length > 0) {
      const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
      db.prepare(`UPDATE savings_transactions SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(txId));
    }
    return db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(Number(txId));
  });

  app.delete('/api/savings/transactions/:txId', async (req, reply) => {
    const { txId } = req.params as { txId: string };
    db.prepare('DELETE FROM savings_transactions WHERE id = ?').run(Number(txId));
    return reply.code(204).send();
  });
}
