import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useFilters } from '../contexts/FilterContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { formatCurrency, categoryIcons, categoryLabels } from '../lib/formatters';
import { ActualExpense, ActualExpenseSummaryItem } from '../types';

// ── Variance badge ─────────────────────────────────────────────────────────────
function VarianceBadge({ status, variance }: { status: string; variance: number }) {
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      <Minus size={10} /> équilibré
    </span>
  );
  if (status === 'over') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <TrendingUp size={10} /> +{formatCurrency(Math.abs(variance))} dépassé
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <TrendingDown size={10} /> -{formatCurrency(Math.abs(variance))} économisé
    </span>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function BudgetBar({ planned, actual }: { planned: number; actual: number }) {
  if (planned === 0 && actual === 0) return null;
  const max = Math.max(planned, actual);
  const pct = max > 0 ? (actual / max) * 100 : 0;
  const over = actual > planned;
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1 relative overflow-hidden">
      {planned > 0 && (
        <div className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-slate-600 rounded-full"
          style={{ width: `${(planned / max) * 100}%` }} />
      )}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-red-400' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Add expense form ───────────────────────────────────────────────────────────
interface AddExpenseFormProps {
  year: number;
  month: number;
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

const ALL_CATEGORIES = [
  'housing', 'energy', 'food', 'insurance', 'credit', 'subscription',
  'tax', 'transport', 'health', 'childcare', 'sport', 'education',
  'clothing', 'telecom', 'other',
];

function AddExpenseForm({ year, month, onSubmit, onCancel }: AddExpenseFormProps) {
  const [category, setCategory] = useState('');
  const [amount,   setAmount]   = useState('');
  const [label,    setLabel]    = useState('');
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    setLoading(true);
    try {
      await onSubmit({ category, amount: Number(amount), year, month, label: label || null, note: note || null });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
        <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)} required>
          <option value="">Sélectionner…</option>
          {ALL_CATEGORIES.map(c => (
            <option key={c} value={c}>{categoryIcons[c] || '📦'} {categoryLabels[c] || c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant réel (€)</label>
          <input className={inputCls} type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Libellé</label>
          <input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} placeholder="Optionnel" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note</label>
        <textarea className={`${inputCls} resize-none`} rows={2} value={note}
          onChange={e => setNote(e.target.value)} placeholder="Détails…" />
      </div>
      <div className="modal-actions flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Summary card per category ──────────────────────────────────────────────────
function SummaryRow({ item, onAddReal }: { item: ActualExpenseSummaryItem; onAddReal: () => void }) {
  const icon  = categoryIcons[item.category]  || '📦';
  const label = categoryLabels[item.category] || item.category;

  return (
    <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{label}</p>
            <VarianceBadge status={item.status} variance={item.variance} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.actual)}</p>
          <p className="text-xs text-slate-400">/ {formatCurrency(item.planned)} prévu</p>
        </div>
      </div>
      <BudgetBar planned={item.planned} actual={item.actual} />
      {item.actual === 0 && (
        <button onClick={onAddReal} className="mt-2 text-xs text-indigo-500 hover:underline">
          + Saisir le réel
        </button>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ActualExpenses() {
  const { showToast } = useToast();
  const { year, month } = useFilters();

  const { data: summary, loading: loadingSummary, refetch: refetchSummary } = useApi(
    () => api.getActualExpensesSummary({ year, month }),
    [year, month]
  );
  const { data: expenses, loading: loadingList, refetch: refetchList } = useApi(
    () => api.getActualExpenses({ year, month }),
    [year, month]
  );

  const [modalOpen, setModalOpen]    = useState(false);
  const [preCategory, setPreCategory] = useState<string | undefined>();
  const [deleting, setDeleting]      = useState<ActualExpense | null>(null);
  const [deleteLoading, setDL]       = useState(false);

  const refetch = () => { refetchSummary(); refetchList(); };

  const openAdd = (cat?: string) => { setPreCategory(cat); setModalOpen(true); };

  const handleSubmit = async (data: object) => {
    try {
      await api.createActualExpense(data);
      showToast('Dépense réelle enregistrée');
      setModalOpen(false);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDL(true);
    try {
      await api.deleteActualExpense(deleting.id);
      showToast('Dépense supprimée');
      setDeleting(null);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setDL(false); }
  };

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Totals from summary
  const totalPlanned = (summary?.summary || []).reduce((s, r) => s + r.planned, 0);
  const totalActual  = (summary?.summary || []).reduce((s, r) => s + r.actual,  0);
  const totalVariance = totalActual - totalPlanned;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Dépenses réelles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{monthName} — budget prévu vs réel</p>
        </div>
        <Button onClick={() => openAdd()} icon={<Plus size={16} />}>Saisir</Button>
      </div>

      {/* KPI recap */}
      {!loadingSummary && summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Budget prévu', value: totalPlanned, color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Dépensé réel', value: totalActual,  color: totalActual > totalPlanned ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Écart',        value: totalVariance, color: totalVariance > 0 ? 'text-red-500' : totalVariance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500' },
          ].map(kpi => (
            <Card key={kpi.label}>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>
                {kpi.label === 'Écart' && totalVariance > 0 ? '+' : ''}{formatCurrency(kpi.value)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison par catégorie */}
      <Card>
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 px-4 pt-4 pb-2">Par catégorie</h2>
        {loadingSummary ? <TableSkeleton /> : !summary?.summary.length ? (
          <EmptyState icon="📊" title="Aucune donnée" description="Aucune charge ni dépense réelle ce mois." action={{ label: 'Saisir une dépense', onClick: () => openAdd() }} />
        ) : (
          summary.summary.map(item => (
            <SummaryRow key={item.category} item={item} onAddReal={() => openAdd(item.category)} />
          ))
        )}
      </Card>

      {/* Liste des saisies réelles */}
      {!!(expenses?.length) && (
        <Card>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 px-4 pt-4 pb-2">
            Saisies du mois ({expenses.length})
          </h2>
          {loadingList ? <TableSkeleton /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Catégorie', 'Libellé', 'Montant', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span>{categoryIcons[e.category] || '📦'}</span>
                          <span className="text-slate-600 dark:text-slate-400">{categoryLabels[e.category] || e.category}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{e.label || '—'}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={() => setDeleting(e)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Saisir une dépense réelle">
        <AddExpenseForm year={year} month={month} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="Supprimer la saisie"
        message={`Supprimer ${deleting ? formatCurrency(deleting.amount) : ''} en ${deleting ? (categoryLabels[deleting.category] || deleting.category) : ''} ?`} />
    </div>
  );
}
