import { useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { formatCurrency } from '../lib/formatters';
import { Transfer, Account } from '../types';

// ── Form ───────────────────────────────────────────────────────────────────────
const TransferFormSchema = z.object({
  fromAccountId: z.number({ error: 'Compte source requis' }).int().positive(),
  toAccountId:   z.number({ error: 'Compte destination requis' }).int().positive(),
  amount:        z.number({ error: 'Montant requis' }).positive('Montant doit être positif'),
  date:          z.string().min(1, 'Date requise'),
  label:         z.string().optional(),
  note:          z.string().optional(),
});

interface TransferFormProps {
  accounts: Account[];
  onSubmit: (data: object) => Promise<void>;
  onCancel: () => void;
}

function TransferForm({ accounts, onSubmit, onCancel }: TransferFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [toAccountId,   setToAccountId]   = useState<number | ''>('');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(today);
  const [label,   setLabel]   = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = TransferFormSchema.safeParse({
      fromAccountId: fromAccountId === '' ? undefined : Number(fromAccountId),
      toAccountId:   toAccountId   === '' ? undefined : Number(toAccountId),
      amount:        amount === '' ? undefined : Number(amount),
      date, label: label || undefined, note: note || undefined,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    if (result.data.fromAccountId === result.data.toAccountId) {
      setErrors({ toAccountId: 'Les deux comptes doivent être différents.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try { await onSubmit(result.data); }
    finally { setLoading(false); }
  };

  const field = (label: string, error?: string, children: React.ReactNode = null) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  const selectCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none';
  const inputCls  = `${selectCls}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('Compte source', errors.fromAccountId,
          <select className={selectCls} value={fromAccountId} onChange={e => setFromAccountId(Number(e.target.value))} required>
            <option value="">Sélectionner…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {field('Compte destination', errors.toAccountId,
          <select className={selectCls} value={toAccountId} onChange={e => setToAccountId(Number(e.target.value))} required>
            <option value="">Sélectionner…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('Montant (€)', errors.amount,
          <input className={inputCls} type="number" min="0.01" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        )}
        {field('Date', errors.date,
          <input className={inputCls} type="date" value={date} onChange={e => setDate(e.target.value)} required />
        )}
      </div>
      {field('Libellé (optionnel)', errors.label,
        <input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex : Alimentation épargne" />
      )}
      {field('Note (optionnel)', errors.note,
        <textarea className={`${inputCls} resize-none`} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Précisions…" />
      )}
      <div className="modal-actions flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Mobile card ────────────────────────────────────────────────────────────────
function TransferCard({ t, fromName, toName, onDelete }: {
  t: Transfer; fromName: string; toName: string; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-xl shrink-0">↔️</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">
          {t.label || `${fromName} → ${toName}`}
        </p>
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
          <span>{fromName}</span>
          <ArrowRight size={10} />
          <span>{toName}</span>
          <span className="mx-1">·</span>
          <span>{new Date(t.date).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(t.amount)}</span>
        <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={onDelete} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Transfers() {
  const { showToast } = useToast();
  const { data: accounts } = useApi(() => api.getAccounts(), []);
  const { data: transfers, loading, refetch } = useApi(() => api.getTransfers(), []);

  const [modalOpen, setModalOpen]   = useState(false);
  const [deleting,  setDeleting]    = useState<Transfer | null>(null);
  const [deleteLoading, setDL]      = useState(false);

  const accountName = (id: number) => accounts?.find(a => a.id === id)?.name ?? `#${id}`;

  const handleSubmit = async (data: object) => {
    try {
      await api.createTransfer(data);
      showToast('Virement enregistré');
      setModalOpen(false);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDL(true);
    try {
      await api.deleteTransfer(deleting.id);
      showToast('Virement supprimé');
      setDeleting(null);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setDL(false); }
  };

  const total = (transfers || []).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Virements internes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mouvements entre comptes — neutres pour le reste à vivre
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Plus size={16} />}>Nouveau</Button>
      </div>

      <Card>
        {loading ? <TableSkeleton /> : !transfers?.length ? (
          <EmptyState icon="↔️" title="Aucun virement" description="Enregistrez les mouvements entre vos comptes." action={{ label: 'Nouveau virement', onClick: () => setModalOpen(true) }} />
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden">
              {transfers.map(t => (
                <TransferCard key={t.id} t={t}
                  fromName={accountName(t.from_account_id)}
                  toName={accountName(t.to_account_id)}
                  onDelete={() => setDeleting(t)} />
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total viré</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Date', 'De', 'Vers', 'Libellé', 'Montant', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-3 text-slate-500">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300">{accountName(t.from_account_id)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-slate-500">
                          <ArrowRight size={12} />
                          <span>{accountName(t.to_account_id)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{t.label || '—'}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(t.amount)}</td>
                      <td className="px-3 py-3">
                        <Button variant="ghost" size="sm" icon={<Trash2 size={14} className="text-red-400" />} onClick={() => setDeleting(t)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={4} className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">Total viré</td>
                    <td className="px-3 py-3 font-bold text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau virement interne">
        <TransferForm accounts={accounts || []} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading}
        title="Supprimer le virement"
        message={`Supprimer le virement de ${deleting ? formatCurrency(deleting.amount) : ''} du ${deleting ? new Date(deleting.date).toLocaleDateString('fr-FR') : ''} ?`} />
    </div>
  );
}
