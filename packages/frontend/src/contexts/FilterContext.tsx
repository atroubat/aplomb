import React, { createContext, useContext, useState } from 'react';

interface FilterContextValue {
  year: number;
  month: number;
  selectedPersonIds: number[];
  selectedAccountIds: number[];
  darkMode: boolean;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  setYearMonth: (y: number, m: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  togglePerson: (id: number) => void;
  setPersonIds: (ids: number[]) => void;
  toggleAccount: (id: number) => void;
  setAccountIds: (ids: number[]) => void;
  toggleDarkMode: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedPersonIds, setPersonIds] = useState<number[]>([]);
  const [selectedAccountIds, setAccountIds] = useState<number[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    document.documentElement.classList.add('dark');
    return true;
  });

  const setYearMonth = (y: number, m: number) => {
    setYear(y); setMonth(m);
  };

  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const togglePerson = (id: number) => {
    setPersonIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAccount = (id: number) => {
    setAccountIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleDarkMode = () => {
    setDarkMode(d => {
      const next = !d;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  return (
    <FilterContext.Provider value={{
      year, month, selectedPersonIds, selectedAccountIds, darkMode,
      setYear, setMonth, setYearMonth, goToPrevMonth, goToNextMonth,
      togglePerson, setPersonIds, toggleAccount, setAccountIds, toggleDarkMode,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
