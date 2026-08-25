import { HouseholdSplit } from '../../types';
import { formatCurrency } from '../../lib/formatters';
import { UserRound } from 'lucide-react';

export function HouseholdSplitBar({ split }: { split: HouseholdSplit }) {
  if (!split?.persons.length) return null;
  return (
    <div className="household-split-tiles">
      {split.persons.map(person => (
        <div className="household-split-tile" key={person.personId}>
          <div className="household-split-person">
            <i style={{ borderColor: person.color, backgroundColor: `${person.color}18` }}><UserRound size={14} /></i>
            <strong>{person.name}</strong>
          </div>
          <span>{person.sharePercent.toFixed(1)}% · à verser</span>
          <strong className="household-split-amount">{formatCurrency(person.commonChargeShare)}</strong>
        </div>
      ))}
    </div>
  );
}
