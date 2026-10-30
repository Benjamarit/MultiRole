import { useLanguage } from '../context/LanguageContext';

export default function EvaluationDeadlineNotice({ project, isBeforeDeadline }) {
  const { t, lang } = useLanguage();
  const deadline = project?.evaluationDeadline;
  const open = project?.status === 'Active' && isBeforeDeadline;
  const formatted = deadline && new Date(deadline).toLocaleString(lang === 'EN' ? 'en-GB' : 'th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${open ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="status">
      <p className="font-semibold">{open
        ? deadline ? t(`แก้ไขและส่งคะแนนได้ถึง ${formatted} (เวลาไทย)`, `Edit and submit until ${formatted} (Bangkok time)`)
          : t('เปิดรับคะแนน · ยังไม่กำหนดวันปิด', 'Scoring open · No deadline set')
        : !isBeforeDeadline ? t('หมดเขตประเมิน · แก้ไขและส่งคะแนนไม่ได้', 'Deadline passed · Scores are locked')
          : t('โครงการยังไม่เปิดรับคะแนน', 'Scoring is closed')}</p>
      {!open && deadline && <p className="mt-1 text-xs">{t(`กำหนดปิดรับ: ${formatted} (เวลาไทย)`, `Deadline: ${formatted} (Bangkok time)`)}</p>}
    </div>
  );
}
