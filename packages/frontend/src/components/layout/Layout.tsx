import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { isDemoMode } from '../../lib/api';
import { useLocation } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

export function Layout() {
  const demoMode = isDemoMode();
  const location = useLocation();
  const pageSlug = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1).replace(/\//g, '-');

  return (
    <div className="hallmark-shell min-h-dvh">
      <Sidebar />
      <div className="hallmark-stage min-w-0">
        <Header />
        {demoMode && (
          <div className="demo-banner" role="status">
            <FlaskConical size={13}/>
            <span>Mode démo · données fictives</span>
          </div>
        )}
        <main className={`hallmark-main app-page app-page--${pageSlug} scrollbar-thin`}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
