import { NavLink } from 'react-router-dom';
import type { NavLinkRenderProps } from 'react-router-dom';
import { LayoutDashboard, PiggyBank, Lightbulb, Wallet, Landmark, ReceiptText } from 'lucide-react';

const mainItems = [
  { to: '/', icon: LayoutDashboard, label: 'Budget', end: true },
  { to: '/incomes', icon: Wallet, label: 'Revenus' },
  { to: '/savings', icon: PiggyBank, label: 'Épargne' },
  { to: '/advice', icon: Lightbulb, label: 'Conseils' },
];

export function Sidebar() {
  return (
    <header className="journal-nav">
      <NavLink to="/" className="budget-wordmark" aria-label="Aplomb">
        <span className="budget-logo"><Landmark size={18}/></span>
        <span>Aplomb</span>
      </NavLink>
      <span className="journal-private">Privé · local</span>

      <nav className="budget-nav-links" aria-label="Navigation principale">
        {mainItems.slice(0, 2).map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }: NavLinkRenderProps) => 'budget-nav-link ' + (isActive ? 'is-active' : '')}>
            <Icon size={18}/><span>{label}</span>
          </NavLink>
        ))}

        <NavLink to="/fixed-charges" className={({ isActive }: NavLinkRenderProps) => 'budget-nav-link ' + (isActive ? 'is-active' : '')}>
          <ReceiptText size={18}/><span>Charges</span>
        </NavLink>

        {mainItems.slice(2).map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }: NavLinkRenderProps) => 'budget-nav-link ' + (isActive ? 'is-active' : '')}>
            <Icon size={18}/><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
