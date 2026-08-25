import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  percentage: number;
  target: number;
  actual: number;
}

export function BudgetGaugeChart({ percentage, target, actual }: Props) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const color = clamped >= 100 ? 'var(--color-chart-savings)' : clamped >= 60 ? 'var(--color-chart-wants)' : 'var(--color-danger)';
  const data = [{ value: clamped, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'var(--color-rule)' }} dataKey="value" cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <div className="text-3xl font-bold" style={{ color }}>{clamped.toFixed(0)}%</div>
        <div className="text-xs text-slate-500 mt-1">de l'objectif atteint</div>
      </div>
    </div>
  );
}
