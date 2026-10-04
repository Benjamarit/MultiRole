export default function Select({ label, error, options = [], className = '', ...props }) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 bg-white border rounded-md text-sm transition-shadow focus:outline-none focus:ring-2 
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 hover:border-gray-400'
          }`}
        {...props}
      >
        <option value="" disabled>-- กรุณาเลือก --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}