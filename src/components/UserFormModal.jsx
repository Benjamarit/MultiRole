import { useState } from 'react';
import Button from './Button';
import Input from './Input';

const ROLES = [
  { value: 'SYSTEM_ADMIN', label: 'System Admin' },
  { value: 'PROJECT_ADMIN', label: 'Project Admin' },
  { value: 'JUDGE', label: 'Judge' },
];

const EMPTY_FORM = { name: '', email: '', role: 'JUDGE' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * โหมด Add: ไม่ส่ง initialUser
 * โหมด Edit: ส่ง initialUser={id, name, email, role}
 *
 * <UserFormModal
 *   isOpen={isFormOpen}
 *   initialUser={editingUser}
 *   onSave={(data) => ...}   // data มี id ต่อเมื่อเป็นการ edit
 *   onClose={() => ...}
 * />
 */
export default function UserFormModal({ isOpen, initialUser, onSave, onClose }) {
  const isEditMode = Boolean(initialUser);
  const [form, setForm] = useState(() =>
    initialUser
      ? { name: initialUser.name, email: initialUser.email, role: initialUser.role }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.email.trim()) {
      next.email = 'กรุณากรอกอีเมล';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      next.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...(isEditMode ? { id: initialUser.id, status: initialUser.status } : { status: 'Active' }),
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="user-form-title" className="text-lg font-semibold text-gray-900">
          {isEditMode ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อ-นามสกุล
            </label>
            <Input
              id="user-name"
              placeholder="เช่น นายวิชัย ทำงาน"
              value={form.name}
              onChange={handleChange('name')}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-gray-700">
              อีเมล
            </label>
            <Input
              id="user-email"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">
              บทบาท (Role)
            </label>
            <select
              id="user-role"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.role}
              onChange={handleChange('role')}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>
            {isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
          </Button>
        </div>
      </div>
    </div>
  );
}