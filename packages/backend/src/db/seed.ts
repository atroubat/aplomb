import { getDb } from './migrate';

const db = getDb('./data/budget.db');

function seed() {
  console.log('🌱 Seeding demo data...');

  // Clear existing data
  db.exec(`
    DELETE FROM savings_transactions;
    DELETE FROM savings;
    DELETE FROM personal_charges;
    DELETE FROM fixed_charges;
    DELETE FROM incomes;
    DELETE FROM accounts;
    DELETE FROM persons;
  `);

  // Persons
  db.prepare(`INSERT INTO persons (name, color, avatar) VALUES (?, ?, ?)`).run('Marie', '#6366f1', '👩');
  db.prepare(`INSERT INTO persons (name, color, avatar) VALUES (?, ?, ?)`).run('Thomas', '#f59e0b', '👨');

  // Accounts
  db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)`).run('Compte joint', 'checking', null, 2500, '🏦');
  db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)`).run('Compte Marie', 'checking', 1, 800, '💳');
  db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)`).run('Compte Thomas', 'checking', 2, 1200, '💳');
  db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)`).run('Livret A Marie', 'savings', 1, 5000, '🏛️');
  db.prepare(`INSERT INTO accounts (name, type, person_id, initial_balance, icon) VALUES (?, ?, ?, ?, ?)`).run('PEA Thomas', 'investment', 2, 8000, '📈');

  // Incomes
  db.prepare(`INSERT INTO incomes (person_id, label, amount, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(1, 'Salaire Marie', 2800, 'monthly', 2, 1);
  db.prepare(`INSERT INTO incomes (person_id, label, amount, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(2, 'Salaire Thomas', 3200, 'monthly', 3, 1);
  db.prepare(`INSERT INTO incomes (person_id, label, amount, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(1, 'Freelance Marie', 600, 'quarterly', 2, 1);

  // Fixed charges
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Loyer', 1100, 'housing', 'monthly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Électricité', 80, 'housing', 'monthly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Internet + TV', 45, 'subscription', 'monthly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Assurance habitation', 25, 'insurance', 'monthly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Assurance voiture', 600, 'insurance', 'yearly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Taxe habitation', 480, 'tax', 'yearly', 1, 1);
  db.prepare(`INSERT INTO fixed_charges (label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run('Netflix', 18, 'subscription', 'monthly', 1, 1);

  // Personal charges
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(1, 'Abonnement sport (salle)', 40, 'sport', 'monthly', 2, 1);
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(1, 'Transport (navigo)', 90, 'transport', 'monthly', 2, 1);
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(1, 'Spotify', 10, 'subscription', 'monthly', 2, 1);
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(2, 'Mutuelle santé', 55, 'health', 'monthly', 3, 1);
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(2, 'Abonnement vélo', 30, 'sport', 'monthly', 3, 1);
  db.prepare(`INSERT INTO personal_charges (person_id, label, amount, category, frequency, account_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(2, 'Formation en ligne', 200, 'education', 'quarterly', 3, 1);

  // Savings products
  db.prepare(`INSERT INTO savings (label, type, target_amount, target_date, account_id, person_id) VALUES (?, ?, ?, ?, ?, ?)`).run('Livret A', 'livret', 10000, '2026-12-31', 4, 1);
  db.prepare(`INSERT INTO savings (label, type, target_amount, target_date, account_id, person_id) VALUES (?, ?, ?, ?, ?, ?)`).run('PEA Thomas', 'pea', 50000, '2030-01-01', 5, 2);
  db.prepare(`INSERT INTO savings (label, type, target_amount, target_date, account_id, person_id) VALUES (?, ?, ?, ?, ?, ?)`).run('Épargne vacances', 'livret', 3000, '2026-06-01', null, null);

  // Savings transactions (last 6 months)
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
    const dateStr = d.toISOString().split('T')[0];
    db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, note) VALUES (?, ?, ?, ?, ?)`).run(1, 'deposit', 200, dateStr, 'Versement mensuel');
    db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, note) VALUES (?, ?, ?, ?, ?)`).run(2, 'deposit', 300, dateStr, 'Investissement mensuel');
    db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, note) VALUES (?, ?, ?, ?, ?)`).run(3, 'deposit', 150, dateStr, 'Épargne vacances');
  }
  // A withdrawal
  db.prepare(`INSERT INTO savings_transactions (savings_id, type, amount, date, reason, note) VALUES (?, ?, ?, ?, ?, ?)`).run(3, 'withdrawal', 200, '2025-12-20', 'Achat important', 'Cadeaux de Noël');

  console.log('✅ Demo data seeded successfully!');
}

seed();
