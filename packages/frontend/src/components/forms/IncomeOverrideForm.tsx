import { useState } from 'react';
import { Button } from '../ui/Button';
import { Income, IncomeOverride } from '../../types';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  income: Income;
  existingOverride?: IncomeOverride | null;
  year: number;
  month: number;
  onSubmit: (data: { year: number; month: number; amount: number; note?: string | null }) => Promise<void>;
  onCancel: () => void;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function IncomeOverrideForm({ income, existingOverride, year, month, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(String(existingOverride?.amount ?? income.amount));
  const [note, setNote] = useState(existingOverride?.note ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ year, month, amount: Number(amount), note: note.trim() || null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
        <p className="font-medium">{income.label}</p>
        <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-400">
          Montant habituel : {formatCurrency(income.amount)} — ajustement pour {MONTH_NAMES[month - 1]} {year} uniquement
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Montant à utiliser ce mois (€) *
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min="0"
          step="0.01"
          className="input w-full"
          placeholder="Ex: 2850.00"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Note (optionnel)
        </label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          className="input w-full"
          placeholder="Ex: Bonus inclus, arrêt maladie…"
        />
      </div>

      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>
          {existingOverride ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
