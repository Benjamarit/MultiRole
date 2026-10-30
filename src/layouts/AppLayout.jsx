import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen min-w-0 bg-page-background text-primary-text">
      <Navbar />
      <main className="min-w-0 overflow-x-hidden">
        <Outlet key={pathname} />
      </main>
    </div>
  );
}
