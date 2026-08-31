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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
      
      {/* กล่อง Modal */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
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