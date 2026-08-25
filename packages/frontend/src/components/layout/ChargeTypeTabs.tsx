import { NavLink } from 'react-router-dom';
import type { NavLinkRenderProps } from 'react-router-dom';
import { Home, UserRound } from 'lucide-react';

export function ChargeTypeTabs() {
  return (
    <nav className="charge-type-tabs" aria-label="Type de charges">
      <NavLink to="/fixed-charges" className={({ isActive }: NavLinkRenderProps) => isActive ? 'is-active' : ''}>
        <Home size={16}/>Communes
      </NavLink>
      <NavLink to="/personal-charges" className={({ isActive }: NavLinkRenderProps) => isActive ? 'is-active' : ''}>
        <UserRound size={16}/>Personnelles
      </NavLink>
    </nav>
  );
}
