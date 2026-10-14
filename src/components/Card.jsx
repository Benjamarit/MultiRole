export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200/90 bg-surface shadow-xs transition-all ${className}`}
    >
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}