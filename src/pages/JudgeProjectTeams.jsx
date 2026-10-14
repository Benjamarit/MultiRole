import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, LayoutGrid, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import {
  getAssignedTeamIds,
  getJudgeAssignments,
  getProjectById,
  isBeforeEvaluationDeadline,
  isProjectReadyForEvaluation,
} from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation } from '../data/EvaluationStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function JudgeProjectTeams() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();

  const project = getProjectById(projectId);
  const canEvaluate = isProjectReadyForEvaluation(projectId);
  const allTeams = getTeamsByProject(projectId);

  const assignments = getJudgeAssignments(projectId);
  const myAssignment = assignments.find((a) => (a.email || a.id) === user?.email);
  const assignedTeamIds = myAssignment ? getAssignedTeamIds(projectId, myAssignment.id) : [];

  const teams = allTeams
    .filter((team) => assignedTeamIds.includes(Number(team.id)))
    .map((team) => {
      const evaluation = getEvaluation(projectId, team.id, user?.email);
      return {
        ...team,
        evaluateStatus: evaluation?.status || 'NOT_STARTED',
        totalScore: evaluation?.totalScore ?? null,
      };
    });

  const submittedCount = teams.filter((tItem) => tItem.evaluateStatus === 'SUBMITTED').length;
  const progressPercent = teams.length > 0 ? Math.round((submittedCount / teams.length) * 100) : 0;

  const getStatusBadge = (status) =>
    status === 'SUBMITTED' ? (
      <Badge variant="success">{t('ส่งคะแนนแล้ว', 'Submitted', { compact: true })}</Badge>
    ) : status === 'DRAFT' ? (
      <Badge variant="warning">{t('ร่าง (รอส่ง)', 'Draft', { compact: true })}</Badge>
    ) : (
      <Badge variant="default">{t('ยังไม่เริ่ม', 'Not Started', { compact: true })}</Badge>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to="/workspace">
        {t('กลับไปหน้า Workspace', 'Back to Workspace', { compact: true })}
      </BackButton>

      <PageHeader
        title={project ? project.name : `โครงการ #${projectId}`}
        subtitle={t('พื้นที่การประเมินสำหรับกรรมการ', 'Judge Evaluation Portal', { compact: true })}
        description={tDesc(
          'เลือกทีมที่ได้รับมอบหมายเพื่อประเมินรายทีม หรือเข้าโหมดตารางเปรียบเทียบ (Matrix) เพื่อประเมินหลายทีมพร้อมกัน',
          'Select an assigned team for individual evaluation or switch to Matrix mode to compare and score multiple teams side by side.'
        )}
        action={
          canEvaluate &&
          teams.length > 1 && (
            <Button onClick={() => navigate(`/judge/project/${projectId}/evaluate-multi`)}>
              <LayoutGrid className="h-4 w-4" />
              {t('โหมดประเมินเปรียบเทียบ', 'Matrix Comparison Mode', {
                compact: true,
              })}
            </Button>
          )
        }
      />

      {canEvaluate && teams.length > 0 && (
        <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {t('ความคืบหน้าการประเมินของคุณ', 'Your Evaluation Progress')}
                </p>
                <p className="text-xs text-slate-600">
                  {t(
                    `ส่งผลประเมินแล้ว ${submittedCount} จาก ${teams.length} ทีมที่ได้รับมอบหมาย`,
                    `Submitted ${submittedCount} of ${teams.length} assigned teams`
                  )}
                </p>
              </div>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                <span>{progressPercent}%</span>
                <span>
                  {submittedCount}/{teams.length}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {!canEvaluate && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            {t(
              'ยังไม่สามารถเริ่มประเมินได้ โครงการต้องเปิดรับคะแนน (Active) และมี Weight รวมครบ 100%',
              'Evaluation is not yet open. The competition must be Active and have criteria weights totaling 100%.'
            )}
          </p>
        </Card>
      )}

      {project?.evaluationDeadline && !isBeforeEvaluationDeadline(project) && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">
            {t(
              'หมดเขตการประเมินแล้ว สามารถดูคะแนนเดิมได้แต่ไม่สามารถแก้ไขหรือส่งคะแนนเพิ่ม',
              'The evaluation deadline has passed. You may view existing scores in read-only mode.'
            )}
          </p>
        </Card>
      )}

      {!canEvaluate ? null : teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="flex h-full flex-col justify-between hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                  {getStatusBadge(team.evaluateStatus)}
                </div>

                {team.totalScore !== null && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('คะแนนที่ให้:', 'Your Score:', { compact: true })}{' '}
                    <span className="font-mono font-bold">
                      {Number(team.totalScore).toFixed(1)}
                    </span>
                  </div>
                )}

                {team.description ? (
                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">
                    {team.description}
                  </p>
                ) : (
                  <p className="mb-3 text-sm italic text-slate-400">
                    {t('ไม่มีคำอธิบายผลงาน', 'No description provided')}
                  </p>
                )}

                {team.link ? (
                  <a
                    href={team.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-flex items-center gap-1 break-all text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {t('เปิดดูผลงาน', 'View Submission', { compact: true })}
                  </a>
                ) : (
                  <p className="mb-2 text-xs text-slate-400">
                    {t('ทีมนี้ยังไม่ได้แนบลิงก์ผลงาน', 'No submission link attached')}
                  </p>
                )}
              </div>

              <Button
                variant={team.evaluateStatus === 'SUBMITTED' ? 'secondary' : 'primary'}
                className="mt-4 w-full"
                onClick={() =>
                  navigate(`/judge/project/${projectId}/evaluate/${team.id}`)
                }
              >
                {team.evaluateStatus === 'SUBMITTED'
                  ? t('ดู / แก้ไขคะแนน', 'View / Edit Score', { compact: true })
                  : team.evaluateStatus === 'DRAFT'
                    ? t('ทำต่อจากแบบร่าง', 'Continue Draft', { compact: true })
                    : t('เริ่มการประเมิน', 'Start Evaluation', { compact: true })}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-50/60">
          <p className="py-6 text-center text-sm text-slate-500">
            {allTeams.length === 0
              ? t(
                  'โครงการนี้ยังไม่มีทีมผู้เข้าแข่งขัน',
                  'No teams have been added to this competition yet'
                )
              : t(
                  'ยังไม่มีทีมที่ได้รับมอบหมายให้คุณประเมิน',
                  'No teams have been assigned to you yet'
                )}
          </p>
        </Card>
      )}
    </div>
  );
}