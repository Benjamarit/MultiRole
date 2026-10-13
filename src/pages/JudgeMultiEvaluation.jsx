import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { getAssignedTeamIds, getProjectById, isBeforeEvaluationDeadline } from '../data/ProjectStore';
import { useAuth } from '../context/AuthContext';

function normalizedScore(criterion, value) {
  if (value === null || value === undefined) return 0;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 100 : 0;
  return (value / criterion.maxScore) * 100;
}

export default function JudgeMultiEvaluation() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const judgeId = user?.email || 'anonymous-judge';

  // โหลดข้อมูลพื้นฐาน
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
      timeoutId = window.setTimeout(checkDeadline, Math.min(remaining, 2_147_483_647));
    };
    checkDeadline();
    return () => window.clearTimeout(timeoutId);
  }, [canEdit, project?.evaluationDeadline]);

  const allTeams = getTeamsByProject(projectId);
  const assignedTeamIds = getAssignedTeamIds(projectId, judgeId);
  const eligibleTeams = allTeams.filter((team) => assignedTeamIds.includes(Number(team.id)));

  // --- เพิ่ม State สำหรับจัดเก็บทีมที่ถูกเลือกแสดงในตาราง (ค่าเริ่มต้นให้เลือกทั้งหมด) ---
  const [selectedTeamIds, setSelectedTeamIds] = useState(() => eligibleTeams.map(t => t.id));
  
  // กรองเฉพาะทีมที่กรรมการเลือกมาแสดงบนตาราง
  const displayedTeams = eligibleTeams.filter(t => selectedTeamIds.includes(t.id));

  // ดึงคะแนนเดิม (ถ้ามี) มาใส่ใน State แบบ Nested Object: { teamId: { criterionId: score } }
  const [matrixScores, setMatrixScores] = useState(() => {
    const initialScores = {};
    eligibleTeams.forEach(team => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialScores[team.id] = evalData?.scores || {};
    });
    return initialScores;
  });

  const [comments, setComments] = useState(() => {
    const initialComments = {};
    eligibleTeams.forEach(team => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialComments[team.id] = evalData?.comment || '';
    });
    return initialComments;
  });

  const [statuses, setStatuses] = useState(() => {
    const initialStatuses = {};
    eligibleTeams.forEach(team => {
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

  // คำนวณคะแนนรวมของแต่ละทีม
  const teamTotals = useMemo(() => {
    const totals = {};
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
    
    eligibleTeams.forEach(team => {
      const teamScores = matrixScores[team.id] || {};
      const weighted = criteria.reduce((sum, c) => {
        return sum + normalizedScore(c, teamScores[c.id]) * (c.weight / totalWeight);
      }, 0);
      totals[team.id] = weighted.toFixed(1);
    });
    return totals;
  }, [criteria, eligibleTeams, matrixScores]);

  const isTeamAnswered = (teamId) =>
    criteria.every((criterion) =>
      matrixScores[teamId]?.[criterion.id] !== undefined &&
      matrixScores[teamId]?.[criterion.id] !== null
    );

  const handleScoreChange = (teamId, criterionId, value) => {
    if (!isTeamEditable(teamId)) return;
    
    setMatrixScores(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [criterionId]: value
      }
    }));
  };

  const handleCommentChange = (teamId, value) => {
    if (!isTeamEditable(teamId)) return;
    setComments(prev => ({ ...prev, [teamId]: value }));
  };

  const handleUnlockTeam = (teamId) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      toast.error('หมดเขตการประเมินแล้ว ไม่สามารถปลดล็อกแก้ไขได้');
      return;
    }
    if (statuses[teamId] !== 'SUBMITTED') return;
    setUnlockedTeams((prev) => ({ ...prev, [teamId]: true }));
  };

  const handleSaveDraft = (teamId) => {
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      toast.error('หมดเขตการประเมินแล้ว ไม่สามารถบันทึกได้');
      return;
    }
    if (!isTeamEditable(teamId)) return;
    const saved = saveEvaluation({
      projectId,
      teamId,
      judgeId,
      judgeName: user?.name || 'กรรมการ',
      scores: matrixScores[teamId],
      comment: comments[teamId] || '',
      totalScore: Number(teamTotals[teamId]),
      status: 'DRAFT',
    });
    if (!saved) {
      toast.error('หมดเขตการประเมินแล้ว ไม่สามารถบันทึกได้');
      return;
    }
    setStatuses((prev) => ({ ...prev, [teamId]: 'DRAFT' }));
    setUnlockedTeams((prev) => ({ ...prev, [teamId]: false }));
    toast.success('บันทึกแบบร่างเรียบร้อยแล้ว');
  };

  const confirmSubmit = () => {
    const teamId = confirmTeamId;
    if (!teamId) return;
    if (!isBeforeEvaluationDeadline(getProjectById(projectId))) {
      setIsConfirmOpen(false);
      setConfirmTeamId(null);
      toast.error('หมดเขตการประเมินแล้ว ไม่สามารถส่งคะแนนได้');
      return;
    }
    if (!isTeamEditable(teamId) || !isTeamAnswered(teamId)) return;
    const saved = saveEvaluation({
      projectId,
      teamId,
      judgeId,
      judgeName: user?.name || 'กรรมการ',
      scores: matrixScores[teamId],
      comment: comments[teamId] || '',
      totalScore: Number(teamTotals[teamId]),
      status: 'SUBMITTED',
    });
    if (!saved) {
      setIsConfirmOpen(false);
      setConfirmTeamId(null);
      toast.error('หมดเขตการประเมินแล้ว ไม่สามารถส่งคะแนนได้');
      return;
    }
    setStatuses((prev) => ({ ...prev, [teamId]: 'SUBMITTED' }));
    setUnlockedTeams((prev) => ({ ...prev, [teamId]: false }));
    setIsConfirmOpen(false);
    setConfirmTeamId(null);
    toast.success('ส่งคะแนนทีมเรียบร้อยแล้ว');
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <BackButton to={`/judge/project/${projectId}/teams`}>
        กลับไปหน้ารายชื่อทีม
      </BackButton>

      <PageHeader
        title="ประเมินเปรียบเทียบ (Multi-Team Evaluation)"
        description={`ให้คะแนนแต่ละทีมพร้อมกันในหน้าเดียว โครงการ #${projectId}`}
      />

      {!canEdit && (
        <Card className="bg-red-50 border-red-200">
          <p className="text-sm text-red-700">หมดเขตการประเมินแล้ว ไม่สามารถแก้ไขหรือส่งคะแนนได้</p>
        </Card>
      )}

      {eligibleTeams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-10">ไม่มีทีมที่คุณสามารถประเมินได้ในขณะนี้</p></Card>
      ) : (
        <>
          {/* ส่วนตัวกรองทีมที่ต้องการแสดงผล */}
          <Card className="bg-gray-50 border-gray-200">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">เลือกทีมที่ต้องการแสดงเปรียบเทียบในตาราง</h3>
                <div className="flex gap-2">
                  <Button variant="text" size="sm" onClick={() => setSelectedTeamIds(eligibleTeams.map(t => t.id))}>
                    เลือกทั้งหมด
                  </Button>
                  <Button variant="textGray" size="sm" onClick={() => setSelectedTeamIds([])}>
                    ล้างทั้งหมด
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {eligibleTeams.map(team => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamIds(prev =>
                          isSelected ? prev.filter(id => id !== team.id) : [...prev, team.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {team.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* ตารางเปรียบเทียบคะแนน */}
          <Card noPadding className="overflow-hidden">
            {displayedTeams.length === 0 ? (
              <div className="p-10 text-center text-gray-500">กรุณาเลือกทีมจากด้านบนอย่างน้อย 1 ทีมเพื่อเริ่มการประเมิน</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-4 font-bold text-gray-800 sticky left-0 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb] z-10 w-64">
                        เกณฑ์ประเมิน / ชื่อทีม
                      </th>
                      {/* เปลี่ยนจากการแมปลูป eligibleTeams เป็น displayedTeams */}
                      {displayedTeams.map(team => (
                        <th key={team.id} className="px-6 py-4 font-bold text-gray-800 text-center border-l min-w-[280px]">
                          {team.name}
                          {team.link && (
                            <div className="mt-1">
                              <a
                                href={team.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-xs font-normal text-blue-600 hover:underline break-all"
                              >
                                ดูผลงาน &rarr;
                              </a>
                            </div>
                          )}
                          <div className="mt-1">
                            {statuses[team.id] === 'SUBMITTED'
                              ? <Badge variant="success">ส่งแล้ว</Badge>
                              : statuses[team.id] === 'DRAFT'
                                ? <Badge variant="warning">ร่าง</Badge>
                                : <Badge variant="default">ยังไม่เริ่ม</Badge>}
                          </div>
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            {statuses[team.id] === 'SUBMITTED' && !unlockedTeams[team.id] ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUnlockTeam(team.id)}
                                disabled={!canEdit}
                              >
                                ปลดล็อกแก้ไข
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSaveDraft(team.id)}
                                  disabled={!isTeamEditable(team.id)}
                                >
                                  บันทึกร่าง
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!isTeamEditable(team.id) || !isTeamAnswered(team.id)) return;
                                    setConfirmTeamId(team.id);
                                    setIsConfirmOpen(true);
                                  }}
                                  disabled={!isTeamEditable(team.id) || !isTeamAnswered(team.id)}
                                >
                                  {statuses[team.id] === 'SUBMITTED' ? 'ส่งอีกครั้ง' : 'ส่งคะแนน'}
                                </Button>
                              </>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-blue-50/50 border-b border-gray-200">
                      <td className="px-6 py-3 font-semibold text-blue-800 sticky left-0 bg-blue-50 shadow-[1px_0_0_0_#e5e7eb] z-10">
                        คะแนนรวมโดยประมาณ
                      </td>
                      {displayedTeams.map(team => (
                        <td key={team.id} className="px-6 py-3 text-center border-l border-gray-200 font-mono text-xl font-bold text-blue-700">
                          {teamTotals[team.id]}
                        </td>
                      ))}
                    </tr>

                    {criteria.map(criterion => (
                      <tr key={criterion.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                        <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 shadow-[1px_0_0_0_#e5e7eb] z-10 align-top">
                          <p className="font-semibold text-gray-900">{criterion.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {criterion.type} · Weight: {criterion.weight}%
                          </p>
                          {criterion.description && (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                              {criterion.description}
                            </p>
                          )}
                        </td>
                        {displayedTeams.map(team => (
                          <td key={team.id} className="px-6 py-4 border-l border-gray-200 align-top">
                            <CriterionScoreInput
                              criterion={criterion}
                              value={matrixScores[team.id]?.[criterion.id] ?? null}
                              onChange={(val) => handleScoreChange(team.id, criterion.id, val)}
                              disabled={!isTeamEditable(team.id)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    
                    <tr className="border-b border-gray-200">
                      <td className="px-6 py-4 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] z-10 align-top">
                        <p className="font-semibold text-gray-900">ข้อเสนอแนะเพิ่มเติม</p>
                      </td>
                      {displayedTeams.map(team => (
                        <td key={team.id} className="px-6 py-4 border-l border-gray-200 align-top">
                          <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 disabled:bg-gray-100"
                            placeholder="คำแนะนำ..."
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
        title="ยืนยันการส่งคะแนน"
        message={`ยืนยันการส่งคะแนน${displayedTeams.find((team) => team.id === confirmTeamId)?.name ? `ของทีม ${displayedTeams.find((team) => team.id === confirmTeamId).name}` : ''}หรือไม่? สามารถแก้ไขและส่งใหม่ได้ก่อน Deadline`}
        onConfirm={confirmSubmit}
        onCancel={() => {
          setIsConfirmOpen(false);
          setConfirmTeamId(null);
        }}
        confirmText="ส่งคะแนน"
      />
    </div>
  );
}