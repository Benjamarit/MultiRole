import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_ADMIN: 'Project Admin',
  JUDGE: 'Judge',
};

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || 'ผู้ใช้งาน';
  const roleLabel = user ? roleLabels[user.role] || user.role : '-';
  const avatarInitial = displayName.charAt(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        
        {/* ซ้าย: สำหรับมือถือ */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={onMenuClick}
            className="rounded-sm text-slate-500 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-precision-blue"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-ink-navy">CE System</h1>
        </div>

        {/* ขวา: ข้อมูล User และปุ่ม Logout */}
        <div className="ml-auto flex w-full items-center justify-end gap-4 md:w-auto">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          
          {/* Avatar — แสดงตัวอักษรแรกของชื่อผู้ใช้งานที่ล็อกอินอยู่จริง */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-semibold text-precision-blue">
            {avatarInitial}
          </div>
          
          <div className="mx-2 hidden h-6 w-px bg-border sm:block"></div>
          
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border-0 bg-transparent p-0 text-xs font-medium text-slate-600 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:text-sm"
          >
            <LogOut size={16} aria-hidden="true" />
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}