import { useState } from 'react';
import { Button } from '../ui/Button';
import { Account, Person, Savings } from '../../types';
import { Home, UserRound } from 'lucide-react';

interface Props {
  initial?: Partial<Savings>;
  persons: Person[];
  accounts: Account[];
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

export function SavingsForm({ initial, persons, accounts, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initial?.label || '');
  const [type, setType] = useState<Savings['type']>(initial?.type || 'livret');
  const [targetAmount, setTargetAmount] = useState(String(initial?.target_amount ?? ''));
  const [targetDate, setTargetDate] = useState(initial?.target_date || '');
  const [accountId, setAccountId] = useState(String(initial?.account_id ?? ''));

  // Ownership: 'common' = household, 'personal' = belongs to a person
  const initialOwnership = initial?.is_common ? 'common' : 'personal';
  const [ownership, setOwnership] = useState<'common' | 'personal'>(initialOwnership);
  const [personId, setPersonId] = useState(String(initial?.person_id ?? (persons[0]?.id ?? '')));
  const [hostedByPersonId, setHostedByPersonId] = useState(String(initial?.hosted_by_person_id ?? ''));

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        label: label.trim(),
        type,
        targetAmount: targetAmount ? Number(targetAmount) : null,
        targetDate: targetDate || null,
        accountId: accountId ? Number(accountId) : null,
        isCommon: ownership === 'common' ? 1 : 0,
        personId: ownership === 'personal' && personId ? Number(personId) : null,
        hostedByPersonId: hostedByPersonId ? Number(hostedByPersonId) : null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} required className="input w-full" placeholder="Ex: Livret A" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as Savings['type'])} className="input w-full">
            <option value="livret">Livret</option>
            <option value="pea">PEA</option>
            <option value="assurance_vie">Assurance Vie</option>
            <option value="crypto">Crypto</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      {/* Objectif */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objectif (€)</label>
          <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} min="0" step="0.01" className="input w-full" placeholder="Optionnel" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date objectif</label>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="input w-full" />
        </div>
      </div>

      {/* Ownership */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Appartient à</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ownership"
              value="common"
              checked={ownership === 'common'}
              onChange={() => setOwnership('common')}
              className="accent-indigo-600"
            />
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"><Home size={15} /> Foyer (commun)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ownership"
              value="personal"
              checked={ownership === 'personal'}
              onChange={() => setOwnership('personal')}
              className="accent-indigo-600"
            />
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"><UserRound size={15} /> Personnel</span>
          </label>
        </div>
      </div>

      {/* Person selector (only for personal) */}
      {ownership === 'personal' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titulaire *</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)} required className="input w-full">
            {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Physical hosting + linked account */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hébergé chez</label>
          <select value={hostedByPersonId} onChange={e => setHostedByPersonId(e.target.value)} className="input w-full">
            <option value="">— Aucun —</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compte bancaire physique qui le détient</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Compte lié</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input w-full">
            <option value="">— Aucun —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </form>
  );
}
