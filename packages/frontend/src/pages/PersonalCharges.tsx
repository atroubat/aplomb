import { useState } from 'react';
import { Plus, Pencil, Trash2, CalendarOff, UserRound } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CategoryBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { PersonalChargeForm } from '../components/forms/PersonalChargeForm';
import { formatCurrency, toMonthlyAmount, frequencyLabels, categoryLabels } from '../lib/formatters';
import { PersonalCharge, Person } from '../types';
import { useFilters } from '../contexts/FilterContext';
import { ChargeTypeTabs } from '../components/layout/ChargeTypeTabs';
import { CategoryIcon } from '../components/ui/CategoryIcon';

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isChargeActiveInMonth(charge: PersonalCharge, year: number, month: number) {
  if (!charge.is_active) return false;
  const selected = monthKey(year, month);
  if (charge.start_date && selected < charge.start_date.slice(0, 7)) return false;
  if (charge.end_date && selected > charge.end_date.slice(0, 7)) return false;
  return true;
}

// ── Mobile card ────────────────────────────────────────────────────────────────
interface ChargeCardProps {
  charge: PersonalCharge;
  accountName?: string;
  activeInSelectedMonth: boolean;
  statusLabel: string;
  onStop?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ChargeCard({ charge: c, accountName, activeInSelectedMonth, statusLabel, onStop, onEdit, onDelete }: ChargeCardProps) {
  const label = categoryLabels[c.category] ?? c.category;
  const monthly = toMonthlyAmount(c.amount, c.frequency);

  return (
    <div className={`charge-card fixed-charge-card personal-charge-card ${!activeInSelectedMonth ? 'opacity-60' : ''}`}>
      <div className="fixed-charge-card-main">
        <span className="charge-card-icon"><CategoryIcon category={c.category} size={18}/></span>
        <div className="fixed-charge-card-copy">
          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.label}</p>
          <span>{accountName || 'Aucun compte'} · {frequencyLabels[c.frequency]}</span>
        </div>
        <p className="fixed-charge-card-amount">{formatCurrency(monthly)}<span>/mois</span></p>
      </div>
      <div className="fixed-charge-card-footer">
        <div className="fixed-charge-card-tags">
          <span className="category-badge">{label}</span>
          <span className={activeInSelectedMonth ? 'is-active' : ''}>{statusLabel}</span>
        </div>
        <div className="fixed-charge-card-actions">
          {onStop && <Button variant="ghost" size="sm" icon={<CalendarOff size={13} className="text-amber-500" />} onClick={onStop} title="Arrêter" />}
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={onEdit} title="Modifier" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} className="text-red-400" />} onClick={onDelete} title="Supprimer" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PersonalCharges() {
  const { showToast } = useToast();
  const { year, month } = useFilters();
  const { data: persons } = useApi<Person[]>(() => api.getPersons(), []);
  const { data: accounts } = useApi(() => api.getAccounts(), []);
  const [activePersonId, setActivePersonId] = useState<number | null>(null);

  const effectivePersonId = activePersonId ?? persons?.[0]?.id ?? null;
  const { data: charges, loading, refetch } = useApi(
    () => effectivePersonId ? api.getPersonalCharges({ person_id: effectivePersonId }) : api.getPersonalCharges(),
    [effectivePersonId]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalCharge | null>(null);
  const [deleting, setDeleting] = useState<PersonalCharge | null>(null);
  const [stopping, setStopping] = useState<PersonalCharge | null>(null);
  const [stopLoading, setStopLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: PersonalCharge) => { setEditing(c); setModalOpen(true); };

  const handleSubmit = async (data: object) => {
    try {
      if (editing) { await api.updatePersonalCharge(editing.id, data); showToast('Charge mise à jour'); }
      else { await api.createPersonalCharge(data); showToast('Charge ajoutée'); }
      setModalOpen(false); refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleStop = async () => {
    if (!stopping) return;
    setStopLoading(true);
    try {
      await api.updatePersonalCharge(stopping.id, { endDate: `${monthKey(year, month)}-01`, isActive: 1 });
      showToast(`Charge arrêtée après ${new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
      setStopping(null);
      refetch();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setStopLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try { await api.deletePersonalCharge(deleting.id); showToast('Charge supprimée'); setDeleting(null); refetch(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setDeleteLoading(false); }
  };

  const activeCharges = (charges || []).filter(c => isChargeActiveInMonth(c, year, month));
  const total = activeCharges.reduce((s, c) => s + toMonthlyAmount(c.amount, c.frequency), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Charges personnelles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize">Situation en {new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Button onClick={openAdd} icon={<Plus size={16} />}>Ajouter</Button>
      </div>

      <ChargeTypeTabs />

      {/* Person tabs */}
      {persons && persons.length > 0 && (
        <div className="personal-charge-person-picker">
          <span className="personal-charge-person-picker__icon"><UserRound size={17}/></span>
          <label htmlFor="personal-charge-person">Personne</label>
          <select
            id="personal-charge-person"
            value={effectivePersonId ?? ''}
            onChange={event => setActivePersonId(Number(event.target.value))}
            aria-label="Choisir la personne dont les charges sont affichées"
          >
            {persons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </div>
      )}

      <Card className="personal-charges-list">
        {loading ? <TableSkeleton /> : !charges?.length ? (
          <EmptyState title="Aucune charge personnelle" description="Ajoutez les dépenses personnelles de cette personne." action={{ label: 'Ajouter une charge', onClick: openAdd }} />
        ) : (
          <>
            {/* ── Mobile cards (< md) ────────────────────────────────────── */}
            <div className="md:hidden">
              {charges.map(c => {
                const active = isChargeActiveInMonth(c, year, month);
                const selected = monthKey(year, month);
                const status = !c.is_active ? 'Désactivée' : c.start_date && selected < c.start_date.slice(0, 7) ? 'À venir' : c.end_date && selected > c.end_date.slice(0, 7) ? 'Terminée' : 'Active ce mois';
                return <ChargeCard
                  key={c.id}
                  charge={c}
                  accountName={accounts?.find(a => a.id === c.account_id)?.name}
                  activeInSelectedMonth={active}
                  statusLabel={status}
                  onStop={active && (!c.end_date || c.end_date.slice(0, 7) > selected) ? () => setStopping(c) : undefined}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleting(c)}
                />;
              })}
              {/* Mobile total footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t-2 border-slate-200 dark:border-slate-700 mt-1">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total du mois sélectionné</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* ── Desktop table (≥ md) ───────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Label', 'Catégorie', 'Montant', 'Fréquence', 'Mensuel', 'Compte', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charges.map(c => {
                    const accountName = accounts?.find(a => a.id === c.account_id)?.name;
                    const active = isChargeActiveInMonth(c, year, month);
                    const selected = monthKey(year, month);
                    const status = !c.is_active ? 'Désactivée' : c.start_date && selected < c.start_date.slice(0, 7) ? 'À venir' : c.end_date && selected > c.end_date.slice(0, 7) ? 'Terminée' : 'Active ce mois';
                    return (
                      <tr key={c.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!active ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{c.label}</td>
                        <td className="px-3 py-3"><CategoryBadge category={c.category} /></td>
                        <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(c.amount)}</td>
                        <td className="px-3 py-3 text-slate-500">{frequencyLabels[c.frequency]}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(toMonthlyAmount(c.amount, c.frequency))}</td>
                        <td className="px-3 py-3 text-slate-500">{accountName || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium ${active ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>{status}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {active && (!c.end_date || c.end_date.slice(0, 7) > selected) && <Button variant="ghost" size="sm" icon={<CalendarOff size={14} className="text-amber-500" />} onClick={() => setStopping(c)} />}
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
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la charge' : 'Ajouter une charge personnelle'}>
        <PersonalChargeForm initial={editing || undefined} persons={persons || []} accounts={accounts || []}
          defaultPersonId={effectivePersonId || undefined}
          onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading}
        title="Supprimer la charge" message={`Supprimer "${deleting?.label}" ?`} />
      <ConfirmDialog open={!!stopping} onClose={() => setStopping(null)} onConfirm={handleStop} loading={stopLoading}
        title="Arrêter la charge"
        message={`Arrêter "${stopping?.label}" à la fin de ${new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} ? Elle restera visible et comptabilisée pour ce mois et tous les mois précédents.`} />
    </div>
  );
}
