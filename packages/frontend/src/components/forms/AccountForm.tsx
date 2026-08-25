import { useState } from 'react';
import { Button } from '../ui/Button';
import { Account, Person } from '../../types';
import { Landmark, PiggyBank, BarChart3 } from 'lucide-react';

interface Props {
  initial?: Partial<Account>;
  persons: Person[];
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

export function AccountForm({ initial, persons, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<string>(initial?.type || 'checking');
  const [personId, setPersonId] = useState<string>(initial?.person_id ? String(initial.person_id) : '');
  const [initialBalance, setInitialBalance] = useState(String(initial?.initial_balance ?? 0));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        personId: personId ? Number(personId) : null,
        initialBalance: Number(initialBalance) || 0,
        icon: null,
      });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
        <input value={name} onChange={e => setName(e.target.value)} required className="input w-full" placeholder="Ex: Compte joint" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type *</label>
          <select value={type} onChange={e => setType(e.target.value)} className="input w-full">
            <option value="checking">Compte courant</option>
            <option value="savings">Épargne</option>
            <option value="investment">Investissement</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Personne</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)} className="input w-full">
            <option value="">Commun</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solde initial (€)</label>
        <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} step="0.01" className="input w-full" />
      </div>
      <div className="account-type-preview">
        {type === 'checking' ? <Landmark size={20}/> : type === 'savings' ? <PiggyBank size={20}/> : <BarChart3 size={20}/>}
        <span>L’icône est choisie automatiquement selon le type de compte.</span>
      </div>
      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </form>
  );
}
