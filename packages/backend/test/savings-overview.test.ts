import { describe, expect, it } from 'vitest';
import { buildSavingsOverview } from '../../frontend/src/lib/savings-overview';
import type { Account, Person, Savings } from '../../frontend/src/types';

const persons: Person[] = [
  { id: 1, name: 'Parent', color: '#4F55F1', avatar: null, role: 'adult' },
  { id: 2, name: 'Child', color: '#007BC2', avatar: null, role: 'child' },
];
const account = (id: number, personId: number, balance: number): Account => ({
  id, person_id: personId, name: 'Account', type: 'savings', initial_balance: balance, icon: null, iban: null,
});
const savings = (id: number, personId: number | null, balance: number, accountId: number | null = null): Savings => ({
  id, person_id: personId, label: 'Book', type: 'livret', balance, account_id: accountId,
  is_common: personId === null ? 1 : 0, hosted_by_person_id: null, target_amount: null, target_date: null,
});

describe('Savings-page overview', () => {
  it('displays a child account even when no savings product exists', () => {
    const overview = buildSavingsOverview([], [account(10, 2, 250)], persons);
    expect(overview.childAccounts.map(a => a.id)).toEqual([10]);
    expect(overview.childTotal).toBe(250);
    expect(overview.total).toBe(250);
  });

  it('keeps child accounts visible alongside adult savings', () => {
    const overview = buildSavingsOverview([savings(1, 1, 100), savings(2, null, 200)], [account(10, 2, 250)], persons);
    expect(overview.personalSavings).toHaveLength(1);
    expect(overview.commonSavings).toHaveLength(1);
    expect(overview.childAccounts).toHaveLength(1);
    expect(overview.total).toBe(550);
  });

  it('uses a linked product balance without counting its account balance twice', () => {
    const overview = buildSavingsOverview([savings(1, 2, 300, 10)], [account(10, 2, 250)], persons);
    expect(overview.childSavings).toHaveLength(1);
    expect(overview.childAccounts).toEqual([]);
    expect(overview.personalSavings).toEqual([]);
    expect(overview.childTotal).toBe(300);
    expect(overview.total).toBe(300);
  });

  it('does not add ordinary adult checking/savings balances to the savings total', () => {
    const overview = buildSavingsOverview([savings(1, 1, 100)], [account(10, 1, 2000)], persons);
    expect(overview.childAccounts).toEqual([]);
    expect(overview.total).toBe(100);
  });

  it('counts all child products once when several share the same linked account', () => {
    const overview = buildSavingsOverview([savings(1, 2, 100, 10), savings(2, 2, 200, 10)], [account(10, 2, 250)], persons);
    expect(overview.childSavings).toHaveLength(2);
    expect(overview.childAccounts).toEqual([]);
    expect(overview.total).toBe(300);
  });
});
