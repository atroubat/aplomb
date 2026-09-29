import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Person, Account, Income } from '../../types';

interface Props {
  initial?: Partial<Income>;
  persons: Person[];
  accounts: Account[];
  effectiveFrom?: string;
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

export function IncomeForm({ initial, persons, accounts, effectiveFrom: initialEffectiveFrom, onSubmit, onCancel }: Props) {
  const [personId, setPersonId] = useState(String(initial?.person_id || (persons[0]?.id ?? '')));
  const [label, setLabel] = useState(initial?.label || '');
  const [amount, setAmount] = useState(String(initial?.amount ?? ''));
  const [frequency, setFrequency] = useState<Income['frequency']>(initial?.frequency || 'monthly');
  const [accountId, setAccountId] = useState(String(initial?.account_id ?? ''));
  const [isActive, setIsActive] = useState(initial?.is_active !== 0);
  const [isVariable, setIsVariable] = useState(!!initial?.is_variable);
  const [effectiveFrom, setEffectiveFrom] = useState(initialEffectiveFrom ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        personId: Number(personId), label: label.trim(),
        amount: Number(amount), frequency,
        accountId: accountId ? Number(accountId) : null,
        isActive: isActive ? 1 : 0,
        isVariable: isVariable ? 1 : 0,
        ...(initial?.id ? { effectiveFrom } : {}),
      });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Personne *</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)} required className="input w-full">
            {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} required className="input w-full" placeholder="Ex: Salaire" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Montant de base (€) *
          </label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            required min="0.01" step="0.01" className="input w-full"
          />
          {isVariable && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Utilisé si le montant du mois n'est pas saisi
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fréquence</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as Income['frequency'])} className="input w-full">
            <option value="monthly">Mensuel</option>
            <option value="quarterly">Trimestriel</option>
            <option value="yearly">Annuel</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Compte</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input w-full">
          <option value="">— Aucun —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {initial?.id && (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-accent-soft)] p-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1" htmlFor="income-effective-from">
            Appliquer cette actualisation à partir de *
          </label>
          <input
            id="income-effective-from"
            type="month"
            value={effectiveFrom}
            onChange={e => setEffectiveFrom(e.target.value)}
            required
            className="input w-full"
          />
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Le revenu précédent est conservé jusqu’au mois précédent : les budgets passés restent inchangés.
          </p>
        </div>
      )}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Actif</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isVariable} onChange={e => setIsVariable(e.target.checked)} className="rounded" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            <><TrendingUp size={14} aria-hidden="true"/> Revenu variable</>
          </span>
        </label>
      </div>
      {isVariable && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
          Un revenu variable doit être saisi chaque mois. Sans saisie, il est compté à 0 pour ce mois.
        </div>
      )}
      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </form>
  );
}
