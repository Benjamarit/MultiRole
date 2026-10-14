import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Award, Crown, Download, FileSpreadsheet, Medal, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { getProjectById, isJudgeAssignedToTeam } from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluationsByProject } from '../data/EvaluationStore';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getGroupForTeam } from '../data/GroupStore';
import { getRegisteredUsers } from '../context/authStore';
import { normalizedScore } from '../data/Scoring';

const EMPTY_ASSIGNMENTS = [];

function formatCriterionRawScore(criterion, rawValue) {
  if (rawValue === null || rawValue === undefined) return '';
  if (criterion.type === 'PASS_FAIL') return rawValue === 1 ? 'Pass (1)' : 'Fail (0)';
  if (criterion.type === 'PERCENTAGE') return `${rawValue}%`;
  return String(rawValue);
}

export default function ProjectLeaderboard() {
  const { id } = useParams();
  const { t, tDesc } = useLanguage();

  const project = getProjectById(id);
  const teams = getTeamsByProject(id);
  const criteria = getCriteriaByProject(id);
  const registeredUsers = getRegisteredUsers();
  const assignments = project?.judgeAssignments || EMPTY_ASSIGNMENTS;
  const allProjectEvaluations = getEvaluationsByProject(id);

  // เฉพาะผลประเมินที่ส่งแล้ว (SUBMITTED) และมาจากกรรมการที่ได้รับมอบหมายให้ตรวจทีมนั้น
  const evaluations = allProjectEvaluations.filter(
    (evaluation) =>
      evaluation.status === 'SUBMITTED' &&
      assignments.some(
        (assignment) =>
          String(assignment.email || assignment.id) === String(evaluation.judgeId) &&
          isJudgeAssignedToTeam(id, assignment.id, evaluation.teamId)
      )
  );

  const leaderboard = useMemo(() => {
    const data = teams.map((team) => {
      const teamEvals = evaluations.filter((e) => e.teamId === team.id);
      const expectedEvals = assignments.filter((assignment) =>
        isJudgeAssignedToTeam(id, assignment.id, team.id)
      ).length;

      const totalScore = teamEvals.reduce((sum, e) => sum + e.totalScore, 0);
      const averageScore = teamEvals.length > 0 ? totalScore / teamEvals.length : 0;
      const group = getGroupForTeam(id, team.id);

      // คำนวณคะแนนเฉลี่ยรายเกณฑ์ของทีมนี้ (จากกรรมการที่ส่งผลแล้ว)
      const criteriaAverages = {};
      criteria.forEach((criterion) => {
        const validScores = teamEvals
          .map((e) => e.scores?.[criterion.id])
          .filter((val) => val !== undefined && val !== null);
        criteriaAverages[criterion.id] =
          validScores.length > 0
            ? validScores.reduce((sum, v) => sum + Number(v), 0) / validScores.length
            : null;
      });

      return {
        ...team,
        groupName: group?.name || '-',
        averageScore,
        evaluatedCount: teamEvals.length,
        expectedCount: expectedEvals,
        isComplete: teamEvals.length >= expectedEvals && expectedEvals > 0,
        criteriaAverages,
      };
    });

    return data
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [id, teams, evaluations, assignments, criteria]);

  const topThree = leaderboard.slice(0, 3);
  const podiumOrder = [
    topThree[1] || null, // อันดับ 2 (ซ้าย)
    topThree[0] || null, // อันดับ 1 (กลาง)
    topThree[2] || null, // อันดับ 3 (ขวา)
  ];

  // ดาวน์โหลดแบบที่ 1: สรุปผลจัดอันดับ (Summary CSV)
  const handleExportSummaryCSV = () => {
    if (!leaderboard.length) return;

    const criterionHeaders = criteria.map(
      (c) =>
        `${c.name} (${t('เฉลี่ย', 'Avg')} / ${c.type === 'PASS_FAIL' ? '1' : c.maxScore}, Weight ${c.weight}%)`
    );

    const headers = [
      t('อันดับ', 'Rank'),
      t('ชื่อทีม', 'Team Name'),
      t('กลุ่ม', 'Group'),
      t('ลิงก์ผลงาน', 'Submission Link'),
      t('กรรมการที่ประเมินแล้ว', 'Evaluated Judges'),
      t('กรรมการที่ได้รับมอบหมายทั้งหมด', 'Assigned Judges'),
      ...criterionHeaders,
      t('คะแนนเฉลี่ยรวม (/100)', 'Total Average Score (/100)'),
      t('สถานะการประเมิน', 'Status'),
    ];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = leaderboard.map((item) => {
      const critCols = criteria.map((c) => {
        const avg = item.criteriaAverages[c.id];
        return avg !== null && avg !== undefined ? avg.toFixed(2) : '-';
      });
      return [
        item.rank,
        item.name,
        item.groupName,
        item.link || '-',
        item.evaluatedCount,
        item.expectedCount,
        ...critCols,
        item.averageScore.toFixed(2),
        item.isComplete ? 'Completed' : 'Pending',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsv).join(','),
        ...rows.map((r) => r.map(escapeCsv).join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeProjectName = (project?.name || `project-${id}`).replace(
      /[^a-zA-Z0-9ก-๙_-]/g,
      '_'
    );
    link.download = `leaderboard-summary-${safeProjectName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      t('ดาวน์โหลดไฟล์สรุปอันดับ (CSV) เรียบร้อยแล้ว', 'Summary Leaderboard CSV downloaded')
    );
  };

  // ดาวน์โหลดแบบที่ 2: รายงานผลคะแนนแบบละเอียดรายกรรมการและรายเกณฑ์ (Detailed Breakdown CSV)
  const handleExportDetailedCSV = () => {
    if (!leaderboard.length) return;

    const totalWeight =
      criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0) || 1;
    const userByEmail = new Map(registeredUsers.map((u) => [u.email, u]));

    // สร้างคอลัมน์สำหรับแต่ละเกณฑ์: คะแนนดิบ, คะแนนถ่วงน้ำหนัก, และความคิดเห็นรายเกณฑ์
    const criterionColumns = criteria.flatMap((c) => {
      const maxLabel = c.type === 'PASS_FAIL' ? 'Pass=1/Fail=0' : `เต็ม ${c.maxScore}`;
      return [
        `${c.name} [${t('คะแนนดิบ', 'Raw Score')} (${maxLabel})]`,
        `${c.name} [${t('คะแนนถ่วงน้ำหนัก', 'Weighted')} (${c.weight}%)]`,
        `${c.name} [${t('ความคิดเห็นกรรมการ', 'Criterion Comment')}]`,
      ];
    });

    const headers = [
      t('โครงการ', 'Competition'),
      t('อันดับทีมปัจจุบัน', 'Current Team Rank'),
      t('ชื่อทีม', 'Team Name'),
      t('กลุ่ม', 'Group'),
      t('ลิงก์ผลงาน', 'Submission Link'),
      t('คะแนนเฉลี่ยรวมของทีม (/100)', 'Team Average Score (/100)'),
      t('สัดส่วนกรรมการที่ตรวจแล้ว', 'Team Evaluation Progress'),
      t('ชื่อกรรมการ', 'Judge Name'),
      t('อีเมลกรรมการ', 'Judge Email'),
      t('สถานะการประเมินของกรรมการ', 'Judge Evaluation Status'),
      ...criterionColumns,
      t('คะแนนรวมที่กรรมการให้ (/100)', 'Judge Total Weighted Score (/100)'),
      t('ข้อเสนอแนะภาพรวมจากกรรมการ', 'Overall Feedback / Comment'),
      t('วัน-เวลาที่ส่งผลประเมิน', 'Submitted At'),
      t('วัน-เวลาที่บันทึก/แก้ไขล่าสุด', 'Last Updated At'),
    ];

    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const detailedRows = [];

    leaderboard.forEach((team) => {
      const assignedJudges = assignments.filter((assignment) =>
        isJudgeAssignedToTeam(id, assignment.id, team.id)
      );

      if (assignedJudges.length === 0) {
        // กรณีทีมยังไม่ได้รับการมอบหมายกรรมการเลย แสดงแถวของทีมไว้เพื่อความครบถ้วน
        const emptyCriteriaCols = criteria.flatMap(() => ['-', '-', '-']);
        detailedRows.push([
          project?.name || `Project #${id}`,
          team.rank,
          team.name,
          team.groupName,
          team.link || '-',
          team.averageScore.toFixed(2),
          `${team.evaluatedCount}/${team.expectedCount}`,
          t('ยังไม่ได้มอบหมายกรรมการ', 'Unassigned'),
          '-',
          'UNASSIGNED',
          ...emptyCriteriaCols,
          '-',
          '-',
          '-',
          '-',
        ]);
        return;
      }

      assignedJudges.forEach((assignment) => {
        const judgeEmail = assignment.email || assignment.id;
        const registeredJudge = userByEmail.get(judgeEmail);
        const evalRecord = allProjectEvaluations.find(
          (e) =>
            Number(e.teamId) === Number(team.id) &&
            String(e.judgeId) === String(judgeEmail)
        );

        const judgeName =
          evalRecord?.judgeName ||
          registeredJudge?.name ||
          judgeEmail.split('@')[0];
        const evalStatus = evalRecord?.status || 'NOT_STARTED';

        const perCriterionCells = criteria.flatMap((c) => {
          const rawVal = evalRecord?.scores?.[c.id];
          const hasScore = rawVal !== undefined && rawVal !== null;
          const rawFormatted = hasScore ? formatCriterionRawScore(c, rawVal) : '-';
          const weightedVal = hasScore
            ? (normalizedScore(c, rawVal) * (Number(c.weight) / totalWeight)).toFixed(2)
            : '-';
          const critComment = evalRecord?.criteriaComments?.[c.id] || '-';
          return [rawFormatted, weightedVal, critComment];
        });

        const judgeTotalScore =
          evalRecord && typeof evalRecord.totalScore === 'number'
            ? evalRecord.totalScore.toFixed(2)
            : '-';

        const submittedTime = evalRecord?.submittedAt
          ? new Date(evalRecord.submittedAt).toLocaleString('th-TH')
          : '-';
        const updatedTime = evalRecord?.updatedAt
          ? new Date(evalRecord.updatedAt).toLocaleString('th-TH')
          : '-';

        detailedRows.push([
          project?.name || `Project #${id}`,
          team.rank,
          team.name,
          team.groupName,
          team.link || '-',
          team.averageScore.toFixed(2),
          `${team.evaluatedCount}/${team.expectedCount}`,
          judgeName,
          judgeEmail,
          evalStatus,
          ...perCriterionCells,
          judgeTotalScore,
          evalRecord?.comment || '-',
          submittedTime,
          updatedTime,
        ]);
      });
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsv).join(','),
        ...detailedRows.map((r) => r.map(escapeCsv).join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeProjectName = (project?.name || `project-${id}`).replace(
      /[^a-zA-Z0-9ก-๙_-]/g,
      '_'
    );
    link.download = `leaderboard-detailed-scores-${safeProjectName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      t(
        'ดาวน์โหลดผลคะแนนแบบละเอียดรายกรรมการและเกณฑ์ (CSV) เรียบร้อยแล้ว',
        'Detailed Judge & Criteria Scores CSV downloaded'
      )
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard')}
      </BackButton>

      <PageHeader
        title={t('สรุปผลคะแนนจัดอันดับ', 'Competition Leaderboard')}
        description={tDesc(
          `ตารางอันดับทีมผู้เข้าแข่งขันคำนวณจากค่าเฉลี่ยถ่วงน้ำหนักของกรรมการที่ส่งผลแล้ว — ${project?.name || ''}`,
          `Official team rankings based on average weighted scores from submitted judges — ${project?.name || ''}`
        )}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportSummaryCSV}
              disabled={leaderboard.length === 0}
            >
              <Download className="h-4 w-4" />
              {t('ดาวน์โหลดสรุปอันดับ (CSV)', 'Export Summary (CSV)')}
            </Button>
            <Button
              variant="primary"
              onClick={handleExportDetailedCSV}
              disabled={leaderboard.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t(
                'ดาวน์โหลดคะแนนแบบละเอียดรายเกณฑ์ (CSV)',
                'Export Detailed Scores (CSV)'
              )}
            </Button>
          </div>
        }
      />

      {/* แท่นรางวัล Podium สำหรับทีมอันดับ 1–3 */}
      {topThree.length > 0 && (
        <section aria-label="Top 3 Podium" className="pt-2">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            {podiumOrder.map((team, idx) => {
              if (!team) {
                return <div key={`empty-${idx}`} className="hidden md:block" />;
              }

              const isFirst = team.rank === 1;
              const isSecond = team.rank === 2;

              const cardStyle = isFirst
                ? 'border-amber-300 bg-gradient-to-b from-amber-50/90 via-white to-white ring-2 ring-amber-200/70 md:-translate-y-2'
                : isSecond
                  ? 'border-slate-300 bg-gradient-to-b from-slate-100/80 via-white to-white'
                  : 'border-orange-200 bg-gradient-to-b from-orange-50/70 via-white to-white';

              const badgeBg = isFirst
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md'
                : isSecond
                  ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
                  : 'bg-gradient-to-br from-orange-400 to-amber-700 text-white';

              const RankIcon = isFirst ? Crown : isSecond ? Medal : Award;

              return (
                <Card key={team.id} className={`relative text-center ${cardStyle}`}>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
                    <span
                      className={`flex h-13 w-13 items-center justify-center rounded-2xl ${badgeBg}`}
                    >
                      <RankIcon className="h-7 w-7" />
                    </span>
                  </div>

                  <span
                    className={`inline-block rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                      isFirst
                        ? 'bg-amber-100 text-amber-800'
                        : isSecond
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {isFirst
                      ? t('อันดับ 1', '1st Place')
                      : isSecond
                        ? t('อันดับ 2', '2nd Place')
                        : t('อันดับ 3', '3rd Place')}
                  </span>

                  <h3 className="mt-2 truncate text-xl font-bold text-slate-900">
                    {team.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('กลุ่ม:', 'Group:')} {team.groupName}
                  </p>

                  <div className="my-4 rounded-xl border border-slate-100 bg-slate-50/80 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {t('คะแนนเฉลี่ย', 'Average Score')}
                    </p>
                    <p
                      className={`font-mono text-3xl font-extrabold ${
                        isFirst ? 'text-amber-600' : 'text-blue-700'
                      }`}
                    >
                      {team.averageScore.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {t('กรรมการตรวจแล้ว:', 'Judges:')}{' '}
                      <strong className="text-slate-700">
                        {team.evaluatedCount}/{team.expectedCount}
                      </strong>
                    </span>
                    {team.isComplete ? (
                      <Badge variant="success">{t('ครบถ้วน', 'Complete')}</Badge>
                    ) : (
                      <Badge variant="warning">{t('รอผลประเมิน', 'Pending')}</Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ตารางอันดับทั้งหมด */}
      <Card noPadding>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              {t('ตารางอันดับคะแนนทั้งหมด', 'Full Ranking Table')}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {t(`ทั้งหมด ${leaderboard.length} ทีม`, `Total ${leaderboard.length} teams`)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-20 px-6 py-3.5 text-center">{t('อันดับ', 'Rank')}</th>
                <th className="px-6 py-3.5">{t('ชื่อทีม', 'Team Name')}</th>
                <th className="px-6 py-3.5">{t('กลุ่ม', 'Group')}</th>
                <th className="px-6 py-3.5 text-center">
                  {t('กรรมการที่ประเมินแล้ว', 'Judges Evaluated')}
                </th>
                <th className="w-1/4 px-6 py-3.5">
                  {t('สัดส่วนคะแนน (/100)', 'Score Distribution')}
                </th>
                <th className="px-6 py-3.5 text-center">
                  {t('คะแนนเฉลี่ย', 'Average')}
                </th>
                <th className="px-6 py-3.5">{t('สถานะ', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.length > 0 ? (
                leaderboard.map((team) => (
                  <tr
                    key={team.id}
                    className="text-sm transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                          team.rank === 1
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                            : team.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : team.rank === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{team.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{team.groupName}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                      {team.evaluatedCount} / {team.expectedCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            team.rank === 1
                              ? 'bg-amber-500'
                              : team.rank <= 3
                                ? 'bg-blue-600'
                                : 'bg-slate-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, team.averageScore))}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-lg font-extrabold text-blue-700">
                      {team.averageScore.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {team.isComplete ? (
                        <Badge variant="success">{t('คะแนนครบถ้วน', 'Complete')}</Badge>
                      ) : (
                        <Badge variant="warning">{t('รอผลประเมิน', 'Pending')}</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-slate-500">
                    {t(
                      'ยังไม่มีข้อมูลทีมหรือยังไม่มีการส่งผลคะแนนในโครงการนี้',
                      'No teams or submitted evaluations available yet'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}