import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import JudgeAssignModal from '../components/JudgeAssignModal';
import CoiEditModal from '../components/CoiEditModal';
import { getTeamsByProject } from '../data/TeamStore';
import {
  getJudgeAssignments,
  inviteJudgeToProject,
  removeJudgeAssignment,
  updateJudgeCoi,
} from '../data/ProjectStore';
import { getRegisteredUsers } from '../context/AuthContext';

export default function ProjectJudges() {
  const { id } = useParams();
  const projectTeams = getTeamsByProject(id);
  const registeredUsers = getRegisteredUsers();

  const [assignedJudges, setAssignedJudges] = useState(() => getJudgeAssignments(id));
  const [searchTerm, setSearchTerm] = useState('');

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCoiOpen, setIsCoiOpen] = useState(false);
  const [coiTarget, setCoiTarget] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [judgeToRemove, setJudgeToRemove] = useState(null);

  // รวมข้อมูล assignment กับข้อมูลผู้ใช้งานจริง
  const judgeList = useMemo(() => {
    return assignedJudges
      .map((assignment) => {
        const user = registeredUsers.find(
          (candidate) => candidate.email === (assignment.email || assignment.id)
        );
        if (!user) return null;
        return { ...user, id: assignment.id, coiTeamIds: assignment.coiTeamIds || [] };
      })
      .filter(Boolean);
  }, [assignedJudges, registeredUsers]);

  const filteredJudges = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return judgeList;
    return judgeList.filter(
      (j) => j.name.toLowerCase().includes(query) || j.email.toLowerCase().includes(query)
    );
  }, [judgeList, searchTerm]);

  const availableJudges = useMemo(() => {
    const assignedEmails = new Set(assignedJudges.map((assignment) => assignment.email || assignment.id));
    return registeredUsers.filter((user) => !assignedEmails.has(user.email));
  }, [assignedJudges, registeredUsers]);

  const handleAssignJudge = (judgeEmail) => {
    inviteJudgeToProject(id, judgeEmail);
    setAssignedJudges((prev) => [...prev, { id: judgeEmail, email: judgeEmail, coiTeamIds: [] }]);
    setIsAssignOpen(false);
  };

  const handleOpenCoi = (judge) => {
    setCoiTarget(judge);
    setIsCoiOpen(true);
  };

  const handleSaveCoi = (judgeId, coiTeamIds) => {
    updateJudgeCoi(id, judgeId, coiTeamIds);
    setAssignedJudges((prev) =>
      prev.map((a) => (a.id === judgeId ? { ...a, coiTeamIds } : a))
    );
    setIsCoiOpen(false);
    setCoiTarget(null);
  };

  const handleRemoveClick = (judge) => {
    setJudgeToRemove(judge);
    setIsConfirmOpen(true);
  };

  const confirmRemove = () => {
    if (judgeToRemove) {
      removeJudgeAssignment(id, judgeToRemove.id, judgeToRemove.email);
      setAssignedJudges((prev) => prev.filter((assignment) => assignment.id !== judgeToRemove.id));
      setIsConfirmOpen(false);
      setJudgeToRemove(null);
    }
  };

  const teamNamesFor = (coiTeamIds) =>
    coiTeamIds
      .map((tid) => projectTeams.find((t) => t.id === tid)?.name)
      .filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to={`/project/${id}/dashboard`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader
        title="จัดการกรรมการ (Judges)"
        description={`กรรมการที่ได้รับมอบหมายในโครงการ #${id} และการตั้งค่า Conflict of Interest (COI)`}
        action={<Button onClick={() => setIsAssignOpen(true)}>+ เพิ่มกรรมการ</Button>}
      />

      <div className="max-w-sm">
        <label htmlFor="judge-search" className="sr-only">
          ค้นหาชื่อหรืออีเมลกรรมการ
        </label>
        <Input
          id="judge-search"
          placeholder="ค้นหาชื่อ หรือ อีเมล..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <p className="text-sm text-gray-500" aria-live="polite">
        พบ {filteredJudges.length} คน
      </p>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-4 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4 font-medium">อีเมล</th>
                <th className="px-6 py-4 font-medium">งดให้คะแนนทีม (COI)</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJudges.length > 0 ? (
                filteredJudges.map((judge) => (
                  <tr key={judge.id} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4 font-medium text-gray-900">{judge.name}</td>
                    <td className="px-6 py-4 text-gray-500">{judge.email}</td>
                    <td className="px-6 py-4">
                      {judge.coiTeamIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teamNamesFor(judge.coiTeamIds).map((name) => (
                            <Badge key={name} variant="warning">{name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">ไม่มี</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button variant="text" size="sm" onClick={() => handleOpenCoi(judge)}>
                        ตั้งค่า COI
                      </Button>
                      <span className="w-px h-4 bg-gray-200"></span>
                      <Button variant="danger" size="sm" onClick={() => handleRemoveClick(judge)}>
                        นำออก
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                    ยังไม่มีกรรมการในโครงการนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <JudgeAssignModal
        isOpen={isAssignOpen}
        availableUsers={availableJudges}
        onAssign={handleAssignJudge}
        onClose={() => setIsAssignOpen(false)}
      />

      <CoiEditModal
        isOpen={isCoiOpen}
        judge={coiTarget}
        teams={projectTeams}
        onSave={handleSaveCoi}
        onClose={() => {
          setIsCoiOpen(false);
          setCoiTarget(null);
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการนำกรรมการออกจากโครงการ"
        message={`คุณแน่ใจหรือไม่ว่าต้องการนำ "${judgeToRemove?.name}" ออกจากโครงการนี้? คะแนนที่เคยให้ไว้ (ถ้ามี) จะไม่ถูกลบ`}
        onConfirm={confirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="นำออก"
      />
    </div>
  );
}