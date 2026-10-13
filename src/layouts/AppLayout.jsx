import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen min-w-0 bg-page-background text-primary-text">
      <Navbar />
      <main className="min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}