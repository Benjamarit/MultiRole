import api from '../../api/client';
import { workspace, refreshNotifications } from '../../api/workspace';
export const getNotificationsByUser = (email) => email === workspace.user?.email ? workspace.notifications : [];
export async function addNotification(n) {
  return (await api.post('/notifications', { competitionId: n.projectId, email: n.userId,
    title: n.title, message: n.message, type: n.type })).data;
}
export async function markAsRead(id) {
  await api.patch('/notifications/' + id + '/read');
  await refreshNotifications();
}
export async function markAllAsRead() {
  await api.patch('/notifications/read-all');
  await refreshNotifications();
}
