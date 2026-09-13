import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getProjectById } from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluationsByProject } from '../data/EvaluationStore';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getRegisteredUsers } from '../context/authStore';

function formatTime(date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [notifiedJudgeIds, setNotifiedJudgeIds] = useState([]);
  const [detailTeam, setDetailTeam] = useState(null);
  const project = getProjectById(id);
  const registeredUsers = getRegisteredUsers();
  const teams = getTeamsByProject(id);
  const criteria = getCriteriaByProject(id);
  const evaluations = getEvaluationsByProject(id).filter((evaluation) => evaluation.status === 'SUBMITTED');
  const assignments = project?.judgeAssignments || [];
  const totalJudges = assignments.length || project?.judgeEmails?.length || 0;
  const judgeProgress = assignments.map((assignment) => {
    const judge = registeredUsers.find(
      (user) => user.email === (assignment.email || assignment.id)
    );
    const eligibleTeams = teams.filter((team) => !(assignment.coiTeamIds || []).includes(team.id));
    const completed = evaluations.filter(
      (evaluation) => evaluation.judgeId === String(judge?.email || assignment.id)
    ).length;
    return {
      id: assignment.id,
      name: judge?.name || `กรรมการ ${assignment.email || assignment.id}`,
      assigned: eligibleTeams.length,
      completed,
      status: completed === 0 ? 'Not Started' : completed >= eligibleTeams.length ? 'Completed' : 'In Progress',
    };
  });
  const teamProgress = teams.map((team) => {
    const teamEvaluations = evaluations.filter((evaluation) => evaluation.teamId === team.id);
    const eligibleJudgeCount = assignments.filter(
      (assignment) => !(assignment.coiTeamIds || []).includes(team.id)
    ).length || totalJudges; // fallback เผื่อโปรเจกต์เก่าไม่มี judgeAssignments แบบละเอียด
    const currentScore = teamEvaluations.length
      ? teamEvaluations.reduce((sum, evaluation) => sum + evaluation.totalScore, 0) / teamEvaluations.length
      : 0;
    return {
      ...team,
      evaluatedBy: teamEvaluations.length,
      totalJudges: eligibleJudgeCount,
      currentScore,
      status: teamEvaluations.length > 0 && teamEvaluations.length >= eligibleJudgeCount ? 'Completed' : 'Pending',
    };
  });
  const totalAssignments = teamProgress.reduce((sum, team) => sum + team.totalJudges, 0);
  const completedAssignments = evaluations.length;
  const completionPercent = totalAssignments ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
  const completedJudges = judgeProgress.filter((judge) => judge.status === 'Completed').length;
  const completedTeams = teamProgress.filter((team) => team.status === 'Completed').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return <Badge variant="success">เสร็จสิ้น</Badge>;
      case 'In Progress': return <Badge variant="warning">กำลังดำเนินการ</Badge>;
      case 'Not Started': return <Badge variant="error">ยังไม่เริ่ม</Badge>;
      case 'Pending': return <Badge variant="warning">รอผลประเมิน</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  // TODO: ตอนต่อ API จริง ให้ยิง GET ใหม่แทนการหน่วงเวลาจำลองนี้
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // TODO: ตอนต่อ API จริง ให้ยิง POST /notifications แทนการเก็บ state ฝั่ง client เฉยๆ
  const handleNotify = (judgeId) => {
    setNotifiedJudgeIds((prev) => [...prev, judgeId]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to={`/project/${id}/dashboard`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader
        title="ติดตามการประเมิน (Monitoring)"
        description="ตรวจสอบความคืบหน้าการให้คะแนนของกรรมการและสถานะของแต่ละทีม"
        action={
          <div className="text-right">
            <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}
            </Button>
            <p className="text-xs text-gray-400 mt-1">อัปเดตล่าสุด {formatTime(lastUpdated)}</p>
          </div>
        }
      />

      {/* สรุปภาพรวม (Overview Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-500 mb-1">ความคืบหน้ารวม</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-blue-600">{completionPercent}%</h3>
            <p className="text-sm text-gray-600 mb-1">({completedAssignments}/{totalAssignments} รายการ)</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completionPercent}%` }}></div>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 mb-1">กรรมการที่ประเมินเสร็จแล้ว</p>
            <h3 className="text-3xl font-bold text-green-600">{completedJudges} <span className="text-lg text-gray-500 font-normal">/ {totalJudges} คน</span></h3>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 mb-1">ทีมที่ได้รับคะแนนครบแล้ว</p>
            <h3 className="text-3xl font-bold text-purple-600">{completedTeams} <span className="text-lg text-gray-500 font-normal">/ {teams.length} ทีม</span></h3>
        </Card>
      </div>

      {/* ตารางความคืบหน้าของกรรมการ */}
      <Card noPadding>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">สถานะกรรมการ (Judge Progress)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-medium">ชื่อกรรมการ</th>
                <th className="px-6 py-3 font-medium text-center">ประเมินแล้ว (ทีม)</th>
                <th className="px-6 py-3 font-medium w-1/3">ความคืบหน้า</th>
                <th className="px-6 py-3 font-medium">สถานะ</th>
                <th className="px-6 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {judgeProgress.map((judge) => {
                const percent = Math.round((judge.completed / judge.assigned) * 100);
                const alreadyNotified = notifiedJudgeIds.includes(judge.id);
                return (
                  <tr key={judge.id} className="hover:bg-gray-50 text-sm">
                    <td className="px-6 py-4 font-medium text-gray-900">{judge.name}</td>
                    <td className="px-6 py-4 text-center">{judge.completed} / {judge.assigned}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-8">{percent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(judge.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="text"
                        size="sm"
                        disabled={percent === 100 || alreadyNotified}
                        onClick={() => handleNotify(judge.id)}
                      >
                        {alreadyNotified ? 'ส่งแล้ว' : 'แจ้งเตือน'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ตารางความคืบหน้าของทีม */}
      <Card noPadding>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">สถานะทีม (Team Progress)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-medium">ชื่อทีม</th>
                <th className="px-6 py-3 font-medium text-center">กรรมการที่ตรวจแล้ว</th>
                <th className="px-6 py-3 font-medium text-center">คะแนนรวมชั่วคราว</th>
                <th className="px-6 py-3 font-medium">สถานะ</th>
                <th className="px-6 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teamProgress.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-6 py-4 font-medium text-gray-900">{team.name}</td>
                  <td className="px-6 py-4 text-center">{team.evaluatedBy} / {team.totalJudges}</td>
                  <td className="px-6 py-4 text-center font-mono text-gray-600">
                    {team.evaluatedBy > 0 ? team.currentScore.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(team.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="text" size="sm" onClick={() => setDetailTeam(team)}>
                      ดูรายละเอียด
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal แสดงคะแนนย่อยรายกรรมการของทีมที่เลือก */}
      {detailTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-detail-title"
          onKeyDown={(e) => e.key === 'Escape' && setDetailTeam(null)}
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <h2 id="team-detail-title" className="text-lg font-semibold text-gray-900">
              คะแนนย่อย — {detailTeam.name}
            </h2>
            <div className="mt-4 space-y-3">
              {evaluations.filter((evaluation) => evaluation.teamId === detailTeam.id).length > 0 ? (
                evaluations.filter((evaluation) => evaluation.teamId === detailTeam.id).map((entry) => (
                  <div
                    key={entry.judgeName}
                    className="rounded-md border border-gray-200 px-4 py-3 text-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{entry.judgeName}</span>
                      <span className="font-mono font-semibold text-blue-600">{entry.totalScore.toFixed(2)}</span>
                    </div>
                    {entry.comment && (
                      <p className="text-gray-600 text-xs whitespace-pre-wrap bg-gray-50 rounded px-2 py-1.5">
                        {entry.comment}
                      </p>
                    )}
                    {entry.criteriaComments &&
                      Object.entries(entry.criteriaComments).some(([, text]) => text) && (
                        <div className="mt-1.5 space-y-1">
                          {criteria.map((criterion) => {
                            const text = entry.criteriaComments[criterion.id];
                            if (!text) return null;
                            const score = entry.scores?.[criterion.id];
                            return (
                              <p
                                key={criterion.id}
                                className="text-xs text-gray-600 bg-amber-50 rounded px-2 py-1.5"
                              >
                                <span className="font-medium text-gray-700">
                                  {criterion.name} ({scoreLabel(criterion, score)}):{' '}
                                </span>
                                {text}
                              </p>
                            );
                          })}
                        </div>
                      )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">ยังไม่มีกรรมการให้คะแนนทีมนี้</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="text" onClick={() => setDetailTeam(null)}>
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}