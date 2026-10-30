import { useEffect, useRef } from 'react';
import { CheckCircle2, EyeOff, Send, X } from 'lucide-react';
import UsageHelp from './UsageHelp';
import Button from './Button';
import Badge from './Badge';
import { useLanguage } from '../context/LanguageContext';

export default function BatchSubmissionDialog({ isOpen, snapshot, results, error, busy, canSubmit, onConfirm, onRetry, onClose, onFixTeam }) {
  const { t } = useLanguage();
  const dialog = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && dialog.current && (!dialog.current.contains(document.activeElement) || document.activeElement?.matches(':disabled'))) dialog.current.focus();
  }, [isOpen, results, busy]);
  if (!isOpen || !snapshot) return null;
  const sent = results?.filter(r => r.outcome === 'SUBMITTED') || [];
  const already = results?.filter(r => r.outcome === 'ALREADY_SUBMITTED') || [];
  const failed = results?.filter(r => r.outcome === 'FAILED') || [];
  const hasResults = results !== null;
  const names = new Map(snapshot.ready.map(team => [team.teamId, team.name]));
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onClose(); }
    if (event.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], summary, [tabindex="0"]')];
    if (!nodes.length) { event.preventDefault(); return; }
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:p-6">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="batch-submit-title" aria-describedby="batch-submit-scope" onKeyDown={onKeyDown} aria-busy={busy} className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl outline-none">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Send className="h-5 w-5" /></span><div><h2 id="batch-submit-title" className="font-bold text-slate-900">{hasResults ? t('ผลการส่งคะแนนรวม', 'Batch submission results') : t('ตรวจสอบก่อนส่งคะแนนรวม', 'Review batch submission')}</h2><p id="batch-submit-scope" className="mt-1 text-xs leading-5 text-slate-500">{t('รวมทีมที่ซ่อนอยู่ด้วย', 'Includes teams hidden by filters.')}</p></div></div><Button variant="textGray" size="sm" disabled={busy} aria-label={t('ปิดหน้าสรุปการส่งคะแนน', 'Close batch summary')} onClick={onClose}><X className="h-4 w-4" /></Button></div>
      <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-800">{error}</div>}
        {!canSubmit && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">{t('ปิดรับคะแนนแล้ว คะแนนที่กรอกยังอยู่ในหน้านี้', 'Submissions are closed or the deadline has passed. Your entered scores remain on this page.')}</div>}
        {hasResults ? <>
          <div role="status" className="grid grid-cols-3 gap-2">{[[t('ส่งสำเร็จ', 'Submitted'), sent.length, 'text-emerald-700 bg-emerald-50 border-emerald-100'], [t('ส่งแล้วก่อนหน้า', 'Already sent'), already.length, 'text-blue-700 bg-blue-50 border-blue-100'], [t('ไม่สำเร็จ', 'Failed'), failed.length, 'text-amber-700 bg-amber-50 border-amber-100']].map(([label, count, color]) => <div key={label} className={`rounded-xl border p-3 ${color}`}><p className="text-[11px]">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{count}</p></div>)}</div>
          {failed.length > 0 && <p className="text-xs leading-6 text-amber-800">{t('คะแนนทีมที่ไม่สำเร็จยังอยู่ กดลองใหม่ได้', 'Scores for failed teams are retained. You can retry.')}</p>}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{results.map(result => <li key={result.teamId} className="p-3"><div className="flex flex-wrap items-start justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{names.get(result.teamId)}</span><Badge variant={result.outcome === 'FAILED' ? 'warning' : 'success'}>{result.outcome === 'FAILED' ? t('ไม่สำเร็จ', 'Failed') : result.outcome === 'ALREADY_SUBMITTED' ? t('ส่งแล้ว · ไม่ส่งทับ', 'Already sent · Preserved') : t('ส่งสำเร็จ', 'Submitted')}</Badge></div>{result.evaluation && <p className="mt-1 text-xs font-semibold text-blue-700">{Number(result.evaluation.totalScore).toFixed(1)} / 100</p>}{result.outcome === 'FAILED' && <p className="mt-1 break-words text-xs leading-6 text-amber-800">{result.message}</p>}</li>)}</ul>
        </> : <>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-6 text-blue-800">{t('ใช้คะแนนและความคิดเห็นล่าสุด รวมที่ยังไม่บันทึกร่าง', 'Uses the latest scores and comments, including unsaved entries.')}</p>
          <div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">{t('ทีมที่พร้อมส่ง', 'Ready to submit')}</h3><Badge variant="info">{snapshot.ready.length} {t('ทีม', 'teams')}</Badge></div>{snapshot.ready.length ? <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{snapshot.ready.map(team => <li key={team.teamId} className="flex items-center justify-between gap-3 px-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{team.name}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">{team.savedDraft ? t('บันทึกร่างแล้ว', 'Saved draft') : t('คะแนนล่าสุดในหน้านี้', 'Latest entered scores')}{team.hidden && <span className="inline-flex items-center gap-1 text-amber-700"><EyeOff className="h-3 w-3" />{t('ซ่อนในตาราง', 'Hidden in matrix')}</span>}</p></div><span className="shrink-0 text-sm font-bold text-blue-700 tabular-nums">{Number(team.totalScore).toFixed(1)}<span className="ml-1 text-xs font-normal text-slate-400">/100</span></span></li>)}</ul> : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">{t('ยังไม่มีทีมที่กรอกครบและพร้อมส่ง', 'No complete evaluations are ready to submit.')}</p>}</div>
        </>}
        {snapshot.incomplete.length > 0 && <details className="rounded-xl border border-amber-100 bg-amber-50/40" open={!snapshot.ready.length && !hasResults}><summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-amber-800">{t(`ยังไม่พร้อม ${snapshot.incomplete.length} ทีม — ไม่นำมาส่ง`, `${snapshot.incomplete.length} incomplete teams — Not included`)}</summary><ul className="space-y-3 border-t border-amber-100 p-3">{snapshot.incomplete.map(team => <li key={team.id}><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-slate-700">{team.name}</p><Button size="sm" variant="text" disabled={busy} onClick={() => onFixTeam(team)}>{t('ไปเติมคะแนน', 'Complete scores')}</Button></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{team.missing.length > 0 && t(`ยังขาด: ${team.missing.map(c => c.name).join(', ')}`, `Missing: ${team.missing.map(c => c.name).join(', ')}`)}{team.invalid.length > 0 && <span className="block">{t(`คะแนนไม่ถูกต้อง: ${team.invalid.map(c => c.name).join(', ')}`, `Invalid scores: ${team.invalid.map(c => c.name).join(', ')}`)}</span>}</p></li>)}</ul></details>}
        {!hasResults && snapshot.submitted.length > 0 && <p className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t(`ไม่ส่งซ้ำ ${snapshot.submitted.length} ทีมที่ส่งแล้ว · บันทึกการแก้ไขแยกรายทีม`, `${snapshot.submitted.length} submitted teams are excluded, including any pending edits.`)}</p>}
        {!hasResults && <UsageHelp title={t('รายละเอียดการส่งรวม', 'About batch submission')}><p>{t('ตรวจทุกเกณฑ์ รวมเกณฑ์ที่ซ่อนอยู่ ทีมที่ส่งแล้วต้องบันทึกการแก้ไขแยกรายทีม', 'All criteria are checked, including hidden criteria. Save edits to submitted teams individually.')}</p></UsageHelp>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:px-5">{busy && <p role="status" className="text-xs text-slate-500">{t('กำลังส่ง กรุณารอผล…', 'Submitting. Please wait…')}</p>}<div className="ml-auto flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>{hasResults ? t('ปิดสรุป', 'Close results') : t('กลับไปตรวจคะแนน', 'Back to scores')}</Button>{hasResults ? failed.length > 0 && <Button onClick={onRetry} disabled={busy || !canSubmit} isLoading={busy}><Send className="h-4 w-4" />{t(`ลองใหม่ ${failed.length} ทีม`, `Retry ${failed.length} teams`)}</Button> : <Button onClick={onConfirm} disabled={busy || !canSubmit || !snapshot.ready.length} isLoading={busy}><Send className="h-4 w-4" />{t(`ยืนยันส่ง ${snapshot.ready.length} ทีม`, `Submit ${snapshot.ready.length} teams`)}</Button>}</div></div>
    </div>
  </div>;
}
