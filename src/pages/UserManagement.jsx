import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { deleteRegisteredUser, getRegisteredUsers, updateRegisteredUser } from '../context/authStore';

const PAGE_SIZE = 10;

export default function UserManagement() {
  const [users, setUsers] = useState(() => getRegisteredUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Logic การค้นหาและกรองข้อมูล
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // รีเซ็ตกลับหน้า 1 ทุกครั้งที่เปลี่ยนตัวกรอง เพื่อไม่ให้ค้างอยู่หน้าที่ไม่มีข้อมูล
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
      prevUsers.map((user) =>
        user.email === email
          ? { ...user, status: nextStatus }
          : user
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
      setUsers((prevUsers) => prevUsers.filter((user) => user.email !== userToDelete.email));
      setIsConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('th-TH')
    : '-';

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <PageHeader
        title="จัดการผู้ใช้งาน (User Management)"
        description="ดูบัญชีผู้ใช้ที่สมัครผ่านระบบ และจัดการสถานะการใช้งาน"
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="user-search" className="sr-only">
            ค้นหาชื่อ หรือ อีเมล
          </label>
          <Input
            id="user-search"
            placeholder="ค้นหาชื่อ หรือ อีเมล..."
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="mb-2 text-sm text-gray-500" aria-live="polite">
        พบ {filteredUsers.length} รายการ
      </p>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-4 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4 font-medium">อีเมล</th>
                <th className="px-6 py-4 font-medium">วันที่สมัคร</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedUsers.length > 0 ? (
                pagedUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'Active' ? 'success' : 'error'}>
                        {user.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        variant="textGray"
                        size="sm"
                        onClick={() => handleToggleStatus(user.email)}
                      >
                        {(user.status || 'Active') === 'Active' ? 'ระงับ' : 'เปิดใช้งาน'}
                      </Button>
                      <span className="w-px h-4 bg-gray-200"></span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                      >
                        ลบ
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">
              หน้า {currentPage} จาก {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="text"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="text"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userToDelete?.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ลบข้อมูล"
      />
    </div>
  );
}