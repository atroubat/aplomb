import { useState } from 'react';
import { Button } from '../ui/Button';
import { Person } from '../../types';
import { Check } from 'lucide-react';

interface Props {
  initial?: Partial<Person>;
  onSubmit: (data: { name: string; color: string; avatar?: string }) => Promise<void>;
  onCancel: () => void;
}

const COLORS = [
  { value: '#4F55F1', label: 'Cobalt' },
  { value: '#E61E49', label: 'Framboise' },
  { value: '#007BC2', label: 'Bleu' },
  { value: '#EC7E00', label: 'Orange' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#00A87E', label: 'Turquoise' },
  { value: '#F04D8A', label: 'Rose' },
  { value: '#D4A600', label: 'Jaune' },
];
export function PersonForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || COLORS[0].value);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try { await onSubmit({ name: name.trim(), color }); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
        <input value={name} onChange={e => setName(e.target.value)} required className="input w-full" placeholder="Ex: Marie" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Couleur</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(option => (
            <button type="button" key={option.value} onClick={() => setColor(option.value)}
              className={`person-color-option ${color === option.value ? 'is-selected' : ''}`}
              style={{ backgroundColor: option.value }}
              aria-label={option.label}
              aria-pressed={color === option.value}
              title={option.label}
            >
              {color === option.value && <Check size={15}/>}<span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="modal-actions flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </form>
  );
}
