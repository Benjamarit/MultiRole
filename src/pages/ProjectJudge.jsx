import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import JudgeAssignModal from '../components/JudgeAssignModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const project = getProjectById(id);
  const authorized = isProjectAdmin(id, user?.email);
  const registeredUsers = getRegisteredUsers();

  const [assignedJudges, setAssignedJudges] = useState(() => getJudgeAssignments(id));
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [judgeToRemove, setJudgeToRemove] = useState(null);

  const judgeList = useMemo(() => {
    return assignedJudges
      .map((assignment) => {
        const email = assignment.email || assignment.id;
        const found = registeredUsers.find((candidate) => candidate.email === email);
        return {
          id: assignment.id,
          email,
          name: found?.name || email.split('@')[0],
          isRegistered: Boolean(found),
          assignedTeamIds: getAssignedTeamIds(id, assignment.id),
        };
      })
      .filter(Boolean);
  }, [assignedJudges, id, registeredUsers]);

  const filteredJudges = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return judgeList;
    return judgeList.filter(
      (j) =>
        j.name.toLowerCase().includes(query) || j.email.toLowerCase().includes(query)
    );
  }, [judgeList, searchTerm]);

  const availableJudges = useMemo(() => {
    const assignedEmails = new Set(
      assignedJudges.map((assignment) => assignment.email || assignment.id)
    );
    return registeredUsers.filter((u) => !assignedEmails.has(u.email));
  }, [assignedJudges, registeredUsers]);

  const handleAssignJudge = (judgeEmail) => {
    inviteJudgeToProject(id, judgeEmail);
    setAssignedJudges((prev) => [...prev, { id: judgeEmail, email: judgeEmail }]);
    setIsAssignOpen(false);
    toast.success(
      t(`เชิญ ${judgeEmail} เข้าเป็นกรรมการแล้ว`, `Invited ${judgeEmail} as judge`)
    );
  };

  const handleRemoveClick = (judge) => {
    setJudgeToRemove(judge);
    setIsConfirmOpen(true);
  };

  const confirmRemove = () => {
    if (judgeToRemove) {
      removeJudgeAssignment(id, judgeToRemove.id, judgeToRemove.email);
      setAssignedJudges((prev) =>
        prev.filter((assignment) => assignment.id !== judgeToRemove.id)
      );
      setIsConfirmOpen(false);
      setJudgeToRemove(null);
      toast.success(t('นำกรรมการออกจากโครงการแล้ว', 'Judge removed from competition'));
    }
  };

  if (!project) {
    return (
      <div className="p-6">
        <Card>{t('ไม่พบโครงการนี้', 'Competition not found')}</Card>
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="p-6">
        <Card>
          {t(
            'เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการกรรมการได้',
            'Only the Project Admin can manage judges for this competition.'
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard', { compact: true })}
      </BackButton>

      <PageHeader
        title={t('จัดการกรรมการ', 'Judges Management')}
        description={tDesc(
          `รายชื่อกรรมการที่ได้รับเชิญในโครงการ ${project.name}`,
          `Manage invited judges for ${project.name}`
        )}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/project/${id}/assignments`)}
            >
              <UserCheck className="h-4 w-4" />
              {t('ไปหน้ามอบหมายทีม', 'Assign Teams', { compact: true })}
            </Button>
            <Button onClick={() => setIsAssignOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('เพิ่มกรรมการ', 'Invite Judge', { compact: true })}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor="judge-search" className="sr-only">
            {t('ค้นหาชื่อหรืออีเมลกรรมการ', 'Search judge name or email')}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="judge-search"
            type="text"
            placeholder={t('ค้นหาชื่อ หรือ อีเมล...', 'Search name or email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <p className="text-sm text-slate-500" aria-live="polite">
          {t(`พบ ${filteredJudges.length} คน`, `Showing ${filteredJudges.length} judges`)}
        </p>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">{t('ชื่อ-นามสกุล', 'Judge Name', { compact: true })}</th>
                <th className="px-6 py-3.5">{t('อีเมล', 'Email', { compact: true })}</th>
                <th className="px-6 py-3.5 text-center">
                  {t('ทีมที่ได้รับมอบหมาย', 'Assigned Teams', { compact: true })}
                </th>
                <th className="px-6 py-3.5 text-right">{t('จัดการ', 'Actions', { compact: true })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJudges.length > 0 ? (
                filteredJudges.map((judge) => (
                  <tr
                    key={judge.id}
                    className="text-sm transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{judge.name}</span>
                        {!judge.isRegistered && (
                          <Badge variant="default">Demo / Pre-invited</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{judge.email}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={judge.assignedTeamIds.length > 0 ? 'info' : 'warning'}>
                        {judge.assignedTeamIds.length}{' '}
                        {t('ทีม', 'teams', { compact: true })}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveClick(judge)}
                      >
                        {t('นำออก', 'Remove', { compact: true })}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-sm text-slate-500">
                    {t('ยังไม่มีกรรมการในโครงการนี้', 'No judges assigned to this competition yet')}
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
        title={t('ยืนยันการนำกรรมการออกจากโครงการ', 'Confirm Removing Judge')}
        message={t(
          `คุณแน่ใจหรือไม่ว่าต้องการนำ "${judgeToRemove?.name}" ออกจากโครงการนี้? คะแนนที่เคยให้ไว้ (ถ้ามี) จะไม่ถูกลบ`,
          `Are you sure you want to remove "${judgeToRemove?.name}" from this competition? Previously saved evaluations will remain intact.`
        )}
        onConfirm={confirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('นำออก', 'Remove', { compact: true })}
      />
    </div>
  );
}