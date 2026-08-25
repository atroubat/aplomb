import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { IncomeExpenseAreaChart } from '../charts/IncomeExpenseAreaChart';

interface CashflowLedgerProps {
  data: Array<{ month: string; income: number; expenses: number }>;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

export function CashflowLedger({ data }: CashflowLedgerProps) {
  return (
    <section className="brief-section cashflow-ledger">
      <header className="brief-section-head">
        <div><p>Historique</p><h2>Six mois de flux</h2></div>
        <span>Entrées · sorties · solde</span>
      </header>
      <div className="cashflow-chart"><IncomeExpenseAreaChart data={data}/></div>
      <div className="cashflow-table" role="table" aria-label="Flux financiers sur six mois">
        <div className="cashflow-row cashflow-row-head" role="row">
          <span>Mois</span><span>Revenus</span><span>Dépenses</span><span>Solde</span>
        </div>
        {data.map(row => {
          const balance = row.income - row.expenses;
          return (
            <div className="cashflow-row" role="row" key={row.month}>
              <strong>{monthLabel(row.month)}</strong>
              <span>{formatCurrency(row.income)}</span>
              <span>{formatCurrency(row.expenses)}</span>
              <span className={balance >= 0 ? 'is-positive' : 'is-negative'}>
                {balance >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {formatCurrency(balance)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
