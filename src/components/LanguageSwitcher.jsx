import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const OPTIONS = [
  { id: 'TH', label: 'TH', title: 'ภาษาไทย (Thai)' },
  { id: 'EN', label: 'ENG', title: 'English' },
];

export default function LanguageSwitcher({ className = '', variant = 'light' }) {
  const { lang, setLang } = useLanguage();

  const containerStyle =
    variant === 'dark'
      ? 'border-white/20 bg-slate-800/80 text-slate-200'
      : 'border-slate-200 bg-slate-100/90 text-slate-600';

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 text-xs font-medium shadow-2xs ${containerStyle} ${className}`}
      role="group"
      aria-label="สลับภาษา / Language switcher"
    >
      <span
        className="hidden items-center pl-2 pr-1 text-slate-400 sm:inline-flex"
        aria-hidden="true"
      >
        <Globe className="h-3.5 w-3.5" />
      </span>
      {OPTIONS.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.title}
            aria-pressed={active}
            onClick={() => setLang(opt.id)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-tight transition-all ${
              active
                ? variant === 'dark'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/80'
                : variant === 'dark'
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
