// src/components/Navbar.jsx (อัปเดตใหม่)
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../data/NotificationStore';

const roleLabels = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_ADMIN: 'Project Admin',
  JUDGE: 'Judge',
};

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  const displayName = user?.name || 'ผู้ใช้งาน';
  const roleLabel = user ? roleLabels[user.role] || user.role : '-';
  const avatarInitial = displayName.charAt(0);

  // ดึงแจ้งเตือนเมื่อเปิด Navbar หรือเมื่อเปิด Dropdown
  useEffect(() => {
    if (user?.email) {
      setNotifications(getNotificationsByUser(user.email));
    }
  }, [user?.email, isNotifOpen]);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
      setNotifications(getNotificationsByUser(user.email));
    }
    setIsNotifOpen(false);
    // พากรรมการไปหน้าประเมินของโปรเจกต์นั้น
    if (notif.projectId) {
      navigate(`/judge/project/${notif.projectId}/teams`);
    }
  };

  const handleMarkAllRead = () => {
    if (user?.email) {
      markAllAsRead(user.email);
      setNotifications(getNotificationsByUser(user.email));
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
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-ink-navy">CE System</h1>
        </div>

        {/* ขวา: ข้อมูล User และปุ่มต่างๆ */}
        <div className="ml-auto flex w-full items-center justify-end gap-4 md:w-auto">
          
          {/* ระบบแจ้งเตือน */}
          <div className="relative flex items-center" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-primary-text transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Dropdown แจ้งเตือน */}
            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> อ่านทั้งหมด
                    </button>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <li 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && <span className="h-2 w-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleString('th-TH')}
                          </p>
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

          {/* ข้อมูล User เดิม */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-semibold text-precision-blue">
            {avatarInitial}
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 inline-flex items-center justify-center gap-1.5 rounded-sm border-0 bg-transparent p-0 text-xs font-medium text-slate-600 hover:text-red-700 sm:text-sm"
          >
            <LogOut size={16} />
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}