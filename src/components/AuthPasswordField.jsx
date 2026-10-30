import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AuthPasswordField({ id, label, value, onChange, hint }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
      <input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={value} onChange={onChange} aria-describedby={hint ? `${id}-hint` : undefined} className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50" />
      <button type="button" onClick={() => setVisible(previous => !previous)} aria-label={`${visible ? t('ซ่อนรหัสผ่าน', 'Hide password') : t('แสดงรหัสผ่าน', 'Show password')} (${label})`} aria-pressed={visible} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">{visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}</button>
    </div>
    {hint && <p id={`${id}-hint`} className="mt-2 text-xs text-slate-500">{hint}</p>}
  </div>;
}
