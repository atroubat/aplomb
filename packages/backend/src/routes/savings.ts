import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { getSavingsEvolution, getSavingsBalance as getBalance } from '../utils/budget-scope.js';

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
  date: z.iso.date(),
  reason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  personId: z.number().int().positive().optional().nullable(),
  isExcludedFromBudget: z.number().int().min(0).max(1).optional(),
});

export async function savingsRoutes(app: FastifyInstance, db: Database.Database) {
  // The first confirmed movement activates tracking without inventing a deposit
  // for the account's pre-existing balance. Creation and movement are atomic.
  app.post('/api/accounts/:id/savings-transactions', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = TransactionSchema.parse(req.body);
    const result = db.transaction(() => {
      const account = db.prepare(`SELECT a.*, p.role FROM accounts a
        JOIN persons p ON p.id = a.person_id WHERE a.id = ?`).get(Number(id)) as {
          id: number; name: string; person_id: number; initial_balance: number; type: string; role: string;
        } | undefined;
      if (!account) return { error: 'Compte introuvable.', status: 404 };
      if (account.role !== 'child') return { error: 'Ce parcours est réservé aux comptes des enfants.', status: 400 };
      const products = db.prepare('SELECT id, person_id, is_common FROM savings WHERE account_id = ?').all(account.id) as { id: number; person_id: number; is_common: number }[];
      if (products.length > 1 || (products[0] && (products[0].person_id !== account.person_id || products[0].is_common))) {
        return { error: 'Ce compte est déjà lié à un autre produit. Utilisez sa fiche dans Épargne.', status: 409 };
      }
      let savingsId = products[0]?.id;
      const balance = savingsId ? getBalance(db, savingsId) : account.initial_balance;
      if (!Number.isFinite(balance) || balance < 0) return { error: 'Corrigez le solde du compte avant de commencer le suivi.', status: 400 };
      if (b.type === 'withdrawal' && b.amount > balance) return { error: `Solde insuffisant. Solde disponible : ${balance.toFixed(2)} €`, status: 400 };
      if (!savingsId) {
        const created = db.prepare(`INSERT INTO savings
          (label, type, account_id, person_id, is_common, opening_balance, opening_balance_date)
          VALUES (?, ?, ?, ?, 0, ?, ?)`).run(account.name, account.type === 'savings' ? 'livret' : 'other', account.id, account.person_id, balance, b.date);
        savingsId = Number(created.lastInsertRowid);
      }
      const tx = db.prepare(`INSERT INTO savings_transactions
        (savings_id, type, amount, date, reason, note, person_id, is_excluded_from_budget)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(savingsId, b.type, b.amount, b.date, b.reason ?? null, b.note ?? null, b.personId ?? null, b.isExcludedFromBudget ?? 0);
      db.prepare('UPDATE savings SET opening_balance_date = ? WHERE id = ? AND opening_balance_date > ?').run(b.date, savingsId, b.date);
      return { savings: { ...(db.prepare('SELECT * FROM savings WHERE id = ?').get(savingsId) as object), balance: getBalance(db, savingsId) },
        transaction: db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(tx.lastInsertRowid) };
    })();
    if ('error' in result) return reply.code(result.status!).send({ error: result.error });
    return reply.code(201).send(result);
  });
  app.get('/api/savings/evolution', async (req) => {
    const now = new Date();
    const { year, month } = z.object({
      year: z.coerce.number().int().min(2000).max(2100).default(now.getFullYear()),
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
    }).parse(req.query);
    return getSavingsEvolution(db, year, month, undefined, true);
  });

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
      'INSERT INTO savings_transactions (savings_id, type, amount, date, reason, note, person_id, is_excluded_from_budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(Number(id), b.type, b.amount, b.date, b.reason ?? null, b.note ?? null, b.personId ?? null, b.isExcludedFromBudget ?? 0);
    db.prepare('UPDATE savings SET opening_balance_date = ? WHERE id = ? AND opening_balance_date > ?').run(b.date, Number(id), b.date);
    return reply.code(201).send(
      db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(result.lastInsertRowid)
    );
  });

  app.put('/api/savings/transactions/:txId', async (req, reply) => {
    const { txId } = req.params as { txId: string };
    const existing = db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(Number(txId)) as { savings_id: number; type: string; amount: number } | undefined;
    if (!existing) return reply.code(404).send({ error: 'Transaction not found' });
    const b = TransactionSchema.partial().parse(req.body);
    const balanceWithoutTransaction = getBalance(db, existing.savings_id, Number(txId));
    const correctedBalance = balanceWithoutTransaction + ((b.type ?? existing.type) === 'deposit' ? 1 : -1) * (b.amount ?? existing.amount);
    if (correctedBalance < -0.000001) return reply.code(400).send({ error: 'Cette modification rendrait le solde du livret négatif.' });
    const colMap: Record<string, string> = { personId: 'person_id', isExcludedFromBudget: 'is_excluded_from_budget' };
    const fields = Object.entries(b).filter(([, v]) => v !== undefined);
    if (fields.length > 0) {
      const set = fields.map(([k]) => `${colMap[k] || k} = ?`).join(', ');
      db.prepare(`UPDATE savings_transactions SET ${set} WHERE id = ?`).run(...fields.map(([, v]) => v), Number(txId));
      if (b.date) db.prepare('UPDATE savings SET opening_balance_date = ? WHERE id = ? AND opening_balance_date > ?').run(b.date, existing.savings_id, b.date);
    }
    return db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(Number(txId));
  });

  app.delete('/api/savings/transactions/:txId', async (req, reply) => {
    const { txId } = req.params as { txId: string };
    const existing = db.prepare('SELECT savings_id FROM savings_transactions WHERE id = ?').get(Number(txId)) as { savings_id: number } | undefined;
    if (existing && getBalance(db, existing.savings_id, Number(txId)) < -0.000001) return reply.code(400).send({ error: 'Cette suppression rendrait le solde du livret négatif.' });
    db.prepare('DELETE FROM savings_transactions WHERE id = ?').run(Number(txId));
    return reply.code(204).send();
  });
}
