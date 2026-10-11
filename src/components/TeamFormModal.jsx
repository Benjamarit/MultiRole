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
export default function TeamFormModal({ isOpen, initialTeam, existingTeams = [], onSave, onClose }) {
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
    else if (
      existingTeams.some(
        (team) =>
          team.id !== initialTeam?.id &&
          team.name.trim().toLowerCase() === form.name.trim().toLowerCase()
      )
    ) {
      next.name = 'ชื่อทีมนี้มีอยู่แล้ว กรุณาใช้ชื่อทีมอื่น';
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-navy/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-form-title"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-6">
        <h2 id="team-form-title" className="text-lg font-semibold text-primary-text">
          {isEditMode ? 'แก้ไขข้อมูลทีม' : 'เพิ่มทีมใหม่'}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-primary-text">
              ชื่อทีม (บังคับ)
            </label>
            <Input
              id="team-name"
              placeholder="เช่น Team Alpha"
              value={form.name}
              onChange={handleChange('name')}
              required
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="team-description" className="mb-1 block text-sm font-medium text-primary-text">
              รายละเอียดผลงาน (ไม่บังคับ)
            </label>
            <textarea
              id="team-description"
              rows={4}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary-text focus-visible:border-precision-blue focus-visible:ring-2 focus-visible:ring-blue-100"
              placeholder="อธิบายแนวคิด เทคโนโลยีที่ใช้ หรือจุดเด่นของผลงาน..."
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>

          <div>
            <label htmlFor="team-link" className="mb-1 block text-sm font-medium text-primary-text">
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
            <p className="mt-1 text-xs leading-5 text-slate-500">
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