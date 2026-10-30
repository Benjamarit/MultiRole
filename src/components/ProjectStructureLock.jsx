import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

import { isProjectStructureLocked } from '../data/ProjectLock';

export default function ProjectStructureLock({ project }) {
  const { t } = useLanguage();
  if (!isProjectStructureLocked(project)) return null;
  return <div role="status" className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{t('ล็อกข้อมูลหลังเปิดรับคะแนนแล้ว', 'Project setup is locked')}</p><p className="mt-1 leading-6">{t('ดูข้อมูลได้ แต่แก้ไขโครงการ ทีม กลุ่ม เกณฑ์ กรรมการ และการมอบหมายไม่ได้ แม้พักรับคะแนน เพื่อให้กรรมการทุกคนใช้ข้อมูลชุดเดียวกัน เปลี่ยนกำหนดเวลาได้ที่ภาพรวมโครงการ', 'Project details, teams, groups, criteria, judges and assignments remain read-only after scoring first opens, including while paused. The deadline can be changed from Overview.')}</p></div></div>;
}
