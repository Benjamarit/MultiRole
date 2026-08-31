import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import UserFormModal from '../components/UserFormModal';

const roleLabels = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_ADMIN: 'Project Admin',
  JUDGE: 'Judge',
};

const PAGE_SIZE = 10;

// ข้อมูลจำลอง (Mock Data)D
const initialUsers = [
  { id: 1, name: 'ดร.สมชาย ใจดี', email: 'somchai@example.com', role: 'SYSTEM_ADMIN', status: 'Active' },
  { id: 2, name: 'อ.สมศรี เรียนเก่ง', email: 'somsri@example.com', role: 'PROJECT_ADMIN', status: 'Active' },
  { id: 3, name: 'นายวิชัย ทำงาน', email: 'wichai@example.com', role: 'JUDGE', status: 'Inactive' },
  { id: 4, name: 'นางสาวสุดา ยิ้มแย้ม', email: 'suda@example.com', role: 'JUDGE', status: 'Active' },
];

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [page, setPage] = useState(1);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = โหมดเพิ่มใหม่

  // Logic การค้นหาและกรองข้อมูล
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      const matchesRole = filterRole === 'ALL' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

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
  const updateFilterRole = (value) => {
    setFilterRole(value);
    setPage(1);
  };

  const handleToggleStatus = (id) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === id
          ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
          : user
      )
    );
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'SYSTEM_ADMIN': return 'purple';
      case 'PROJECT_ADMIN': return 'info';
      case 'JUDGE': return 'warning';
      default: return 'default';
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userToDelete.id));
      setIsConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  // เปิดฟอร์มโหมดเพิ่มใหม่
  const handleAddClick = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  // เปิดฟอร์มโหมดแก้ไข
  const handleEditClick = (user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  // บันทึกจากฟอร์ม ทั้งเพิ่มและแก้ไขใช้ path เดียวกัน
  const handleSaveUser = (userData) => {
    if (userData.id) {
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userData.id ? { ...user, ...userData } : user))
      );
    } else {
      const nextId = users.length > 0 ? Math.max(...users.map((user) => user.id)) + 1 : 1;
      setUsers((prevUsers) => [{ ...userData, id: nextId }, ...prevUsers]);
      setPage(1);
    }
    setIsFormOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <PageHeader
        title="จัดการผู้ใช้งาน (User Management)"
        description="ดูและจัดการบัญชีผู้ใช้ทั้งหมดในระบบ"
        action={
          <Button onClick={handleAddClick}>
            + เพิ่มผู้ใช้งานใหม่
          </Button>

        }
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
        <div className="sm:w-48">
          <label htmlFor="user-role-filter" className="sr-only">
            กรองตามบทบาท
          </label>
          <select
            id="user-role-filter"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm transition-shadow focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
            value={filterRole}
            onChange={(e) => updateFilterRole(e.target.value)}
          >
            <option value="ALL">ทุกบทบาท (All Roles)</option>
            <option value="SYSTEM_ADMIN">System Admin</option>
            <option value="PROJECT_ADMIN">Project Admin</option>
            <option value="JUDGE">Judge</option>
          </select>
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
                <th className="px-6 py-4 font-medium">บทบาท (Role)</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedUsers.length > 0 ? (
                pagedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'Active' ? 'success' : 'error'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button variant="text" size="sm" onClick={() => handleEditClick(user)}>
                        แก้ไข
                      </Button>
                      <span className="w-px h-4 bg-gray-200"></span>
                      <Button
                        variant="textGray"
                        size="sm"
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'Active' ? 'ระงับ' : 'เปิดใช้งาน'}
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

      <UserFormModal
        key={`${isFormOpen}-${editingUser?.id ?? 'new'}`}
        isOpen={isFormOpen}
        initialUser={editingUser}
        onSave={handleSaveUser}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
      />

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