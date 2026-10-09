// src/components/Badge.jsx
export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border border-amber-200 bg-amber-50 text-amber-800",
    error: "border border-red-200 bg-red-50 text-red-800",
    info: "border border-blue-200 bg-blue-50 text-blue-800",
    purple: "border border-violet-200 bg-violet-50 text-violet-800",
    default: "border border-border bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}