import { useState } from 'react';
import Button from './Button';

/**
 * <CoiEditModal
 *   isOpen={isCoiOpen}
 *   judge={{id, name, coiTeamIds: [1,2]}}
 *   teams={[{id, name}, ...]}   // ทีมทั้งหมดในโครงการ
 *   onSave={(judgeId, coiTeamIds) => ...}
 *   onClose={() => ...}
 * />
 */
export default function CoiEditModal({ isOpen, judge, teams, onSave, onClose }) {
  const [selected, setSelected] = useState(() => judge?.coiTeamIds || []);

  if (!isOpen || !judge) return null;

  const toggleTeam = (teamId) => {
    setSelected((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSave = () => {
    onSave(judge.id, selected);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coi-edit-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="coi-edit-title" className="text-lg font-semibold text-gray-900">
          ตั้งค่า Conflict of Interest
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          เลือกทีมที่ <span className="font-medium">{judge.name}</span> ต้องงดให้คะแนน
          เนื่องจากมีผลประโยชน์ทับซ้อน ระบบจะไม่แสดงทีมเหล่านี้ในหน้าประเมินของกรรมการคนนี้
        </p>

        <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
          {teams.map((team) => (
            <label
              key={team.id}
              className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {team.name}
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </div>
      </div>
    </div>
  );
}