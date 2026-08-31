import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Button from './Button';
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* ซ้าย: สำหรับมือถือ */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={onMenuClick}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">CE System</h1>
        </div>

        {/* ขวา: ข้อมูล User และปุ่ม Logout */}
        <div className="flex items-center justify-end gap-4 w-full md:w-auto">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          
          {/* Avatar — แสดงตัวอักษรแรกของชื่อผู้ใช้งานที่ล็อกอินอยู่จริง */}
          <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
            {avatarInitial}
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
          
          <Button variant="textGray" size="sm" onClick={handleLogout}>
            LOGOUT
          </Button>
        </div>
      </div>
    </header>
  );
}