export function isDemoMode(): boolean {
  return localStorage.getItem('budgetfoyer-mode') === 'demo';
}

export function setDemoMode(enabled: boolean): void {
  localStorage.setItem('budgetfoyer-mode', enabled ? 'demo' : 'personal');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const base = isDemoMode() ? '/demo/api' : '/api';
  const res = await fetch(`${base}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // ── PERSONS ──────────────────────────────────────────────────────────────
  getPersons: () => request<import('../types').Person[]>('/persons'),
  createPerson: (data: object) => request<import('../types').Person>('/persons', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id: number, data: object) => request<import('../types').Person>(`/persons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: (id: number) => request<void>(`/persons/${id}`, { method: 'DELETE' }),

  // ── ACCOUNTS ─────────────────────────────────────────────────────────────
  getAccounts: (params?: { person_id?: number }) => {
    const qs = params?.person_id ? `?person_id=${params.person_id}` : '';
    return request<import('../types').Account[]>(`/accounts${qs}`);
  },
  createAccount: (data: object) => request<import('../types').Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: object) => request<import('../types').Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) => request<void>(`/accounts/${id}`, { method: 'DELETE' }),

  // ── INCOMES ──────────────────────────────────────────────────────────────
  getIncomes: (params?: { person_id?: number }) => {
    const qs = params?.person_id ? `?person_id=${params.person_id}` : '';
    return request<import('../types').Income[]>(`/incomes${qs}`);
  },
  createIncome: (data: object) => request<import('../types').Income>('/incomes', { method: 'POST', body: JSON.stringify(data) }),
  updateIncome: (id: number, data: object) => request<import('../types').Income>(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reviseIncome: (id: number, data: object) => request<import('../types').Income>(`/incomes/${id}/revisions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteIncome: (id: number) => request<void>(`/incomes/${id}`, { method: 'DELETE' }),

  // ── INCOME OVERRIDES ─────────────────────────────────────────────────────
  getIncomeOverrides: (incomeId: number, params?: { year?: number }) => {
    const qs = params?.year ? `?year=${params.year}` : '';
    return request<import('../types').IncomeOverride[]>(`/incomes/${incomeId}/overrides${qs}`);
  },
  upsertIncomeOverride: (incomeId: number, data: { year: number; month: number; amount: number; note?: string | null }) =>
    request<import('../types').IncomeOverride>(`/incomes/${incomeId}/overrides`, { method: 'POST', body: JSON.stringify(data) }),
  updateIncomeOverride: (id: number, data: object) =>
    request<import('../types').IncomeOverride>(`/income-overrides/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncomeOverride: (id: number) => request<void>(`/income-overrides/${id}`, { method: 'DELETE' }),

  // ── EFFECTIVE INCOME ─────────────────────────────────────────────────────
  getEffectiveIncome: (params: { year: number; month: number; person_id?: number }) => {
    const qs = new URLSearchParams({
      year: String(params.year),
      month: String(params.month),
      ...(params.person_id ? { person_id: String(params.person_id) } : {}),
    });
    return request<import('../types').EffectiveIncomeData>(`/incomes/effective?${qs}`);
  },

  // ── FIXED CHARGES ─────────────────────────────────────────────────────────
  getFixedCharges: () => request<import('../types').FixedCharge[]>('/fixed-charges'),
  createFixedCharge: (data: object) => request<import('../types').FixedCharge>('/fixed-charges', { method: 'POST', body: JSON.stringify(data) }),
  updateFixedCharge: (id: number, data: object) => request<import('../types').FixedCharge>(`/fixed-charges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFixedCharge: (id: number) => request<void>(`/fixed-charges/${id}`, { method: 'DELETE' }),

  // ── PERSONAL CHARGES ──────────────────────────────────────────────────────
  getPersonalCharges: (params?: { person_id?: number }) => {
    const qs = params?.person_id ? `?person_id=${params.person_id}` : '';
    return request<import('../types').PersonalCharge[]>(`/personal-charges${qs}`);
  },
  createPersonalCharge: (data: object) => request<import('../types').PersonalCharge>('/personal-charges', { method: 'POST', body: JSON.stringify(data) }),
  updatePersonalCharge: (id: number, data: object) => request<import('../types').PersonalCharge>(`/personal-charges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePersonalCharge: (id: number) => request<void>(`/personal-charges/${id}`, { method: 'DELETE' }),

  // ── SAVINGS ───────────────────────────────────────────────────────────────
  getSavings: (params?: { person_id?: number; common?: boolean }) => {
    const p = new URLSearchParams();
    if (params?.person_id) p.set('person_id', String(params.person_id));
    if (params?.common) p.set('common', '1');
    const qs = p.toString() ? `?${p}` : '';
    return request<import('../types').Savings[]>(`/savings${qs}`);
  },
  getSavingsById: (id: number) => request<import('../types').Savings>(`/savings/${id}`),
  createSavings: (data: object) => request<import('../types').Savings>('/savings', { method: 'POST', body: JSON.stringify(data) }),
  updateSavings: (id: number, data: object) => request<import('../types').Savings>(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavings: (id: number) => request<void>(`/savings/${id}`, { method: 'DELETE' }),

  // ── SAVINGS TRANSACTIONS ──────────────────────────────────────────────────
  getSavingsTransactions: (savingsId: number, params?: { type?: 'deposit' | 'withdrawal' }) => {
    const qs = params?.type ? `?type=${params.type}` : '';
    return request<import('../types').SavingsTransaction[]>(`/savings/${savingsId}/transactions${qs}`);
  },
  createSavingsTransaction: (savingsId: number, data: object) =>
    request<import('../types').SavingsTransaction>(`/savings/${savingsId}/transactions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsTransaction: (txId: number, data: object) =>
    request<import('../types').SavingsTransaction>(`/savings/transactions/${txId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavingsTransaction: (txId: number) => request<void>(`/savings/transactions/${txId}`, { method: 'DELETE' }),

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  getDashboard: (params: { year: number; month: number; person_id?: number; method?: string }) => {
    const qs = new URLSearchParams({
      year: String(params.year),
      month: String(params.month),
      ...(params.person_id ? { person_id: String(params.person_id) } : {}),
      ...(params.method ? { method: params.method } : {}),
    });
    return request<import('../types').DashboardData>(`/dashboard?${qs}`);
  },

  // ── ADVICE ────────────────────────────────────────────────────────────────
  getAdvice: (params: { year: number; month: number; method: '50-30-20' | '75-15-10'; person_id: number }) => {
    const qs = new URLSearchParams({
      year: String(params.year),
      month: String(params.month),
      method: params.method,
      person_id: String(params.person_id),
    });
    return request<import('../types').BudgetAdvice>(`/advice?${qs}`);
  },

  // ── TRANSFERS ────────────────────────────────────────────────────────────
  getTransfers: (params?: { account_id?: number; from_date?: string; to_date?: string }) => {
    const p = new URLSearchParams();
    if (params?.account_id) p.set('account_id', String(params.account_id));
    if (params?.from_date)  p.set('from_date', params.from_date);
    if (params?.to_date)    p.set('to_date',   params.to_date);
    const qs = p.toString() ? `?${p}` : '';
    return request<import('../types').Transfer[]>(`/transfers${qs}`);
  },
  createTransfer: (data: object) =>
    request<import('../types').Transfer>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  updateTransfer: (id: number, data: object) =>
    request<import('../types').Transfer>(`/transfers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransfer: (id: number) => request<void>(`/transfers/${id}`, { method: 'DELETE' }),

  // ── ACTUAL EXPENSES ───────────────────────────────────────────────────────
  getActualExpenses: (params?: { year?: number; month?: number; person_id?: number }) => {
    const p = new URLSearchParams();
    if (params?.year)      p.set('year',      String(params.year));
    if (params?.month)     p.set('month',     String(params.month));
    if (params?.person_id) p.set('person_id', String(params.person_id));
    const qs = p.toString() ? `?${p}` : '';
    return request<import('../types').ActualExpense[]>(`/actual-expenses${qs}`);
  },
  getActualExpensesSummary: (params: { year: number; month: number; person_id?: number }) => {
    const p = new URLSearchParams({ year: String(params.year), month: String(params.month) });
    if (params.person_id) p.set('person_id', String(params.person_id));
    return request<{ year: number; month: number; summary: import('../types').ActualExpenseSummaryItem[] }>(
      `/actual-expenses/summary?${p}`
    );
  },
  createActualExpense: (data: object) =>
    request<import('../types').ActualExpense>('/actual-expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateActualExpense: (id: number, data: object) =>
    request<import('../types').ActualExpense>(`/actual-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteActualExpense: (id: number) => request<void>(`/actual-expenses/${id}`, { method: 'DELETE' }),

  // ── INCOME HISTORY ────────────────────────────────────────────────────────
  getIncomeHistory: (params: { year_from: number; month_from: number; year_to: number; month_to: number; person_id?: number }) => {
    const p = new URLSearchParams({
      year_from:  String(params.year_from),
      month_from: String(params.month_from),
      year_to:    String(params.year_to),
      month_to:   String(params.month_to),
    });
    if (params.person_id) p.set('person_id', String(params.person_id));
    return request<{ history: import('../types').IncomeHistoryPoint[] }>(`/incomes/history?${p}`);
  },

  // ── DATA MANAGEMENT ───────────────────────────────────────────────────────
  exportData: () => request<object>('/export'),
  importData: (data: object) => request<{ success: boolean; message: string }>('/import', { method: 'POST', body: JSON.stringify(data) }),
  resetData: () => request<{ success: boolean }>('/data/reset', { method: 'DELETE' }),
};
