import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/formatters';

const COLORS = ['var(--color-chart-1)','var(--color-chart-2)','var(--color-chart-3)','var(--color-chart-4)','var(--color-chart-5)','var(--color-chart-6)','var(--color-chart-7)','var(--color-chart-8)','var(--color-chart-9)','var(--color-chart-10)','var(--color-chart-11)'];

interface Props {
  data: Array<{ category: string; amount: number; label: string }>;
}

export function ExpensesPieChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Aucune dépense</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
        <Legend iconType="circle" iconSize={8} formatter={(value: string | number) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
