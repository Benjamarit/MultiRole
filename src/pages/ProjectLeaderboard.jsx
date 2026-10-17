import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Award,
  Crown,
  Download,
  FileSpreadsheet,
  Medal,
  Sparkles,
  Trophy,
} from 'lucide-react';
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

  // จัดเรียงลำดับแท่นโพเดียม: ซ้าย = อันดับ 2, กลาง = อันดับ 1 (สูงสุด), ขวา = อันดับ 3
  const podiumSlots = [
    {
      targetRank: 2,
      team: leaderboard[1] || null,
      label: t('รองชนะเลิศอันดับ 1', '1st Runner-Up'),
      subLabel: '2nd Place',
      icon: Medal,
      pedestalHeight: 'h-32 sm:h-40',
      pedestalBg:
        'bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-t-4 border-slate-200 text-white',
      cardRing: 'border-slate-300 bg-white/95 shadow-md',
      iconBadge:
        'bg-gradient-to-br from-slate-400 to-slate-600 text-white ring-4 ring-slate-100',
      scoreColor: 'text-slate-800',
      rankBadge: 'bg-slate-200 text-slate-800',
      orderClass: 'order-2 sm:order-1',
    },
    {
      targetRank: 1,
      team: leaderboard[0] || null,
      label: t('ชนะเลิศอันดับ 1', 'Champion'),
      subLabel: '1st Place',
      icon: Crown,
      pedestalHeight: 'h-44 sm:h-56',
      pedestalBg:
        'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-t-4 border-yellow-200 text-white shadow-lg',
      cardRing:
        'border-amber-300 bg-gradient-to-b from-amber-50/90 to-white ring-2 ring-amber-300/70 shadow-xl',
      iconBadge:
        'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-4 ring-amber-100 shadow-md',
      scoreColor: 'text-amber-600',
      rankBadge: 'bg-amber-100 text-amber-900',
      orderClass: 'order-1 sm:order-2',
    },
    {
      targetRank: 3,
      team: leaderboard[2] || null,
      label: t('รองชนะเลิศอันดับ 2', '2nd Runner-Up'),
      subLabel: '3rd Place',
      icon: Award,
      pedestalHeight: 'h-24 sm:h-32',
      pedestalBg:
        'bg-gradient-to-b from-amber-600 via-orange-700 to-amber-800 border-t-4 border-orange-300 text-white',
      cardRing: 'border-orange-200 bg-white/95 shadow-md',
      iconBadge:
        'bg-gradient-to-br from-orange-400 to-amber-700 text-white ring-4 ring-orange-100',
      scoreColor: 'text-orange-700',
      rankBadge: 'bg-orange-100 text-orange-900',
      orderClass: 'order-3 sm:order-3',
    },
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
    <div className="mx-auto max-w-7xl space-y-8 p-6">
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

      {/* โพเดียมแท่นรางวัล 3 ระดับ (Stepped Podium Showcase) */}
      {leaderboard.length > 0 && (
        <section
          aria-label="Top 3 Stepped Podium"
          className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 px-4 pt-8 pb-0 text-white shadow-xl sm:px-10 sm:pt-10"
        >
          {/* แสงตกแต่งพื้นหลังโพเดียม */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-3/4 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-48 w-48 rounded-full bg-blue-500/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-2xl" />

          <div className="relative z-10 mb-8 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('แท่นเกียรติยศผู้นำคะแนนสูงสุด', 'Top Performers Podium')}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {project?.name || t('สรุปอันดับผู้ชนะการแข่งขัน', 'Winners Podium')}
            </h2>
          </div>

          {/* โครงสร้างแท่นโพเดียม 3 คอลัมน์ (2 - 1 - 3) */}
          <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-1 items-end gap-4 sm:grid-cols-3 sm:gap-5">
            {podiumSlots.map((slot) => {
              const Icon = slot.icon;
              const team = slot.team;
              const isFirst = slot.targetRank === 1;

              return (
                <div
                  key={slot.targetRank}
                  className={`flex flex-col items-center ${slot.orderClass}`}
                >
                  {/* การ์ดข้อมูลทีมเหนือแท่น */}
                  <div
                    className={`mb-3 w-full rounded-2xl border p-4 text-center text-slate-900 transition-transform duration-200 hover:-translate-y-1 ${slot.cardRing}`}
                  >
                    <div className="-mt-9 mb-2 flex justify-center">
                      <span
                        className={`flex items-center justify-center rounded-2xl ${
                          isFirst ? 'h-14 w-14' : 'h-12 w-12'
                        } ${slot.iconBadge}`}
                      >
                        <Icon className={isFirst ? 'h-7 w-7' : 'h-6 w-6'} />
                      </span>
                    </div>

                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${slot.rankBadge}`}
                    >
                      {slot.label}
                    </span>

                    {team ? (
                      <>
                        <h3
                          className={`mt-2 truncate font-extrabold text-slate-900 ${
                            isFirst ? 'text-xl' : 'text-base'
                          }`}
                          title={team.name}
                        >
                          {team.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {t('กลุ่ม:', 'Group:')} {team.groupName}
                        </p>

                        <div className="my-3 rounded-xl border border-slate-100 bg-slate-50/90 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {t('คะแนนเฉลี่ย', 'Average Score')}
                          </p>
                          <p
                            className={`font-mono font-extrabold ${
                              isFirst ? 'text-3xl' : 'text-2xl'
                            } ${slot.scoreColor}`}
                          >
                            {team.averageScore.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {t('ตรวจแล้ว:', 'Judges:')}{' '}
                            <strong className="text-slate-700">
                              {team.evaluatedCount}/{team.expectedCount}
                            </strong>
                          </span>
                          {team.isComplete ? (
                            <Badge variant="success">
                              {t('ครบถ้วน', 'Complete')}
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              {t('รอผล', 'Pending')}
                            </Badge>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-xs text-slate-400">
                        {t('ยังไม่มีทีมในอันดับนี้', 'No team in this slot yet')}
                      </div>
                    )}
                  </div>

                  {/* แท่นยืนโพเดียม (Stepped Pedestal Block) */}
                  <div
                    className={`flex w-full flex-col items-center justify-between rounded-t-2xl px-4 py-4 ${slot.pedestalHeight} ${slot.pedestalBg}`}
                  >
                    <div className="text-center">
                      <span className="block font-mono text-4xl font-black leading-none drop-shadow-xs sm:text-5xl">
                        {slot.targetRank}
                      </span>
                      <span className="mt-1 block text-[11px] font-bold uppercase tracking-widest opacity-90">
                        {slot.subLabel}
                      </span>
                    </div>
                    {team && (
                      <div className="w-full truncate rounded-lg bg-black/15 px-2.5 py-1 text-center text-xs font-semibold backdrop-blur-2xs">
                        {team.name}
                      </div>
                    )}
                  </div>
                </div>
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