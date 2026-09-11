import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
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

  // States สำหรับเปลี่ยนรหัสผ่าน
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      return !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    toast.success(`เปลี่ยนสถานะเป็น ${nextStatus} เรียบร้อยแล้ว`);
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
      toast.success('ลบผู้ใช้งานสำเร็จ');
    }
  };

  // จัดการ Submit รหัสผ่านใหม่
  const handleResetPassword = (e) => {
    e.preventDefault();
    if (!userToReset) {
      toast.error('ไม่พบข้อมูลผู้ใช้งาน');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    
    updateRegisteredUser(userToReset.email, { 
      password: newPassword, 
      resetRequested: false // เอาสถานะแจ้งเตือนออก
    });
    
    setUsers((prevUsers) =>
      prevUsers.map((u) => 
        u.email === userToReset.email ? { ...u, password: newPassword, resetRequested: false } : u
      )
    );
    
    toast.success(`เปลี่ยนรหัสผ่านของ ${userToReset.name} สำเร็จ`);
    setIsResetModalOpen(false);
    setUserToReset(null);
    setNewPassword('');
  };

  // ฟังก์ชันนี้ทำงานเมื่อกด "ยืนยัน" ในหน้าต่าง ConfirmDialog
  const confirmResetPassword = () => {
    if (!userToReset) {
      toast.error('ไม่พบข้อมูลผู้ใช้งาน');
      return;
    }
    updateRegisteredUser(userToReset.email, { 
      password: newPassword, 
      resetRequested: false 
    });
    
    setUsers((prevUsers) =>
      prevUsers.map((u) => 
        u.email === userToReset.email ? { ...u, password: newPassword, resetRequested: false } : u
      )
    );
    
    toast.success(`เปลี่ยนรหัสผ่านของ ${userToReset.name} สำเร็จ`);
    
    // ปิดหน้าต่างทั้งหมดและล้างค่า
    setIsConfirmResetOpen(false);
    setIsResetModalOpen(false);
    setUserToReset(null);
    setNewPassword('');
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="จัดการผู้ใช้งาน (User Management)"
        description="ดูบัญชีผู้ใช้ที่สมัครผ่านระบบ และจัดการสถานะการใช้งาน"
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="user-search" className="sr-only">ค้นหาชื่อ หรือ อีเมล</label>
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
                      {/* แจ้งเตือนเมื่อมีการขอกู้รหัสผ่าน */}
                      {user.resetRequested && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          ขอกู้รหัสผ่าน
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => { setUserToReset(user); setIsResetModalOpen(true); }}
                      >
                        เปลี่ยนรหัส
                      </Button>
                      <span className="w-px h-4 bg-gray-200"></span>
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
            <p className="text-sm text-gray-500">หน้า {currentPage} จาก {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="text" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                ก่อนหน้า
              </Button>
              <Button variant="text" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${userToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ลบข้อมูล"
      />

      {/* Modal สำหรับเปลี่ยนรหัสผ่าน */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">เปลี่ยนรหัสผ่าน</h3>
            <p className="text-sm text-gray-600 mb-4">
              กำหนดรหัสผ่านใหม่ให้กับ <strong>{userToReset?.name}</strong>
            </p>
            {/* Form for password reset */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="password"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setIsResetModalOpen(false); setNewPassword(''); }}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึกรหัสผ่าน</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog สำหรับยืนยันการเปลี่ยนรหัสผ่าน */}
      <ConfirmDialog
        isOpen={isConfirmResetOpen}
        title="ยืนยันการเปลี่ยนรหัสผ่าน"
        message={`คุณกำลังเปลี่ยนรหัสผ่านของ "${userToReset?.name}" คุณมั่นใจหรือไม่?`}
        onConfirm={confirmResetPassword}
        onCancel={() => setIsConfirmResetOpen(false)}
        confirmText="ยืนยันการเปลี่ยนรหัส"
      />
    </div>
  );
}