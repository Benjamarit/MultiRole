import { useId } from 'react';

export default function Select({
  label,
  error,
  options = [],
  className = '',
  id,
  'aria-describedby': describedBy,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const errorDescription = error && errorId;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-primary-text">
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[describedBy, errorDescription].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-primary-text transition-colors focus-visible:border-precision-blue focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100
          ${error 
            ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-100'
            : 'border-border hover:border-slate-400'
          }`}
      >
        <option value="" disabled>-- กรุณาเลือก --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}