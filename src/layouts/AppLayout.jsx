import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // ปิด Sidebar อัตโนมัติทุกครั้งที่เปลี่ยนหน้า 
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* เมนูด้านข้าง */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* พื้นที่หลักด้านขวา */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* แถบด้านบน */}
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* พื้นที่เนื้อหาที่เปลี่ยนไปตาม Route */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}