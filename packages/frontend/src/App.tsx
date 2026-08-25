import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Layout } from './components/layout/Layout';
import { FilterProvider } from './contexts/FilterContext';
import { ToastProvider } from './contexts/ToastContext';
import { CardSkeleton } from './components/ui/SkeletonLoader';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Incomes = lazy(() => import('./pages/Incomes'));
const FixedCharges = lazy(() => import('./pages/FixedCharges'));
const PersonalCharges = lazy(() => import('./pages/PersonalCharges'));
const SavingsPage = lazy(() => import('./pages/Savings'));
const Advice = lazy(() => import('./pages/Advice'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="incomes" element={<Suspense fallback={<PageLoader />}><Incomes /></Suspense>} />
              <Route path="fixed-charges" element={<Suspense fallback={<PageLoader />}><FixedCharges /></Suspense>} />
              <Route path="personal-charges" element={<Suspense fallback={<PageLoader />}><PersonalCharges /></Suspense>} />
              <Route path="savings" element={<Suspense fallback={<PageLoader />}><SavingsPage /></Suspense>} />
              <Route path="advice" element={<Suspense fallback={<PageLoader />}><Advice /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </ToastProvider>
  );
}
