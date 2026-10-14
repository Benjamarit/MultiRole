import { useMemo, useState } from 'react';
import Button from './Button';
import CriteriaModal from './CriteriaModal';
import { useLanguage } from '../context/LanguageContext';

export default function JudgeAssignModal({
  isOpen,
  availableUsers,
  onAssign,
  onClose,
}) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');

  const matchingUsers = useMemo(() => {
    const query = email.trim().toLowerCase();
    if (!query) return availableUsers;
    return availableUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        (user.name || '').toLowerCase().includes(query)
    );
  }, [availableUsers, email]);

  if (!isOpen) return null;

  const handleAssign = (e) => {
    e?.preventDefault();
    const selectedEmail = email.trim().toLowerCase();
    if (!availableUsers.some((user) => user.email.toLowerCase() === selectedEmail))
      return;
    onAssign(selectedEmail);
    setEmail('');
  };

  return (
    <CriteriaModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('เชิญกรรมการเข้าโครงการ', 'Invite Judge to Competition')}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleAssign} className="space-y-4">
        <p className="text-sm text-slate-600">
          {t(
            'ค้นหาและเลือกจากอีเมลของผู้ใช้ที่ลงทะเบียนในระบบ',
            'Select from registered users in the system by email.'
          )}
        </p>

        <div>
          <label
            htmlFor="judge-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {t('อีเมลกรรมการ', 'Judge Email')}
          </label>
          {availableUsers.length > 0 ? (
            <>
              <input
                id="judge-email"
                type="email"
                list="available-judge-emails"
                className="w-full rounded-lg border border-slate-200 bg-surface px-3.5 py-2 text-sm text-primary-text focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="judge@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <datalist id="available-judge-emails">
                {matchingUsers.map((user) => (
                  <option key={user.email} value={user.email}>
                    {user.name}
                  </option>
                ))}
              </datalist>
              {email &&
                !availableUsers.some(
                  (user) => user.email.toLowerCase() === email.trim().toLowerCase()
                ) && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {t(
                      'ไม่พบอีเมลผู้ใช้ที่สมัครไว้ หรือผู้ใช้นี้ถูกเชิญแล้ว',
                      'Registered user not found or already invited'
                    )}
                  </p>
                )}
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              {t(
                'ยังไม่มีผู้ใช้อื่นที่สามารถเชิญเข้าโครงการนี้ได้ (ผู้ใช้อาจถูกเชิญครบแล้ว หรือยังไม่ได้สมัครสมาชิก)',
                'No additional registered users available to invite.'
              )}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ยกเลิก', 'Cancel', { compact: true })}
          </Button>
          <Button
            type="submit"
            disabled={
              !email ||
              !availableUsers.some(
                (user) => user.email.toLowerCase() === email.trim().toLowerCase()
              )
            }
          >
            {t('เชิญเข้าโครงการ', 'Invite Judge', { compact: true })}
          </Button>
        </div>
      </form>
    </CriteriaModal>
  );
}