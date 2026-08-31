import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, ClipboardCheck, X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  // Judge URL
  const isJudgeMode = location.pathname.startsWith('/judge');

  // Admin (System Admin / Project Admin)
  const adminMenus = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Project Management', path: '/admin/projects', icon: FolderKanban },
  ];

  // Judge Menus
  const judgeMenus = [
    { name: 'Judge Dashboard', path: '/judge/dashboard', icon: ClipboardCheck },
  ];

  // เลือกชุดเมนูที่จะนำมา Render ตามโหมดปัจจุบัน
  const menuItems = isJudgeMode ? judgeMenus : adminMenus;
  const portalLabel = isJudgeMode ? 'Judge Portal' : 'Admin Portal';

  const navContent = (
    <>
      {/* โลโก้ หรือ ชื่อระบบ (เปลี่ยนชื่อตามโหมด) */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">CE System</h2>
          <p className="text-xs text-gray-400 mt-1">{portalLabel}</p>
        </div>
        {/* ปุ่มปิด แสดงเฉพาะบนมือถือ */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white focus:outline-none"
          aria-label="ปิดเมนู"
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      {/* รายการเมนู */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => {
                // เงื่อนไขพิเศษ: ถ้าอยู่ในหน้าย่อยของ Project ให้ไฮไลต์เมนู Project Management
                const isProjectSubPage = item.name === 'Project Management' && location.pathname.startsWith('/project/');
                const activeStyle = isActive || isProjectSubPage;

                return `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                  activeStyle
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`;
              }}
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
      <aside className="w-64 bg-gray-900 text-white flex-col hidden md:flex h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile: Drawer เลื่อนเข้า-ออกจากซ้าย ผูกกับ isOpen */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col h-screen md:hidden transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {navContent}
      </aside>

      {/* Backdrop: กดข้างนอกเพื่อปิด แสดงเฉพาะตอนเปิดบนมือถือ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}