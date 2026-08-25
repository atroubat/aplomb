import { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Person, SavingsTransaction } from '../../types';
import { ArrowDownToLine, ArrowUpFromLine, Save, UserRound, UsersRound } from 'lucide-react';

interface Props {
  type: 'deposit' | 'withdrawal';
  balance: number;
  persons: Person[];
  isCommon: boolean;
  defaultPersonId?: number | null;
  initial?: SavingsTransaction;
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

const WITHDRAWAL_REASONS = ['Vacances', 'Urgence', 'Achat important', 'Transfert', 'Autre'];

export function SavingsTransactionForm({ type, balance, persons, isCommon, defaultPersonId, initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState(() => {
    if (!initial?.reason) return '';
    return WITHDRAWAL_REASONS.includes(initial.reason) ? initial.reason : 'Autre';
  });
  const [customReason, setCustomReason] = useState(() => {
    if (!initial?.reason) return '';
    return WITHDRAWAL_REASONS.includes(initial.reason) ? '' : initial.reason;
  });
  const [note, setNote] = useState(initial?.note ?? '');
  const [personId, setPersonId] = useState<string>(() => {
    if (initial?.person_id) return String(initial.person_id);
    if (!isCommon && defaultPersonId) return String(defaultPersonId);
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!initial;
  const effectiveType = initial?.type ?? type;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (effectiveType === 'withdrawal' && !isEditing && amt > balance) {
      setError(`Montant supérieur au solde disponible (${formatCurrency(balance)})`);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        type: effectiveType,
        amount: amt,
        date,
        reason: effectiveType === 'withdrawal' ? (reason === 'Autre' ? customReason : reason) || null : null,
        note: note || null,
        personId: personId ? Number(personId) : null,
      });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {effectiveType === 'withdrawal' && !isEditing && (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-sm">
          Solde disponible : <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(balance)}</span>
        </div>
      )}

      {/* Person selector */}
      {persons.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">À qui attribuer ce mouvement ?</label>
          <div className="flex gap-2 flex-wrap">
            {isCommon && (
              <button
                type="button"
                onClick={() => setPersonId('')}
                className={`savings-attribution-option px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  personId === ''
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)]'
                    : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                }`}
              >
                <UsersRound size={14}/> Foyer
              </button>
            )}
            {persons.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersonId(String(p.id))}
                className={`savings-attribution-option px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  personId === String(p.id)
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                }`}
                style={personId === String(p.id) ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                <UserRound size={14}/> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant (€) *</label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            required min="0.01" step="0.01"
            max={effectiveType === 'withdrawal' && !isEditing ? balance : undefined}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input w-full" />
        </div>
      </div>

      {effectiveType === 'withdrawal' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motif</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="input w-full">
            <option value="">— Sélectionner —</option>
            {WITHDRAWAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {reason === 'Autre' && (
            <input value={customReason} onChange={e => setCustomReason(e.target.value)} className="input w-full mt-2" placeholder="Préciser le motif..." />
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="input w-full resize-none" placeholder="Optionnel..." />
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg p-3">{error}</p>}

      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button
          type="submit"
          variant={effectiveType === 'withdrawal' ? 'danger' : 'success'}
          loading={loading}
          icon={isEditing ? <Save size={15}/> : effectiveType === 'deposit' ? <ArrowDownToLine size={15}/> : <ArrowUpFromLine size={15}/>}
        >
          {isEditing ? 'Enregistrer' : effectiveType === 'deposit' ? 'Verser' : 'Retirer'}
        </Button>
      </div>
    </form>
  );
}
