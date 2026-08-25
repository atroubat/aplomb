import { useState } from 'react';
import { useFilters } from '../contexts/FilterContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { MethodCompareChart } from '../components/charts/MethodCompareChart';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { Person } from '../types';
import { UserCircle, Circle, Ruler, BarChart3, Activity, Target, Lightbulb } from 'lucide-react';
import { PersonViewPicker } from '../components/ui/PersonViewPicker';

type Method = '50-30-20' | '75-15-10';

const METHOD_INFO: Record<Method, { title: string; description: string }> = {
  '50-30-20': {
    title: 'Méthode 50/30/20',
    description: '50% pour les besoins (loyer, charges, assurances), 30% pour les envies (loisirs, sorties, shopping), 20% pour l\'épargne',
  },
  '75-15-10': {
    title: 'Méthode 75/15/10',
    description: '75% pour toutes les dépenses (fixes + perso), 15% pour l\'épargne, 10% pour les loisirs et plaisirs',
  },
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <Circle size={9} fill="currentColor" className="text-[var(--color-chart-savings)]" />;
  if (status === 'under') return <Circle size={9} fill="currentColor" className="text-[var(--color-chart-wants)]" />;
  return <Circle size={9} fill="currentColor" className="text-[var(--color-danger)]" />;
}

export default function Advice() {
  const [method, setMethod] = useState<Method>('50-30-20');
  const { year, month, selectedPersonIds, setPersonIds } = useFilters();
  const { data: persons } = useApi<Person[]>(() => api.getPersons(), []);

  // person_id is required for advice — use the first selected person
  const selectedPersonId = selectedPersonIds.length === 1 ? selectedPersonIds[0] : null;

  const { data: advice, loading } = useApi(
    () => selectedPersonId
      ? api.getAdvice({ year, month, method, person_id: selectedPersonId })
      : Promise.resolve(null),
    [year, month, method, selectedPersonId]
  );

  const info = METHOD_INFO[method];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white">Conseils budgétaires</h1>
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
          {(['50-30-20', '75-15-10'] as Method[]).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${method === m ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Method explanation */}
      <Card className="border-l-4 border-indigo-500">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{info.title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{info.description}</p>
      </Card>

      {/* Person selector — required */}
      <Card className="advice-person-picker-card">
        <PersonViewPicker
          persons={persons || []}
          value={selectedPersonId}
          onChange={id => setPersonIds(id ? [id] : [])}
          label="Conseils pour"
        />
        {!selectedPersonId && (
          <p className="text-xs text-slate-400 mt-3">
            Les conseils budgétaires sont calculés individuellement en tenant compte de vos revenus, votre part des charges communes, et vos charges personnelles.
          </p>
        )}
      </Card>

      {/* No person selected */}
      {!selectedPersonId && (
        <Card className="text-center py-12">
          <UserCircle size={28} className="mx-auto mb-3 text-[var(--color-accent)]" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Sélectionnez une personne pour afficher ses conseils budgétaires</p>
          <p className="text-sm text-slate-400 mt-1">Chaque personne a ses propres revenus et charges — une analyse personnalisée est nécessaire.</p>
        </Card>
      )}

      {/* Loading */}
      {selectedPersonId && loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i=><CardSkeleton key={i}/>)}</div>
      )}

      {/* Results */}
      {selectedPersonId && !loading && advice && (
        <>
          {/* Pro-rata info */}
          {advice.meta && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Revenus personnels : <strong>{formatCurrency(advice.meta.personalIncome)}</strong> —
              Part des charges communes : <strong>{formatCurrency(advice.meta.personalFixedShare)}</strong> ({formatPercent(advice.meta.proRataRatio * 100, 0)} du foyer)
            </div>
          )}

          {/* Three columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Ruler size={16}/> Théorique</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Revenus</span><span className="font-bold">{formatCurrency(advice.totalIncome)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Besoins</span><span className="font-medium text-indigo-600">{formatCurrency(advice.theoretical.needs.amount)} <span className="text-slate-400">({advice.theoretical.needs.percentage}%)</span></span></div>
                <div className="flex justify-between"><span className="text-slate-500">Loisirs</span><span className="font-medium text-amber-500">{formatCurrency(advice.theoretical.wants.amount)} <span className="text-slate-400">({advice.theoretical.wants.percentage}%)</span></span></div>
                <div className="flex justify-between"><span className="text-slate-500">Épargne</span><span className="font-medium text-green-500">{formatCurrency(advice.theoretical.savings.amount)} <span className="text-slate-400">({advice.theoretical.savings.percentage}%)</span></span></div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16}/> Réel</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Revenus</span><span className="font-bold">{formatCurrency(advice.totalIncome)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Besoins</span><span className="font-medium text-indigo-600">{formatCurrency(advice.actual.needs.amount)} <span className="text-slate-400">({formatPercent(advice.actual.needs.percentage, 0)})</span></span></div>
                <div className="flex justify-between"><span className="text-slate-500">Loisirs</span><span className="font-medium text-amber-500">{formatCurrency(advice.actual.wants.amount)} <span className="text-slate-400">({formatPercent(advice.actual.wants.percentage, 0)})</span></span></div>
                <div className="flex justify-between"><span className="text-slate-500">Épargne</span><span className="font-medium text-green-500">{formatCurrency(advice.actual.savings.amount)} <span className="text-slate-400">({formatPercent(advice.actual.savings.percentage, 0)})</span></span></div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Activity size={16}/> Écarts</h3>
              <div className="space-y-3 text-sm">
                <GapRow label="Besoins" gap={advice.gaps.needs} />
                <GapRow label="Loisirs" gap={advice.gaps.wants} />
                <GapRow label="Épargne" gap={advice.gaps.savings} />
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Comparaison Théorique vs Réel</h3>
            <MethodCompareChart advice={advice} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="advice-card advice-card--mint">
              <Target size={20} className="mb-2 text-[var(--color-accent)]" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Objectif épargne ce mois</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(advice.recommendedSavingsThisMonth)}</p>
            </Card>
            <Card className="advice-card advice-card--pear">
              <Target size={20} className="mb-2 text-[var(--color-chart-wants)]" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Budget loisirs ce mois</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(advice.availableForLeisure)}
              </p>
              <p className="text-xs text-slate-400 mt-1">objectif : {formatCurrency(advice.theoretical.wants.amount)}</p>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Lightbulb size={16}/> Conseils personnalisés</h3>
            <div className="space-y-3">
              {advice.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-indigo-500 mt-0.5">→</span>
                  {tip}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function GapRow({ label, gap }: { label: string; gap: { amount: number; status: string } }) {
  const textColor = gap.status === 'ok'
    ? 'text-green-500'
    : gap.status === 'under'
      ? 'text-amber-500'
      : 'text-red-500';
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <StatusIcon status={gap.status} />
        <span className={`font-medium ${textColor}`}>
          {gap.amount > 0 ? '+' : ''}{formatCurrency(gap.amount)}
        </span>
      </span>
    </div>
  );
}
