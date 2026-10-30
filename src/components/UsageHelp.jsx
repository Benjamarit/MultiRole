import { ChevronDown, CircleHelp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function UsageHelp({ children, title, className = '' }) {
  const { t } = useLanguage();
  return <details className={`group rounded-xl border border-slate-200 bg-white ${className}`}>
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
      <CircleHelp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{title || t('วิธีใช้', 'How to use')}</span>
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
    </summary>
    <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs leading-6 text-slate-600">{children}</div>
  </details>;
}
