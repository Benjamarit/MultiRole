import { NavLink } from 'react-router-dom';
import { FolderKanban, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const adminMenus = [
  { name: 'User Management', path: '/admin/users', icon: Users },
];

const userMenus = [
  { name: 'Workspace', path: '/workspace', icon: FolderKanban },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const menus = isSystemAdmin ? adminMenus : userMenus;

  const navContent = (
    <>
      {/* โลโก้ หรือ ชื่อระบบ */}
      <div className="flex items-center justify-between border-b border-white/15 p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">CE System</h2>
          <p className="mt-1 text-xs text-white/65">
            {isSystemAdmin ? 'Admin Portal' : 'Workspace'}
          </p>
        </div>
        {/* ปุ่มปิด แสดงเฉพาะบนมือถือ */}
        <button
          onClick={onClose}
          className="rounded-sm text-white/65 hover:text-white focus-visible:ring-2 focus-visible:ring-white md:hidden"
          aria-label="ปิดเมนู"
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      {/* รายการเมนู */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {menus.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                  isActive
                    ? 'bg-precision-blue text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: ค้างโชว์ตลอด ไม่ผูกกับ isOpen */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col bg-ink-navy text-white md:flex">
        {navContent}
      </aside>

      {/* Mobile: Drawer เลื่อนเข้า-ออกจากซ้าย ผูกกับ isOpen */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-ink-navy text-white transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {navContent}
      </aside>

      {/* Backdrop: กดข้างนอกเพื่อปิด แสดงเฉพาะตอนเปิดบนมือถือ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-navy/35 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}