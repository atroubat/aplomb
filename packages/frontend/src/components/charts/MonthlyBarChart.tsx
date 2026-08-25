import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatMonthYear } from '../../lib/formatters';

interface Props {
  data: Array<{ month: string; income: number; expenses: number }>;
}

export function MonthlyBarChart({ data }: Props) {
  const formatted = data.map(d => ({ ...d, monthLabel: formatMonthYear(d.month + '-01').slice(0, 3) + ' ' + d.month.slice(0, 4) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="income" name="Revenus" fill="var(--color-chart-savings)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="expenses" name="Dépenses" fill="var(--color-coral)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
