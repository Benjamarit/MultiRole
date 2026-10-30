import { useEffect, useState } from 'react';
import { ChevronDown, History, LoaderCircle } from 'lucide-react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import Button from './Button';
import UsageHelp from './UsageHelp';

const same = (a, b) => (a ?? '') === (b ?? '');
export default function EvaluationHistory({ evaluationId }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    api.get(`/evaluations/${evaluationId}/history`, { params: { page } }).then(({ data }) => {
      if (active) setResult(previous => ({ ...data, content: page === 0 ? data.content : [...(previous?.content || []), ...data.content] }));
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, evaluationId, page, retry]);
  const value = (score, type) => score == null ? '—' : type === 'PASS_FAIL' ? Number(score) === 1 ? t('ผ่าน', 'Pass') : t('ไม่ผ่าน', 'Fail') : String(score);
  const change = (before, after) => <span className="break-words"><span className="text-slate-400">{before ?? '—'}</span><span className="mx-2 text-slate-400" aria-label={t('เปลี่ยนเป็น', 'changed to')}>→</span><span className="font-semibold text-blue-700">{after ?? '—'}</span></span>;
  return <div className="border-t border-slate-100">
    <button type="button" aria-expanded={open} onClick={() => { if (open) { setPage(0); setResult(null); } setOpen(!open); }} className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50/50 focus-visible:outline-blue-500">
      <span className="flex items-center gap-2"><History className="h-4 w-4" />{t('ประวัติการแก้คะแนน', 'Score history')}</span><ChevronDown className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="space-y-3 px-4 pb-4" aria-live="polite">
      {result?.content.map(entry => {
        const before = entry.before;
        const after = entry.after;
        const oldScores = new Map((before?.scores || []).map(s => [s.criterionId, s]));
        const newScores = new Map((after?.scores || []).map(s => [s.criterionId, s]));
        const scores = [...new Set([...oldScores.keys(), ...newScores.keys()])].map(id => [oldScores.get(id), newScores.get(id)]).filter(([a, b]) => !same(a?.scoreValue, b?.scoreValue) || !same(a?.comment, b?.comment) || !same(a?.weightPercentage, b?.weightPercentage) || !same(a?.maxScore, b?.maxScore) || !same(a?.scoringType, b?.scoringType));
        return <article key={entry.historyId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-slate-800">{entry.eventType === 'UPDATED' ? t('แก้ไขคะแนนที่ส่งแล้ว', 'Submitted scores edited') : entry.eventType === 'SUBMITTED' ? t('ส่งคะแนนครั้งแรก', 'First submission') : t('บันทึกฉบับร่าง', 'Draft saved')}</p><p className="mt-1 break-words text-slate-500">{entry.actorName} · {entry.actorEmail}</p></div><time className="text-[11px] text-slate-400">{new Date(entry.occurredAt).toLocaleString(lang === 'EN' ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'medium' })}</time></div>
          <div className="rounded-lg bg-blue-50/60 p-2.5"><span className="mr-2 text-slate-600">{t('คะแนนรวม', 'Total')} /100</span>{change(before?.totalScore, after.totalScore)}</div>
          {scores.map(([a, b]) => <div key={(b || a).criterionId} className="space-y-1.5 border-t border-slate-100 pt-2"><p className="font-semibold text-slate-700">{(b || a).title}</p>{!same(a?.scoreValue, b?.scoreValue) && <p>{t('คะแนน', 'Score')}: {change(value(a?.scoreValue, a?.scoringType), value(b?.scoreValue, b?.scoringType))}</p>}{!same(a?.comment, b?.comment) && <p className="whitespace-pre-wrap leading-5">{t('ความคิดเห็น', 'Comment')}: {change(a?.comment, b?.comment)}</p>}{a && b && (!same(a.maxScore, b.maxScore) || !same(a.weightPercentage, b.weightPercentage) || !same(a.scoringType, b.scoringType)) && <p className="text-slate-500">{t('คะแนนเต็ม / น้ำหนัก / รูปแบบ', 'Maximum / weight / type')}: {change(`${a.maxScore} / ${a.weightPercentage}% / ${a.scoringType}`, `${b.maxScore} / ${b.weightPercentage}% / ${b.scoringType}`)}</p>}</div>)}
          {!same(before?.comment, after.comment) && <p className="whitespace-pre-wrap border-t border-slate-100 pt-2 leading-5">{t('ข้อเสนอแนะภาพรวม', 'Overall feedback')}: {change(before?.comment, after.comment)}</p>}
        </article>;
      })}
      {loading && <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{t('กำลังโหลดประวัติ...', 'Loading history...')}</p>}
      {error && <div role="alert" className="space-y-2 text-xs text-red-600"><p>{error}</p><Button size="sm" variant="secondary" onClick={() => setRetry(v => v + 1)}>{t('ลองอีกครั้ง', 'Retry')}</Button></div>}
      {!loading && !error && result?.content.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{t('ยังไม่มีประวัติ คะแนนที่บันทึกก่อนเปิดใช้ฟีเจอร์นี้จะไม่มีประวัติย้อนหลัง', 'No history yet. Scores saved before this feature have no earlier history.')}</p>}
      {result?.content.length > 0 && <UsageHelp title={t('เกี่ยวกับประวัติ', 'About this history')}><p>{t('แสดงรายการล่าสุดก่อน เริ่มเก็บตั้งแต่เปิดใช้ประวัติ การบันทึกโดยไม่เปลี่ยนคะแนนหรือความคิดเห็นจะไม่เพิ่มรายการ', 'Newest first. History starts when this feature was enabled. Unchanged scores and comments do not add entries.')}</p></UsageHelp>}
      {result && !result.last && !error && <Button size="sm" variant="secondary" disabled={loading} onClick={() => setPage(v => v + 1)}>{t('โหลดประวัติเพิ่ม', 'Load more history')}</Button>}
    </div>}
  </div>;
}
