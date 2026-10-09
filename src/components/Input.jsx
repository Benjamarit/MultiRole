// src/components/common/Input.jsx
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
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-primary-text">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[describedBy, error && errorId].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-primary-text transition-colors placeholder:text-slate-400 focus-visible:border-precision-blue focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100
          ${error 
            ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-100'
            : 'border-border hover:border-slate-400'
          }`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}