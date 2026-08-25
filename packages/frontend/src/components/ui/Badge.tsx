import React from 'react';
import { categoryLabels } from '../../lib/formatters';
import { CategoryIcon } from './CategoryIcon';

interface BadgeProps {
  children?: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`category-badge inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={color ? { ['--badge-color' as string]: color } : undefined}
    >
      {children}
    </span>
  );
}

interface CategoryBadgeProps {
  category: string;
}

const categoryColors: Record<string, string> = {
  housing: 'var(--color-chart-1)', insurance: 'var(--color-chart-5)', subscription: 'var(--color-chart-3)',
  tax: 'var(--color-chart-4)', transport: 'var(--color-chart-8)', health: 'var(--color-chart-6)',
  sport: 'var(--color-chart-2)', education: 'var(--color-chart-10)', food: 'var(--color-chart-7)',
  clothing: 'var(--color-chart-2)', telecom: 'var(--color-chart-3)', credit: 'var(--color-chart-9)',
  energy: 'var(--color-chart-4)', childcare: 'var(--color-chart-10)', other: 'var(--color-chart-11)',
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const color = categoryColors[category] || 'var(--color-muted)';
  const label = categoryLabels[category] || category;
  return (
    <Badge color={color}>
      <CategoryIcon category={category} size={13} /> {label}
    </Badge>
  );
}
