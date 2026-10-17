import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ListFilter,
  LockOpen,
  MessageSquarePlus,
  Save,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
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

  // 1. State สำหรับเลือกทีมที่จะแสดงในตาราง
  const [selectedTeamIds, setSelectedTeamIds] = useState(() =>
    eligibleTeams.map((tItem) => tItem.id)
  );

  const displayedTeams = eligibleTeams.filter((tItem) =>
    selectedTeamIds.includes(tItem.id)
  );

  // 2. State สำหรับจัดลำดับและเลือกเกณฑ์ประเมินที่จะประเมินก่อน-หลัง
  const [criteriaOrderIds, setCriteriaOrderIds] = useState(() =>
    criteria.map((c) => c.id)
  );
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState(() =>
    criteria.map((c) => c.id)
  );
  // โหมดโฟกัสทีละเกณฑ์ ('all' = แสดงทุกเกณฑ์ที่ติ๊กเลือก, หรือเก็บ criterion.id เมื่อกดโฟกัสเกณฑ์เดียว)
  const [focusedCriterionId, setFocusedCriterionId] = useState('all');

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

  // คำนวณจำนวนทีมที่ให้คะแนนแล้วในแต่ละเกณฑ์ (เฉพาะทีมที่แสดงอยู่)
  const criterionProgressMap = useMemo(() => {
    const map = {};
    const targetTeams = displayedTeams.length > 0 ? displayedTeams : eligibleTeams;
    criteria.forEach((c) => {
      const scoredCount = targetTeams.filter(
        (team) =>
          matrixScores[team.id]?.[c.id] !== undefined &&
          matrixScores[team.id]?.[c.id] !== null
      ).length;
      map[c.id] = {
        scoredCount,
        totalTeams: targetTeams.length,
        isComplete: targetTeams.length > 0 && scoredCount === targetTeams.length,
      };
    });
    return map;
  }, [criteria, displayedTeams, eligibleTeams, matrixScores]);

  // เรียงลำดับเกณฑ์ตามที่ผู้ใช้จัดลำดับไว้ใน criteriaOrderIds
  const orderedCriteria = useMemo(() => {
    const byId = new Map(criteria.map((c) => [c.id, c]));
    const ordered = criteriaOrderIds.map((id) => byId.get(id)).filter(Boolean);
    const missing = criteria.filter((c) => !criteriaOrderIds.includes(c.id));
    return [...ordered, ...missing];
  }, [criteria, criteriaOrderIds]);

  // เกณฑ์ที่แสดงจริงบนตารางตามโหมดโฟกัสหรือรายการที่ติ๊กเลือก
  const displayedCriteria = useMemo(() => {
    if (focusedCriterionId !== 'all') {
      return orderedCriteria.filter((c) => String(c.id) === String(focusedCriterionId));
    }
    return orderedCriteria.filter((c) => selectedCriteriaIds.includes(c.id));
  }, [orderedCriteria, focusedCriterionId, selectedCriteriaIds]);

  // เลื่อนลำดับเกณฑ์ขึ้น/ลง
  const moveCriterionOrder = (criterionId, direction) => {
    setCriteriaOrderIds((prev) => {
      const currentOrder =
        prev.length === criteria.length ? [...prev] : criteria.map((c) => c.id);
      const index = currentOrder.indexOf(criterionId);
      if (index < 0) return currentOrder;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentOrder.length) return currentOrder;
      const next = [...currentOrder];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  // จัดเรียงเกณฑ์อัตโนมัติ (ตามเกณฑ์ที่ยังประเมินไม่ครบก่อน / ตามน้ำหนักมากสุดก่อน / ลำดับตั้งต้น)
  const sortCriteriaOrder = (mode) => {
    if (mode === 'default') {
      setCriteriaOrderIds(criteria.map((c) => c.id));
      return;
    }
    if (mode === 'weight-desc') {
      const sorted = [...criteria]
        .sort((a, b) => Number(b.weight) - Number(a.weight))
        .map((c) => c.id);
      setCriteriaOrderIds(sorted);
      return;
    }
    if (mode === 'incomplete-first') {
      const sorted = [...criteria]
        .sort((a, b) => {
          const progA = criterionProgressMap[a.id];
          const progB = criterionProgressMap[b.id];
          if (progA?.isComplete !== progB?.isComplete) {
            return progA?.isComplete ? 1 : -1;
          }
          return (progA?.scoredCount || 0) - (progB?.scoredCount || 0);
        })
        .map((c) => c.id);
      setCriteriaOrderIds(sorted);
    }
  };

  // สลับไปเกณฑ์ก่อนหน้า/ถัดไป เมื่ออยู่ในโหมดโฟกัสทีละเกณฑ์
  const stepFocusedCriterion = (offset) => {
    if (orderedCriteria.length === 0) return;
    const currentIndex = orderedCriteria.findIndex(
      (c) => String(c.id) === String(focusedCriterionId)
    );
    if (currentIndex === -1) {
      setFocusedCriterionId(orderedCriteria[0].id);
      return;
    }
    const nextIndex =
      (currentIndex + offset + orderedCriteria.length) % orderedCriteria.length;
    setFocusedCriterionId(orderedCriteria[nextIndex].id);
  };

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
        {t('กลับไปหน้ารายชื่อทีม', 'Back to Assigned Teams')}
      </BackButton>

      <PageHeader
        title={t('ประเมินเปรียบเทียบหลายทีม', 'Multi-Team Matrix Evaluation')}
        description={tDesc(
          `เลือกเกณฑ์ที่ต้องการประเมินก่อน-หลัง และเปรียบเทียบให้คะแนนแต่ละทีมพร้อมกันในตารางเดียว — ${project?.name || `โครงการ #${projectId}`}`,
          `Select and prioritize criteria to evaluate first, and score multiple teams side by side — ${project?.name || `Competition #${projectId}`}`
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
          {/* แผงควบคุม: 1) เลือกทีม และ 2) เลือก/จัดลำดับเกณฑ์ประเมินที่ต้องการประเมินก่อน */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* การ์ดที่ 1: เลือกทีมที่จะแสดงเปรียบเทียบ */}
            <Card className="border-slate-200 bg-slate-50/70">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t(
                        '1. เลือกทีมที่ต้องการเปรียบเทียบ',
                        '1. Select Teams to Compare'
                      )}
                    </h3>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSelectedTeamIds(eligibleTeams.map((tItem) => tItem.id))
                      }
                    >
                      {t('เลือกทุกทีม', 'Select All')}
                    </Button>
                    <Button
                      variant="textGray"
                      size="sm"
                      onClick={() => setSelectedTeamIds([])}
                    >
                      {t('ล้าง', 'Clear')}
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

            {/* การ์ดที่ 2: เลือกเกณฑ์ประเมินและจัดลำดับว่าจะประเมินเกณฑ์ไหนก่อน */}
            <Card className="border-blue-200/80 bg-blue-50/30">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t(
                        '2. เลือกและจัดลำดับเกณฑ์ที่จะประเมินก่อน',
                        '2. Select & Prioritize Criteria'
                      )}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      aria-label={t('เรียงลำดับเกณฑ์ประเมิน', 'Sort criteria order')}
                      onChange={(e) => sortCriteriaOrder(e.target.value)}
                      defaultValue="default"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="default">
                        {t('เรียงเกณฑ์: ลำดับตั้งต้น', 'Order: Default')}
                      </option>
                      <option value="incomplete-first">
                        {t(
                          'เรียงเกณฑ์: ยังให้คะแนนไม่ครบขึ้นก่อน',
                          'Order: Incomplete First'
                        )}
                      </option>
                      <option value="weight-desc">
                        {t(
                          'เรียงเกณฑ์: น้ำหนัก (Weight) มากสุดก่อน',
                          'Order: Highest Weight First'
                        )}
                      </option>
                    </select>

                    <Button
                      variant={focusedCriterionId === 'all' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        setFocusedCriterionId('all');
                        setSelectedCriteriaIds(criteria.map((c) => c.id));
                      }}
                    >
                      {t('แสดงทุกเกณฑ์', 'Show All Criteria')}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  {t(
                    'คลิกที่ชื่อเกณฑ์เพื่อโฟกัสประเมินทีละเกณฑ์ หรือกดลูกศร ↑ ↓ เพื่อเลื่อนเกณฑ์ที่อยากประเมินก่อนขึ้นไปไว้แถวบนสุดของตาราง',
                    'Click a criterion to focus on scoring it across all teams, or use ↑ ↓ arrows to reorder which criterion appears first.'
                  )}
                </p>

                {/* รายการเกณฑ์พร้อมปุ่มโฟกัส, ปุ่มติ๊กเลือก และปุ่มเลื่อนลำดับ ↑ ↓ */}
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {orderedCriteria.map((criterion, idx) => {
                    const prog = criterionProgressMap[criterion.id] || {
                      scoredCount: 0,
                      totalTeams: displayedTeams.length,
                      isComplete: false,
                    };
                    const isFocused =
                      String(focusedCriterionId) === String(criterion.id);
                    const isChecked =
                      focusedCriterionId === 'all'
                        ? selectedCriteriaIds.includes(criterion.id)
                        : isFocused;

                    return (
                      <div
                        key={criterion.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-all ${
                          isFocused
                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-2xs ring-1 ring-blue-400'
                            : isChecked
                              ? 'border-slate-200 bg-white text-slate-800'
                              : 'border-slate-200/60 bg-slate-100/60 text-slate-400'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setFocusedCriterionId('all');
                              setSelectedCriteriaIds((prev) =>
                                prev.includes(criterion.id)
                                  ? prev.filter((id) => id !== criterion.id)
                                  : [...prev, criterion.id]
                              );
                            }}
                            aria-label={`แสดงเกณฑ์ ${criterion.name}`}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFocusedCriterionId(
                                isFocused ? 'all' : criterion.id
                              )
                            }
                            className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold hover:text-blue-600"
                            title={t(
                              'คลิกเพื่อโฟกัสประเมินเฉพาะเกณฑ์นี้ก่อน',
                              'Click to focus only on this criterion'
                            )}
                          >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                              {idx + 1}
                            </span>
                            <span className="truncate">{criterion.name}</span>
                            <span className="shrink-0 text-[11px] font-normal text-slate-400">
                              ({criterion.weight}%)
                            </span>
                          </button>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              prog.isComplete
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {prog.isComplete && <CheckCircle2 className="h-3 w-3" />}
                            {prog.scoredCount}/{prog.totalTeams}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setFocusedCriterionId(
                                isFocused ? 'all' : criterion.id
                              )
                            }
                            className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                              isFocused
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                          >
                            {isFocused
                              ? t('กำลังโฟกัส', 'Focused')
                              : t('ประเมินก่อน', 'Focus')}
                          </button>

                          <div className="flex items-center border-l border-slate-200 pl-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveCriterionOrder(criterion.id, 'up')}
                              aria-label={t('เลื่อนเกณฑ์ขึ้น', 'Move up')}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === orderedCriteria.length - 1}
                              onClick={() => moveCriterionOrder(criterion.id, 'down')}
                              aria-label={t('เลื่อนเกณฑ์ลง', 'Move down')}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* แถบนำทางเมื่ออยู่ในโหมดโฟกัสประเมินทีละเกณฑ์ */}
                {focusedCriterionId !== 'all' && (
                  <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-600 px-3.5 py-2 text-xs text-white shadow-xs">
                    <span className="font-semibold">
                      {t('โหมดประเมินทีละเกณฑ์:', 'Single-Criterion Focus:')}{' '}
                      <strong>
                        {
                          orderedCriteria.find(
                            (c) => String(c.id) === String(focusedCriterionId)
                          )?.name
                        }
                      </strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepFocusedCriterion(-1)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        {t('เกณฑ์ก่อนหน้า', 'Prev')}
                      </button>
                      <button
                        type="button"
                        onClick={() => stepFocusedCriterion(1)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
                      >
                        {t('เกณฑ์ถัดไป', 'Next')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFocusedCriterionId('all')}
                        className="ml-1 rounded-lg bg-white px-2.5 py-1 font-bold text-blue-700 hover:bg-blue-50"
                      >
                        {t('ดูทุกเกณฑ์', 'Show All')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card noPadding className="overflow-hidden">
            {displayedTeams.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {t(
                  'กรุณาเลือกทีมจากด้านบนอย่างน้อย 1 ทีมเพื่อเริ่มการประเมิน',
                  'Please select at least 1 team above to start comparing'
                )}
              </div>
            ) : displayedCriteria.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {t(
                  'กรุณาติ๊กเลือกเกณฑ์ประเมินอย่างน้อย 1 ข้อ หรือกดปุ่ม "แสดงทุกเกณฑ์"',
                  'Please select at least 1 criterion above or click "Show All Criteria"'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/90">
                      <th className="sticky left-0 z-10 w-64 bg-slate-100 px-6 py-4 text-sm font-bold text-slate-800 shadow-[1px_0_0_0_#e2e8f0]">
                        {t('เกณฑ์ประเมิน / ชื่อทีม', 'Criteria / Teams')}
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
                                {t('ดูผลงาน', 'Submission')}
                              </a>
                            </div>
                          )}
                          <div className="mt-1.5">
                            {statuses[team.id] === 'SUBMITTED' ? (
                              <Badge variant="success">
                                {t('ส่งแล้ว', 'Submitted')}
                              </Badge>
                            ) : statuses[team.id] === 'DRAFT' ? (
                              <Badge variant="warning">
                                {t('ร่าง', 'Draft')}
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                {t('ยังไม่เริ่ม', 'Not Started')}
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
                                {t('ปลดล็อกแก้ไข', 'Unlock to Edit')}
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
                                  {t('บันทึกร่าง', 'Save Draft')}
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
                                    ? t('ส่งอีกครั้ง', 'Resubmit')
                                    : t('ส่งคะแนน', 'Submit')}
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
                          'Weighted Total Score (/100)'
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

                    {displayedCriteria.map((criterion) => {
                      const prog = criterionProgressMap[criterion.id];
                      return (
                        <tr
                          key={criterion.id}
                          className="border-b border-slate-200 hover:bg-slate-50/40"
                        >
                          <td className="sticky left-0 z-10 bg-white px-6 py-4 align-top shadow-[1px_0_0_0_#e2e8f0]">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-900">{criterion.name}</p>
                              {prog?.isComplete && (
                                <Badge variant="success">
                                  {t('ครบทุกทีม', 'Done')}
                                </Badge>
                              )}
                            </div>
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

                                  <div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleCommentCell(team.id, criterion.id)
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600"
                                    >
                                      <MessageSquarePlus className="h-3.5 w-3.5" />
                                      {isCommentOpen
                                        ? t('ความคิดเห็นเกณฑ์นี้', 'Criterion Note')
                                        : t('+ เพิ่มความเห็นเกณฑ์นี้', '+ Add Criterion Note')}
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
                      );
                    })}

                    <tr className="border-b border-slate-200">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 align-top shadow-[1px_0_0_0_#e2e8f0]">
                        <p className="font-bold text-slate-900">
                          {t('ข้อเสนอแนะภาพรวม', 'Overall Feedback')}
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
        confirmText={t('ส่งคะแนน', 'Submit Score')}
      />
    </div>
  );
}