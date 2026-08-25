export interface Person {
  id: number;
  name: string;
  color: string;
  avatar: string | null;
  created_at?: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  person_id: number | null;
  initial_balance: number;
  icon: string | null;
  /** IBAN for future banking sync (GoCardless/Powens) */
  iban: string | null;
  created_at?: string;
}

export interface Income {
  id: number;
  person_id: number;
  label: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  account_id: number | null;
  is_active: number;
  is_variable: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface IncomeOverride {
  id: number;
  income_id: number;
  year: number;
  month: number;
  amount: number;
  note: string | null;
  created_at?: string;
}

export interface FixedCharge {
  id: number;
  label: string;
  amount: number;
  category: 'housing' | 'energy' | 'food' | 'insurance' | 'credit' | 'subscription' | 'tax' | 'transport' | 'health' | 'childcare' | 'other';
  frequency: 'monthly' | 'quarterly' | 'yearly';
  account_id: number | null;
  is_active: number;
  /** 1 = monthly equivalent spread every month (default). 0 = cash-flow: full amount only in falling month(s). */
  is_smoothed: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface PersonalCharge {
  id: number;
  person_id: number;
  label: string;
  amount: number;
  category: 'health' | 'sport' | 'subscription' | 'transport' | 'education' | 'food' | 'clothing' | 'credit' | 'telecom' | 'other';
  frequency: 'monthly' | 'quarterly' | 'yearly';
  account_id: number | null;
  is_active: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface Savings {
  id: number;
  label: string;
  type: 'livret' | 'pea' | 'assurance_vie' | 'crypto' | 'other';
  target_amount: number | null;
  target_date: string | null;
  account_id: number | null;
  /** Ownership: null/0 = personal (person_id), 1 = common household */
  person_id: number | null;
  is_common: number;
  /** Which person's account physically hosts this savings product */
  hosted_by_person_id: number | null;
  balance: number;
  created_at?: string;
}

export interface SavingsTransaction {
  id: number;
  savings_id: number;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  reason: string | null;
  note: string | null;
  person_id: number | null;
  created_at?: string;
}

export interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  label: string | null;
  note: string | null;
  created_at?: string;
}

export interface ActualExpense {
  id: number;
  person_id: number | null;
  category: string;
  amount: number;
  year: number;
  month: number;
  label: string | null;
  note: string | null;
  created_at?: string;
}

export interface ActualExpenseSummaryItem {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  status: 'ok' | 'over' | 'under';
}

export interface IncomeHistoryPoint {
  year: number;
  month: number;
  person_id?: number;
  total: number;
}

export interface PersonSplit {
  personId: number;
  name: string;
  color: string;
  avatar: string | null;
  effectiveIncome: number;
  sharePercent: number;
  commonChargeShare: number;
}

export interface HouseholdSplit {
  totalHouseholdIncome: number;
  totalCommonCharges: number;
  persons: PersonSplit[];
}

export interface DashboardData {
  view: 'household' | 'personal';
  kpis: {
    total_income: number;
    total_fixed_charges: number;
    total_personal_charges: number;
    total_savings: number;
    remaining: number;
    reste_a_vivre: number | null;
    income_vs_prev_month: number;
    charges_vs_prev_month: number;
    savings_vs_prev_month: number;
  };
  household_split: HouseholdSplit;
  missing_variable_income_ids: number[];
  expenses_by_category: Array<{ category: string; amount: number; label: string }>;
  monthly_comparison: Array<{ month: string; income: number; expenses: number }>;
  savings_evolution: Array<{ month: string; total: number }>;
  savings_goal_progress: {
    target: number;
    actual: number;
    percentage: number;
    monthly_effort_required: number;
    on_track: boolean;
    method?: string;
    savings_pct?: number;
  };
}

export interface BudgetAdvice {
  method: string;
  totalIncome: number;
  theoretical: {
    needs: { percentage: number; amount: number };
    wants: { percentage: number; amount: number };
    savings: { percentage: number; amount: number };
  };
  actual: {
    needs: { amount: number; percentage: number };
    wants: { amount: number; percentage: number };
    savings: { amount: number; percentage: number };
  };
  gaps: {
    needs: { amount: number; status: string };
    wants: { amount: number; status: string };
    savings: { amount: number; status: string };
  };
  recommendedSavingsThisMonth: number;
  availableForLeisure: number;
  tips: string[];
  meta?: {
    personId: number;
    personalIncome: number;
    totalHouseholdIncome: number;
    proRataRatio: number;
    personalFixedShare: number;
  };
}

export interface EffectiveIncomeData {
  year: number;
  month: number;
  byPerson: Record<number, number>;
  perIncome: Array<{
    id: number;
    personId: number;
    label: string;
    effectiveAmount: number;
    isVariable: number;
  }>;
  missingVariableIds: number[];
  total: number;
}

export type Frequency = 'monthly' | 'quarterly' | 'yearly';
