import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { addProject, isProjectNameTaken } from '../data/ProjectStore';
import toast from 'react-hot-toast';

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    evaluationDeadline: '',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) {
      next.name = t('กรุณากรอกชื่อโครงการ', 'Please enter a competition name');
    } else if (isProjectNameTaken(form.name)) {
      next.name = t(
        'มีโครงการชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น',
        'This competition name is already taken'
      );
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const project = addProject({
        name: form.name.trim(),
        type: '',
        description: '',
        ownerEmail: user?.email,
        ownerName: user?.name,
        evaluationDeadline: form.evaluationDeadline || null,
      });

      if (!project) {
        setErrors({
          name: t(
            'มีโครงการชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น',
            'This competition name is already taken'
          ),
        });
        toast.error(
          t(
            'มีโครงการชื่อนี้อยู่แล้ว ไม่สามารถสร้างโครงการซ้ำได้',
            'Competition name already exists'
          )
        );
        return;
      }

      toast.success(
        t(
          `สร้างโครงการ "${project.name}" สำเร็จ! เริ่มตั้งค่าโครงการต่อได้เลย`,
          `Created "${project.name}"! Redirecting to setup dashboard.`
        )
      );
      navigate(`/project/${project.id}/dashboard`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <BackButton to="/workspace">
        {t('กลับไปหน้า Workspace', 'Back to Workspace')}
      </BackButton>

      <PageHeader
        title={t('สร้างโครงการใหม่', 'Create New Competition')}
        description={tDesc(
          'ระบุชื่อโครงการและกำหนดเวลาส่งคะแนน (ถ้ามี) เมื่อสร้างเสร็จระบบจะพาไปยังหน้า Dashboard ทันที',
          'Enter the competition name and optional evaluation deadline to get started immediately.'
        )}
      />

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            id="project-name"
            label={t('ชื่อโครงการ (บังคับ)', 'Competition Name (Required)')}
            placeholder={t(
              'เช่น การประกวดนวัตกรรม AI 2026',
              'e.g. AI Innovation Challenge 2026'
            )}
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
            autoFocus
          />

          <div>
            <label
              htmlFor="evaluation-deadline"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
              <CalendarClock className="h-4 w-4 text-slate-400" />
              {t('กำหนดปิดรับคะแนน (ไม่บังคับ)', 'Evaluation Deadline (Optional)')}
            </label>
            <input
              id="evaluation-deadline"
              type="datetime-local"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={form.evaluationDeadline}
              onChange={handleChange('evaluationDeadline')}
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
            <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
            <span>
              {t(
                'โครงการที่สร้างใหม่จะอยู่ในสถานะ Draft เพื่อให้คุณเตรียมเกณฑ์คะแนนและรายชื่อทีมให้พร้อมก่อนเปิดรับคะแนนจริง',
                'New competitions start in Draft status so you can configure criteria, teams, and judges before opening evaluations.'
              )}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/workspace')}
            >
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isSaving
                ? t('กำลังสร้าง...', 'Creating...')
                : t('สร้างและไปหน้าตั้งค่าโครงการ', 'Create & Go to Dashboard')}
              {!isSaving && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}