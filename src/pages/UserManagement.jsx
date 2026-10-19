import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Search, UserCheck, UserX, Users } from 'lucide-react';
import apiClient from '../api/client';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteRegisteredUser,
  getRegisteredUsers,
  setRegisteredUsersCache,
  updateRegisteredUser,
} from '../context/authStore';

const PAGE_SIZE = 10;

export default function UserManagement() {
  const { t, tDesc } = useLanguage();
  const [users, setUsers] = useState(() => getRegisteredUsers());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/users');
      if (Array.isArray(res.data)) {
        setUsers(res.data);
        setRegisteredUsersCache(res.data);
      }
    } catch {
      // Fallback กรณีไม่ได้เปิดเซิร์ฟเวอร์ Spring Boot
      setUsers(getRegisteredUsers());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      return (
        !query ||
        (user.name || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
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
  const suspendedCount = users.filter((u) => u.status === 'Suspended').length;

  const updateSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus =
      (targetUser.status || 'Active') === 'Active' ? 'Suspended' : 'Active';
    try {
      if (targetUser.id) {
        await apiClient.patch(`/admin/users/${targetUser.id}/status`, {
          status: nextStatus,
        });
      }
    } catch {
      // fallback localStorage
    }
    updateRegisteredUser(targetUser.email, { status: nextStatus });
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.email === targetUser.email ? { ...u, status: nextStatus } : u
      )
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

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      if (userToDelete.id) {
        await apiClient.delete(`/admin/users/${userToDelete.id}`);
      }
    } catch {
      // fallback localStorage
    }
    deleteRegisteredUser(userToDelete.email);
    setUsers((prevUsers) =>
      prevUsers.filter((u) => u.email !== userToDelete.email)
    );
    setIsConfirmOpen(false);
    setUserToDelete(null);
    toast.success(t('ลบผู้ใช้งานสำเร็จ', 'User deleted successfully'));
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('th-TH') : '-';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title={t('จัดการผู้ใช้งาน', 'User Management')}
        description={tDesc(
          'ดูบัญชีผู้ใช้ที่สมัครผ่านระบบ และจัดการสถานะการใช้งาน (การรีเซ็ตรหัสผ่านดำเนินการผ่านลิงก์อีเมลอัตโนมัติ)',
          'View registered accounts and manage active or suspended status (password resets are handled via automated email links).'
        )}
        action={
          <Button variant="secondary" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('รีเฟรชข้อมูล', 'Refresh')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('ผู้ใช้ทั้งหมด', 'Total Users')}
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
              {t('เปิดใช้งานปกติ', 'Active Accounts')}
            </p>
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('บัญชีที่ถูกระงับ', 'Suspended Accounts')}
            </p>
            <p className="text-2xl font-bold text-rose-700">{suspendedCount}</p>
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
                <th className="px-6 py-3.5">{t('ชื่อ-นามสกุล', 'Full Name')}</th>
                <th className="px-6 py-3.5">{t('อีเมล', 'Email')}</th>
                <th className="px-6 py-3.5">{t('วันที่สมัคร', 'Joined')}</th>
                <th className="px-6 py-3.5">{t('สถานะ', 'Status')}</th>
                <th className="px-6 py-3.5 text-right">{t('จัดการ', 'Actions')}</th>
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
                      <Badge
                        variant={(user.status || 'Active') === 'Active' ? 'success' : 'error'}
                      >
                        {user.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                        >
                          {(user.status || 'Active') === 'Active'
                            ? t('ระงับ', 'Suspend')
                            : t('เปิดใช้', 'Activate')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          {t('ลบ', 'Delete')}
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
                {t('ก่อนหน้า', 'Previous')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                {t('ถัดไป', 'Next')}
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
        confirmText={t('ลบข้อมูล', 'Delete User')}
      />
    </div>
  );
}