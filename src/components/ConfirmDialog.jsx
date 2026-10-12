import Button from './Button';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'ยืนยัน', 
  cancelText = 'ยกเลิก',
  isDanger = true 
}) {
  if (!isOpen) return null;

  return (
    // Overlay พื้นหลังสีดำโปร่งใส
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-navy/45 px-4 transition-opacity">
      
      {/* กล่อง Modal */}
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-6">
        <h3 className="mb-2 text-lg font-semibold text-primary-text">
          {title}
        </h3>
        <p className="mb-6 text-sm leading-6 text-slate-600">
          {message}
        </p>
        
        {/* ส่วนปุ่มกด */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button 
            variant={isDanger ? 'danger' : 'primary'} 
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
      
    </div>
  );
}