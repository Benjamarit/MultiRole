export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    success: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700',
    warning: 'border border-amber-200/80 bg-amber-50 text-amber-800',
    error: 'border border-red-200/80 bg-red-50 text-red-700',
    info: 'border border-blue-200/80 bg-blue-50 text-blue-700',
    purple: 'border border-violet-200/80 bg-violet-50 text-violet-700',
    default: 'border border-slate-200 bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
}