import { useEffect, useState } from 'react';
import Button from './Button';

/**
 * <JudgeAssignModal
 *   isOpen={isAssignOpen}
 *   availableJudges={[{id, name, email}, ...]}   // judge-role users not yet assigned to this project
 *   onAssign={(judgeId) => ...}
 *   onClose={() => ...}
 * />
 */
export default function JudgeAssignModal({ isOpen, availableJudges, onAssign, onClose }) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedId(availableJudges[0]?.id ?? '');
    }
  }, [isOpen, availableJudges]);

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!selectedId) return;
    onAssign(Number(selectedId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-assign-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="judge-assign-title" className="text-lg font-semibold text-gray-900">
          เพิ่มกรรมการเข้าโครงการ
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          เลือกจากรายชื่อผู้ใช้งานที่มีบทบาท Judge ในระบบ (จัดการรายชื่อได้ที่หน้า User Management)
        </p>

        <div className="mt-5">
          <label htmlFor="judge-select" className="mb-1 block text-sm font-medium text-gray-700">
            กรรมการ
          </label>
          {availableJudges.length > 0 ? (
            <select
              id="judge-select"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {availableJudges.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.name} ({judge.email})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">
              กรรมการทุกคนในระบบถูกเพิ่มเข้าโครงการนี้หมดแล้ว หรือยังไม่มีผู้ใช้งานบทบาท Judge
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleAssign} disabled={availableJudges.length === 0}>
            เพิ่มเข้าโครงการ
          </Button>
        </div>
      </div>
    </div>
  );
}