import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, ClipboardList, Clock3, FilePenLine, LayoutGrid, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import EvaluationHistory from '../components/EvaluationHistory';
import { detail, loadProject } from '../api/workspace';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getProjectById } from '../data/projects/ProjectStore';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { MonitoringStat, MonitoringSearch, MonitoringEmpty, MonitoringPagination, MonitoringSkeleton } from '../components/MonitoringUI';
import { useDeadline } from '../hooks/useDeadline';

export default function JudgeScoreMonitoring() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [evaluations, setEvaluations] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('order');
  const [page, setPage] = useState(1);
  const { loading, error: refreshError, updatedAt, refresh } = useVisiblePolling(async isActive => {
      const [response] = await Promise.all([api.get(`/evaluations/competition/${projectId}/mine`), loadProject(projectId)]);
      if (isActive()) setEvaluations(response.data);
  }, 15000, projectId);
  const error = refreshError?.message;
  const project = getProjectById(projectId);
  const data = detail(projectId);
  const assignedIds = new Set(data.assignments.filter(a => a.judgeId === user?.id).map(a => a.teamId));
  const byTeam = new Map(evaluations.map(e => [e.teamId, e]));
  const teams = data.teams.filter(team => assignedIds.has(team.id) || byTeam.has(team.id));
  const rows = teams.filter(team => team.name.toLowerCase().includes(search.trim().toLowerCase()) && (status === 'ALL' || (byTeam.get(team.id)?.status || 'NOT_STARTED') === status)).sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'th', { numeric: true });
    if (sort === 'score') return (byTeam.get(b.id)?.totalScore ?? -1) - (byTeam.get(a.id)?.totalScore ?? -1);
    return 0;
  });
  const submitted = evaluations.filter(e => e.status === 'SUBMITTED');
  const drafts = evaluations.filter(e => e.status === 'DRAFT');
  const notStarted = teams.filter(team => !byTeam.has(team.id)).length;
  const criteria = new Map(data.criteria.map(c => [c.id, c]));
  const beforeDeadline = useDeadline(project);
  const canEdit = project?.status === 'Active' && beforeDeadline;
  const labels = { SUBMITTED: t('ส่งคะแนนแล้ว', 'Submitted'), DRAFT: t('ฉบับร่าง', 'Draft'), NOT_STARTED: t('ยังไม่เริ่ม', 'Not started') };
  const progress = teams.length ? Math.round(submitted.length / teams.length * 100) : 0;
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const current = Math.min(page, pages);
  const date = value => value ? new Date(value).toLocaleString(lang === 'EN' ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const filter = value => { setStatus(value); setPage(1); };
  const reset = () => { setSearch(''); setStatus('ALL'); setSort('order'); setPage(1); };
  const inputClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-6 lg:p-8">
    <BackButton to="/workspace">{t('กลับไปหน้า Workspace', 'Back to Workspace', { compact: true })}</BackButton>
    <PageHeader title={t('คะแนนที่ฉันให้', 'My Scores')} subtitle={project?.name} badge={<Badge variant="info"><ShieldCheck className="h-3 w-3" />{t('เฉพาะคะแนนของคุณ', 'Your scores only')}</Badge>} action={<div className="flex flex-wrap items-center gap-3"><span className="text-xs text-slate-400" role="status">{updatedAt && t(`อัปเดต ${updatedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`, `Updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)}</span><Button variant="secondary" disabled={loading} onClick={refresh}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('รีเฟรชคะแนน', 'Refresh scores')}</Button></div>} />
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">{t('โหลดคะแนนไม่สำเร็จ', 'Could not load scores')}</p><p className="mt-1">{error} {updatedAt && t('ข้อมูลที่แสดงเป็นข้อมูลก่อนหน้า', 'Showing previously loaded scores.')}</p></div></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MonitoringStat tinted icon={LayoutGrid} label={t('ทีมในรายการ', 'All teams')} value={loading && !updatedAt ? '—' : teams.length} onClick={() => filter('ALL')} active={status === 'ALL'} />
      <MonitoringStat tinted icon={CheckCircle2} tone="green" label={labels.SUBMITTED} value={loading && !updatedAt ? '—' : submitted.length} onClick={() => filter('SUBMITTED')} active={status === 'SUBMITTED'} />
      <MonitoringStat tinted icon={FilePenLine} tone="amber" label={labels.DRAFT} value={loading && !updatedAt ? '—' : drafts.length} onClick={() => filter('DRAFT')} active={status === 'DRAFT'} />
      <MonitoringStat tinted icon={Clock3} tone="slate" label={labels.NOT_STARTED} value={loading && !updatedAt ? '—' : notStarted} onClick={() => filter('NOT_STARTED')} active={status === 'NOT_STARTED'} />
    </div>
    <Card noPadding><div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="font-semibold text-slate-700">{t('ความคืบหน้าการส่งคะแนน', 'Submission progress')}</span><span className="font-bold text-blue-600 tabular-nums">{submitted.length}/{teams.length} · {progress}%</span></div><div role="progressbar" aria-label={t('ความคืบหน้าการส่งคะแนน', 'Submission progress')} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[11px] text-slate-400">{t('คะแนนฉบับร่างยังไม่รวมในผลจัดอันดับ', 'Draft scores are not included in the leaderboard.')}</p></div><div className="flex items-start gap-2 border-t border-slate-100 pt-4 lg:max-w-xs lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><CalendarClock className={`mt-0.5 h-4 w-4 shrink-0 ${canEdit ? 'text-blue-500' : 'text-slate-400'}`} /><div><p className="text-xs font-semibold text-slate-700">{project?.evaluationDeadline ? t('กำหนดปิดรับคะแนน', 'Evaluation deadline') : t('สถานะการประเมิน', 'Evaluation status')}</p><p className="mt-1 text-xs text-slate-500">{project?.evaluationDeadline ? date(project.evaluationDeadline) : t('ยังไม่กำหนดวันปิดรับ', 'No deadline set')}</p><p className={`mt-1 text-[11px] ${canEdit ? 'text-blue-600' : 'text-slate-500'}`}>{canEdit ? t('เปิดรับการแก้ไข', 'Editing open') : t('ปิดรับการแก้ไข · ยังดูคะแนนย้อนหลังได้', 'Editing is closed · Your scores remain available.')}</p></div></div></div></Card>
    <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-bold text-slate-900">{t('ผลการประเมินรายทีม', 'Team evaluations')}</h2></div><p className="text-xs text-slate-400" aria-live="polite">{t(`${rows.length} จาก ${teams.length} ทีม`, `${rows.length} of ${teams.length} teams`)}</p></div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs sm:flex-row"><MonitoringSearch id="my-score-search" label={t('ค้นหาชื่อทีม', 'Search team name')} value={search} onChange={value => { setSearch(value); setPage(1); }} /><select aria-label={t('กรองสถานะคะแนน', 'Filter score status')} value={status} onChange={e => filter(e.target.value)} className={inputClass}><option value="ALL">{t('ทุกสถานะ', 'All statuses')}</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label={t('เรียงรายการทีม', 'Sort teams')} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className={inputClass}><option value="order">{t('ตามลำดับทีม', 'Team order')}</option><option value="name">{t('ตามชื่อทีม', 'Team name')}</option><option value="score">{t('คะแนนสูงก่อน', 'Highest score')}</option></select></div>
      {loading && !updatedAt ? <Card noPadding><MonitoringSkeleton /></Card> : !rows.length ? <Card noPadding><MonitoringEmpty title={teams.length ? t('ไม่พบทีมที่ตรงกับตัวกรอง', 'No matching teams') : t('ยังไม่มีทีมในรายการ', 'No teams yet')} description={teams.length ? t('ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น', 'Try another search or status filter.') : t('ทีมที่ได้รับมอบหมายและผลประเมินของคุณจะแสดงที่นี่', 'Your assigned teams and evaluations will appear here.')} icon={ClipboardList} onReset={search || status !== 'ALL' ? reset : undefined} /></Card> : <div className="grid items-start gap-4 lg:grid-cols-2">{rows.slice((current - 1) * 8, current * 8).map(team => {
        const evaluation = byTeam.get(team.id);
        const submittedScore = evaluation?.status === 'SUBMITTED';
        const draft = evaluation?.status === 'DRAFT';
        const Icon = submittedScore ? CheckCircle2 : draft ? FilePenLine : ClipboardList;
        const score = evaluation ? Number(evaluation.totalScore).toFixed(1) : null;
        const headerTone = submittedScore ? 'bg-emerald-50/80' : draft ? 'bg-amber-50/80' : 'bg-slate-100/80';
        const scoreTone = submittedScore ? 'text-emerald-700' : draft ? 'text-amber-700' : 'text-slate-400';
        return <Card key={team.id} noPadding><article className="h-full"><div className={`flex items-start justify-between gap-3 p-4 sm:p-5 ${headerTone}`}><div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 ${submittedScore ? 'text-emerald-600' : draft ? 'text-amber-600' : 'text-slate-500'}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{team.name}</h3><div className="mt-1.5"><Badge variant={submittedScore ? 'success' : draft ? 'warning' : 'default'}>{labels[evaluation?.status || 'NOT_STARTED']}</Badge></div></div></div><div className="shrink-0 text-right"><p className="text-[10px] font-medium text-slate-500">{draft ? t('คะแนนร่าง', 'Draft score') : t('คะแนนรวม', 'Total score')}</p><p className={`mt-0.5 text-2xl font-bold tracking-tight tabular-nums ${scoreTone}`}>{score ?? '—'}{evaluation && <span className="ml-1 text-xs font-normal text-slate-400">/100</span>}</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-5"><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 className="h-3.5 w-3.5" />{evaluation ? date(evaluation.updatedAt || evaluation.submittedAt) : t('ยังไม่มีคะแนนที่บันทึก', 'No saved scores')}</p>{assignedIds.has(team.id) && <Link to={`/judge/project/${projectId}/evaluate/${team.id}`} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${canEdit && !submittedScore ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{canEdit ? submittedScore ? t('ดูและแก้คะแนน', 'Review and edit') : draft ? t('ให้คะแนนต่อ', 'Continue') : t('เริ่มให้คะแนน', 'Start scoring') : t('ดูใบประเมิน', 'View evaluation')}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div>
          {evaluation && <details className="group border-t border-slate-100"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50/50 sm:px-5 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5" />{t('คะแนนย่อยและความคิดเห็น', 'Criterion scores and feedback')}</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary><div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">{evaluation.scores.map(item => {
            const criterion = criteria.get(item.criterionId);
            return <div key={item.criterionId} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xs font-semibold text-slate-700">{criterion?.name || t('เกณฑ์เดิม', 'Previous criterion')}</p>{criterion && <p className="mt-1 text-[10px] text-slate-400">{t('น้ำหนัก', 'Weight')} {criterion.weight}%</p>}</div><span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-bold text-blue-700 shadow-2xs">{criterion?.type === 'PASS_FAIL' && item.scoreValue !== null ? Number(item.scoreValue) === 1 ? t('ผ่าน', 'Pass') : t('ไม่ผ่าน', 'Fail') : <>{item.scoreValue ?? '—'}<span className="font-normal text-slate-400"> / {criterion?.maxScore ?? '—'}</span></>}</span></div>{item.comment && <p className="mt-2 whitespace-pre-wrap break-words border-t border-slate-200/60 pt-2 text-xs leading-6 text-slate-500">{item.comment}</p>}</div>;
          })}{evaluation.comment && <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3"><p className="flex items-center gap-2 text-xs font-semibold text-blue-700"><MessageSquareText className="h-3.5 w-3.5" />{t('ข้อเสนอแนะภาพรวม', 'Overall feedback')}</p><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">{evaluation.comment}</p></div>}</div></details>}
          {evaluation && <EvaluationHistory key={`${evaluation.evaluationId}-${evaluation.updatedAt}`} evaluationId={evaluation.evaluationId} />}
        </article></Card>;
      })}</div>}
      {rows.length > 8 && <div className="rounded-xl border border-slate-200 bg-white"><MonitoringPagination page={current} pages={pages} count={rows.length} onChange={setPage} /></div>}
    </div>
  </div>;
}
