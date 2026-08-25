import { useState } from 'react';
import { Button } from '../ui/Button';
import { Account, Person, PersonalCharge } from '../../types';

interface Props {
  initial?: Partial<PersonalCharge>;
  persons: Person[];
  accounts: Account[];
  defaultPersonId?: number;
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

export function PersonalChargeForm({ initial, persons, accounts, defaultPersonId, onSubmit, onCancel }: Props) {
  const [personId, setPersonId] = useState(String(initial?.person_id || defaultPersonId || (persons[0]?.id ?? '')));
  const [label, setLabel] = useState(initial?.label || '');
  const [amount, setAmount] = useState(String(initial?.amount ?? ''));
  const [category, setCategory] = useState<PersonalCharge['category']>(initial?.category || 'other');
  const [frequency, setFrequency] = useState<PersonalCharge['frequency']>(initial?.frequency || 'monthly');
  const [accountId, setAccountId] = useState(String(initial?.account_id ?? ''));
  const [isActive, setIsActive] = useState(initial?.is_active !== 0);
  const [startMonth, setStartMonth] = useState(initial?.start_date?.slice(0, 7) || '');
  const [endMonth, setEndMonth] = useState(initial?.end_date?.slice(0, 7) || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        personId: Number(personId), label: label.trim(), amount: Number(amount), category, frequency,
        accountId: accountId ? Number(accountId) : null,
        isActive: isActive ? 1 : 0,
        startDate: startMonth ? `${startMonth}-01` : null,
        endDate: endMonth ? `${endMonth}-01` : null,
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
          <input value={label} onChange={e => setLabel(e.target.value)} required className="input w-full" placeholder="Ex: Abonnement sport" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Période d'application</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Premier mois</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Dernier mois inclus</label>
            <input type="month" value={endMonth} min={startMonth || undefined} onChange={e => setEndMonth(e.target.value)} className="input w-full" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">Laissez vide si la charge n'a pas encore de date de fin.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant (€) *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fréquence</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as PersonalCharge['frequency'])} className="input w-full">
            <option value="monthly">Mensuel</option>
            <option value="quarterly">Trimestriel</option>
            <option value="yearly">Annuel</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
          <select value={category} onChange={e => setCategory(e.target.value as PersonalCharge['category'])} className="input w-full">
            <option value="health">Santé</option>
            <option value="credit">Crédit</option>
            <option value="telecom">Téléphonie</option>
            <option value="sport">Sport</option>
            <option value="subscription">Abonnement</option>
            <option value="transport">Transport</option>
            <option value="education">Éducation</option>
            <option value="food">Alimentation</option>
            <option value="clothing">Vêtements</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Compte</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input w-full">
            <option value="">— Aucun —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
        <span className="text-sm text-slate-700 dark:text-slate-300">Actif</span>
      </label>
      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </form>
  );
}
