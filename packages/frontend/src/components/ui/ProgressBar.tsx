interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className = '', showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 75 ? 'bg-green-500' : clamped >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={`relative h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${clamped}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {clamped.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
