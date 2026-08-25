import { UserRound, UsersRound } from 'lucide-react';
import { Person } from '../../types';

export function PersonViewPicker({
  persons,
  value,
  onChange,
  allowHousehold = false,
  label = 'Personne',
}: {
  persons: Person[];
  value: number | null;
  onChange: (personId: number | null) => void;
  allowHousehold?: boolean;
  label?: string;
}) {
  return (
    <div className="personal-charge-person-picker person-view-picker">
      <span className="personal-charge-person-picker__icon">
        {value === null && allowHousehold ? <UsersRound size={17}/> : <UserRound size={17}/>}
      </span>
      <label htmlFor={`person-view-${label}`}>{label}</label>
      <select
        id={`person-view-${label}`}
        value={value ?? ''}
        onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        {allowHousehold && <option value="">Foyer</option>}
        {!allowHousehold && <option value="" disabled>Choisir une personne</option>}
        {persons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select>
    </div>
  );
}
