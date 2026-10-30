import { useId } from 'react';

export default function Input({
  label,
  error,
  className = '',
  id,
  'aria-describedby': describedBy,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[describedBy, error && errorId].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded-lg border bg-surface px-3.5 py-2 text-sm text-primary-text shadow-2xs transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100
          ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-200 hover:border-slate-300 focus:border-precision-blue focus:ring-blue-100'
          }`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}