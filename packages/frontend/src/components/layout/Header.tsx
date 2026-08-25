import { ChevronLeft, ChevronRight, Sun, Moon, AlertCircle, FlaskConical, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFilters } from '../../contexts/FilterContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { EffectiveIncomeData } from '../../types';
import { isDemoMode, setDemoMode } from '../../lib/api';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export function Header() {
  const demoMode = isDemoMode();
  const { year, month, goToPrevMonth, goToNextMonth, darkMode, toggleDarkMode } = useFilters();
  const { data: effectiveIncome } = useApi<EffectiveIncomeData>(
    () => api.getEffectiveIncome({ year, month }),
    [year, month]
  );

  const missingCount = effectiveIncome?.missingVariableIds?.length ?? 0;

  return (
    <header className="budget-toolbar flex items-center gap-3 flex-wrap">
      {/* Month picker */}
      <div className="toolbar-group toolbar-group--period">
      <span className="toolbar-group-label">Période</span>
      <div className="month-picker">
        <button onClick={goToPrevMonth} className="toolbar-icon" aria-label="Mois précédent">
          <ChevronLeft size={16} />
        </button>
        <span className="month-label">
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={goToNextMonth} className="toolbar-icon" aria-label="Mois suivant">
          <ChevronRight size={16} />
        </button>
      </div>
      </div>

      {/* Variable income notification badge */}
      {missingCount > 0 && (
        <div className="income-alert">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>
            {missingCount} revenu{missingCount > 1 ? 's' : ''} variable{missingCount > 1 ? 's' : ''} à saisir
          </span>
        </div>
      )}

      <div className="toolbar-actions ml-auto flex items-center gap-2">
        <button
          onClick={() => { setDemoMode(!demoMode); window.location.assign('/'); }}
          className={`demo-toggle ${demoMode ? 'is-active' : ''}`}
          title={demoMode ? 'Revenir à mes finances' : 'Afficher des données fictives'}
        >
          {demoMode ? <LogOut size={15} /> : <FlaskConical size={15} />}
          <span className="hidden sm:inline">{demoMode ? 'Quitter la démo' : 'Mode démo'}</span>
        </button>
        <Link to="/settings" className="toolbar-icon" aria-label="Ouvrir les réglages" title="Réglages">
          <Settings size={18}/>
        </Link>
        <button onClick={toggleDarkMode} className="toolbar-icon" aria-label={darkMode ? 'Activer le thème clair' : 'Activer le thème sombre'}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
