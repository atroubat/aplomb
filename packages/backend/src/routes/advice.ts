import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { toMonthlyAmount, getEffectiveMonthlyIncome, isActiveInMonth, getChargeAmountForMonth, getPersonMonthSavings } from '../utils/monthly-calc.js';
import { computeAdvice, BudgetMethod } from '../utils/budget-methods.js';
import { round2 } from '../utils/money.js';

type Frequency = 'monthly' | 'quarterly' | 'yearly';
type IncomeRow = {
  id: number; person_id: number; amount: number; frequency: Frequency;
  is_active: number; is_variable: number; start_date: string | null; end_date: string | null;
};
type ChargeRow = {
  person_id?: number; amount: number; frequency: Frequency; category: string;
  is_active: number; is_smoothed?: number; start_date: string | null; end_date: string | null;
};

function isActive(row: { is_active: number; start_date: string | null; end_date: string | null }, y: number, m: number) {
  return isActiveInMonth({ isActive: row.is_active, startDate: row.start_date, endDate: row.end_date }, y, m);
}

export async function adviceRoutes(app: FastifyInstance, db: Database.Database) {
  app.get('/api/advice', async (req, reply) => {
    const { year, month, method, person_id } = req.query as {
      year?: string; month?: string; method?: string; person_id?: string;
    };

    // person_id is required for personal-dimension advice
    if (!person_id) {
      return reply.code(400).send({
        error: 'person_id est requis. Sélectionnez une personne pour voir vos conseils budgétaires personnalisés.',
      });
    }

    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) : now.getMonth() + 1;
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return reply.code(400).send({ error: 'Paramètres year/month invalides.' });
    }
    const budgetMethod: BudgetMethod = (method === '75-15-10' ? '75-15-10' : '50-30-20');
    const pid = Number(person_id);
    if (isNaN(pid)) return reply.code(400).send({ error: 'person_id invalide.' });

    // ── EFFECTIVE PERSONAL INCOME ──────────────────────────────────────────
    const allIncomes = db.prepare<[], IncomeRow>('SELECT * FROM incomes WHERE is_active = 1').all();
    const allPersonIncomes = allIncomes.filter(r => r.person_id === pid && isActive(r, y, m));
    const personalIncome = allPersonIncomes.reduce(
      (sum, r) => sum + getEffectiveMonthlyIncome(db, r, y, m), 0
    );

    // Total household income for pro-rata calculation
    const totalHouseholdIncome = allIncomes
      .filter(r => isActive(r, y, m))
      .reduce((sum, r) => sum + getEffectiveMonthlyIncome(db, r, y, m), 0);

    const proRataRatio = totalHouseholdIncome > 0 ? personalIncome / totalHouseholdIncome : 0;

    // ── NEEDS ─────────────────────────────────────────────────────────────
    // Needs = pro-rata share of common fixed charges + personal essential charges
    // Use getChargeAmountForMonth so is_smoothed=0 (cash-flow) charges match the dashboard.
    const fixedRows = db.prepare<[], ChargeRow>('SELECT * FROM fixed_charges WHERE is_active = 1').all()
      .filter(r => isActive(r, y, m));
    const totalFixedCharges = fixedRows.reduce((sum, r) => sum + getChargeAmountForMonth(r, y, m), 0);
    const personalFixedShare = totalFixedCharges * proRataRatio;

    const essentialCategories = ['health', 'transport', 'education', 'credit', 'telecom', 'subscription'];
    const personalRows = db.prepare<[number], ChargeRow>(
      'SELECT * FROM personal_charges WHERE is_active = 1 AND person_id = ?'
    ).all(pid).filter(r => isActive(r, y, m));

    const needsPersonal = personalRows
      .filter(r => essentialCategories.includes(r.category))
      .reduce((sum, r) => sum + toMonthlyAmount(r.amount, r.frequency), 0);

    const needsAmount = personalFixedShare + needsPersonal;

    // ── SAVINGS ───────────────────────────────────────────────────────────
    const savingsAmount = getPersonMonthSavings(db, y, m, pid, proRataRatio);

    // ── WANTS ─────────────────────────────────────────────────────────────
    // Loisirs réels = reste après besoins + épargne (on ne tracke pas les dépenses loisirs)
    const wantsAmount = Math.max(0, personalIncome - needsAmount - savingsAmount);

    const advice = computeAdvice(budgetMethod, round2(personalIncome), round2(needsAmount), round2(wantsAmount), round2(savingsAmount));
    return {
      ...advice,
      meta: {
        personId: pid,
        personalIncome: round2(personalIncome),
        totalHouseholdIncome: round2(totalHouseholdIncome),
        proRataRatio: round2(proRataRatio),
        personalFixedShare: round2(personalFixedShare),
      },
    };
  });
}
