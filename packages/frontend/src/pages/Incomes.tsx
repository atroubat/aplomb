import { useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, Calendar, Wallet, UserRound } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useFilters } from '../contexts/FilterContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { IncomeForm } from '../components/forms/IncomeForm';
import { IncomeOverrideForm } from '../components/forms/IncomeOverrideForm';
import { formatCurrency, toMonthlyAmount, frequencyLabels } from '../lib/formatters';
import { Person, Account, Income, IncomeOverride, EffectiveIncomeData } from '../types';

const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jui','Aoû','Sep','Oct','Nov','Déc'];

function toYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isIncomeActiveInMonth(income: Income, year: number, month: number) {
  if (!income.is_active) return false;
  const selected = toYearMonth(year, month);
  return (!income.start_date || selected >= income.start_date.slice(0, 7))
    && (!income.end_date || selected <= income.end_date.slice(0, 7));
}

export default function Incomes() {
  const { year, month } = useFilters();
  const { showToast } = useToast();

  const { data: persons } = useApi<Person[]>(() => api.getPersons(), []);
  const { data: accounts } = useApi<Account[]>(() => api.getAccounts(), []);
  const { data: incomes, refetch: refetchIncomes } = useApi<Income[]>(() => api.getIncomes(), []);
  const { data: effective, refetch: refetchEffective } = useApi<EffectiveIncomeData>(
    () => api.getEffectiveIncome({ year, month }),
    [year, month]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleting, setDeleting] = useState<Income | null>(null);
  const [overrideIncome, setOverrideIncome] = useState<Income | null>(null);

  const handleSubmit = async (data: object) => {
    try {
      if (editing) { await api.reviseIncome(editing.id, data); showToast('Revenu actualisé — historique préservé'); }
      else { await api.createIncome(data); showToast('Revenu ajouté'); }
      setModalOpen(false); setEditing(null); refetchIncomes(); refetchEffective();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.deleteIncome(deleting.id); showToast('Revenu supprimé'); setDeleting(null); refetchIncomes(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const allIncomes = incomes || [];
  const allPersons = persons || [];
  const allAccounts = accounts || [];
  const activeIncomes = allIncomes.filter(income => isIncomeActiveInMonth(income, year, month));
  const variableIncomeIds = activeIncomes.filter(i => i.is_variable).map(i => i.id);

  // Map incomeId -> effectiveAmount for the selected month (uses override if set, else base)
  const effectiveMap: Record<number, number> = {};
  effective?.perIncome.forEach(e => { effectiveMap[e.id] = e.effectiveAmount; });

  const grouped = allPersons.map(p => ({
    person: p,
    incomes: activeIncomes.filter(i => i.person_id === p.id),
    total: activeIncomes.filter(i => i.person_id === p.id)
      .reduce((s, i) => s + (effectiveMap[i.id] ?? toMonthlyAmount(i.amount, i.frequency)), 0),
  }));

  const grandTotal = grouped.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Wallet size={24} className="text-indigo-500" /> Revenus
        </h1>
        <Button icon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true); }}>Ajouter un revenu</Button>
      </div>

      {/* Summary card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total des revenus mensuels</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(grandTotal)}</p>
          </div>
          <div className="flex gap-4">
            {grouped.map(({ person, total }) => (
              <div key={person.id} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg mx-auto mb-1"
                  style={{ backgroundColor: `${person.color}20`, border: `2px solid ${person.color}` }}>
                  <UserRound size={18}/>
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{person.name}</p>
                <p className="text-xs font-semibold" style={{ color: person.color }}>{formatCurrency(total)}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Variable income notice */}
      {variableIncomeIds.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium mb-1">Revenus variables</p>
          <p>Les revenus marqués comme variables doivent être saisis chaque mois. Cliquez sur "Saisir" pour entrer le montant réel.</p>
        </div>
      )}

      {/* Per-person income groups */}
      {grouped.map(({ person, incomes: pIncomes, total }) => (
        <Card key={person.id} className="income-person-card">
          <div className="income-person-header flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: `${person.color}20`, border: `2px solid ${person.color}` }}>
              <UserRound size={17}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{person.name}</p>
                {pIncomes.some(income => income.is_variable) && (
                  <span className="income-variable-badge"><TrendingUp size={10}/>Variable</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {pIncomes.length} revenu{pIncomes.length > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-lg font-bold" style={{ color: person.color }}>{formatCurrency(total)}<span className="text-xs font-normal text-slate-400">/mois</span></p>
          </div>

          {pIncomes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucun revenu pour cette personne</p>
          ) : (
            <div className="space-y-2">
              {pIncomes.map(inc => (
                <IncomeRow
                  key={inc.id}
                  income={inc}
                  showAmount={pIncomes.length > 1}
                  year={year}
                  month={month}
                  effectiveAmount={effectiveMap[inc.id]}
                  onEdit={() => { setEditing(inc); setModalOpen(true); }}
                  onDelete={() => setDeleting(inc)}
                  onOverride={() => { setOverrideIncome(inc); }}
                />
              ))}
            </div>
          )}
        </Card>
      ))}

      {allPersons.length === 0 && (
        <Card>
          <p className="text-center text-slate-400 py-8">Ajoutez d'abord des personnes dans les Paramètres pour commencer à gérer les revenus.</p>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Actualiser le revenu' : 'Ajouter un revenu'}>
        <IncomeForm
          initial={editing || undefined}
          persons={allPersons}
          accounts={allAccounts}
          effectiveFrom={editing ? toYearMonth(year, month) : undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      {overrideIncome && (
        <IncomeOverrideModal
          income={overrideIncome}
          year={year}
          month={month}
          onClose={() => setOverrideIncome(null)}
          onRefetch={() => { refetchIncomes(); refetchEffective(); }}
          showToast={showToast}
        />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Supprimer" message={`Supprimer "${deleting?.label}" ?`} />
    </div>
  );
}

// ── INCOME ROW ────────────────────────────────────────────────────────────

function IncomeRow({ income, showAmount, year, month, effectiveAmount, onEdit, onDelete, onOverride }: {
  income: Income; year: number; month: number; effectiveAmount?: number;
  showAmount: boolean;
  onEdit: () => void; onDelete: () => void; onOverride: () => void;
}) {
  const { data: overrides } = useApi<IncomeOverride[]>(
    () => api.getIncomeOverrides(income.id),
    [income.id]
  );

  const thisMonthOverride = overrides?.find(o => o.year === year && o.month === month);

  const recentMonths: Array<{ y: number; m: number }> = [];
  for (let i = 5; i >= 0; i--) {
    let mm = month - i; let yy = year;
    while (mm <= 0) { mm += 12; yy--; }
    recentMonths.push({ y: yy, m: mm });
  }

  const rollingMonths = new Set<string>();
  for (let i = 0; i < 12; i++) {
    let mm = month - i; let yy = year;
    while (mm <= 0) { mm += 12; yy--; }
    rollingMonths.add(`${yy}-${mm}`);
  }
  const rollingOverrides = (overrides || []).filter(o => rollingMonths.has(`${o.year}-${o.month}`));
  const rollingAverage = rollingOverrides.length > 0
    ? rollingOverrides.reduce((sum, override) => sum + override.amount, 0) / rollingOverrides.length
    : null;

  return (
    <div className={`income-register-row ${!income.is_active ? 'opacity-50' : ''}`}>
      <div className="income-register-main">
        <div className="income-register-info">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{income.label}</span>
          <span className="text-xs text-slate-400">{frequencyLabels[income.frequency]}</span>
          {!income.is_variable && thisMonthOverride ? (
            <span className="income-temporary-badge"><Calendar size={10}/>Temporaire ce mois</span>
          ) : null}
          {!income.is_active && (
            <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 text-xs rounded">Inactif</span>
          )}
        </div>
        <div className="income-register-actions">
          {showAmount && (income.is_variable ? (
            <span className={`text-sm font-semibold ${thisMonthOverride ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
              {effectiveAmount !== undefined ? formatCurrency(effectiveAmount) : '—'}
              {!thisMonthOverride && <span className="text-xs font-normal ml-1 opacity-70">(non saisi)</span>}
            </span>
          ) : (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {effectiveAmount !== undefined ? formatCurrency(effectiveAmount) : formatCurrency(toMonthlyAmount(income.amount, income.frequency))}
            </span>
          ))}
          <Button
            size="sm"
            variant={thisMonthOverride ? 'secondary' : income.is_variable ? 'primary' : 'ghost'}
            icon={<Calendar size={11} />}
            onClick={onOverride}
          >
            <span className="income-action-label income-action-label--long">
              {thisMonthOverride ? 'Modifier ce mois' : income.is_variable ? 'Saisir' : 'Ajuster ce mois'}
            </span>
            <span className="income-action-label income-action-label--short">
              {thisMonthOverride ? 'Modifier' : income.is_variable ? 'Saisir' : 'Ajuster'}
            </span>
          </Button>
          <Button variant="ghost" size="sm" icon={<Pencil size={12} />} onClick={onEdit} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={12} className="text-red-400" />} onClick={onDelete} />
        </div>
      </div>

      {!!income.is_variable && overrides && (
        <div className="flex gap-1 mt-2">
          {recentMonths.map(({ y, m }) => {
            const ov = overrides.find(o => o.year === y && o.month === m);
            const isThisMonth = y === year && m === month;
            return (
              <div
                key={`${y}-${m}`}
                className={`flex-1 text-center py-1 rounded text-xs ${
                  isThisMonth
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-400'
                    : ov
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-600/50 text-slate-400'
                }`}
              >
                <div className="text-[10px] leading-none mb-0.5">{MONTH_SHORT[m - 1]}</div>
                <div className="font-medium">{ov ? `${(ov.amount / 1000).toFixed(1)}k` : '—'}</div>
              </div>
            );
          })}
        </div>
      )}
      {!!income.is_variable && rollingAverage !== null && (
        <div className="income-average-line">
          <span>
            Moyenne mensuelle sur 12 mois
            <small>{rollingOverrides.length} mois renseigné{rollingOverrides.length > 1 ? 's' : ''}</small>
          </span>
          <strong>{formatCurrency(rollingAverage)}</strong>
        </div>
      )}
    </div>
  );
}

// ── OVERRIDE MODAL ────────────────────────────────────────────────────────

function IncomeOverrideModal({ income, year, month, onClose, onRefetch, showToast }: {
  income: Income; year: number; month: number;
  onClose: () => void; onRefetch: () => void;
  showToast: (m: string, t?: 'success'|'error'|'info') => void;
}) {
  const { data: overrides, refetch } = useApi<IncomeOverride[]>(
    () => api.getIncomeOverrides(income.id, { year }),
    [income.id, year]
  );
  const existingOverride = overrides?.find(o => o.month === month) ?? null;

  const handleSubmit = async (data: { year: number; month: number; amount: number; note?: string | null }) => {
    try {
      await api.upsertIncomeOverride(income.id, data);
      showToast('Revenu enregistré');
      refetch();
      onRefetch();
      onClose();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  return (
    <Modal open onClose={onClose} title={income.is_variable ? 'Saisir le revenu du mois' : 'Ajuster uniquement ce mois'} size="sm">
      <IncomeOverrideForm
        income={income}
        existingOverride={existingOverride}
        year={year}
        month={month}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
