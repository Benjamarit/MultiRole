import api from './client';
import { normalizeUser } from './workspace';

export const ADMIN_READ_TIMEOUT = 30000;

// Apply each successful response independently, even if the other request fails.
// Reject the aggregate on partial failure so polling still backs off and retries.
export async function loadSystemAdminData({ onUsers, onMonitoring, isActive = () => true }) {
  const parts = [
    { name: 'users', label: 'รายชื่อผู้ใช้', path: '/admin/users', apply: data => {
      if (!Array.isArray(data)) throw new Error('รูปแบบข้อมูลผู้ใช้ไม่ถูกต้อง');
      onUsers(data.map(normalizeUser));
    } },
    { name: 'monitoring', label: 'ข้อมูลติดตามระบบ', path: '/admin/monitoring', apply: data => {
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.projects) || !Array.isArray(data.activities)) {
        throw new Error('รูปแบบข้อมูลติดตามระบบไม่ถูกต้อง');
      }
      onMonitoring(data);
    } },
  ];
  const results = await Promise.allSettled(parts.map(async part => {
    const { data } = await api.get(part.path, { timeout: ADMIN_READ_TIMEOUT });
    if (isActive()) part.apply(data);
  }));
  if (!isActive()) return;
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [{ part: parts[index].name, label: parts[index].label, cause: result.reason }] : []);
  if (failures.length) {
    const error = new Error(failures.map(failure => `${failure.label}: ${failure.cause.message}`).join('\n'));
    error.failures = failures;
    throw error;
  }
}
