import type Database from 'better-sqlite3';

/** Populate the isolated demo database once. Never touches the user's database. */
export function seedDemoDataIfEmpty(db: Database.Database): void {
  const count = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM persons').get()?.count ?? 0;
  if (count > 0) return;

  const seed = db.transaction(() => {
    const marieId = Number(db.prepare(`INSERT INTO persons (name, color, avatar) VALUES ('Marie', '#6366f1', '👩')`).run().lastInsertRowid);
    const thomasId = Number(db.prepare(`INSERT INTO persons (name, color, avatar) VALUES ('Thomas', '#f59e0b', '👨')`).run().lastInsertRowid);
    const jointId = Number(db.prepare(`INSERT INTO accounts (name, type, initial_balance, icon) VALUES ('Compte joint démo', 'checking', 2500, '🏦')`).run().lastInsertRowid);
    const marieAccountId = Number(db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES ('Compte Marie', 'checking', ?, 800, '💳')`).run(marieId).lastInsertRowid);
    const thomasAccountId = Number(db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES ('Compte Thomas', 'checking', ?, 1200, '💳')`).run(thomasId).lastInsertRowid);

    const income = db.prepare(`INSERT INTO incomes (person_id, label, amount, frequency, account_id, is_active) VALUES (?, ?, ?, 'monthly', ?, 1)`);
    income.run(marieId, 'Salaire Marie', 2800, marieAccountId);
    income.run(thomasId, 'Salaire Thomas', 3200, thomasAccountId);

    const fixed = db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active, is_smoothed) VALUES (?, ?, ?, ?, ?, 1, 1)`);
    fixed.run('Loyer', 1100, 'housing', 'monthly', jointId);
    fixed.run('Électricité', 95, 'energy', 'monthly', jointId);
    fixed.run('Internet', 39.99, 'subscription', 'monthly', jointId);
    fixed.run('Crédit auto', 285, 'credit', 'monthly', jointId);
    fixed.run('Assurance habitation', 300, 'insurance', 'yearly', jointId);

    const personal = db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`);
    personal.run(marieId, 'Salle de sport', 35, 'sport', 'monthly', marieAccountId);
    personal.run(marieId, 'Pass transport', 86.40, 'transport', 'monthly', marieAccountId);
    personal.run(thomasId, 'Mutuelle', 58, 'health', 'monthly', thomasAccountId);
    personal.run(thomasId, 'Formation photo', 180, 'education', 'quarterly', thomasAccountId);

    const savingsId = Number(db.prepare(`INSERT INTO savings (label, type, target_amount, target_date, person_id, is_common) VALUES ('Projet vacances', 'livret', 4000, '2027-06-01', NULL, 1)`).run().lastInsertRowid);
    const now = new Date();
    const tx = db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, note) VALUES (?, 'deposit', 250, ?, 'Versement démo')`);
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 10);
      tx.run(savingsId, date.toISOString().slice(0, 10));
    }
  });

  seed();
}
