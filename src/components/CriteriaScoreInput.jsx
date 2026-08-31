import { Star } from 'lucide-react';

/**
 * <CriterionScoreInput
 *   criterion={{ id, name, type: 'STAR'|'NUMERIC'|'PERCENTAGE'|'PASS_FAIL', weight, maxScore }}
 *   value={number|null}
 *   onChange={(value) => ...}
 *   disabled={boolean}
 * />
 */
export default function CriterionScoreInput({ criterion, value, onChange, disabled }) {
  switch (criterion.type) {
    case 'STAR':
      return (
        <div className="flex gap-1" role="radiogroup" aria-label={`ให้คะแนน ${criterion.name}`}>
          {Array.from({ length: criterion.maxScore }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              aria-label={`${star} ดาว`}
              aria-pressed={value >= star}
              className="disabled:cursor-not-allowed"
            >
              <Star
                className={`w-6 h-6 ${
                  value >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      );

    case 'NUMERIC':
      return (
        <input
          type="number"
          min={0}
          max={criterion.maxScore}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return onChange(null);
            const num = Math.max(0, Math.min(criterion.maxScore, Number(raw)));
            onChange(num);
          }}
          placeholder={`0-${criterion.maxScore}`}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
        />
      );

    case 'PERCENTAGE':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={value ?? 0}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full disabled:opacity-50"
          />
          <span className="text-sm font-mono text-gray-700 w-12 text-right">
            {value ?? 0}%
          </span>
        </div>
      );

    case 'PASS_FAIL':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(1)}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              value === 1
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pass
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(0)}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              value === 0
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Fail
          </button>
        </div>
      );

    default:
      return <p className="text-sm text-red-500">ไม่รู้จักรูปแบบการให้คะแนนนี้ ({criterion.type})</p>;
  }
}