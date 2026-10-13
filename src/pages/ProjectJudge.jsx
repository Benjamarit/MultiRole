import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import ConfirmDialog from '../components/ConfirmDialog';
import JudgeAssignModal from '../components/JudgeAssignModal';
import { useAuth } from '../context/AuthContext';
import {
  getProjectById,
  getJudgeAssignments,
  getAssignedTeamIds,
  inviteJudgeToProject,
  isProjectAdmin,
  removeJudgeAssignment,
} from '../data/ProjectStore';
import { getRegisteredUsers } from '../context/authStore';

export default function ProjectJudges() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = getProjectById(id);
  const authorized = isProjectAdmin(id, user?.email);
  const registeredUsers = getRegisteredUsers();

  const [assignedJudges, setAssignedJudges] = useState(() => getJudgeAssignments(id));
  const [searchTerm, setSearchTerm] = useState('');

  const [isAssignOpen, setIsAssignOpen] = useState(false);

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
        return { ...user, id: assignment.id, assignedTeamIds: getAssignedTeamIds(id, assignment.id) };
      })
      .filter(Boolean);
  }, [assignedJudges, id, registeredUsers]);

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
    setAssignedJudges((prev) => [...prev, { id: judgeEmail, email: judgeEmail }]);
    setIsAssignOpen(false);
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

  if (!project) {
    return <div className="p-6"><Card>ไม่พบโครงการนี้</Card></div>;
  }
  if (!authorized) {
    return <div className="p-6"><Card>เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการกรรมการได้</Card></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackButton to={`/project/${id}/dashboard`}>
        กลับไปหน้า Dashboard โครงการ
      </BackButton>

      <PageHeader
        title="จัดการกรรมการ (Judges)"
        description={`กรรมการที่ได้รับเชิญในโครงการ #${id}`}
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
                <th className="px-6 py-4 font-medium text-center">ทีมที่ได้รับมอบหมาย</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJudges.length > 0 ? (
                filteredJudges.map((judge) => (
                  <tr key={judge.id} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4 font-medium text-gray-900">{judge.name}</td>
                    <td className="px-6 py-4 text-gray-500">{judge.email}</td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {judge.assignedTeamIds.length}
                    </td>
                    <td className="px-6 py-4 text-right">
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