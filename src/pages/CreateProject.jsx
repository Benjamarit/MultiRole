import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { addProject } from '../data/ProjectStore';

const PROJECT_TYPES = ['Technology', 'Software', 'Business', 'Design', 'Other'];

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', type: PROJECT_TYPES[0], description: '', evaluationDeadline: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อโครงการ';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      // TODO: ยิง API จริงตอนต่อ Backend เช่น
      // const { data } = await api.post('/projects', form);
      // navigate(`/project/${data.id}/dashboard`);

      await new Promise((resolve) => setTimeout(resolve, 500)); // จำลองการบันทึก

      addProject({
        name: form.name,
        type: form.type,
        description: form.description,
        ownerEmail: user?.email,
        ownerName: user?.name,
        evaluationDeadline: form.evaluationDeadline || null,
      });

      navigate('/workspace');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link to="/workspace" className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้า Workspace
      </Link>

      <PageHeader
        title="สร้างโครงการใหม่"
        description="กรอกข้อมูลเบื้องต้นของโครงการประกวด สามารถตั้งค่า Criteria และเพิ่มทีม/กรรมการได้ภายหลัง"
      />

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อโครงการ
            </label>
            <Input
              id="project-name"
              placeholder="เช่น การประกวดนวัตกรรม AI 2026"
              value={form.name}
              onChange={handleChange('name')}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="evaluation-deadline" className="block text-sm font-medium text-gray-700 mb-1">
              กำหนดส่งคะแนน (Evaluation Deadline) ไม่บังคับ
            </label>
            <input
              id="evaluation-deadline"
              type="datetime-local"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              value={form.evaluationDeadline}
              onChange={handleChange('evaluationDeadline')}
            />
          </div>

          <div>
            <label htmlFor="project-type" className="block text-sm font-medium text-gray-700 mb-1">
              ประเภทโครงการ
            </label>
            <select
              id="project-type"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              value={form.type}
              onChange={handleChange('type')}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียด (ไม่บังคับ)
            </label>
            <textarea
              id="project-description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              placeholder="อธิบายภาพรวมของโครงการประกวดนี้"
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="text" onClick={() => navigate('/workspace')}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'สร้างโครงการ'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}