import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Home as House, UserRound, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useFilters } from '../contexts/FilterContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { SavingsForm } from '../components/forms/SavingsForm';
import { SavingsTransactionForm } from '../components/forms/SavingsTransactionForm';
import { SavingsLineChart } from '../components/charts/SavingsLineChart';
import { formatCurrency, formatDate, savingsTypeLabels } from '../lib/formatters';
import { DashboardData, Savings, SavingsTransaction, Person } from '../types';

export default function SavingsPage() {
  const { showToast } = useToast();
  const { year, month } = useFilters();
  const { data: savingsList, loading, refetch } = useApi(() => api.getSavings(), []);
  const { data: dashboard, refetch: refetchEvolution } = useApi<DashboardData>(
    () => api.getDashboard({ year, month }),
    [year, month]
  );
  const { data: persons } = useApi<Person[]>(() => api.getPersons(), []);
  const { data: accounts } = useApi(() => api.getAccounts(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Savings | null>(null);
  const [deleting, setDeleting] = useState<Savings | null>(null);
  const [txModal, setTxModal] = useState<{ savings: Savings; type: 'deposit' | 'withdrawal' } | null>(null);
  const [editingTx, setEditingTx] = useState<{ tx: SavingsTransaction; savings: Savings } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSavingsSubmit = async (data: object) => {
    try {
      if (editing) { await api.updateSavings(editing.id, data); showToast('Épargne mise à jour'); }
      else { await api.createSavings(data); showToast('Produit d\'épargne créé'); }
      setModalOpen(false); refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleTxSubmit = async (data: object) => {
    if (!txModal) return;
    try {
      await api.createSavingsTransaction(txModal.savings.id, data);
      showToast(txModal.type === 'deposit' ? 'Versement enregistré !' : 'Retrait enregistré !');
      setTxModal(null); refetch(); refetchEvolution();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleTxEditSubmit = async (data: object) => {
    if (!editingTx) return;
    try {
      await api.updateSavingsTransaction(editingTx.tx.id, data);
      showToast('Transaction mise à jour');
      setEditingTx(null); refetch(); refetchEvolution();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try { await api.deleteSavings(deleting.id); showToast('Produit supprimé'); setDeleting(null); refetch(); refetchEvolution(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setDeleteLoading(false); }
  };

  const commonSavings = (savingsList || []).filter(s => s.is_common);
  const personalSavings = (savingsList || []).filter(s => !s.is_common);
  const total = (savingsList || []).reduce((s, sv) => s + sv.balance, 0);

  const evolution = dashboard?.savings_evolution || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Épargne</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} icon={<Plus size={16} />}>Nouveau produit</Button>
      </div>

      {/* Summary */}
      <Card className="savings-summary">
        <p className="text-sm font-medium">Épargne totale</p>
        <p className="savings-summary-value">{formatCurrency(total)}</p>
        <div className="savings-summary-split flex gap-4 text-sm mt-2">
          <span><House size={15}/> Commun : {formatCurrency(commonSavings.reduce((s, sv) => s + sv.balance, 0))}</span>
          <span><UserRound size={15}/> Personnel : {formatCurrency(personalSavings.reduce((s, sv) => s + sv.balance, 0))}</span>
        </div>
      </Card>

      {/* Common savings */}
      {commonSavings.length > 0 && (
        <div>
          <h2 className="section-title"><House size={16}/> Épargne commune du foyer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commonSavings.map(sv => (
              <SavingsCard
                key={sv.id}
                sv={sv}
                persons={persons || []}
                expanded={expandedId === sv.id}
                onExpand={() => setExpandedId(expandedId === sv.id ? null : sv.id)}
                onEdit={() => { setEditing(sv); setModalOpen(true); }}
                onDelete={() => setDeleting(sv)}
                onDeposit={() => setTxModal({ savings: sv, type: 'deposit' })}
                onWithdraw={() => setTxModal({ savings: sv, type: 'withdrawal' })}
                onEditTx={tx => setEditingTx({ tx, savings: sv })}
                onTransactionsChanged={refetchEvolution}
              />
            ))}
          </div>
        </div>
      )}

      {/* Personal savings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : !savingsList?.length ? (
        <EmptyState title="Aucun produit d'épargne" description="Créez un livret, PEA, assurance vie..." action={{ label: 'Nouveau produit', onClick: () => setModalOpen(true) }} />
      ) : personalSavings.length > 0 ? (
        <div>
          {commonSavings.length > 0 && (
            <h2 className="section-title"><UserRound size={16}/> Épargne personnelle</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalSavings.map(sv => (
              <SavingsCard
                key={sv.id}
                sv={sv}
                persons={persons || []}
                expanded={expandedId === sv.id}
                onExpand={() => setExpandedId(expandedId === sv.id ? null : sv.id)}
                onEdit={() => { setEditing(sv); setModalOpen(true); }}
                onDelete={() => setDeleting(sv)}
                onDeposit={() => setTxModal({ savings: sv, type: 'deposit' })}
                onWithdraw={() => setTxModal({ savings: sv, type: 'withdrawal' })}
                onEditTx={tx => setEditingTx({ tx, savings: sv })}
                onTransactionsChanged={refetchEvolution}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Evolution chart */}
      {savingsList && savingsList.length > 0 && (
        <Card className="savings-evolution-card">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Évolution de l'épargne</h2>
          <div className="savings-chart-frame">
            <SavingsLineChart data={evolution} />
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le produit' : 'Nouveau produit d\'épargne'}>
        <SavingsForm initial={editing || undefined} persons={persons || []} accounts={accounts || []} onSubmit={handleSavingsSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal open={!!txModal} onClose={() => setTxModal(null)} title={txModal?.type === 'deposit' ? 'Versement' : 'Retrait'} size="sm">
        {txModal && (
          <SavingsTransactionForm
            type={txModal.type}
            balance={txModal.savings.balance}
            persons={persons || []}
            isCommon={!!txModal.savings.is_common}
            defaultPersonId={txModal.savings.person_id}
            onSubmit={handleTxSubmit}
            onCancel={() => setTxModal(null)}
          />
        )}
      </Modal>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Modifier la transaction" size="sm">
        {editingTx && (
          <SavingsTransactionForm
            type={editingTx.tx.type}
            balance={editingTx.savings.balance}
            persons={persons || []}
            isCommon={!!editingTx.savings.is_common}
            defaultPersonId={editingTx.savings.person_id}
            initial={editingTx.tx}
            onSubmit={handleTxEditSubmit}
            onCancel={() => setEditingTx(null)}
          />
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading}
        title="Supprimer le produit" message={`Supprimer "${deleting?.label}" et toutes ses transactions ?`} />
    </div>
  );
}

interface SavingsCardProps {
  sv: Savings;
  persons: Person[];
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEditTx: (tx: SavingsTransaction) => void;
  onTransactionsChanged: () => void;
}

function SavingsCard({ sv, persons, expanded, onExpand, onEdit, onDelete, onDeposit, onWithdraw, onEditTx, onTransactionsChanged }: SavingsCardProps) {
  const owner = sv.is_common ? null : persons.find(p => p.id === sv.person_id);
  const hostedBy = sv.hosted_by_person_id ? persons.find(p => p.id === sv.hosted_by_person_id) : null;
  const progress = sv.target_amount ? (sv.balance / sv.target_amount) * 100 : null;

  return (
    <div className="savings-register-item card-hover">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                {savingsTypeLabels[sv.type]}
              </span>
              {sv.is_common ? (
                <span className="savings-owner-badge text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  Foyer
                </span>
              ) : owner ? (
                <span className="savings-owner-badge text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: owner.color }}>
                  <UserRound size={12}/> {owner.name}
                </span>
              ) : null}
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">{sv.label}</h3>
            {hostedBy && (
              <p className="text-xs text-slate-400 mt-0.5">
                Hébergé chez {hostedBy.name}
              </p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={onEdit} />
            <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={onDelete} />
          </div>
        </div>

        <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sv.balance)}</div>

        {progress !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Objectif : {formatCurrency(sv.target_amount!)}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="success" size="sm" className="flex-1" icon={<ArrowDownToLine size={14}/>} onClick={onDeposit}>Verser</Button>
          <Button variant="danger" size="sm" className="flex-1" icon={<ArrowUpFromLine size={14}/>} onClick={onWithdraw}>Retirer</Button>
        </div>
      </div>

      <button
        onClick={onExpand}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-t border-slate-100 dark:border-slate-700 transition-colors"
      >
        {expanded ? <><ChevronUp size={14} /> Masquer l'historique</> : <><ChevronDown size={14} /> Voir l'historique</>}
      </button>

      {expanded && <TransactionHistory savingsId={sv.id} persons={persons} isCommon={!!sv.is_common} onEdit={onEditTx} onChanged={onTransactionsChanged} />}
    </div>
  );
}

function TransactionHistory({ savingsId, persons, isCommon, onEdit, onChanged }: { savingsId: number; persons: Person[]; isCommon: boolean; onEdit: (tx: SavingsTransaction) => void; onChanged: () => void }) {
  const { data: txs, loading, refetch } = useApi<SavingsTransaction[]>(() => api.getSavingsTransactions(savingsId), [savingsId]);
  const { showToast } = useToast();

  const handleDelete = async (txId: number) => {
    try { await api.deleteSavingsTransaction(txId); refetch(); onChanged(); showToast('Transaction supprimée'); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  // Breakdown by person (for deposits only)
  const breakdown = persons.length > 0 && txs?.length
    ? persons.map(p => ({
        person: p,
        total: txs.filter(tx => tx.type === 'deposit' && tx.person_id === p.id).reduce((s, tx) => s + tx.amount, 0),
      })).filter(b => b.total > 0)
    : [];

  if (loading) return <div className="p-4 text-center text-xs text-slate-400">Chargement...</div>;
  if (!txs?.length) return <div className="p-4 text-center text-xs text-slate-400">Aucune transaction</div>;

  return (
    <div className="border-t border-slate-100 dark:border-slate-700">
      {/* Per-person breakdown */}
      {breakdown.length > 1 && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex gap-3 flex-wrap">
          {breakdown.map(({ person, total }) => (
            <div key={person.id} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.color }} />
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><UserRound size={12}/>{person.name}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto">
        {txs.map(tx => {
          const txPerson = tx.person_id ? persons.find(p => p.id === tx.person_id) : null;
          return (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 text-sm group">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-slate-500 text-xs flex-shrink-0">{formatDate(tx.date)}</span>
                {txPerson && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium flex-shrink-0" style={{ backgroundColor: txPerson.color }}>
                    <UserRound size={11}/>
                  </span>
                )}
                {!txPerson && isCommon && (
                  <span className="savings-owner-badge text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium flex-shrink-0">
                    <House size={11}/> Foyer
                  </span>
                )}
                {tx.reason && <span className="text-xs text-slate-400 truncate">({tx.reason})</span>}
                {tx.note && !tx.reason && <span className="text-xs text-slate-400 truncate">{tx.note}</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`font-semibold text-sm ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
                <button
                  type="button"
                  aria-label={`Modifier la transaction du ${formatDate(tx.date)}`}
                  title="Modifier la transaction"
                  onClick={() => onEdit(tx)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Supprimer la transaction du ${formatDate(tx.date)}`}
                  title="Supprimer la transaction"
                  onClick={() => handleDelete(tx.id)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
