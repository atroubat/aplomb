import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  data: Array<{ month: string; total: number }>;
}

export function SavingsLineChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    monthLabel: new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
      .format(new Date(`${d.month}-01T12:00:00`))
      .replace('.', ''),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
        <XAxis dataKey="monthLabel" minTickGap={18} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
        <Area type="monotone" dataKey="total" name="Épargne totale" stroke="var(--color-accent)" strokeWidth={2} fill="var(--color-accent-soft)" dot={{ r: 3, fill: 'var(--color-accent)' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
