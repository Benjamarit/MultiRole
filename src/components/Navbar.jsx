import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotificationsByUser, markAllAsRead, markAsRead } from '../data/NotificationStore';

const roleLabels = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_ADMIN: 'Project Admin',
  JUDGE: 'Judge',
};

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const notifications = getNotificationsByUser(user?.email);

  const displayName = user?.name || 'ผู้ใช้งาน';
  const roleLabel = user ? roleLabels[user.role] || user.role : '-';
  const avatarInitial = displayName.charAt(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsNotifOpen(false);
    if (notification.projectId) {
      navigate(`/judge/project/${notification.projectId}/teams`);
    }
  };

  const handleMarkAllRead = () => {
    if (user?.email) {
      markAllAsRead(user.email);
      setIsNotifOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
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
          <div className="relative flex items-center" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen((isOpen) => !isOpen)}
              className="relative rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-precision-blue"
              aria-label={`การแจ้งเตือน${unreadCount ? ` (${unreadCount} ยังไม่อ่าน)` : ''}`}
              aria-expanded={isNotifOpen}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">การแจ้งเตือน</h2>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <CheckCheck className="h-3 w-3" aria-hidden="true" />
                      อ่านทั้งหมด
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                          >
                            <span className="mb-1 flex items-start justify-between">
                              <span className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </span>
                              {!notification.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="ยังไม่อ่าน" />
                              )}
                            </span>
                            <span className="block line-clamp-2 text-xs text-gray-500">{notification.message}</span>
                            <span className="mt-1 block text-[10px] text-gray-400">
                              {new Date(notification.createdAt).toLocaleString('th-TH')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      ไม่มีการแจ้งเตือนใหม่
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-6 w-px bg-border sm:block"></div>
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