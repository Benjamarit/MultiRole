import { useId } from 'react';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[describedBy, errorDescription].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded-lg border bg-surface px-3.5 py-2 text-sm text-primary-text shadow-2xs transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100
          ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-200 hover:border-slate-300 focus:border-precision-blue focus:ring-blue-100'
          }`}
      >
        <option value="" disabled>
          -- {t('กรุณาเลือก', 'Please select', { compact: true })} --
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}