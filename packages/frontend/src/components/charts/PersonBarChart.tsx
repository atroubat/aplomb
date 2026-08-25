import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { formatCurrency } from '../../lib/formatters';
import { PersonSplit } from '../../types';

interface PersonBarData {
  name: string;
  color: string;
  income: number;
  fixedShare: number;    // pro-rata common charges
  personalCharges: number;
  savings: number;
  remaining: number;
}

interface Props {
  persons: PersonSplit[];
  /** Raw data per person from dashboard — caller constructs PersonBarData */
  data?: PersonBarData[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; fill: string }, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Stacked bar: one bar per person, stacked by budget category. */
export function PersonBarChart({ persons }: Props) {
  if (!persons.length) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Aucune donnée</div>
  );

  // Build data: one entry per person showing income vs charges share
  const chartData = persons.map(p => ({
    name: p.name,
    color: p.color,
    'Charges communes': Math.round(p.commonChargeShare * 100) / 100,
    'Revenu net restant': Math.round(Math.max(0, p.effectiveIncome - p.commonChargeShare) * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={48}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
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
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="Charges communes" stackId="a" fill="var(--color-muted)" radius={[0, 0, 4, 4]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} opacity={0.5} />
          ))}
        </Bar>
        <Bar dataKey="Revenu net restant" stackId="a" fill="var(--color-accent)" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
