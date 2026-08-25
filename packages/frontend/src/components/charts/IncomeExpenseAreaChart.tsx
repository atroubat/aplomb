import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency } from '../../lib/formatters';

interface DataPoint {
  month: string;   // "2025-04"
  income: number;
  expenses: number;
}

interface Props {
  data: DataPoint[];
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const income   = payload.find((p: { dataKey: string }) => p.dataKey === 'income')?.value ?? 0;
  const expenses = payload.find((p: { dataKey: string }) => p.dataKey === 'expenses')?.value ?? 0;
  const surplus  = income - expenses;
  return (
    <div className="glass rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{fmtMonth(label)}</p>
      <div className="flex justify-between gap-4">
        <span className="text-indigo-500">Revenus</span>
        <span className="font-medium">{formatCurrency(income)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-red-400">Dépenses</span>
        <span className="font-medium">{formatCurrency(expenses)}</span>
      </div>
      <div className={`flex justify-between gap-4 border-t border-slate-100 dark:border-slate-600 pt-1 font-semibold ${surplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        <span>Solde</span>
        <span>{surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}</span>
      </div>
    </div>
  );
}

export function IncomeExpenseAreaChart({ data }: Props) {
  if (!data.length) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Aucune donnée</div>
  );

  const formatted = data.map(d => ({ ...d, _label: fmtMonth(d.month) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
        <XAxis
          dataKey="_label"
          tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `${Math.round(v / 1000)}k`}
          tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string | number) => value === 'income' ? 'Revenus' : 'Dépenses'}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="var(--color-accent-soft)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          fill="var(--color-danger-soft)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
