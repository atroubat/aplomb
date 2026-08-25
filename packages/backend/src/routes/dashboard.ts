import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { toMonthlyAmount, getEffectiveMonthlyIncome, getMissingVariableIncomeIds, isActiveInMonth, getChargeAmountForMonth, getPersonMonthSavings } from '../utils/monthly-calc.js';
import { computeHouseholdSplit } from '../utils/household-split.js';
import { round2 } from '../utils/money.js';

type Frequency = 'monthly' | 'quarterly' | 'yearly';

function monthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getBalance(db: Database.Database, savingsId: number): number {
  const row = db.prepare<[number], { balance: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) as balance
     FROM savings_transactions WHERE savings_id = ?`
  ).get(savingsId) as { balance: number };
  return row?.balance ?? 0;
}


type IncomeRow = {
  id: number; person_id: number; amount: number; frequency: Frequency;
  is_active: number; is_variable: number; start_date: string | null; end_date: string | null;
};
type ChargeRow = {
  person_id?: number; amount: number; frequency: Frequency; category: string;
  is_active: number; is_smoothed?: number; start_date: string | null; end_date: string | null;
};

function isActive(row: { is_active: number; start_date: string | null; end_date: string | null }, year: number, month: number): boolean {
  return isActiveInMonth({ isActive: row.is_active, startDate: row.start_date, endDate: row.end_date }, year, month);
}

function getEffectiveIncomeForMonth(db: Database.Database, year: number, month: number, personId?: number): number {
  const rows = db.prepare<[], IncomeRow>('SELECT * FROM incomes WHERE is_active = 1').all();
  const filtered = personId ? rows.filter(r => r.person_id === personId) : rows;
  return filtered
    .filter(r => isActive(r, year, month))
    .reduce((sum, r) => sum + getEffectiveMonthlyIncome(db, r, year, month), 0);
}

function getMonthFixedCharges(db: Database.Database, year: number, month: number): number {
  const rows = db.prepare<[], ChargeRow>('SELECT * FROM fixed_charges WHERE is_active = 1').all();
  return rows
    .filter(r => isActive(r, year, month))
    .reduce((sum, r) => sum + getChargeAmountForMonth(r, year, month), 0);
}

function getMonthPersonalCharges(db: Database.Database, year: number, month: number, personId?: number): number {
  const rows = db.prepare<[], ChargeRow>('SELECT * FROM personal_charges WHERE is_active = 1').all();
  const filtered = personId ? rows.filter(r => r.person_id === personId) : rows;
  return filtered
    .filter(r => isActive(r, year, month))
    .reduce((sum, r) => sum + toMonthlyAmount(r.amount, r.frequency), 0);
}

function getMonthSavings(db: Database.Database, year: number, month: number, isCommon?: boolean, personId?: number): number {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-31`;

  let savingsIds: number[];
  if (isCommon) {
    savingsIds = (db.prepare<[], { id: number }>('SELECT id FROM savings WHERE is_common = 1').all()).map(r => r.id);
  } else if (personId) {
    savingsIds = (db.prepare<[number], { id: number }>(
      'SELECT id FROM savings WHERE person_id = ? AND (is_common = 0 OR is_common IS NULL)'
    ).all(personId)).map(r => r.id);
  } else {
    savingsIds = (db.prepare<[], { id: number }>('SELECT id FROM savings').all()).map(r => r.id);
  }

  if (savingsIds.length === 0) return 0;

  const placeholders = savingsIds.map(() => '?').join(',');
  const row = db.prepare<unknown[], { total: number }>(`
    SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END), 0) as total
    FROM savings_transactions WHERE savings_id IN (${placeholders}) AND date >= ? AND date <= ?
  `).get(...savingsIds, start, end);
  return row?.total ?? 0;
}

export async function dashboardRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/dashboard', async (req, reply) => {
    const { year, month, person_id, method } = req.query as { year?: string; month?: string; person_id?: string; method?: string };
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) : now.getMonth() + 1;
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return reply.code(400).send({ error: 'Paramètres year/month invalides.' });
    }
    const pid = person_id ? Number(person_id) : undefined;
    if (person_id && isNaN(pid as number)) {
      return reply.code(400).send({ error: 'person_id invalide.' });
    }

    // Determine view mode
    const isPersonalView = !!pid;
    const budgetMethod = method === '50-30-20' ? '50-30-20' : '75-15-10';
    const savingsPct = budgetMethod === '75-15-10' ? 15 : 20;

    // ── INCOME ─────────────────────────────────────────────────────────────
    const totalHouseholdIncome = getEffectiveIncomeForMonth(db, y, m);
    const personalIncome = pid ? getEffectiveIncomeForMonth(db, y, m, pid) : totalHouseholdIncome;

    // ── FIXED CHARGES ──────────────────────────────────────────────────────
    const totalFixedCharges = getMonthFixedCharges(db, y, m);

    // Pro-rata personal contribution to common charges
    const personalFixedShare = isPersonalView && totalHouseholdIncome > 0
      ? (personalIncome / totalHouseholdIncome) * totalFixedCharges
      : totalFixedCharges;

    // ── PERSONAL CHARGES ───────────────────────────────────────────────────
    const personalCharges = getMonthPersonalCharges(db, y, m, pid);

    // ── SAVINGS ────────────────────────────────────────────────────────────
    // In personal view: use actual attributed deposits (person_id on transactions),
    // with pro-rata fallback only for unattributed entries.
    // In household view: all savings across all products.
    const proRatioForSavings = totalHouseholdIncome > 0 ? personalIncome / totalHouseholdIncome : 1;
    const personalSavingsKpi = isPersonalView && pid
      ? getPersonMonthSavings(db, y, m, pid, proRatioForSavings)
      : getMonthSavings(db, y, m);

    // ── REMAINING ─────────────────────────────────────────────────────────
    const totalCharges = isPersonalView
      ? personalFixedShare + personalCharges
      : totalFixedCharges + personalCharges;

    const remaining = (isPersonalView ? personalIncome : totalHouseholdIncome) - totalCharges - personalSavingsKpi;

    // ── HOUSEHOLD SPLIT ────────────────────────────────────────────────────
    const allPersons = db.prepare<[], { id: number; name: string; color: string; avatar: string | null }>('SELECT id, name, color, avatar FROM persons').all();
    const allIncomes = db.prepare<[], IncomeRow>('SELECT * FROM incomes WHERE is_active = 1').all();

    const personsWithIncome = allPersons.map(p => {
      const personIncome = allIncomes
        .filter(inc => inc.person_id === p.id && isActive(inc, y, m))
        .reduce((sum, inc) => sum + getEffectiveMonthlyIncome(db, inc, y, m), 0);
      return { ...p, effectiveIncome: personIncome };
    });

    const householdSplit = computeHouseholdSplit(personsWithIncome, totalFixedCharges);

    // Missing variable incomes
    const missingVariableIds = getMissingVariableIncomeIds(db, y, m);

    // ── PREV MONTH (for trends) ────────────────────────────────────────────
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    const prevIncome = getEffectiveIncomeForMonth(db, py, pm, pid);
    const prevFixed = getMonthFixedCharges(db, py, pm);
    const prevPersonal = getMonthPersonalCharges(db, py, pm, pid);
    const prevSavings = isPersonalView && pid
      ? getPersonMonthSavings(db, py, pm, pid, proRatioForSavings)
      : getMonthSavings(db, py, pm);
    const prevTotal = prevFixed + prevPersonal;
    const curTotal = totalFixedCharges + personalCharges;

    // ── EXPENSES BY CATEGORY ───────────────────────────────────────────────
    const fixedRows = db.prepare<[], ChargeRow>('SELECT * FROM fixed_charges WHERE is_active = 1').all()
      .filter(r => isActive(r, y, m));
    const personalRows = db.prepare<[], ChargeRow>('SELECT * FROM personal_charges WHERE is_active = 1').all()
      .filter(r => isActive(r, y, m) && (!pid || r.person_id === pid));

    const catMap: Record<string, number> = {};
    // Household view shows common charges only; personal charges belong exclusively
    // to each person's dashboard.
    const catRows = isPersonalView ? personalRows : fixedRows;
    for (const r of catRows) {
      const base = !isPersonalView
        ? getChargeAmountForMonth(r, y, m)
        : toMonthlyAmount(r.amount, r.frequency);
      catMap[r.category] = (catMap[r.category] || 0) + base;
    }

    const categoryLabels: Record<string, string> = {
      housing: 'Logement', energy: 'Énergie', food: 'Alimentation',
      insurance: 'Assurance', credit: 'Crédit', subscription: 'Abonnement',
      tax: 'Taxes', transport: 'Transport', health: 'Santé',
      childcare: 'Enfants', sport: 'Sport', education: 'Éducation',
      clothing: 'Vêtements', telecom: 'Téléphonie', other: 'Autre',
    };
    const expensesByCategory = Object.entries(catMap).map(([cat, amt]) => ({
      category: cat, amount: amt, label: categoryLabels[cat] || cat
    }));

    // ── MONTHLY COMPARISON (6 months) ─────────────────────────────────────
    const monthlyComparison = [];
    for (let i = 5; i >= 0; i--) {
      let cm = m - i; let cy = y;
      while (cm <= 0) { cm += 12; cy--; }
      const inc = getEffectiveIncomeForMonth(db, cy, cm, pid);
      let exp: number;
      if (isPersonalView && pid) {
        const totalInc = getEffectiveIncomeForMonth(db, cy, cm);
        const fixed = getMonthFixedCharges(db, cy, cm);
        const proRata = totalInc > 0 ? inc / totalInc : 0;
        exp = fixed * proRata + getMonthPersonalCharges(db, cy, cm, pid);
      } else {
        exp = getMonthFixedCharges(db, cy, cm) + getMonthPersonalCharges(db, cy, cm, pid);
      }
      monthlyComparison.push({ month: monthStr(cy, cm), income: inc, expenses: exp });
    }

    // ── SAVINGS EVOLUTION (12 months) ─────────────────────────────────────
    const savingsEvolution = [];
    for (let i = 11; i >= 0; i--) {
      let cm = m - i; let cy = y;
      while (cm <= 0) { cm += 12; cy--; }
      const endDate = `${cy}-${String(cm).padStart(2, '0')}-31`;
      let total: number;
      if (isPersonalView && pid) {
        // Personal history: only products owned by this person. Contributions to
        // common savings are deliberately excluded from this chart.
        const row = db.prepare<[string, number], { total: number }>(`
          SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) as total
          FROM savings_transactions
          WHERE date <= ? AND (
            savings_id IN (
              SELECT id FROM savings
              WHERE person_id = ? AND (is_common = 0 OR is_common IS NULL)
            )
          )
        `).get(endDate, pid);
        total = row?.total ?? 0;
      } else {
        // Household history includes every personal and common savings product.
        const row = db.prepare<[string], { total: number }>(`
          SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END), 0) as total
          FROM savings_transactions
          WHERE date <= ?
        `).get(endDate);
        total = row?.total ?? 0;
      }
      savingsEvolution.push({ month: monthStr(cy, cm), total });
    }

    // ── SAVINGS GOAL ───────────────────────────────────────────────────────
    let savingsGoalProgress: object;
    if (isPersonalView && pid) {
      // Personal view: target = advice method % × personal income
      const theoreticalTarget = round2(personalIncome * savingsPct / 100);
      const actualSavings = personalSavingsKpi;
      savingsGoalProgress = {
        target: theoreticalTarget,
        actual: round2(actualSavings),
        monthly_effort_required: 0,
        on_track: actualSavings >= theoreticalTarget,
        percentage: theoreticalTarget > 0 ? Math.min(100, round2((actualSavings / theoreticalTarget) * 100)) : 0,
        method: budgetMethod,
        savings_pct: savingsPct,
      };
    } else {
      // Household view: aggregate all savings goals
      const savingsGoalRows = db.prepare<[], { id: number; target_amount: number | null; target_date: string | null }>(
        'SELECT id, target_amount, target_date FROM savings WHERE target_amount IS NOT NULL'
      ).all();

      const allSavingsGoalTarget = savingsGoalRows.reduce((s, r) => s + (r.target_amount || 0), 0);
      const thisMonthSavings = getMonthSavings(db, y, m);

      const nowDate = new Date(y, m - 1, 1);
      let totalMonthlyEffortRequired = 0;
      for (const sg of savingsGoalRows) {
        if (!sg.target_amount) continue;
        const balance = getBalance(db, sg.id);
        const gap = Math.max(0, sg.target_amount - balance);
        if (sg.target_date) {
          const target = new Date(sg.target_date);
          const monthsLeft = Math.max(1, (target.getFullYear() - nowDate.getFullYear()) * 12 + (target.getMonth() - nowDate.getMonth()));
          totalMonthlyEffortRequired += gap / monthsLeft;
        } else {
          totalMonthlyEffortRequired += gap / 12;
        }
      }
      savingsGoalProgress = {
        target: allSavingsGoalTarget / 12,
        actual: thisMonthSavings,
        monthly_effort_required: round2(totalMonthlyEffortRequired),
        on_track: thisMonthSavings >= round2(totalMonthlyEffortRequired),
        percentage: allSavingsGoalTarget > 0 ? Math.min(100, (thisMonthSavings / (allSavingsGoalTarget / 12)) * 100) : 0,
      };
    }

    // ── RESTE À VIVRE (personal view only) ────────────────────────────────
    // = personal income - pro-rata fixed contribution - personal charges - personal savings
    const personalSavingsOnly = isPersonalView ? getMonthSavings(db, y, m, false, pid) : 0;
    const resteAVivre = isPersonalView
      ? personalIncome - personalFixedShare - personalCharges - personalSavingsOnly
      : null;

    return {
      view: isPersonalView ? 'personal' : 'household',
      kpis: {
        total_income: round2(isPersonalView ? personalIncome : totalHouseholdIncome),
        total_fixed_charges: round2(isPersonalView ? personalFixedShare : totalFixedCharges),
        total_personal_charges: round2(personalCharges),
        // In personal view: show savings attributed to this person (personal + pro-rata common)
        total_savings: round2(personalSavingsKpi),
        remaining: round2(remaining),
        reste_a_vivre: resteAVivre !== null ? round2(resteAVivre) : null,
        income_vs_prev_month: prevIncome > 0 ? round2((personalIncome - prevIncome) / prevIncome) : 0,
        charges_vs_prev_month: prevTotal > 0 ? round2((curTotal - prevTotal) / prevTotal) : 0,
        savings_vs_prev_month: prevSavings > 0 ? round2((personalSavingsKpi - prevSavings) / prevSavings) : 0,
      },
      household_split: householdSplit,
      missing_variable_income_ids: missingVariableIds,
      expenses_by_category: expensesByCategory,
      monthly_comparison: monthlyComparison,
      savings_evolution: savingsEvolution,
      savings_goal_progress: savingsGoalProgress,
    };
  });
}
