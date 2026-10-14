import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import CriterionScoreInput from '../components/CriteriaScoreInput';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation, saveEvaluation } from '../data/EvaluationStore';
import {
  getProjectById,
  isBeforeEvaluationDeadline,
  isJudgeAssignedToTeam,
  isProjectReadyForEvaluation,
} from '../data/ProjectStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateWeightedScore } from '../data/Scoring';

function scoreLabel(criterion, value) {
  if (value === null || value === undefined) return null;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 'Pass' : 'Fail';
  if (criterion.type === 'STAR') return `${value} / ${criterion.maxScore} ดาว`;
  if (criterion.type === 'PERCENTAGE') return `${value}%`;
  return `${value} / ${criterion.maxScore}`;
}

export default function JudgeEvaluation() {
  const { projectId, teamId } = useParams();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const criteria = getCriteriaByProject(projectId);
  const project = getProjectById(projectId);
  const team = getTeamsByProject(projectId).find((item) => item.id === Number(teamId));
  const judgeId = user?.email || 'anonymous-judge';
  const savedEvaluation = getEvaluation(projectId, teamId, judgeId);
  const isAssigned = isJudgeAssignedToTeam(projectId, judgeId, teamId);

  const teamName = team?.name || `ทีม #${teamId}`;

  const [scores, setScores] = useState(() => savedEvaluation?.scores || {});
  const [criteriaComments, setCriteriaComments] = useState(
    () => savedEvaluation?.criteriaComments || {}
  );
  const [comment, setComment] = useState(() => savedEvaluation?.comment || '');
  const [evaluationStatus, setEvaluationStatus] = useState(
    () => savedEvaluation?.status || 'DRAFT'
  );
  const [submittedAt, setSubmittedAt] = useState(() => savedEvaluation?.submittedAt || null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    () => savedEvaluation?.updatedAt || null
  );
  const canEdit = isAssigned && isBeforeEvaluationDeadline(project);
  const canEvaluate = isProjectReadyForEvaluation(projectId);

  const answeredCount = useMemo(
    () =>
      criteria.filter((c) => scores[c.id] !== undefined && scores[c.id] !== null).length,
    [criteria, scores]
  );

  const allAnswered = useMemo(
    () =>
      criteria.length > 0 &&
      criteria.every((c) => scores[c.id] !== undefined && scores[c.id] !== null),
    [criteria, scores]
  );

  const estimatedTotal = useMemo(() => {
    return calculateWeightedScore(criteria, scores).toFixed(1);
  }, [criteria, scores]);

  const handleScoreChange = (criterionId, value) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) return;
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleCriterionCommentChange = (criterionId, value) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) return;
    setCriteriaComments((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleSaveDraft = () => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) return;
    try {
      const saved = saveEvaluation({
        projectId,
        teamId,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores,
        criteriaComments,
        comment,
        totalScore: Number(estimatedTotal),
        status: 'DRAFT',
      });
      if (!saved) {
        toast.error(
          t('หมดเขตการประเมินแล้ว ไม่สามารถบันทึกได้', 'Evaluation deadline has passed')
        );
        return;
      }
      setEvaluationStatus(saved.status);
      setSubmittedAt(saved.submittedAt);
      setLastUpdatedAt(saved.updatedAt);
      toast.success(t('บันทึกแบบร่างเรียบร้อยแล้ว', 'Draft saved successfully'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmitClick = () => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId)) || !allAnswered) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) return;
    try {
      const saved = saveEvaluation({
        projectId,
        teamId,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores,
        criteriaComments,
        comment,
        totalScore: Number(estimatedTotal),
        status: 'SUBMITTED',
      });
      if (!saved) {
        setIsConfirmOpen(false);
        toast.error(
          t('หมดเขตการประเมินแล้ว ไม่สามารถส่งคะแนนได้', 'Evaluation deadline has passed')
        );
        return;
      }
      setEvaluationStatus(saved.status);
      setSubmittedAt(saved.submittedAt);
      setLastUpdatedAt(saved.updatedAt);
      setIsConfirmOpen(false);
      toast.success(t('ส่งคะแนนเรียบร้อยแล้ว', 'Evaluation submitted successfully'));
    } catch (error) {
      setIsConfirmOpen(false);
      toast.error(error.message);
    }
  };

  if (!team || !isAssigned) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <BackButton to={`/judge/project/${projectId}/teams`}>
          {t('กลับไปหน้ารายชื่อทีม', 'Back to Assigned Teams', { compact: true })}
        </BackButton>
        <Card>
          <p className="text-center text-slate-600">
            {t('ทีมนี้ไม่ได้รับมอบหมายให้คุณประเมิน', 'You are not assigned to evaluate this team')}
          </p>
        </Card>
      </div>
    );
  }

  if (!canEvaluate) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <BackButton to={`/judge/project/${projectId}/teams`}>
          {t('กลับไปหน้ารายชื่อทีม', 'Back to Assigned Teams', { compact: true })}
        </BackButton>
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-700">
            {t(
              'ยังไม่สามารถประเมินได้ โครงการต้องเปิดรับคะแนนและมี Weight รวมครบ 100%',
              'Evaluation is not ready yet. The project must be Active with 100% total criteria weight.'
            )}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-28">
      <BackButton to={`/judge/project/${projectId}/teams`}>
        {t('กลับไปหน้ารายชื่อทีมที่ต้องประเมิน', 'Back to Assigned Teams', { compact: true })}
      </BackButton>

      <PageHeader
        title={`${t('ประเมินทีม:', 'Evaluate:', { compact: true })} ${teamName}`}
        description={tDesc(
          `${project?.name || `โครงการ #${projectId}`} — ให้คะแนนและข้อเสนอแนะตามเกณฑ์ด้านล่าง`,
          `${project?.name || `Competition #${projectId}`} — Score each criterion and provide feedback below.`
        )}
        badge={
          evaluationStatus === 'SUBMITTED' ? (
            <Badge variant="success">
              {t('ส่งคะแนนแล้ว', 'Submitted', { compact: true })}
            </Badge>
          ) : (
            <Badge variant="warning">{t('ร่าง', 'Draft')}</Badge>
          )
        }
      />

      {(team?.description || team?.link) && (
        <Card className="bg-slate-50/70">
          {team.description && (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {team.description}
            </p>
          )}
          {team.link && (
            <a
              href={team.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 break-all text-xs font-semibold text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {t('เปิดดูผลงานของทีมนี้', 'Open Team Submission', { compact: true })}
            </a>
          )}
        </Card>
      )}

      {/* การ์ดรายการเกณฑ์ประเมินแต่ละข้อ */}
      <div className="space-y-4">
        {criteria.map((criterion, idx) => {
          const currentVal = scores[criterion.id];
          const isScored = currentVal !== undefined && currentVal !== null;
          return (
            <Card
              key={criterion.id}
              className={
                isScored ? 'border-blue-200/90' : 'border-slate-200'
              }
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {idx + 1}
                    </span>
                    <p className="font-bold text-slate-900">{criterion.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {criterion.type} · Weight {criterion.weight}%
                    {criterion.type !== 'PASS_FAIL' &&
                      criterion.type !== 'PERCENTAGE' &&
                      ` · ${t('เต็ม', 'Max', { compact: true })} ${criterion.maxScore}`}
                  </p>
                </div>
                {scoreLabel(criterion, currentVal) ? (
                  <Badge variant="info">{scoreLabel(criterion, currentVal)}</Badge>
                ) : (
                  <Badge variant="default">
                    {t('รอให้คะแนน', 'Unscored', { compact: true })}
                  </Badge>
                )}
              </div>

              {criterion.description && (
                <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5">
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('คำอธิบายเกณฑ์', 'Criterion Guide', { compact: true })}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {criterion.description}
                  </p>
                </div>
              )}

              <CriterionScoreInput
                criterion={criterion}
                value={currentVal ?? null}
                onChange={(value) => handleScoreChange(criterion.id, value)}
                disabled={!canEdit}
              />

              <div className="mt-4 border-t border-slate-100 pt-3">
                <label
                  htmlFor={`criterion-comment-${criterion.id}`}
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  {t(
                    'ความคิดเห็นสำหรับเกณฑ์นี้ (ไม่บังคับ)',
                    'Comment for this criterion (Optional)'
                  )}
                </label>
                <textarea
                  id={`criterion-comment-${criterion.id}`}
                  rows={2}
                  disabled={!canEdit}
                  value={criteriaComments[criterion.id] || ''}
                  onChange={(e) =>
                    handleCriterionCommentChange(criterion.id, e.target.value)
                  }
                  placeholder={t(
                    `ระบุเหตุผลหรือข้อสังเกตของหัวข้อ ${criterion.name}...`,
                    `Notes or rationale for ${criterion.name}...`
                  )}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </Card>
          );
        })}

        <Card>
          <label
            htmlFor="evaluation-comment"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            {t(
              'ข้อเสนอแนะภาพรวมถึงทีม',
              'Overall Feedback (Optional)'
            )}
          </label>
          <textarea
            id="evaluation-comment"
            rows={4}
            disabled={!canEdit}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t(
              'แสดงความคิดเห็นจุดเด่นหรือข้อควรพัฒนาเพิ่มเติมสำหรับทีมนี้...',
              'Share overall strengths, suggestions, or constructive feedback...'
            )}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </Card>
      </div>

      {/* แถบสรุปคะแนนรวมและปุ่มส่งงานแบบลอยตามหน้าจอ (Sticky Floating Bar) */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-md">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-13 min-w-20 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 px-3 py-1.5 text-white shadow-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                {t('คะแนนรวม', 'Total', { compact: true })}
              </span>
              <span className="font-mono text-xl font-extrabold leading-none">
                {estimatedTotal}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {t(
                    `ให้คะแนนแล้ว ${answeredCount}/${criteria.length} เกณฑ์`,
                    `Scored ${answeredCount}/${criteria.length} criteria`
                  )}
                </span>
                {allAnswered && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('ครบทุกข้อ', 'Complete', { compact: true })}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {!canEdit ? (
                  <span className="font-medium text-red-600">
                    {t(
                      'หมดเขตการประเมินแล้ว (โหมดดูอย่างเดียว)',
                      'Deadline passed (Read-only)'
                    )}
                  </span>
                ) : !allAnswered ? (
                  <span className="text-amber-600">
                    {t(
                      'กรุณาให้คะแนนครบทุกหัวข้อก่อนกดส่งคะแนนจริง (สามารถบันทึกร่างไว้ก่อนได้)',
                      'Score all criteria to submit (you can save a draft anytime)'
                    )}
                  </span>
                ) : submittedAt && evaluationStatus === 'SUBMITTED' ? (
                  <span className="text-emerald-600">
                    {t('ส่งคะแนนล่าสุดเมื่อ', 'Last submitted:')}{' '}
                    {new Date(submittedAt).toLocaleString('th-TH')}
                  </span>
                ) : lastUpdatedAt ? (
                  <span>
                    {t('บันทึกล่าสุดเมื่อ', 'Last saved:')}{' '}
                    {new Date(lastUpdatedAt).toLocaleString('th-TH')}
                  </span>
                ) : (
                  <span>
                    {t(
                      'คะแนนคำนวณถ่วงน้ำหนักอัตโนมัติจาก Weight ของแต่ละเกณฑ์',
                      'Weighted score updates automatically as you rate each criterion'
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={!canEdit}
            >
              <Save className="h-4 w-4" />
              {t('บันทึกแบบร่าง', 'Save Draft', { compact: true })}
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={!canEdit || !allAnswered}
            >
              <Send className="h-4 w-4" />
              {evaluationStatus === 'SUBMITTED'
                ? t('อัปเดตผลคะแนน', 'Update Score', { compact: true })
                : t('ส่งคะแนน', 'Submit Score', { compact: true })}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        isDanger={false}
        title={t('ยืนยันการส่งคะแนน', 'Confirm Score Submission')}
        message={t(
          `ยืนยันการส่งคะแนนของ "${teamName}" (รวม ${estimatedTotal} คะแนน) หรือไม่? คะแนนจะถูกนำไปคำนวณในตารางอันดับทันที และยังสามารถกลับมาแก้ไขได้ก่อนถึงเวลาปิดรับคะแนน`,
          `Submit score (${estimatedTotal} pts) for "${teamName}"? This score will be included in the official leaderboard and can be updated before the deadline.`
        )}
        onConfirm={confirmSubmit}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('ยืนยันส่งคะแนน', 'Submit Score', { compact: true })}
      />
    </div>
  );
}