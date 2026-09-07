import { useMemo, useState } from 'react';
import Button from './Button';

/**
 * <JudgeAssignModal
 *   isOpen={isAssignOpen}
 *   availableUsers={[{name, email}, ...]}   // registered users not yet assigned
 *   onAssign={(email) => ...}
 *   onClose={() => ...}
 * />
 */
export default function JudgeAssignModal({ isOpen, availableUsers, onAssign, onClose }) {
  const [email, setEmail] = useState('');

  const matchingUsers = useMemo(() => {
    const query = email.trim().toLowerCase();
    if (!query) return availableUsers;
    return availableUsers.filter((user) => user.email.toLowerCase().includes(query));
  }, [availableUsers, email]);

  if (!isOpen) return null;

  const handleAssign = () => {
    const selectedEmail = email.trim().toLowerCase();
    if (!availableUsers.some((user) => user.email.toLowerCase() === selectedEmail)) return;
    onAssign(selectedEmail);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-assign-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="judge-assign-title" className="text-lg font-semibold text-gray-900">
          เพิ่มกรรมการเข้าโครงการ
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          ค้นหาจากอีเมลของผู้ใช้ที่สมัครสมาชิกในระบบ
        </p>

        <div className="mt-5">
          <label htmlFor="judge-email" className="mb-1 block text-sm font-medium text-gray-700">
            อีเมลกรรมการ
          </label>
          {availableUsers.length > 0 ? (
            <>
              <input
                id="judge-email"
                type="email"
                list="available-judge-emails"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="judge@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <datalist id="available-judge-emails">
                {matchingUsers.map((user) => <option key={user.email} value={user.email}>{user.name}</option>)}
              </datalist>
              {email && !availableUsers.some((user) => user.email.toLowerCase() === email.trim().toLowerCase()) && (
                <p className="mt-1 text-xs text-red-600">ไม่พบอีเมลผู้ใช้ที่สมัครไว้ หรือผู้ใช้นี้ถูกเชิญแล้ว</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              ยังไม่มีผู้ใช้อื่นที่สามารถเชิญเข้าโครงการนี้ได้
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleAssign} disabled={!email || !availableUsers.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())}>
            เพิ่มเข้าโครงการ
          </Button>
        </div>
      </div>
    </div>
  );
}