import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Search, ShieldAlert, UserCheck, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import CriteriaModal from '../components/CriteriaModal';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteRegisteredUser,
  getRegisteredUsers,
  updateRegisteredUser,
} from '../context/authStore';

const PAGE_SIZE = 10;

export default function UserManagement() {
  const { t, tDesc } = useLanguage();
  const [users, setUsers] = useState(() => getRegisteredUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      return (
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = users.filter((u) => (u.status || 'Active') === 'Active').length;
  const resetReqCount = users.filter((u) => u.resetRequested).length;

  const updateSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleToggleStatus = (email) => {
    const user = users.find((item) => item.email === email);
    if (!user) return;
    const nextStatus = (user.status || 'Active') === 'Active' ? 'Suspended' : 'Active';
    updateRegisteredUser(email, { status: nextStatus });
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.email === email ? { ...u, status: nextStatus } : u))
    );
    toast.success(
      t(
        `เปลี่ยนสถานะเป็น ${nextStatus} เรียบร้อยแล้ว`,
        `Status updated to ${nextStatus}`
      )
    );
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteRegisteredUser(userToDelete.email);
      setUsers((prevUsers) => prevUsers.filter((u) => u.email !== userToDelete.email));
      setIsConfirmOpen(false);
      setUserToDelete(null);
      toast.success(t('ลบผู้ใช้งานสำเร็จ', 'User deleted successfully'));
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (!userToReset) {
      toast.error(t('ไม่พบข้อมูลผู้ใช้งาน', 'User not found'));
      return;
    }
    if (newPassword.length < 4) {
      toast.error(
        t('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'Password must be at least 4 characters')
      );
      return;
    }

    updateRegisteredUser(userToReset.email, {
      password: newPassword,
      resetRequested: false,
    });

    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.email === userToReset.email
          ? { ...u, password: newPassword, resetRequested: false }
          : u
      )
    );

    toast.success(
      t(
        `เปลี่ยนรหัสผ่านของ ${userToReset.name} สำเร็จ`,
        `Password updated for ${userToReset.name}`
      )
    );
    setIsResetModalOpen(false);
    setUserToReset(null);
    setNewPassword('');
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('th-TH') : '-';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title={t('จัดการผู้ใช้งาน', 'User Management')}
        description={tDesc(
          'ดูบัญชีผู้ใช้ที่สมัครผ่านระบบ จัดการสถานะการใช้งาน และรีเซ็ตรหัสผ่านตามคำขอ',
          'Manage registered accounts, toggle active/suspended status, and handle password reset requests.'
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('ผู้ใช้ทั้งหมด', 'Total Users', { compact: true })}
            </p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('เปิดใช้งานปกติ', 'Active Accounts', { compact: true })}
            </p>
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('คำขอกู้รหัสผ่าน', 'Password Reset Requests', { compact: true })}
            </p>
            <p className="text-2xl font-bold text-amber-700">{resetReqCount}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <label htmlFor="user-search" className="sr-only">
            {t('ค้นหาชื่อ หรือ อีเมล', 'Search by name or email')}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="user-search"
            type="text"
            placeholder={t('ค้นหาชื่อ หรือ อีเมล...', 'Search name or email...')}
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <p className="text-sm text-slate-500" aria-live="polite">
          {t(`พบ ${filteredUsers.length} รายการ`, `Found ${filteredUsers.length} users`)}
        </p>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">{t('ชื่อ-นามสกุล', 'Full Name', { compact: true })}</th>
                <th className="px-6 py-3.5">{t('อีเมล', 'Email', { compact: true })}</th>
                <th className="px-6 py-3.5">{t('วันที่สมัคร', 'Joined', { compact: true })}</th>
                <th className="px-6 py-3.5">{t('สถานะ', 'Status', { compact: true })}</th>
                <th className="px-6 py-3.5 text-right">{t('จัดการ', 'Actions', { compact: true })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.length > 0 ? (
                pagedUsers.map((user) => (
                  <tr
                    key={user.email}
                    className="text-sm transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={(user.status || 'Active') === 'Active' ? 'success' : 'error'}
                        >
                          {user.status || 'Active'}
                        </Badge>
                        {user.resetRequested && (
                          <Badge variant="warning">
                            <ShieldAlert className="h-3 w-3" />
                            {t('ขอกู้รหัสผ่าน', 'Reset Requested', { compact: true })}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => {
                            setUserToReset(user);
                            setIsResetModalOpen(true);
                          }}
                        >
                          {t('เปลี่ยนรหัส', 'Reset PW', { compact: true })}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(user.email)}
                        >
                          {(user.status || 'Active') === 'Active'
                            ? t('ระงับ', 'Suspend', { compact: true })
                            : t('เปิดใช้', 'Activate', { compact: true })}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          {t('ลบ', 'Delete', { compact: true })}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm text-slate-500">
                    {t(
                      'ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา',
                      'No users match your search criteria'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5">
            <p className="text-sm text-slate-500">
              {t(`หน้า ${currentPage} จาก ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {t('ก่อนหน้า', 'Previous', { compact: true })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                {t('ถัดไป', 'Next', { compact: true })}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t('ยืนยันการลบผู้ใช้งาน', 'Confirm User Deletion')}
        message={t(
          `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userToDelete?.name}"?`,
          `Are you sure you want to permanently delete "${userToDelete?.name}"?`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('ลบข้อมูล', 'Delete User', { compact: true })}
      />

      <CriteriaModal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setNewPassword('');
        }}
        title={t('กำหนดรหัสผ่านใหม่', 'Reset User Password')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            {t('กำหนดรหัสผ่านใหม่ให้กับ', 'Set a new password for')}{' '}
            <strong className="text-slate-900">{userToReset?.name}</strong> ({userToReset?.email})
          </p>
          <Input
            type="password"
            label={t('รหัสผ่านใหม่', 'New Password')}
            placeholder={t(
              'กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)',
              'Enter new password (min 4 chars)'
            )}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsResetModalOpen(false);
                setNewPassword('');
              }}
            >
              {t('ยกเลิก', 'Cancel', { compact: true })}
            </Button>
            <Button type="submit">{t('บันทึกรหัสผ่าน', 'Save Password', { compact: true })}</Button>
          </div>
        </form>
      </CriteriaModal>
    </div>
  );
}