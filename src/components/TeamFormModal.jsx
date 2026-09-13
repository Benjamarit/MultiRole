import { useState } from 'react';
import Button from './Button';
import Input from './Input';

const EMPTY_FORM = { name: '', description: '', link: '' };

/**
 * โหมด Add: ไม่ส่ง initialTeam
 * โหมด Edit: ส่ง initialTeam={id, name, description, link}
 *
 * <TeamFormModal
 *   isOpen={isFormOpen}
 *   initialTeam={editingTeam}
 *   onSave={(data) => ...}   // data มี id ต่อเมื่อเป็นการ edit
 *   onClose={() => ...}
 * />
 */
export default function TeamFormModal({ isOpen, initialTeam, onSave, onClose }) {
  const isEditMode = Boolean(initialTeam);
  const [form, setForm] = useState(() =>
    initialTeam
      ? {
          name: initialTeam.name,
          description: initialTeam.description || '',
          link: initialTeam.link || '',
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อทีม';
    if (form.link.trim() && !/^https?:\/\/.+/i.test(form.link.trim())) {
      next.link = 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...(isEditMode ? { id: initialTeam.id } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
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
            <label htmlFor="team-description" className="mb-1 block text-sm font-medium text-gray-700">
              รายละเอียดผลงาน (ไม่บังคับ)
            </label>
            <textarea
              id="team-description"
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="อธิบายแนวคิด เทคโนโลยีที่ใช้ หรือจุดเด่นของผลงาน..."
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>

          <div>
            <label htmlFor="team-link" className="mb-1 block text-sm font-medium text-gray-700">
              ลิงก์ผลงาน (ไม่บังคับ)
            </label>
            <Input
              id="team-link"
              type="url"
              placeholder="https://..."
              value={form.link}
              onChange={handleChange('link')}
              error={errors.link}
            />
            <p className="mt-1 text-xs text-gray-400">
              เช่น ลิงก์ GitHub, วิดีโอสาธิต, หรือเว็บไซต์ผลงาน — กรรมการจะกดเข้าไปดูได้จากหน้าประเมิน
            </p>
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