import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, LockOpen, MessageSquarePlus, Save, Send } from 'lucide-react';
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
  getAssignedTeamIds,
  getProjectById,
  isBeforeEvaluationDeadline,
} from '../data/ProjectStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function normalizedScore(criterion, value) {
  if (value === null || value === undefined) return 0;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 100 : 0;
  return (value / criterion.maxScore) * 100;
}

export default function JudgeMultiEvaluation() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const judgeId = user?.email || 'anonymous-judge';

  const criteria = getCriteriaByProject(projectId);
  const project = getProjectById(projectId);
  const [canEdit, setCanEdit] = useState(() => isBeforeEvaluationDeadline(project));

  useEffect(() => {
    if (!canEdit || !project?.evaluationDeadline) return undefined;
    const deadline = new Date(project.evaluationDeadline).getTime();
    if (!Number.isFinite(deadline)) return undefined;
    let timeoutId;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setCanEdit(false);
        return;
      }
      timeoutId = window.setTimeout(checkDeadline, Math.min(remaining, 2147483647));
    };
    checkDeadline();
    return () => window.clearTimeout(timeoutId);
  }, [canEdit, project?.evaluationDeadline]);

  const allTeams = getTeamsByProject(projectId);
  const assignedTeamIds = getAssignedTeamIds(projectId, judgeId);
  const eligibleTeams = allTeams.filter((team) =>
    assignedTeamIds.includes(Number(team.id))
  );

  const [selectedTeamIds, setSelectedTeamIds] = useState(() =>
    eligibleTeams.map((tItem) => tItem.id)
  );

  const displayedTeams = eligibleTeams.filter((tItem) =>
    selectedTeamIds.includes(tItem.id)
  );

  // คะแนนรายเกณฑ์: { [teamId]: { [criterionId]: score } }
  const [matrixScores, setMatrixScores] = useState(() => {
    const initialScores = {};
    eligibleTeams.forEach((team) => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialScores[team.id] = evalData?.scores || {};
    });
    return initialScores;
  });

  // ความคิดเห็นรายเกณฑ์ (criteriaComments): { [teamId]: { [criterionId]: commentText } }
  const [matrixCriteriaComments, setMatrixCriteriaComments] = useState(() => {
    const initialCriteriaComments = {};
    eligibleTeams.forEach((team) => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialCriteriaComments[team.id] = evalData?.criteriaComments || {};
    });
    return initialCriteriaComments;
  });

  // เปิด/ปิดช่องกรอกความคิดเห็นรายเกณฑ์ในแต่ละเซลล์: { [`${teamId}:${criterionId}`]: boolean }
  const [openCommentCells, setOpenCommentCells] = useState(() => {
    const initialOpen = {};
    eligibleTeams.forEach((team) => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      const cComments = evalData?.criteriaComments || {};
      Object.entries(cComments).forEach(([cId, text]) => {
        if (text && String(text).trim()) {
          initialOpen[`${team.id}:${cId}`] = true;
        }
      });
    });
    return initialOpen;
  });

  const [comments, setComments] = useState(() => {
    const initialComments = {};
    eligibleTeams.forEach((team) => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialComments[team.id] = evalData?.comment || '';
    });
    return initialComments;
  });

  const [statuses, setStatuses] = useState(() => {
    const initialStatuses = {};
    eligibleTeams.forEach((team) => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialStatuses[team.id] = evalData?.status || 'NOT_STARTED';
    });
    return initialStatuses;
  });

  const [unlockedTeams, setUnlockedTeams] = useState({});
  const [confirmTeamId, setConfirmTeamId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isTeamEditable = (teamId) =>
    isBeforeEvaluationDeadline(getProjectById(projectId)) &&
    (statuses[teamId] !== 'SUBMITTED' || unlockedTeams[teamId]);

  const teamTotals = useMemo(() => {
    const totals = {};
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;

    eligibleTeams.forEach((team) => {
      const teamScores = matrixScores[team.id] || {};
      const weighted = criteria.reduce((sum, c) => {
        return sum + normalizedScore(c, teamScores[c.id]) * (c.weight / totalWeight);
      }, 0);
      totals[team.id] = weighted.toFixed(1);
    });
    return totals;
  }, [criteria, eligibleTeams, matrixScores]);

  const isTeamAnswered = (teamId) =>
    criteria.every(
      (criterion) =>
        matrixScores[teamId]?.[criterion.id] !== undefined &&
        matrixScores[teamId]?.[criterion.id] !== null
    );

  const handleScoreChange = (teamId, criterionId, value) => {
    if (!isTeamEditable(teamId)) return;

    setMatrixScores((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [criterionId]: value,
      },
    }));
  };

  const handleCriterionCommentChange = (teamId, criterionId, value) => {
    if (!isTeamEditable(teamId)) return;

    setMatrixCriteriaComments((prev) => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [criterionId]: value,
      },
    }));
  };

  const toggleCommentCell = (teamId, criterionId) => {
    const key = `${teamId}:${criterionId}`;
    setOpenCommentCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCommentChange = (teamId, value) => {
    if (!isTeamEditable(teamId)) return;
    setComments((prev) => ({ ...prev, [teamId]: value }));
  };

  const handleUnlockTeam = (teamId) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      toast.error(
        t(
          'หมดเขตการประเมินแล้ว ไม่สามารถปลดล็อกแก้ไขได้',
          'Evaluation deadline has passed'
        )
      );
      return;
    }
    if (statuses[teamId] !== 'SUBMITTED') return;
    setUnlockedTeams((prev) => ({ ...prev, [teamId]: true }));
  };

  const handleSaveDraft = (teamId) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      toast.error(
        t('หมดเขตการประเมินแล้ว ไม่สามารถบันทึกได้', 'Evaluation deadline has passed')
      );
      return;
    }
    if (!isTeamEditable(teamId)) return;
    try {
      const saved = saveEvaluation({
        projectId,
        teamId,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores: matrixScores[teamId],
        criteriaComments: matrixCriteriaComments[teamId] || {},
        comment: comments[teamId] || '',
        totalScore: Number(teamTotals[teamId]),
        status: 'DRAFT',
      });
      if (!saved) {
        toast.error(
          t('หมดเขตการประเมินแล้ว ไม่สามารถบันทึกได้', 'Evaluation deadline has passed')
        );
        return;
      }
      setStatuses((prev) => ({ ...prev, [teamId]: 'DRAFT' }));
      setUnlockedTeams((prev) => ({ ...prev, [teamId]: false }));
      toast.success(t('บันทึกแบบร่างเรียบร้อยแล้ว', 'Draft saved'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const confirmSubmit = () => {
    const teamId = confirmTeamId;
    if (!teamId) return;
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      setIsConfirmOpen(false);
      setConfirmTeamId(null);
      toast.error(
        t('หมดเขตการประเมินแล้ว ไม่สามารถส่งคะแนนได้', 'Evaluation deadline has passed')
      );
      return;
    }
    if (!isTeamEditable(teamId) || !isTeamAnswered(teamId)) return;
    try {
      const saved = saveEvaluation({
        projectId,
        teamId,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores: matrixScores[teamId],
        criteriaComments: matrixCriteriaComments[teamId] || {},
        comment: comments[teamId] || '',
        totalScore: Number(teamTotals[teamId]),
        status: 'SUBMITTED',
      });
      if (!saved) {
        setIsConfirmOpen(false);
        setConfirmTeamId(null);
        toast.error(
          t('หมดเขตการประเมินแล้ว ไม่สามารถส่งคะแนนได้', 'Evaluation deadline has passed')
        );
        return;
      }
      setStatuses((prev) => ({ ...prev, [teamId]: 'SUBMITTED' }));
      setUnlockedTeams((prev) => ({ ...prev, [teamId]: false }));
      setIsConfirmOpen(false);
      setConfirmTeamId(null);
      toast.success(t('ส่งคะแนนทีมเรียบร้อยแล้ว', 'Team score submitted'));
    } catch (error) {
      setIsConfirmOpen(false);
      toast.error(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-6">
      <BackButton to={`/judge/project/${projectId}/teams`}>
        {t('กลับไปหน้ารายชื่อทีม', 'Back to Assigned Teams', { compact: true })}
      </BackButton>

      <PageHeader
        title={t(
          'ประเมินเปรียบเทียบหลายทีม',
          'Multi-Team Matrix Evaluation'
        )}
        description={tDesc(
          `เปรียบเทียบ ให้คะแนน และใส่ความคิดเห็นรายเกณฑ์ของแต่ละทีมพร้อมกันในตารางเดียว — ${project?.name || `โครงการ #${projectId}`}`,
          `Compare, score, and add per-criterion comments across multiple teams side by side — ${project?.name || `Competition #${projectId}`}`
        )}
      />

      {!canEdit && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">
            {t(
              'หมดเขตการประเมินแล้ว ไม่สามารถแก้ไขหรือส่งคะแนนได้',
              'Evaluation deadline has passed. Scores are locked.'
            )}
          </p>
        </Card>
      )}

      {eligibleTeams.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-slate-500">
            {t(
              'ไม่มีทีมที่คุณสามารถประเมินได้ในขณะนี้',
              'No teams assigned for evaluation at this time'
            )}
          </p>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200 bg-slate-50/70">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {t(
                    'เลือกทีมที่ต้องการแสดงเปรียบเทียบในตาราง',
                    'Select Teams to Compare in Matrix'
                  )}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedTeamIds(eligibleTeams.map((tItem) => tItem.id))}
                  >
                    {t('เลือกทั้งหมด', 'Select All', { compact: true })}
                  </Button>
                  <Button
                    variant="textGray"
                    size="sm"
                    onClick={() => setSelectedTeamIds([])}
                  >
                    {t('ล้างทั้งหมด', 'Clear All', { compact: true })}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {eligibleTeams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeamIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== team.id)
                            : [...prev, team.id]
                        );
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-blue-300 bg-blue-100 text-blue-800 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {team.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card noPadding className="overflow-hidden">
            {displayedTeams.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {t(
                  'กรุณาเลือกทีมจากด้านบนอย่างน้อย 1 ทีมเพื่อเริ่มการประเมิน',
                  'Please select at least 1 team above to start comparing'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/90">
                      <th className="sticky left-0 z-10 w-64 bg-slate-100 px-6 py-4 text-sm font-bold text-slate-800 shadow-[1px_0_0_0_#e2e8f0]">
                        {t('เกณฑ์ประเมิน / ชื่อทีม', 'Criteria / Teams', { compact: true })}
                      </th>
                      {displayedTeams.map((team) => (
                        <th
                          key={team.id}
                          className="min-w-[300px] border-l border-slate-200 px-6 py-4 text-center font-bold text-slate-900"
                        >
                          <div className="text-base">{team.name}</div>
                          {team.link && (
                            <div className="mt-1">
                              <a
                                href={team.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 break-all text-xs font-semibold text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {t('ดูผลงาน', 'Submission', { compact: true })}
                              </a>
                            </div>
                          )}
                          <div className="mt-1.5">
                            {statuses[team.id] === 'SUBMITTED' ? (
                              <Badge variant="success">
                                {t('ส่งแล้ว', 'Submitted', { compact: true })}
                              </Badge>
                            ) : statuses[team.id] === 'DRAFT' ? (
                              <Badge variant="warning">
                                {t('ร่าง', 'Draft', { compact: true })}
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                {t('ยังไม่เริ่ม', 'Not Started', { compact: true })}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            {statuses[team.id] === 'SUBMITTED' && !unlockedTeams[team.id] ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUnlockTeam(team.id)}
                                disabled={!canEdit}
                              >
                                <LockOpen className="h-3.5 w-3.5" />
                                {t('ปลดล็อกแก้ไข', 'Unlock to Edit', { compact: true })}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSaveDraft(team.id)}
                                  disabled={!isTeamEditable(team.id)}
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  {t('บันทึกร่าง', 'Save Draft', { compact: true })}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!isTeamEditable(team.id) || !isTeamAnswered(team.id))
                                      return;
                                    setConfirmTeamId(team.id);
                                    setIsConfirmOpen(true);
                                  }}
                                  disabled={
                                    !isTeamEditable(team.id) || !isTeamAnswered(team.id)
                                  }
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {statuses[team.id] === 'SUBMITTED'
                                    ? t('ส่งอีกครั้ง', 'Resubmit', { compact: true })
                                    : t('ส่งคะแนน', 'Submit', { compact: true })}
                                </Button>
                              </>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 bg-blue-50/60">
                      <td className="sticky left-0 z-10 bg-blue-50 px-6 py-3.5 text-sm font-bold text-blue-900 shadow-[1px_0_0_0_#e2e8f0]">
                        {t(
                          'คะแนนรวมถ่วงน้ำหนัก (เต็ม 100)',
                          'Weighted Total Score (/100)',
                          { compact: true }
                        )}
                      </td>
                      {displayedTeams.map((team) => (
                        <td
                          key={team.id}
                          className="border-l border-slate-200 px-6 py-3.5 text-center font-mono text-2xl font-extrabold text-blue-700"
                        >
                          {teamTotals[team.id]}
                        </td>
                      ))}
                    </tr>

                    {criteria.map((criterion) => (
                      <tr
                        key={criterion.id}
                        className="border-b border-slate-200 hover:bg-slate-50/40"
                      >
                        <td className="sticky left-0 z-10 bg-white px-6 py-4 align-top shadow-[1px_0_0_0_#e2e8f0]">
                          <p className="font-bold text-slate-900">{criterion.name}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {criterion.type} · Weight: {criterion.weight}%
                          </p>
                          {criterion.description && (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                              {criterion.description}
                            </p>
                          )}
                        </td>
                        {displayedTeams.map((team) => {
                          const cellKey = `${team.id}:${criterion.id}`;
                          const cellComment =
                            matrixCriteriaComments[team.id]?.[criterion.id] || '';
                          const isCommentOpen =
                            Boolean(openCommentCells[cellKey]) || Boolean(cellComment);

                          return (
                            <td
                              key={team.id}
                              className="border-l border-slate-200 px-6 py-4 align-top"
                            >
                              <div className="space-y-2.5">
                                <CriterionScoreInput
                                  criterion={criterion}
                                  value={matrixScores[team.id]?.[criterion.id] ?? null}
                                  onChange={(val) =>
                                    handleScoreChange(team.id, criterion.id, val)
                                  }
                                  disabled={!isTeamEditable(team.id)}
                                />

                                {/* ปุ่มเปิด/ซ่อนความคิดเห็นรายเกณฑ์ (criteriaComments) */}
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => toggleCommentCell(team.id, criterion.id)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600"
                                  >
                                    <MessageSquarePlus className="h-3.5 w-3.5" />
                                    {isCommentOpen
                                      ? t('ความคิดเห็นเกณฑ์นี้', 'Criterion Note', {
                                          compact: true,
                                        })
                                      : t('+ เพิ่มความเห็นเกณฑ์นี้', '+ Add Criterion Note', {
                                          compact: true,
                                        })}
                                  </button>

                                  {isCommentOpen && (
                                    <textarea
                                      rows={2}
                                      disabled={!isTeamEditable(team.id)}
                                      value={cellComment}
                                      onChange={(e) =>
                                        handleCriterionCommentChange(
                                          team.id,
                                          criterion.id,
                                          e.target.value
                                        )
                                      }
                                      placeholder={t(
                                        `เหตุผลของคะแนน ${criterion.name}...`,
                                        `Note for ${criterion.name}...`
                                      )}
                                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 focus:border-precision-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    <tr className="border-b border-slate-200">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 align-top shadow-[1px_0_0_0_#e2e8f0]">
                        <p className="font-bold text-slate-900">
                          {t('ข้อเสนอแนะภาพรวม', 'Overall Feedback', { compact: true })}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('ความเห็นรวมถึงทีมผู้เข้าแข่งขัน', 'General comments for the team')}
                        </p>
                      </td>
                      {displayedTeams.map((team) => (
                        <td
                          key={team.id}
                          className="border-l border-slate-200 px-6 py-4 align-top"
                        >
                          <textarea
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                            placeholder={t(
                              'ข้อเสนอแนะภาพรวม...',
                              'Overall feedback...'
                            )}
                            value={comments[team.id]}
                            onChange={(e) => handleCommentChange(team.id, e.target.value)}
                            disabled={!isTeamEditable(team.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        isDanger={false}
        title={t('ยืนยันการส่งคะแนน', 'Confirm Score Submission')}
        message={t(
          `ยืนยันการส่งคะแนน${
            displayedTeams.find((team) => team.id === confirmTeamId)?.name
              ? `ของทีม "${displayedTeams.find((team) => team.id === confirmTeamId).name}"`
              : ''
          } หรือไม่? สามารถปลดล็อกแก้ไขและส่งใหม่ได้ก่อน Deadline`,
          `Submit score for "${
            displayedTeams.find((team) => team.id === confirmTeamId)?.name || 'this team'
          }"? You can unlock and update it before the deadline.`
        )}
        onConfirm={confirmSubmit}
        onCancel={() => {
          setIsConfirmOpen(false);
          setConfirmTeamId(null);
        }}
        confirmText={t('ส่งคะแนน', 'Submit Score', { compact: true })}
      />
    </div>
  );
}