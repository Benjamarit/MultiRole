import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, FolderKanban, LockKeyhole, UnlockKeyhole, UserRound } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import { MonitoringSearch, MonitoringEmpty, MonitoringPagination, MonitoringSkeleton } from './MonitoringUI';
import { useLanguage } from '../context/LanguageContext';

export default function SystemMonitoringOverview({ data, users, mode = 'projects', ownerId, onOwnerChange, loading }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('ALL');
  const [page, setPage] = useState(1);
  const projectView = mode === 'projects';
  const date = value => value ? new Date(value).toLocaleString(lang === 'EN' ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const statuses = { ACTIVE: [t('เปิดรับคะแนน', 'Active'), 'success'], DRAFT: [t('ฉบับร่าง', 'Draft'), 'warning'], CLOSED: [t('ปิดโครงการ', 'Closed'), 'default'] };
  const actions = {
    PROJECT_CREATED: { label: t('สร้างโครงการ', 'Project created'), icon: FolderKanban, color: 'bg-blue-50 text-blue-600', badge: 'info' },
    CREATE_DENIED: { label: t('ปฏิเสธการสร้าง', 'Creation denied'), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600', badge: 'warning' },
    CREATION_BLOCKED: { label: t('ระงับการสร้าง', 'Creation blocked'), icon: LockKeyhole, color: 'bg-red-50 text-red-600', badge: 'error' },
    CREATION_UNBLOCKED: { label: t('คืนสิทธิ์สร้าง', 'Creation restored'), icon: UnlockKeyhole, color: 'bg-emerald-50 text-emerald-600', badge: 'success' },
  };
  const query = search.trim().toLowerCase();
  const rows = projectView ? (data?.projects || []).filter(p => (!ownerId || p.ownerId === ownerId) && `${p.title} ${p.ownerName} ${p.ownerEmail}`.toLowerCase().includes(query)) : (data?.activities || []).filter(e => (!ownerId || e.userId === ownerId) && (eventType === 'ALL' || e.action === eventType) && `${e.name} ${e.email} ${e.detail}`.toLowerCase().includes(query));
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * 10, current * 10);
  const reset = () => { setSearch(''); setEventType('ALL'); onOwnerChange(''); setPage(1); };
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';
  return <Card noPadding>
    <div className="space-y-4 border-b border-slate-100 p-4 sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{projectView ? <FolderKanban className="h-5 w-5" /> : <Activity className="h-5 w-5" />}</span><div><h2 className="font-bold text-slate-900">{projectView ? t('โครงการในระบบ', 'System projects') : t('บันทึกกิจกรรม', 'Activity log')}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{projectView ? t('ตรวจสอบเจ้าของโครงการ สถานะ และวันที่สร้าง', 'Review ownership, project status, and creation dates.') : t('ตรวจสอบเหตุการณ์การสร้างโครงการและการเปลี่ยนสิทธิ์ ล่าสุดสูงสุด 100 รายการ', 'Latest 100 project creation and access change events.')}</p></div></div>
      <div className={`grid gap-3 ${projectView ? 'sm:grid-cols-[1fr_240px]' : 'lg:grid-cols-[1fr_230px_200px]'}`}>
        <MonitoringSearch id={`system-${mode}-search`} label={projectView ? t('ค้นหาโครงการหรือเจ้าของ', 'Search project or owner') : t('ค้นหากิจกรรมหรือผู้ใช้', 'Search activity or user')} value={search} onChange={value => { setSearch(value); setPage(1); }} />
        <select aria-label={t('กรองตามเจ้าของบัญชี', 'Filter by account')} value={ownerId} onChange={e => { onOwnerChange(e.target.value); setPage(1); }} className={inputClass}><option value="">{t('ผู้ใช้ทั้งหมด', 'All users')}</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select>
        {!projectView && <select aria-label={t('ประเภทเหตุการณ์', 'Event type')} value={eventType} onChange={e => { setEventType(e.target.value); setPage(1); }} className={inputClass}><option value="ALL">{t('ทุกเหตุการณ์', 'All events')}</option>{Object.entries(actions).map(([key, action]) => <option key={key} value={key}>{action.label}</option>)}</select>}
      </div>
    </div>
    {!data ? loading ? <MonitoringSkeleton /> : <MonitoringEmpty title={t('ยังโหลดข้อมูลไม่ได้', 'Data is unavailable')} description={t('ลองกดรีเฟรชข้อมูลด้านบนอีกครั้ง', 'Use Refresh above to try again.')} /> : !rows.length ? <MonitoringEmpty title={projectView ? t('ไม่พบโครงการ', 'No projects found') : t('ไม่พบเหตุการณ์', 'No events found')} description={t('ลองเปลี่ยนคำค้นหาหรือเลือกผู้ใช้อื่น', 'Try another search or account filter.')} onReset={search || ownerId || eventType !== 'ALL' ? reset : undefined} icon={projectView ? FolderKanban : Activity} /> : projectView ? <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">{[t('โครงการ', 'Project'), t('เจ้าของโครงการ', 'Owner'), t('สถานะ', 'Status'), t('วันที่สร้าง', 'Created')].map(h => <th scope="col" className="px-5 py-3.5" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(p => <tr key={p.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400"><FolderKanban className="h-4 w-4" /></span><span className="font-semibold text-slate-900">{p.title}</span></div></td><td className="px-5 py-4"><p className="text-slate-700">{p.ownerName}</p><p className="mt-0.5 break-all text-xs text-slate-400">{p.ownerEmail}</p></td><td className="px-5 py-4"><Badge variant={statuses[p.status]?.[1]}>{statuses[p.status]?.[0] || p.status}</Badge></td><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{date(p.createdAt)}</td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{visible.map(p => <div key={p.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{p.title}</h3><Badge variant={statuses[p.status]?.[1]}>{statuses[p.status]?.[0] || p.status}</Badge></div><div className="flex items-start gap-2 text-xs text-slate-500"><UserRound className="h-4 w-4 shrink-0" /><div>{p.ownerName}<p className="mt-0.5 break-all text-slate-400">{p.ownerEmail}</p></div></div><p className="flex items-center gap-2 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{date(p.createdAt)}</p></div>)}</div>
    </> : <ol className="divide-y divide-slate-100">{visible.map(event => { const action = actions[event.action] || { label: event.action, icon: CheckCircle2, color: 'bg-slate-100 text-slate-500' }; const Icon = action.icon; return <li key={event.id} className="flex gap-3 px-4 py-4 transition-colors hover:bg-slate-50/60 sm:gap-4 sm:px-6"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.color}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={action.badge}>{action.label}</Badge><time className="text-[11px] text-slate-400">{date(event.occurredAt)}</time></div><p className="mt-2 text-sm font-semibold text-slate-800">{event.name}<span className="ml-2 break-all text-xs font-normal text-slate-400">{event.email}</span></p><p className="mt-1 break-words text-xs leading-6 text-slate-500">{event.detail}</p></div></li>; })}</ol>}
    <MonitoringPagination page={current} pages={pages} count={rows.length} onChange={setPage} />
  </Card>;
}
