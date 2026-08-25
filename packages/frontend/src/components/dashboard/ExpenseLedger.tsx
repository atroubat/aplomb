import { formatCurrency } from '../../lib/formatters';
import { ExpensesPieChart } from '../charts/ExpensesPieChart';

interface ExpenseLedgerProps {
  data: Array<{ category: string; amount: number; label: string }>;
}

export function ExpenseLedger({ data }: ExpenseLedgerProps) {
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="brief-section expense-ledger">
      <header className="brief-section-head">
        <div><p>Dépenses</p><h2>Où part l'argent</h2></div>
        <strong>{formatCurrency(total)}</strong>
      </header>
      <div className="expense-visual">
        <div className="expense-ring"><ExpensesPieChart data={rows}/></div>
        <div className="ledger-list">
          {rows.length === 0 && <p className="brief-empty">Aucune dépense sur cette période.</p>}
          {rows.map((row, index) => {
            const share = total > 0 ? (row.amount / total) * 100 : 0;
            return (
              <div className="ledger-row" key={`${row.category}-${index}`}>
                <span className="ledger-rank">{String(index + 1).padStart(2, '0')}</span>
                <div className="ledger-copy">
                  <div><span>{row.label}</span><strong>{formatCurrency(row.amount)}</strong></div>
                  <div className="ledger-track"><span style={{ width: `${share}%` }} /></div>
                </div>
                <span className="ledger-share">{share.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
