import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BackButton({ to, className = '', children }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:text-precision-blue focus-visible:outline-offset-4 ${className}`}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {children}
    </Link>
  );
}