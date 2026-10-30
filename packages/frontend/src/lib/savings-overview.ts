import type { Account, Person, Savings } from '../types';

/** Account-only balances remain visible without manufacturing transaction history. */
export function buildSavingsOverview(savings: Savings[], accounts: Account[], persons: Person[]) {
  const children = new Set(persons.filter(p => p.role === 'child').map(p => p.id));
  const linkedAccounts = new Set(savings.map(s => s.account_id).filter(id => id !== null));
  const commonSavings = savings.filter(s => s.is_common);
  const childSavings = savings.filter(s => !s.is_common && s.person_id !== null && children.has(s.person_id));
  const personalSavings = savings.filter(s => !s.is_common && (s.person_id === null || !children.has(s.person_id)));
  const childAccounts = accounts.filter(a => a.person_id !== null && children.has(a.person_id) && !linkedAccounts.has(a.id));
  const childTotal = childSavings.reduce((sum, s) => sum + s.balance, 0)
    + childAccounts.reduce((sum, a) => sum + a.initial_balance, 0);
  const total = savings.reduce((sum, s) => sum + s.balance, 0)
    + childAccounts.reduce((sum, a) => sum + a.initial_balance, 0);
  return { commonSavings, personalSavings, childSavings, childAccounts, childTotal, total };
}
