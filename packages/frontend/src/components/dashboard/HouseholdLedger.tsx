import { formatCurrency } from '../../lib/formatters';
import { HouseholdSplit } from '../../types';
import { UserRound } from 'lucide-react';

export function HouseholdLedger({ split }: { split: HouseholdSplit }) {
  return (
    <section className="brief-section household-ledger">
      <header className="brief-section-head">
        <div><p>Foyer</p><h2>Répartition</h2></div>
      </header>
      <div className="household-chart" role="img" aria-label="Répartition des charges communes">
        {split.persons.map(person => (
          <span
            key={person.personId}
            style={{ width: `${person.sharePercent}%`, backgroundColor: person.color }}
            title={`${person.name} : ${person.sharePercent.toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="household-list">
        {split.persons.map(person => (
          <div className="household-row" key={person.personId}>
            <div className="household-person">
              <span className="household-avatar" style={{ borderColor: person.color, backgroundColor: `${person.color}24` }}><UserRound size={17} /></span>
              <div><strong>{person.name}</strong><span>{formatCurrency(person.effectiveIncome)} de revenus</span></div>
            </div>
            <div className="household-share">
              <span>{person.sharePercent.toFixed(0)}% du foyer</span>
              <strong>{formatCurrency(person.commonChargeShare)}</strong>
              <small>à verser</small>
            </div>
          </div>
        ))}
      </div>
      <footer className="household-total"><span>Charges communes</span><strong>{formatCurrency(split.totalCommonCharges)}</strong></footer>
    </section>
  );
}
