import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LockOpen,
  Save,
  Send,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import CriterionScoreInput from '../components/CriteriaScoreInput';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { calculateWeightedScore } from '../data/Scoring';
import {
  getAssignedTeamIds,
  getProjectById,
  isBeforeEvaluationDeadline,
  isProjectReadyForEvaluation,
} from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation, saveEvaluation } from '../data/EvaluationStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function scoreLabel(criterion, value) {
  if (value === null || value === undefined) return null;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 'Pass' : 'Fail';
  if (criterion.type === 'PERCENTAGE') return `${value}%`;
  return `${value}/${criterion.maxScore}`;
}

function parseRubricLevels(description) {
  if (!description || !String(description).trim()) return [];
  const raw = String(description).trim();

  const segments = raw
    .split(/(?=[★⭐•])|\r?\n+|(?=\b\d+\s*(?:ดาว|คะแนน|แต้ม|stars?|points?|pts)\s*[:：])/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.map((seg) => {
    const colonMatch = seg.match(/^([^:：]{1,32})[:：]\s*(.+)$/);
    if (colonMatch) {
      return {
        label: colonMatch[1].trim(),
        detail: colonMatch[2].trim(),
      };
    }
    return {
      label: null,
      detail: seg,
    };
  });
}

export default function JudgeEvaluation() {
  const { projectId, teamId } = useParams();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const judgeId = user?.email || 'anonymous-judge';

  const criteria = getCriteriaByProject(projectId);
  const project = getProjectById(projectId);
  const canEvaluate = isProjectReadyForEvaluation(projectId);
  const teams = getTeamsByProject(projectId);
  const assignedTeamIds = getAssignedTeamIds(projectId, judgeId);
  const team = teams.find((item) => item.id === Number(teamId));
  const isAssigned = assignedTeamIds.includes(Number(teamId));
  const existingEvaluation = getEvaluation(projectId, teamId, judgeId);

  const [scores, setScores] = useState(() => existingEvaluation?.scores || {});
  const [criteriaComments, setCriteriaComments] = useState(
    () => existingEvaluation?.criteriaComments || {}
  );
  const [comment, setComment] = useState(() => existingEvaluation?.comment || '');
  const [evaluationStatus, setEvaluationStatus] = useState(
    () => existingEvaluation?.status || 'DRAFT'
  );
  const [submittedAt, setSubmittedAt] = useState(
    () => existingEvaluation?.submittedAt || null
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    () => existingEvaluation?.updatedAt || null
  );
  const [isUnlockedForEdit, setIsUnlockedForEdit] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [collapsedRubricIds, setCollapsedRubricIds] = useState({});
  const [isBeforeDeadline, setIsBeforeDeadline] = useState(() =>
    isBeforeEvaluationDeadline(project)
  );

  useEffect(() => {
    if (!isBeforeDeadline || !project?.evaluationDeadline) return undefined;
    const deadline = new Date(project.evaluationDeadline).getTime();
    if (!Number.isFinite(deadline)) return undefined;
    let timeoutId;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setIsBeforeDeadline(false);
        return;
      }
      timeoutId = window.setTimeout(checkDeadline, Math.min(remaining, 2147483647));
    };
    checkDeadline();
    return () => window.clearTimeout(timeoutId);
  }, [isBeforeDeadline, project?.evaluationDeadline]);

  const canEdit =
    canEvaluate &&
    isBeforeDeadline &&
    (evaluationStatus !== 'SUBMITTED' || isUnlockedForEdit);

  const teamName = team?.name || `ทีม #${teamId}`;

  const answeredCount = criteria.filter(
    (c) => scores[c.id] !== undefined && scores[c.id] !== null
  ).length;
  const isAllAnswered = answeredCount === criteria.length && criteria.length > 0;

  const estimatedTotal = useMemo(
    () => calculateWeightedScore(criteria, scores).toFixed(1),
    [criteria, scores]
  );

  const handleScoreChange = (criterionId, value) => {
    if (!canEdit) return;
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleCriterionCommentChange = (criterionId, value) => {
    if (!canEdit) return;
    setCriteriaComments((prev) => ({ ...prev, [criterionId]: value }));
  };

  const toggleRubric = (criterionId) => {
    setCollapsedRubricIds((prev) => ({
      ...prev,
      [criterionId]: !prev[criterionId],
    }));
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
      setLastUpdatedAt(saved.updatedAt);
      setIsUnlockedForEdit(false);
      toast.success(t('บันทึกแบบร่างเรียบร้อยแล้ว', 'Draft saved successfully'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit || !isAllAnswered) return;
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
          const rubricItems = parseRubricLevels(criterion.description);
          const isRubricCollapsed = Boolean(collapsedRubricIds[criterion.id]);

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
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                      {t('คำอธิบายเกณฑ์ (Rubric)', 'Scoring Rubric')}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleRubric(criterion.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-2xs hover:bg-blue-50"
                    >
                      {isRubricCollapsed ? (
                        <>
                          {t('ดูเกณฑ์ละเอียด', 'Show Rubric')}
                          <ChevronDown className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          {t('ซ่อนเกณฑ์ละเอียด', 'Hide Rubric')}
                          <ChevronUp className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>

                  {!isRubricCollapsed && (
                    <div className="mt-2.5 space-y-1.5">
                      {rubricItems.length > 1 ? (
                        rubricItems.map((item, rIdx) => (
                          <div
                            key={rIdx}
                            className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-2xs"
                          >
                            {item.label ? (
                              <>
                                <span className="mr-2 inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                                  {item.label}
                                </span>
                                <span>{item.detail}</span>
                              </>
                            ) : (
                              <span>{item.detail}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">
                          {criterion.description}
                        </p>
                      )}
                    </div>
                  )}
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
              'เขียนคำแนะนำ จุดเด่น หรือสิ่งที่ทีมควรพัฒนาต่อ...',
              'Share overall strengths, feedback, or areas for improvement...'
            )}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
          {(lastUpdatedAt || submittedAt) && (
            <p className="mt-2 text-xs text-slate-400">
              {submittedAt
                ? `${t('ส่งผลประเมินเมื่อ:', 'Submitted at:')} ${new Date(
                    submittedAt
                  ).toLocaleString('th-TH')}`
                : `${t('บันทึกล่าสุดเมื่อ:', 'Last saved:')} ${new Date(
                    lastUpdatedAt
                  ).toLocaleString('th-TH')}`}
            </p>
          )}
        </Card>
      </div>

      {/* Sticky Floating Summary & Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('คะแนนรวมถ่วงน้ำหนัก', 'Weighted Total')}
              </p>
              <p className="font-mono text-2xl font-extrabold text-blue-700">
                {estimatedTotal}{' '}
                <span className="text-xs font-normal text-slate-400">/ 100</span>
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {t(
                  `ให้คะแนนแล้ว ${answeredCount}/${criteria.length} เกณฑ์`,
                  `Scored ${answeredCount}/${criteria.length} criteria`
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAllAnswered
                  ? t('พร้อมส่งผลประเมิน', 'Ready to submit')
                  : t('กรุณาให้คะแนนครบทุกเกณฑ์ก่อนกดส่ง', 'Score all criteria to submit')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {evaluationStatus === 'SUBMITTED' && !isUnlockedForEdit ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsUnlockedForEdit(true)}
                disabled={!isBeforeDeadline}
              >
                <LockOpen className="h-4 w-4" />
                {t('ปลดล็อกเพื่อแก้ไข', 'Unlock to Edit')}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={!canEdit}
                >
                  <Save className="h-4 w-4" />
                  {t('บันทึกร่าง', 'Save Draft')}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canEdit || !isAllAnswered}
                >
                  <Send className="h-4 w-4" />
                  {evaluationStatus === 'SUBMITTED'
                    ? t('ส่งคะแนนอีกครั้ง', 'Resubmit Score')
                    : t('ส่งคะแนน', 'Submit Score')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        isDanger={false}
        title={t('ยืนยันการส่งคะแนน', 'Confirm Score Submission')}
        message={t(
          `ยืนยันการส่งคะแนนทีม "${teamName}" (รวม ${estimatedTotal}/100) หรือไม่? หลังส่งแล้วสามารถกดปลดล็อกเพื่อแก้ไขได้ก่อนวันปิดรับคะแนน`,
          `Submit score for "${teamName}" (Total ${estimatedTotal}/100)? You can unlock and edit before the deadline.`
        )}
        onConfirm={confirmSubmit}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('ยืนยันส่งคะแนน', 'Submit Score')}
      />
    </div>
  );
}