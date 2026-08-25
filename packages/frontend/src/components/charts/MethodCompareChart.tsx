import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../lib/formatters';
import { BudgetAdvice } from '../../types';

interface Props {
  advice: BudgetAdvice;
}

export function MethodCompareChart({ advice }: Props) {
  const data = [
    {
      name: 'Théorique',
      Besoins: advice.theoretical.needs.amount,
      Loisirs: advice.theoretical.wants.amount,
      Épargne: advice.theoretical.savings.amount,
    },
    {
      name: 'Réel',
      Besoins: advice.actual.needs.amount,
      Loisirs: advice.actual.wants.amount,
      Épargne: advice.actual.savings.amount,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis dataKey="name" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-rule)' }} tickLine={false}/>
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false}/>
        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="Besoins" stackId="a" fill="var(--color-chart-needs)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Loisirs" stackId="a" fill="var(--color-chart-wants)" />
        <Bar dataKey="Épargne" stackId="a" fill="var(--color-chart-savings)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
