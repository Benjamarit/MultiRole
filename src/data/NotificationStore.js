// src/data/NotificationStore.js
const NOTIFICATIONS_KEY = 'ce_notifications';

function readAll() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeAll(notifications) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

// ดึงการแจ้งเตือนของผู้ใช้แต่ละคน
export function getNotificationsByUser(email) {
  if (!email) return [];
  const all = readAll();
  // เรียงจากใหม่ไปเก่า
  return all
    .filter((n) => n.userId === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// สร้างการแจ้งเตือนใหม่
export function addNotification({ userId, projectId, title, message, type = 'REMINDER' }) {
  const notifications = readAll();
  const newNotification = {
    id: Date.now().toString(),
    userId,
    projectId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  writeAll([...notifications, newNotification]);
  return newNotification;
}

// ทำเครื่องหมายว่าอ่านแล้ว (1 รายการ)
export function markAsRead(notificationId) {
  const notifications = readAll();
  const updated = notifications.map(n =>
    n.id === notificationId ? { ...n, isRead: true } : n
  );
  writeAll(updated);
}

// ทำเครื่องหมายว่าอ่านแล้ว (ทั้งหมดของผู้ใช้)
export function markAllAsRead(email) {
  const notifications = readAll();
  const updated = notifications.map(n =>
    n.userId === email ? { ...n, isRead: true } : n
  );
  writeAll(updated);
}