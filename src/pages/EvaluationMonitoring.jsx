import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BellRing, CheckCircle2, Eye, RefreshCw, Scale, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import CriteriaModal from '../components/CriteriaModal';
import { useLanguage } from '../context/LanguageContext';
import {
  getAssignedTeamIds,
  getProjectById,
  isJudgeAssignedToTeam,
} from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluationsByProject } from '../data/EvaluationStore';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getRegisteredUsers } from '../context/authStore';
import { addNotification } from '../data/NotificationStore';

function formatTime(date) {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function scoreLabel(criterion, value) {
  if (value === null || value === undefined) return 'ยังไม่ให้คะแนน';
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 'Pass' : 'Fail';
  if (criterion.type === 'STAR') return `${value} / ${criterion.maxScore} ดาว`;
  if (criterion.type === 'PERCENTAGE') return `${value}%`;
  return `${value} / ${criterion.maxScore}`;
}

export default function EvaluationMonitoring() {
  const { id } = useParams();
  const { t, tDesc } = useLanguage();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [notifiedJudgeIds, setNotifiedJudgeIds] = useState([]);
  const [detailTeam, setDetailTeam] = useState(null);
  const project = getProjectById(id);
  const registeredUsers = getRegisteredUsers();
  const teams = getTeamsByProject(id);
  const criteria = getCriteriaByProject(id);
  const assignments = project?.judgeAssignments || [];
  const evaluations = getEvaluationsByProject(id).filter(
    (evaluation) =>
      evaluation.status === 'SUBMITTED' &&
      assignments.some(
        (assignment) =>
          String(assignment.email || assignment.id) === String(evaluation.judgeId) &&
          isJudgeAssignedToTeam(id, assignment.id, evaluation.teamId)
      )
  );

  const judgeProgress = assignments.map((assignment) => {
    const judge = registeredUsers.find(
      (user) => user.email === (assignment.email || assignment.id)
    );
    const assignedTeamIds = getAssignedTeamIds(id, assignment.id);
    const eligibleTeams = teams.filter((team) =>
      assignedTeamIds.includes(Number(team.id))
    );
    const completed = evaluations.filter(
      (evaluation) => evaluation.judgeId === String(judge?.email || assignment.id)
    ).length;
    return {
      id: assignment.id,
      email: judge?.email || assignment.email || assignment.id,
      name: judge?.name || `${assignment.email || assignment.id}`,
      assigned: eligibleTeams.length,
      completed,
      status:
        completed === 0
          ? 'Not Started'
          : completed >= eligibleTeams.length
            ? 'Completed'
            : 'In Progress',
    };
  });

  const teamProgress = teams.map((team) => {
    const teamEvaluations = evaluations.filter(
      (evaluation) => evaluation.teamId === team.id
    );
    const eligibleJudgeCount = assignments.filter((assignment) =>
      isJudgeAssignedToTeam(id, assignment.id, team.id)
    ).length;
    const currentScore = teamEvaluations.length
      ? teamEvaluations.reduce((sum, evaluation) => sum + evaluation.totalScore, 0) /
        teamEvaluations.length
      : 0;
    return {
      ...team,
      evaluatedBy: teamEvaluations.length,
      totalJudges: eligibleJudgeCount,
      currentScore,
      status:
        teamEvaluations.length > 0 && teamEvaluations.length >= eligibleJudgeCount
          ? 'Completed'
          : 'Pending',
    };
  });

  const totalAssignments = teamProgress.reduce((sum, team) => sum + team.totalJudges, 0);
  const completedAssignments = evaluations.length;
  const completionPercent = totalAssignments
    ? Math.round((completedAssignments / totalAssignments) * 100)
    : 0;
  const completedJudges = judgeProgress.filter(
    (judge) => judge.status === 'Completed'
  ).length;
  const completedTeams = teamProgress.filter(
    (team) => team.status === 'Completed'
  ).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">{t('เสร็จสิ้น', 'Completed', { compact: true })}</Badge>;
      case 'In Progress':
        return (
          <Badge variant="warning">{t('กำลังดำเนินการ', 'In Progress', { compact: true })}</Badge>
        );
      case 'Not Started':
        return <Badge variant="error">{t('ยังไม่เริ่ม', 'Not Started', { compact: true })}</Badge>;
      case 'Pending':
        return <Badge variant="warning">{t('รอผลประเมิน', 'Pending', { compact: true })}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const handleNotify = (judgeId, judgeEmail, judgeName) => {
    addNotification({
      userId: judgeEmail,
      projectId: id,
      title: 'แจ้งเตือนการประเมิน',
      message: `เรียนคุณ ${judgeName}, โปรดอย่าลืมให้คะแนนผลงานในโครงการ "${project?.name || `โครงการ #${id}`}" เนื่องจากใกล้ถึงกำหนดเวลาแล้วครับ`,
      type: 'REMINDER',
    });
    setNotifiedJudgeIds((prev) => [...prev, judgeId]);
    toast.success(
      t(
        `ส่งการแจ้งเตือนถึง ${judgeName} เรียบร้อยแล้ว`,
        `Reminder sent to ${judgeName}`
      )
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard', { compact: true })}
      </BackButton>

      <PageHeader
        title={t('ติดตามผลการประเมิน', 'Evaluation Monitoring')}
        description={tDesc(
          'ตรวจสอบความคืบหน้าการให้คะแนนของกรรมการ ส่งแจ้งเตือน และดูคะแนนย่อยของแต่ละทีม',
          'Track real-time judge completion rates, send reminders, and inspect detailed score breakdowns.'
        )}
        action={
          <div className="text-right">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing
                ? t('กำลังรีเฟรช...', 'Refreshing...', { compact: true })
                : t('รีเฟรชข้อมูล', 'Refresh', { compact: true })}
            </Button>
            <p className="mt-1 text-xs text-slate-400">
              {t('อัปเดตล่าสุด', 'Last updated', { compact: true })} {formatTime(lastUpdated)}
            </p>
          </div>
        }
      />

      {/* สรุปภาพรวม (Overview Stats) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600">
          <p className="mb-1 text-xs font-medium text-slate-500">
            {t('ความคืบหน้ารวมทั้งหมด', 'Overall Completion', { compact: true })}
          </p>
          <div className="flex items-end gap-2">
            <h3 className="font-mono text-3xl font-extrabold text-blue-600">
              {completionPercent}%
            </h3>
            <p className="mb-1 text-xs text-slate-500">
              ({completedAssignments}/{totalAssignments}{' '}
              {t('รายการ', 'evaluations', { compact: true })})
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-emerald-600">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('กรรมการที่ประเมินเสร็จแล้ว', 'Judges Completed', { compact: true })}
            </p>
            <h3 className="mt-0.5 font-mono text-3xl font-extrabold text-emerald-600">
              {completedJudges}{' '}
              <span className="font-sans text-base font-normal text-slate-400">
                / {assignments.length} {t('คน', 'judges', { compact: true })}
              </span>
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-violet-600">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('ทีมที่ได้รับคะแนนครบแล้ว', 'Teams Fully Scored', { compact: true })}
            </p>
            <h3 className="mt-0.5 font-mono text-3xl font-extrabold text-violet-600">
              {completedTeams}{' '}
              <span className="font-sans text-base font-normal text-slate-400">
                / {teams.length} {t('ทีม', 'teams', { compact: true })}
              </span>
            </h3>
          </div>
        </Card>
      </div>

      {/* ตารางความคืบหน้าของกรรมการ */}
      <Card noPadding>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {t('สถานะกรรมการ', 'Judge Progress')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">{t('ชื่อกรรมการ', 'Judge', { compact: true })}</th>
                <th className="px-6 py-3.5 text-center">
                  {t('ประเมินแล้ว (ทีม)', 'Scored Teams', { compact: true })}
                </th>
                <th className="w-1/3 px-6 py-3.5">
                  {t('ความคืบหน้า', 'Progress', { compact: true })}
                </th>
                <th className="px-6 py-3.5">{t('สถานะ', 'Status', { compact: true })}</th>
                <th className="px-6 py-3.5 text-right">
                  {t('การแจ้งเตือน', 'Reminder', { compact: true })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {judgeProgress.length > 0 ? (
                judgeProgress.map((judge) => {
                  const percent =
                    judge.assigned > 0
                      ? Math.round((judge.completed / judge.assigned) * 100)
                      : 0;
                  const alreadyNotified = notifiedJudgeIds.includes(judge.id);
                  return (
                    <tr
                      key={judge.id}
                      className="text-sm transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{judge.name}</p>
                        <p className="text-xs text-slate-500">{judge.email}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        {judge.completed} / {judge.assigned}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-xs font-bold text-slate-600">
                            {percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(judge.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={
                            judge.assigned === 0 || percent === 100 || alreadyNotified
                          }
                          onClick={() => handleNotify(judge.id, judge.email, judge.name)}
                        >
                          {alreadyNotified ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {t('ส่งเตือนแล้ว', 'Sent', { compact: true })}
                            </>
                          ) : (
                            <>
                              <BellRing className="h-3.5 w-3.5 text-blue-600" />
                              {t('แจ้งเตือน', 'Notify', { compact: true })}
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                    {t('ยังไม่มีกรรมการในโครงการนี้', 'No judges assigned yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ตารางความคืบหน้าของทีม */}
      <Card noPadding>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {t('สถานะรายทีม', 'Team Evaluation Status')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">{t('ชื่อทีม', 'Team Name', { compact: true })}</th>
                <th className="px-6 py-3.5 text-center">
                  {t('กรรมการที่ตรวจแล้ว', 'Evaluated By', { compact: true })}
                </th>
                <th className="px-6 py-3.5 text-center">
                  {t('คะแนนเฉลี่ยปัจจุบัน', 'Current Avg Score', { compact: true })}
                </th>
                <th className="px-6 py-3.5">{t('สถานะ', 'Status', { compact: true })}</th>
                <th className="px-6 py-3.5 text-right">
                  {t('รายละเอียด', 'Details', { compact: true })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamProgress.length > 0 ? (
                teamProgress.map((team) => (
                  <tr
                    key={team.id}
                    className="text-sm transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{team.name}</td>
                    <td className="px-6 py-4 text-center font-mono">
                      {team.evaluatedBy} / {team.totalJudges}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-blue-700">
                      {team.evaluatedBy > 0 ? team.currentScore.toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(team.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDetailTeam(team)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t('ดูคะแนนย่อย', 'Breakdown', { compact: true })}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                    {t('ยังไม่มีทีมในโครงการนี้', 'No teams in this competition yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal แสดงคะแนนย่อยรายกรรมการของทีมที่เลือก */}
      <CriteriaModal
        isOpen={Boolean(detailTeam)}
        onClose={() => setDetailTeam(null)}
        title={`${t('คะแนนย่อยรายกรรมการ —', 'Score Breakdown —', { compact: true })} ${detailTeam?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {detailTeam &&
          evaluations.filter((evaluation) => evaluation.teamId === detailTeam.id).length >
            0 ? (
            evaluations
              .filter((evaluation) => evaluation.teamId === detailTeam.id)
              .map((entry) => (
                <div
                  key={entry.judgeId}
                  className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div>
                      <span className="font-bold text-slate-900">{entry.judgeName}</span>
                      <span className="ml-2 text-xs text-slate-500">({entry.judgeId})</span>
                    </div>
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-base font-extrabold text-blue-700">
                      {entry.totalScore.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {criteria.map((criterion) => {
                      const score = entry.scores?.[criterion.id];
                      const note = entry.criteriaComments?.[criterion.id];
                      return (
                        <div
                          key={criterion.id}
                          className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{criterion.name}</span>
                            <span className="font-mono text-blue-600">
                              {scoreLabel(criterion, score)}
                            </span>
                          </div>
                          {note && (
                            <p className="mt-1 rounded bg-amber-50/80 px-2 py-1 text-slate-600">
                              💬 {note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {entry.comment && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {t('ข้อเสนอแนะภาพรวม:', 'Overall Feedback:', { compact: true })}{' '}
                      </span>
                      <span className="whitespace-pre-wrap">{entry.comment}</span>
                    </div>
                  )}
                </div>
              ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              {t('ยังไม่มีกรรมการส่งผลคะแนนของทีมนี้', 'No submitted evaluations for this team yet')}
            </p>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setDetailTeam(null)}>
              {t('ปิดหน้าต่าง', 'Close', { compact: true })}
            </Button>
          </div>
        </div>
      </CriteriaModal>
    </div>
  );
}