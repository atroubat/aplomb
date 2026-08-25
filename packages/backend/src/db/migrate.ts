import Database from 'better-sqlite3';
import path from 'path';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'investment')),
      person_id INTEGER REFERENCES persons(id),
      initial_balance REAL DEFAULT 0,
      icon TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES persons(id),
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'quarterly', 'yearly')),
      account_id INTEGER REFERENCES accounts(id),
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fixed_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('housing','energy','food','insurance','credit','subscription','tax','transport','health','childcare','other')),
      frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'quarterly', 'yearly')),
      account_id INTEGER REFERENCES accounts(id),
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personal_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES persons(id),
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('health','sport','subscription','transport','education','food','clothing','credit','telecom','other')),
      frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'quarterly', 'yearly')),
      account_id INTEGER REFERENCES accounts(id),
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('livret','pea','assurance_vie','crypto','other')),
      target_amount REAL,
      target_date TEXT,
      account_id INTEGER REFERENCES accounts(id),
      person_id INTEGER REFERENCES persons(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS savings_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      savings_id INTEGER NOT NULL REFERENCES savings(id),
      type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_id INTEGER NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(income_id, year, month)
    );
  `);

  // Additive column migrations — SQLite ALTER TABLE has no IF NOT EXISTS,
  // so we guard each one with a try/catch.
  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch { /* column already exists */ }
  };

  addColumnIfMissing('incomes', 'is_variable', 'INTEGER DEFAULT 0');
  addColumnIfMissing('savings', 'is_common', 'INTEGER DEFAULT 0');
  addColumnIfMissing('savings', 'hosted_by_person_id', 'INTEGER REFERENCES persons(id)');
  // is_smoothed DEFAULT 1 = monthly equivalent in all months (existing behaviour).
  // is_smoothed = 0 = charge appears only in the month(s) it actually falls (cash-flow mode).
  addColumnIfMissing('fixed_charges', 'is_smoothed', 'INTEGER DEFAULT 1');
  // IBAN on accounts — for future banking sync (GoCardless/Powens)
  addColumnIfMissing('accounts', 'iban', 'TEXT');
  // Person who made the savings transaction (for common savings breakdown)
  addColumnIfMissing('savings_transactions', 'person_id', 'INTEGER REFERENCES persons(id)');

  // ── NEW TABLES (idempotent CREATE IF NOT EXISTS) ────────────────────────

  // Transfers: internal movements between accounts — P&L neutral
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      amount          REAL NOT NULL CHECK(amount > 0),
      date            TEXT NOT NULL,
      label           TEXT,
      note            TEXT,
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK(from_account_id != to_account_id)
    );
  `);

  // Actual expenses: real spending recorded against a category/month
  // Enables "budget prévu vs réel" comparisons
  db.exec(`
    CREATE TABLE IF NOT EXISTS actual_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id   INTEGER REFERENCES persons(id) ON DELETE CASCADE,
      category    TEXT NOT NULL,
      amount      REAL NOT NULL CHECK(amount >= 0),
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      label       TEXT,
      note        TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_actual_expenses_ym ON actual_expenses(year, month);
  `);

  // Savings transactions are read by (savings_id, date range) on every dashboard
  // request (KPIs, 6/12-month evolution). Index keeps those range scans cheap.
  db.exec(`CREATE INDEX IF NOT EXISTS idx_savings_tx_savings_date ON savings_transactions(savings_id, date);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_income_overrides_income_ym ON income_overrides(income_id, year, month);`);

  // Widen CHECK constraints for categories on existing databases.
  // SQLite CHECK constraints are baked into CREATE TABLE and cannot be ALTERed,
  // so we recreate the tables if the constraints are outdated.
  const widenCategoryCheck = (table: string, newCategories: string) => {
    // Inspect the live CREATE TABLE statement rather than probing with a sentinel
    // INSERT. Probing mutated the table on every boot and failed outright when
    // NOT NULL foreign keys (e.g. personal_charges.person_id) had no target row.
    const row = db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table) as { sql: string } | undefined;
    if (!row) return;

    // Every category literal we expect must already appear in the stored DDL.
    const expected = newCategories.match(/'[^']+'/g) ?? [];
    const allPresent = expected.every((cat) => row.sql.includes(cat));
    if (allPresent) return;

    // CHECK is outdated. Rebuild from the *actual* DDL, rewriting only the
    // category CHECK clause. This preserves every column added over time
    // (e.g. is_smoothed) instead of dropping any not listed in a hard-coded
    // template, and copies rows by explicit column name to stay count-safe.
    const newSql = row.sql.replace(
      /category\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*category\s+IN\s*\([^)]*\)\s*\)/i,
      `category TEXT NOT NULL CHECK(category IN (${newCategories}))`,
    );
    if (newSql === row.sql) return; // regex missed — refuse to touch the table

    db.exec(`PRAGMA foreign_keys = OFF`);
    db.exec(`ALTER TABLE ${table} RENAME TO ${table}_old`);
    db.exec(newSql);
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[])
      .map((c) => c.name)
      .join(', ');
    db.exec(`INSERT INTO ${table} (${cols}) SELECT ${cols} FROM ${table}_old`);
    db.exec(`DROP TABLE ${table}_old`);
    db.exec(`PRAGMA foreign_keys = ON`);
  };

  widenCategoryCheck(
    'fixed_charges',
    `'housing','energy','food','insurance','credit','subscription','tax','transport','health','childcare','other'`,
  );

  widenCategoryCheck(
    'personal_charges',
    `'health','sport','subscription','transport','education','food','clothing','credit','telecom','other'`,
  );
}

export function getDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'budget.db');
  const dir = path.dirname(resolvedPath);

  // Ensure directory exists
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}
