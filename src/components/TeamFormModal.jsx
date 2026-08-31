import { useEffect, useState } from 'react';
import Button from './Button';
import Input from './Input';

const EMPTY_FORM = { name: '', members: '' };

/**
 * โหมด Add: ไม่ส่ง initialTeam
 * โหมด Edit: ส่ง initialTeam={id, name, members: string[]}
 *
 * <TeamFormModal
 *   isOpen={isFormOpen}
 *   initialTeam={editingTeam}
 *   onSave={(data) => ...}   // data มี id ต่อเมื่อเป็นการ edit, members เป็น string[]
 *   onClose={() => ...}
 * />
 */
export default function TeamFormModal({ isOpen, initialTeam, onSave, onClose }) {
  const isEditMode = Boolean(initialTeam);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // รีเซ็ตฟอร์มทุกครั้งที่เปิด modal ใหม่ หรือสลับทีมที่จะแก้ไข
  useEffect(() => {
    if (isOpen) {
      setForm(
        initialTeam
          ? { name: initialTeam.name, members: (initialTeam.members || []).join('\n') }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [isOpen, initialTeam]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อทีม';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const members = form.members
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);

    onSave({
      ...(isEditMode ? { id: initialTeam.id } : {}),
      name: form.name.trim(),
      members,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-form-title"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="team-form-title" className="text-lg font-semibold text-gray-900">
          {isEditMode ? 'แก้ไขข้อมูลทีม' : 'เพิ่มทีมใหม่'}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อทีม
            </label>
            <Input
              id="team-name"
              placeholder="เช่น Team Alpha"
              value={form.name}
              onChange={handleChange('name')}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="team-members" className="mb-1 block text-sm font-medium text-gray-700">
              รายชื่อสมาชิก (ไม่บังคับ)
            </label>
            <textarea
              id="team-members"
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={'ใส่ 1 ชื่อต่อบรรทัด เช่น\nสมชาย ใจดี\nสมศรี เรียนเก่ง'}
              value={form.members}
              onChange={handleChange('members')}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>
            {isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มทีม'}
          </Button>
        </div>
      </div>
    </div>
  );
}