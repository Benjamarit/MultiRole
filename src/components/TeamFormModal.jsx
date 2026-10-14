import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import CriteriaModal from './CriteriaModal';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = { name: '', description: '', link: '' };

export default function TeamFormModal({
  isOpen,
  initialTeam,
  existingTeams = [],
  onSave,
  onClose,
}) {
  const { t } = useLanguage();
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
    if (!form.name.trim()) {
      next.name = t('กรุณากรอกชื่อทีม', 'Please enter a team name');
    } else if (
      existingTeams.some(
        (team) =>
          team.id !== initialTeam?.id &&
          team.name.trim().toLowerCase() === form.name.trim().toLowerCase()
      )
    ) {
      next.name = t(
        'ชื่อทีมนี้มีอยู่แล้ว กรุณาใช้ชื่อทีมอื่น',
        'This team name already exists'
      );
    }
    if (form.link.trim() && !/^https?:\/\/.+/i.test(form.link.trim())) {
      next.link = t(
        'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://',
        'Link must start with http:// or https://'
      );
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = (e) => {
    e?.preventDefault();
    if (!validate()) return;

    onSave({
      ...(isEditMode ? { id: initialTeam.id } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
    });
  };

  return (
    <CriteriaModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? t('แก้ไขข้อมูลทีม', 'Edit Team')
          : t('เพิ่มทีมใหม่', 'Add New Team')
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          id="team-name"
          label={t('ชื่อทีม (บังคับ)', 'Team Name (Required)')}
          placeholder="e.g. Team Alpha"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          autoFocus
        />

        <div>
          <label
            htmlFor="team-description"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {t('รายละเอียดผลงาน (ไม่บังคับ)', 'Project Description (Optional)')}
          </label>
          <textarea
            id="team-description"
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-surface px-3.5 py-2 text-sm text-primary-text focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder={t(
              'อธิบายแนวคิด เทคโนโลยีที่ใช้ หรือจุดเด่นของผลงาน...',
              'Describe the concept, tech stack, or key highlights...'
            )}
            value={form.description}
            onChange={handleChange('description')}
          />
        </div>

        <div>
          <Input
            id="team-link"
            type="url"
            label={t('ลิงก์ผลงาน (ไม่บังคับ)', 'Submission Link (Optional)')}
            placeholder="https://github.com/..."
            value={form.link}
            onChange={handleChange('link')}
            error={errors.link}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t(
              'เช่น ลิงก์ GitHub, วิดีโอสาธิต หรือสไลด์นำเสนอ เพื่อให้กรรมการเปิดดูได้จากหน้าประเมิน',
              'e.g. GitHub repo, demo video, or slide deck for judges to review.'
            )}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ยกเลิก', 'Cancel', { compact: true })}
          </Button>
          <Button type="submit">
            {isEditMode
              ? t('บันทึกการแก้ไข', 'Save Changes', { compact: true })
              : t('เพิ่มทีม', 'Add Team', { compact: true })}
          </Button>
        </div>
      </form>
    </CriteriaModal>
  );
}