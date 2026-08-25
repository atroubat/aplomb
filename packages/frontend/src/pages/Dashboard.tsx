import { useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Building2, CircleGauge, PiggyBank, ReceiptText, UserRound, Users } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { DashboardData } from '../types';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { ExpenseLedger } from '../components/dashboard/ExpenseLedger';
import { HouseholdLedger } from '../components/dashboard/HouseholdLedger';
import { SavingsLineChart } from '../components/charts/SavingsLineChart';
import { PersonViewPicker } from '../components/ui/PersonViewPicker';
import { Person } from '../types';

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const adjusted = invert ? -value : value;
  const positive = adjusted >= 0;
  return (
    <span className={positive ? 'metric-delta is-positive' : 'metric-delta is-negative'}>
      {positive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {Math.abs(adjusted) < .005 ? 'Stable' : `${formatPercent(Math.abs(adjusted) * 100, 0)} vs mois dernier`}
    </span>
  );
}

export default function Dashboard() {
  const { year, month, selectedPersonIds, setPersonIds } = useFilters();
  const personId = selectedPersonIds.length === 1 ? selectedPersonIds[0] : undefined;
  const { data: persons } = useApi<Person[]>(() => api.getPersons(), []);
  const [method, setMethod] = useState<'75-15-10' | '50-30-20'>('50-30-20');
  const { data, loading } = useApi<DashboardData>(() => api.getDashboard({ year, month, person_id: personId, method }), [year, month, personId, method]);

  if (loading) return <div className="brief-loading">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i}/>)}</div>;
  if (!data) return null;

  const { kpis, expenses_by_category, savings_evolution, savings_goal_progress: goal, household_split, missing_variable_income_ids, view } = data;
  const personal = view === 'personal';
  const remaining = personal && kpis.reste_a_vivre !== null ? kpis.reste_a_vivre : kpis.remaining;
  const charges = kpis.total_fixed_charges + kpis.total_personal_charges;
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="financial-brief">
      <header className="brief-title">
        <div><span>Budget · {monthName}</span><h1>Le point du mois</h1></div>
        <span className="view-chip">{personal ? <UserRound size={14}/> : <Users size={14}/>} {personal ? 'Personnel' : 'Foyer'}</span>
      </header>

      {!!persons?.length && (
        <PersonViewPicker
          persons={persons}
          value={personId ?? null}
          onChange={id => setPersonIds(id ? [id] : [])}
          allowHousehold
          label="Vue du budget"
        />
      )}

      {missing_variable_income_ids.length > 0 && (
        <div className="brief-alert"><AlertCircle size={16}/><span>{missing_variable_income_ids.length} revenu variable reste à saisir. Les montants sont provisoires.</span></div>
      )}

      <section className={`balance-statement ${remaining < 0 ? 'is-negative' : ''}`}>
        <div className="balance-main">
          <span>{personal ? 'Reste à vivre' : 'Disponible après charges et épargne'}</span>
          <strong>{remaining > 0 ? '+' : ''}{formatCurrency(remaining)}</strong>
          <p>{remaining >= 0 ? 'Ce montant peut encore être affecté ce mois.' : 'Les sorties dépassent le budget disponible.'}</p>
        </div>
        <div className="balance-metrics">
          <div><span><Building2 size={15}/> Revenus</span><strong>{formatCurrency(kpis.total_income)}</strong><Delta value={kpis.income_vs_prev_month}/></div>
          <div><span><ReceiptText size={15}/> Charges</span><strong>{formatCurrency(charges)}</strong><Delta value={kpis.charges_vs_prev_month} invert/></div>
          <div><span><PiggyBank size={15}/> Épargne</span><strong>{formatCurrency(kpis.total_savings)}</strong><Delta value={kpis.savings_vs_prev_month}/></div>
        </div>
      </section>

      <div className="brief-columns">
        {!personal && household_split.persons.length > 1 ? <HouseholdLedger split={household_split}/> : (
          <section className="brief-section savings-target">
            <header className="brief-section-head"><div><p>Objectif</p><h2>Épargne du mois</h2></div><CircleGauge size={20}/></header>
            <strong className="target-percent">{Math.round(goal.percentage)}%</strong>
            <div className="target-track"><span style={{ width: `${Math.min(100, Math.max(0, goal.percentage))}%` }}/></div>
            <div className="target-values"><span>Réalisé {formatCurrency(goal.actual)}</span><span>Cible {formatCurrency(goal.target)}</span></div>
            {personal && <div className="method-switch">{(['75-15-10','50-30-20'] as const).map(item => <button key={item} className={method === item ? 'is-active' : ''} onClick={() => setMethod(item)}>{item}</button>)}</div>}
          </section>
        )}
        <ExpenseLedger data={expenses_by_category}/>
      </div>

      <section className="brief-section savings-history">
        <header className="brief-section-head">
          <div><p>Historique</p><h2>Évolution de l’épargne</h2></div>
          <PiggyBank size={20}/>
        </header>
        <SavingsLineChart data={savings_evolution}/>
      </section>

      {!personal && (
        <section className="brief-section savings-strip">
          <div><p>Objectif d'épargne</p><strong>{goal.target > 0 ? `${Math.round(goal.percentage)}% atteint` : 'Aucun objectif défini'}</strong></div>
          <div className="target-track"><span style={{ width: `${Math.min(100, Math.max(0, goal.percentage))}%` }}/></div>
          <div><span>{formatCurrency(goal.actual)} réalisé</span><span>{formatCurrency(goal.target)} visé</span></div>
        </section>
      )}
    </div>
  );
}
