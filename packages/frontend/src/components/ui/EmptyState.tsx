import React from 'react';
import { Button } from './Button';
import { Plus, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="empty-state-mark"><Inbox size={22}/></span>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">{description}</p>}
      {action && (
        <Button onClick={action.onClick} icon={<Plus size={16} />}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
