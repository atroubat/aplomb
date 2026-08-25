import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, ArrowRightLeft, CalendarOff, ClipboardList } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useFilters } from '../contexts/FilterContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CategoryBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { FixedChargeForm } from '../components/forms/FixedChargeForm';
import { HouseholdSplitBar } from '../components/charts/HouseholdSplitBar';
import { formatCurrency, toMonthlyAmount, frequencyLabels, categoryLabels } from '../lib/formatters';
import { FixedCharge, DashboardData } from '../types';
import { ChargeTypeTabs } from '../components/layout/ChargeTypeTabs';
import { CategoryIcon } from '../components/ui/CategoryIcon';

// ── helpers ─────────────────────────────────────────────────────────────────

/** Return "YYYY-MM" for year/month */
function toYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Return "YYYY-MM-DD" for the last day of the month BEFORE the given YYYY-MM */
function prevMonthLastDay(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 0); // day 0 = last day of previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Return "YYYY-MM-01" for the first day of the given YYYY-MM */
function firstDayOf(ym: string): string {
  return `${ym}-01`;
}

function isChargeActiveInMonth(charge: FixedCharge, year: number, month: number): boolean {
  if (!charge.is_active) return false;
  const selected = toYearMonth(year, month);
  if (charge.start_date && selected < charge.start_date.slice(0, 7)) return false;
  if (charge.end_date && selected > charge.end_date.slice(0, 7)) return false;
  return true;
}

function chargeStatus(charge: FixedCharge, year: number, month: number): string {
  const selected = toYearMonth(year, month);
  if (!charge.is_active) return 'Désactivée';
  if (charge.start_date && selected < charge.start_date.slice(0, 7)) return 'À venir';
  if (charge.end_date && selected > charge.end_date.slice(0, 7)) return 'Terminée';
  return 'Active ce mois';
}

// ── UpdateRateModal ──────────────────────────────────────────────────────────

function UpdateRateModal({
  charge,
  currentYearMonth,
  onClose,
  onDone,
  showToast,
}: {
  charge: FixedCharge;
  currentYearMonth: string;
  onClose: () => void;
  onDone: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const [newAmount, setNewAmount] = useState(String(charge.amount));
  const [effectiveFrom, setEffectiveFrom] = useState(currentYearMonth);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) return;
    setLoading(true);
    try {
      // 1. Close the old charge: set end_date to last day of the month before effectiveFrom
      await api.updateFixedCharge(charge.id, { endDate: prevMonthLastDay(effectiveFrom) });

      // 2. Create a new charge identical to the old one, with the new amount + startDate
      await api.createFixedCharge({
        label: charge.label,
        amount: Number(newAmount),
        category: charge.category,
        frequency: charge.frequency,
        accountId: charge.account_id,
        isActive: charge.is_active,
        isSmoothed: charge.is_smoothed ?? 1,
        startDate: firstDayOf(effectiveFrom),
        endDate: null,
      });

      showToast('Tarif mis à jour — historique préservé');
      onDone();
      onClose();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Modifier le tarif" size="sm">
      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1 flex items-center gap-2"><ClipboardList size={15}/> Historisation automatique</p>
        <p className="text-xs">L'ancienne ligne sera clôturée et une nouvelle sera créée à partir du mois choisi. L'historique passé reste intact.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Charge concernée
          </label>
          <p className="text-slate-800 dark:text-slate-100 font-semibold">{charge.label}</p>
          <p className="text-xs text-slate-400">Montant actuel : {formatCurrency(charge.amount)} / {frequencyLabels[charge.frequency].toLowerCase()}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nouveau montant (€) *
          </label>
          <input
            type="number"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="input w-full"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            À partir de quel mois ?
          </label>
          <input
            type="month"
            value={effectiveFrom}
            onChange={e => setEffectiveFrom(e.target.value)}
            className="input w-full"
          />
        </div>
        <div className="modal-actions flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading} icon={<ArrowRightLeft size={14} />}>Appliquer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── ChargeCard (mobile) ──────────────────────────────────────────────────────

function ChargeCard({
  charge,
  accountName,
  onEdit,
  onUpdateRate,
  onDelete,
  onStop,
  activeInSelectedMonth,
  statusLabel,
}: {
  charge: FixedCharge;
  accountName?: string;
  onEdit: () => void;
  onUpdateRate: () => void;
  onDelete: () => void;
  onStop?: () => void;
  activeInSelectedMonth: boolean;
  statusLabel: string;
}) {
  const monthly = toMonthlyAmount(charge.amount, charge.frequency);
  const categoryLabel = categoryLabels[charge.category] || charge.category;
  return (
    <div className={`charge-card fixed-charge-card ${!activeInSelectedMonth ? 'opacity-60' : ''}`}>
      <div className="fixed-charge-card-main">
        <span className="charge-card-icon"><CategoryIcon category={charge.category} size={18}/></span>
        <div className="fixed-charge-card-copy">
          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{charge.label}</p>
          <span>{accountName || 'Aucun compte'} · {frequencyLabels[charge.frequency]}</span>
        </div>
        <p className="fixed-charge-card-amount">{formatCurrency(monthly)}<span>/mois</span></p>
      </div>
      <div className="fixed-charge-card-footer">
        <div className="fixed-charge-card-tags">
          <span className="category-badge">{categoryLabel}</span>
          <span className={activeInSelectedMonth ? 'is-active' : ''}>{statusLabel}</span>
          <span>{(charge.is_smoothed ?? 1) === 1 ? 'Lissé' : 'Flux réel'}</span>
        </div>
        <div className="fixed-charge-card-actions">
          {onStop && <Button variant="ghost" size="sm" icon={<CalendarOff size={13} className="text-amber-500" />} onClick={onStop} title="Arrêter" />}
          <Button variant="ghost" size="sm" icon={<ArrowRightLeft size={13} />} onClick={onUpdateRate} title="Changer le tarif" />
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={onEdit} title="Modifier" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={onDelete} title="Supprimer" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FixedCharges() {
  const { showToast } = useToast();
  const { year, month } = useFilters();
  const { data: charges, loading, refetch } = useApi(() => api.getFixedCharges(), []);
  const { data: accounts } = useApi(() => api.getAccounts(), []);
  const { data: dashboard } = useApi<DashboardData>(
    () => api.getDashboard({ year, month }),
    [year, month]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedCharge | null>(null);
  const [deleting, setDeleting] = useState<FixedCharge | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingRate, setUpdatingRate] = useState<FixedCharge | null>(null);
  const [stopping, setStopping] = useState<FixedCharge | null>(null);
  const [stopLoading, setStopLoading] = useState(false);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: FixedCharge) => { setEditing(c); setModalOpen(true); };

  const handleSubmit = async (data: object) => {
    try {
      if (editing) { await api.updateFixedCharge(editing.id, data); showToast('Charge mise à jour'); }
      else { await api.createFixedCharge(data); showToast('Charge ajoutée'); }
      setModalOpen(false); refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleStop = async () => {
    if (!stopping) return;
    setStopLoading(true);
    try {
      await api.updateFixedCharge(stopping.id, { endDate: firstDayOf(currentYearMonth), isActive: 1 });
      showToast(`Charge arrêtée après ${new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
      setStopping(null);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setStopLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try { await api.deleteFixedCharge(deleting.id); showToast('Charge supprimée'); setDeleting(null); refetch(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setDeleteLoading(false); }
  };

  const activeCharges = (charges || []).filter(c => isChargeActiveInMonth(c, year, month));
  const total = activeCharges.reduce((s, c) => s + toMonthlyAmount(c.amount, c.frequency), 0);

  const hasMissingVariable = (dashboard?.missing_variable_income_ids?.length ?? 0) > 0;
  const householdSplit = dashboard?.household_split;
  const currentYearMonth = toYearMonth(year, month);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Charges fixes du foyer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize">Situation en {new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Button onClick={openAdd} icon={<Plus size={16} />}>Ajouter</Button>
      </div>
      <ChargeTypeTabs />

      {/* Pro-rata split panel */}
      {householdSplit && householdSplit.persons.length > 1 && (
        <Card className="household-split-card">
          <div className="household-split-card-head">
            <div>
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Répartition commune</h2>
              <span>Total · {formatCurrency(householdSplit.totalCommonCharges)}</span>
            </div>
            {hasMissingVariable && (
              <div className="household-split-warning">
                <AlertTriangle size={12} />
                <span>Chiffres provisoires</span>
              </div>
            )}
          </div>
          <HouseholdSplitBar split={householdSplit} />
        </Card>
      )}

      <Card className="fixed-charges-list">
        {loading ? <TableSkeleton /> : !charges?.length ? (
          <EmptyState title="Aucune charge fixe" description="Ajoutez vos loyer, abonnements, assurances..." action={{ label: 'Ajouter une charge', onClick: openAdd }} />
        ) : (
          <>
            {/* ── Mobile card list (hidden on md+) ── */}
            <div className="md:hidden space-y-3">
              {charges.map(c => {
                const active = isChargeActiveInMonth(c, year, month);
                return <ChargeCard
                  key={c.id}
                  charge={c}
                  accountName={accounts?.find(a => a.id === c.account_id)?.name}
                  onEdit={() => openEdit(c)}
                  onUpdateRate={() => setUpdatingRate(c)}
                  onDelete={() => setDeleting(c)}
                  activeInSelectedMonth={active}
                  statusLabel={chargeStatus(c, year, month)}
                  onStop={active && (!c.end_date || c.end_date.slice(0, 7) > currentYearMonth) ? () => setStopping(c) : undefined}
                />
              })}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 px-1">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total du mois sélectionné</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* ── Desktop table (hidden on mobile) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Label', 'Catégorie', 'Montant', 'Fréquence', 'Mensuel', 'Lissage', 'Compte', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charges.map(c => {
                    const accountName = accounts?.find(a => a.id === c.account_id)?.name;
                    const active = isChargeActiveInMonth(c, year, month);
                    return (
                      <tr key={c.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!active ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{c.label}</td>
                        <td className="px-3 py-3"><CategoryBadge category={c.category} /></td>
                        <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(c.amount)}</td>
                        <td className="px-3 py-3 text-slate-500">{frequencyLabels[c.frequency]}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(toMonthlyAmount(c.amount, c.frequency))}</td>
                        <td className="px-3 py-3">
                          {(c.is_smoothed ?? 1) === 1
                            ? <span className="text-xs text-green-600 dark:text-green-400">✓ Lissé</span>
                            : <span className="text-xs text-amber-600 dark:text-amber-400">Flux réel</span>}
                        </td>
                        <td className="px-3 py-3 text-slate-500">{accountName || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium ${active ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>{chargeStatus(c, year, month)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {active && (!c.end_date || c.end_date.slice(0, 7) > currentYearMonth) && <Button variant="ghost" size="sm" icon={<CalendarOff size={13} className="text-amber-500" />} onClick={() => setStopping(c)} title="Arrêter à la fin du mois" />}
                            <Button variant="ghost" size="sm" icon={<ArrowRightLeft size={13} />} onClick={() => setUpdatingRate(c)} title="Changer le tarif" />
                            <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => openEdit(c)} />
                            <Button variant="ghost" size="sm" icon={<Trash2 size={14} className="text-red-400" />} onClick={() => setDeleting(c)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={4} className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">Total du mois sélectionné</td>
                    <td className="px-3 py-3 font-bold text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(total)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la charge' : 'Ajouter une charge fixe'}>
        <FixedChargeForm initial={editing || undefined} accounts={accounts || []} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      {updatingRate && (
        <UpdateRateModal
          charge={updatingRate}
          currentYearMonth={currentYearMonth}
          onClose={() => setUpdatingRate(null)}
          onDone={refetch}
          showToast={showToast}
        />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading}
        title="Supprimer la charge" message={`Supprimer "${deleting?.label}" ? Cette action est irréversible.`} />
      <ConfirmDialog open={!!stopping} onClose={() => setStopping(null)} onConfirm={handleStop} loading={stopLoading}
        title="Arrêter la charge fixe"
        message={`Arrêter "${stopping?.label}" à la fin de ${new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} ? Elle restera visible et comptabilisée pour ce mois et tous les mois précédents.`} />
    </div>
  );
}
