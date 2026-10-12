export default function CriteriaModal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-navy/45 p-4 transition-opacity">
      <div className={`flex max-h-[90vh] w-full flex-col rounded-md border border-border bg-surface ${maxWidth}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-primary-text">{title}</h3>
          <button onClick={onClose} aria-label="ปิดหน้าต่าง" className="rounded-sm text-2xl font-semibold leading-none text-slate-500 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-precision-blue">
            &times;
          </button>
        </div>
        
        {/* Body (Scrollable) */}
        <div className="overflow-y-auto p-6">
          {children}
        </div>

      </div>
    </div>
  );
}