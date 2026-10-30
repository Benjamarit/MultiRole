import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export default function DeadlineHistory({ projectId, revision }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    api.get(`/competitions/${projectId}/deadline-history`).then(({ data }) => {
      if (active) { setEntries(data); setError(''); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, revision, open, retry]);
  const date = value => value ? new Date(value).toLocaleString(lang === 'EN' ? 'en-GB' : 'th-TH') : t('ไม่กำหนดเวลา', 'No deadline');
  return <details className="mt-5 border-t border-slate-200 pt-4 text-sm" open={open} onToggle={event => { const next = event.currentTarget.open; if (next && !open) { setLoading(true); setError(''); } setOpen(next); }}>
    <summary className="cursor-pointer font-semibold text-blue-700">{t('ประวัติการเปลี่ยนกำหนดเวลา', 'Deadline change history')}</summary>
    <div className="mt-3 space-y-3" aria-live="polite">{loading ? <p>{t('กำลังโหลด…', 'Loading…')}</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)} className="mt-2 underline">{t('ลองอีกครั้ง', 'Retry')}</button></div> : entries.length ? <><p className="text-xs text-slate-500">{t('แสดงล่าสุดสูงสุด 20 รายการ · เวลาไทย', 'Latest 20 changes · Bangkok time')}</p><ol className="divide-y divide-slate-100">{entries.map(e => <li key={e.id} className="space-y-1 py-3"><p className="break-words font-semibold text-slate-800">{date(e.previousDeadline)} → {date(e.newDeadline)}</p><p className="break-words text-xs text-slate-500">{e.actorName} · {e.actorEmail}</p><p className="text-xs text-slate-400">{date(e.changedAt)}</p></li>)}</ol></> : <p className="text-slate-500">{t('ยังไม่มีการเปลี่ยนกำหนดเวลา', 'No deadline changes yet')}</p>}</div>
  </details>;
}
