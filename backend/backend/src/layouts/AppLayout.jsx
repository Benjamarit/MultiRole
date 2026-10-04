import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  const [sidebarOpenPath, setSidebarOpenPath] = useState(null);
  const location = useLocation();
  const isSidebarOpen = sidebarOpenPath === location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* เมนูด้านข้าง */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpenPath(null)} />

      {/* พื้นที่หลักด้านขวา */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* แถบด้านบน */}
        <Navbar onMenuClick={() => setSidebarOpenPath(location.pathname)} />

        {/* พื้นที่เนื้อหาที่เปลี่ยนไปตาม Route */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}