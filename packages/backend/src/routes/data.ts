import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';

/**
 * Table registry — single source of truth for export/import/reset.
 *
 * `key`     : property name in the export/import JSON payload (camelCase).
 * `table`   : physical SQLite table name.
 * `columns` : full column list, in INSERT order.
 *
 * Order matters:
 *  - EXPORT / INSERT follow this array (parents before children) so foreign keys resolve.
 *  - DELETE walks it in reverse (children before parents) so referential integrity holds.
 *
 * Keeping every table here means export/import/reset can never silently drop a table again.
 */
const TABLES = [
  { key: 'persons',             table: 'persons',              columns: ['id', 'name', 'color', 'avatar', 'created_at'] },
  { key: 'accounts',            table: 'accounts',             columns: ['id', 'name', 'type', 'person_id', 'initial_balance', 'icon', 'iban', 'created_at'] },
  { key: 'incomes',             table: 'incomes',              columns: ['id', 'person_id', 'label', 'amount', 'frequency', 'account_id', 'is_active', 'is_variable', 'start_date', 'end_date', 'created_at'] },
  { key: 'fixedCharges',        table: 'fixed_charges',        columns: ['id', 'label', 'amount', 'category', 'frequency', 'account_id', 'is_active', 'is_smoothed', 'start_date', 'end_date', 'created_at'] },
  { key: 'personalCharges',     table: 'personal_charges',     columns: ['id', 'person_id', 'label', 'amount', 'category', 'frequency', 'account_id', 'is_active', 'start_date', 'end_date', 'created_at'] },
  { key: 'savings',             table: 'savings',              columns: ['id', 'label', 'type', 'target_amount', 'target_date', 'account_id', 'person_id', 'is_common', 'hosted_by_person_id', 'created_at'] },
  { key: 'savingsTransactions', table: 'savings_transactions', columns: ['id', 'savings_id', 'type', 'amount', 'date', 'reason', 'note', 'person_id', 'created_at'] },
  { key: 'incomeOverrides',     table: 'income_overrides',     columns: ['id', 'income_id', 'year', 'month', 'amount', 'note', 'created_at'] },
  { key: 'transfers',           table: 'transfers',            columns: ['id', 'from_account_id', 'to_account_id', 'amount', 'date', 'label', 'note', 'created_at'] },
  { key: 'actualExpenses',      table: 'actual_expenses',      columns: ['id', 'person_id', 'category', 'amount', 'year', 'month', 'label', 'note', 'created_at'] },
] as const;

const EXPORT_VERSION = '2.0';

export async function dataRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/export', async (_req, reply) => {
    const data: Record<string, unknown> = {};
    for (const { key, table } of TABLES) {
      data[key] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    data.exportedAt = new Date().toISOString();
    data.version = EXPORT_VERSION;

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="budgetfoyer-export.json"');
    return data;
  });

  app.post('/api/import', async (req, reply) => {
    const body = req.body as Record<string, unknown> | null | undefined;

    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Données d\'import invalides : objet JSON attendu.' });
    }
    // A valid export always carries at least the persons collection.
    if (!Array.isArray(body.persons)) {
      return reply.code(400).send({ error: 'Données d\'import invalides : la liste « persons » est manquante.' });
    }
    // Every present collection must be an array.
    for (const { key } of TABLES) {
      if (body[key] !== undefined && !Array.isArray(body[key])) {
        return reply.code(400).send({ error: `Données d'import invalides : « ${key} » doit être une liste.` });
      }
    }

    try {
      const importTx = db.transaction(() => {
        // Delete children before parents (reverse registry order).
        for (let i = TABLES.length - 1; i >= 0; i--) {
          db.exec(`DELETE FROM ${TABLES[i].table}`);
        }
        // Insert parents before children (registry order).
        for (const { key, table, columns } of TABLES) {
          const rows = (body[key] as Array<Record<string, unknown>> | undefined) ?? [];
          if (rows.length === 0) continue;
          const placeholders = columns.map(() => '?').join(', ');
          const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
          for (const row of rows) {
            if (!row || typeof row !== 'object') {
              throw new Error(`Ligne invalide dans « ${key} ».`);
            }
            stmt.run(...columns.map((c) => row[c] ?? null));
          }
        }
      });
      importTx();
    } catch (err) {
      req.log.error({ err }, 'Import failed');
      return reply.code(400).send({
        error: `Échec de l'import : ${err instanceof Error ? err.message : 'données incohérentes'}`,
      });
    }

    return { success: true, message: 'Données importées avec succès' };
  });

  app.delete('/api/data/reset', async (_req, _reply) => {
    const reset = db.transaction(() => {
      for (let i = TABLES.length - 1; i >= 0; i--) {
        db.exec(`DELETE FROM ${TABLES[i].table}`);
      }
    });
    reset();
    return { success: true, message: 'Données réinitialisées' };
  });
}
