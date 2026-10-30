import { ChevronLeft, ChevronRight, Search, SearchX, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Button from './Button';

export function MonitoringStat({ icon: Icon, label, value, hint, tone = 'blue', onClick, active, tinted = false }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-500' };
  const surfaces = {
    blue: { border: 'border-blue-200', background: 'bg-blue-50', selected: 'border-blue-500 ring-2 ring-blue-200', hover: 'hover:bg-blue-100/70', icon: 'text-blue-700' },
    green: { border: 'border-emerald-200', background: 'bg-emerald-50', selected: 'border-emerald-500 ring-2 ring-emerald-200', hover: 'hover:bg-emerald-100/70', icon: 'text-emerald-700' },
    amber: { border: 'border-amber-200', background: 'bg-amber-50', selected: 'border-amber-500 ring-2 ring-amber-200', hover: 'hover:bg-amber-100/70', icon: 'text-amber-700' },
    slate: { border: 'border-slate-200', background: 'bg-slate-100/80', selected: 'border-slate-500 ring-2 ring-slate-200', hover: 'hover:bg-slate-200/60', icon: 'text-slate-600' },
  };
  const surface = surfaces[tone] || surfaces.blue;
  const content = <><div className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold leading-5 ${tinted ? 'text-slate-600' : 'text-slate-500'}`}>{label}</span><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tinted ? `bg-white/80 ${surface.icon}` : tones[tone] || tones.blue}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>{hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}</>;
  const appearance = tinted
    ? `${active ? surface.selected : surface.border} ${surface.background} ${onClick ? `${surface.hover} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600` : ''}`
    : `bg-surface ${active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/90'} ${onClick ? 'hover:border-blue-300 hover:bg-blue-50/30' : ''}`;
  const className = `min-w-0 rounded-xl border p-4 text-left shadow-xs sm:p-5 ${appearance} ${onClick ? 'transition-colors' : ''}`;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={active} className={className}>{content}</button> : <div className={className}>{content}</div>;
}

export function MonitoringTabs({ id, label, items, value, onChange }) {
  const onKeyDown = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].id);
    document.getElementById(`${id}-${items[next].id}-tab`)?.focus();
  };
  return <div role="tablist" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1">{items.map((item, index) => <button type="button" role="tab" key={item.id} id={`${id}-${item.id}-tab`} aria-selected={value === item.id} aria-controls={`${id}-${item.id}-panel`} tabIndex={value === item.id ? 0 : -1} onKeyDown={e => onKeyDown(e, index)} onClick={() => onChange(item.id)} className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${value === item.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}>{item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}{item.label}{item.count !== undefined && <span className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${value === item.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/60 text-slate-500'}`}>{item.count}</span>}</button>)}</div>;
}

export function MonitoringSearch({ id, label, placeholder, value, onChange }) {
  const { t } = useLanguage();
  return <div className="relative min-w-0 flex-1"><label htmlFor={id} className="sr-only">{label}</label><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || label} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:appearance-none" />{value && <button type="button" aria-label={t('ล้างการค้นหา', 'Clear search')} onClick={() => onChange('')} className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}</div>;
}

export function MonitoringEmpty({ title, description, onReset, icon: Icon = SearchX }) {
  const { t } = useLanguage();
  return <div className="flex flex-col items-center px-5 py-14 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400"><Icon className="h-6 w-6" aria-hidden="true" /></span><h3 className="text-sm font-bold text-slate-800">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{onReset && <Button variant="secondary" size="sm" className="mt-4" onClick={onReset}>{t('ล้างตัวกรอง', 'Reset filters')}</Button>}</div>;
}

export function MonitoringPagination({ page, pages, count, onChange }) {
  const { t } = useLanguage();
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-6"><p aria-live="polite">{t(`${count} รายการ · หน้า ${page} จาก ${pages}`, `${count} results · Page ${page} of ${pages}`)}</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-3.5 w-3.5" />{t('ก่อนหน้า', 'Previous')}</Button><Button variant="secondary" size="sm" disabled={page === pages} onClick={() => onChange(page + 1)}>{t('ถัดไป', 'Next')}<ChevronRight className="h-3.5 w-3.5" /></Button></div></div>;
}

export function MonitoringSkeleton() {
  return <div role="status" aria-label="Loading" className="space-y-3 p-6 motion-safe:animate-pulse">{[0, 1, 2].map(i => <div key={i} className="flex gap-4 rounded-xl border border-slate-100 p-4"><div className="h-10 w-10 rounded-xl bg-slate-100" /><div className="flex-1 space-y-3"><div className="h-3 w-1/3 rounded bg-slate-100" /><div className="h-3 w-2/3 rounded bg-slate-100" /></div></div>)}</div>;
}
