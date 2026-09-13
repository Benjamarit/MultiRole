import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import CriterionScoreInput from '../components/CriteriaScoreInput';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation, saveEvaluation } from '../data/EvaluationStore';
import { getJudgeAssignments } from '../data/ProjectStore';
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
  const allTeams = getTeamsByProject(projectId);
  const assignments = getJudgeAssignments(projectId);
  
  // หาทีมที่ตัวเองติด COI เพื่อนำไปกรองออก
  const myAssignment = assignments.find((a) => (a.email || a.id) === judgeId);
  const coiTeamIds = myAssignment?.coiTeamIds || [];
  const eligibleTeams = allTeams.filter(t => !coiTeamIds.includes(t.id));

  // ดึงคะแนนเดิม (ถ้ามี) มาใส่ใน State แบบ Nested Object: { teamId: { criterionId: score } }
  // และดึง comment/status มาด้วย
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

  // Comment แยกรายเกณฑ์ต่อทีม: { [teamId]: { [criterionId]: text } }
  const [criteriaComments, setCriteriaComments] = useState(() => {
    const initial = {};
    eligibleTeams.forEach(team => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initial[team.id] = evalData?.criteriaComments || {};
    });
    return initial;
  });

  const [statuses, setStatuses] = useState(() => {
    const initialStatuses = {};
    eligibleTeams.forEach(team => {
      const evalData = getEvaluation(projectId, team.id, judgeId);
      initialStatuses[team.id] = evalData?.status || 'NOT_STARTED';
    });
    return initialStatuses;
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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

  // เช็กว่ากรอกครบทุกทีม+ทุกเกณฑ์แล้วหรือยัง
  const allAnswered = useMemo(() => {
    return eligibleTeams.every(team => 
      criteria.every(c => matrixScores[team.id]?.[c.id] !== undefined && matrixScores[team.id]?.[c.id] !== null)
    );
  }, [criteria, eligibleTeams, matrixScores]);

  const handleScoreChange = (teamId, criterionId, value) => {
    if (statuses[teamId] === 'SUBMITTED') return; // ล็อกไว้ถ้าทีมนี้กดส่งแล้ว
    
    setMatrixScores(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [criterionId]: value
      }
    }));
  };

  const handleCommentChange = (teamId, value) => {
    if (statuses[teamId] === 'SUBMITTED') return;
    setComments(prev => ({ ...prev, [teamId]: value }));
  };

  const handleCriterionCommentChange = (teamId, criterionId, value) => {
    if (statuses[teamId] === 'SUBMITTED') return;
    setCriteriaComments(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], [criterionId]: value },
    }));
  };

  const handleSaveDraft = () => {
    eligibleTeams.forEach(team => {
      if (statuses[team.id] === 'SUBMITTED') return; // ไม่เซฟทับตัวที่ส่งแล้ว
      saveEvaluation({
        projectId,
        teamId: team.id,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores: matrixScores[team.id],
        criteriaComments: criteriaComments[team.id] || {},
        comment: comments[team.id] || '',
        totalScore: Number(teamTotals[team.id]),
        status: 'DRAFT',
      });
    });
    toast.success('บันทึกแบบร่างทุกทีมเรียบร้อยแล้ว');
  };

  const confirmSubmitAll = () => {
    const now = new Date().toISOString();
    const newStatuses = { ...statuses };

    eligibleTeams.forEach(team => {
      if (statuses[team.id] === 'SUBMITTED') return; 
      saveEvaluation({
        projectId,
        teamId: team.id,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores: matrixScores[team.id],
        criteriaComments: criteriaComments[team.id] || {},
        comment: comments[team.id] || '',
        totalScore: Number(teamTotals[team.id]),
        status: 'SUBMITTED',
        submittedAt: now,
      });
      newStatuses[team.id] = 'SUBMITTED';
    });

    setStatuses(newStatuses);
    setIsConfirmOpen(false);
    toast.success('ส่งคะแนนทุกทีมสำเร็จ ระบบบันทึกข้อมูลแล้ว');
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Link to={`/judge/project/${projectId}/teams`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้ารายชื่อทีม
      </Link>

      <PageHeader
        title="ประเมินเปรียบเทียบ (Multi-Team Evaluation)"
        description={`ให้คะแนนทุกทีมพร้อมกันในหน้าเดียว โครงการ #${projectId}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSaveDraft}>บันทึกแบบร่างทั้งหมด</Button>
            <Button onClick={() => setIsConfirmOpen(true)} disabled={!allAnswered}>ส่งคะแนนทั้งหมด</Button>
          </div>
        }
      />

      {eligibleTeams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-10">ไม่มีทีมที่คุณสามารถประเมินได้ในขณะนี้</p></Card>
      ) : (
        <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 font-bold text-gray-800 sticky left-0 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb] z-10 w-64">
                    เกณฑ์ประเมิน / ชื่อทีม
                  </th>
                  {eligibleTeams.map(team => (
                    <th key={team.id} className="px-6 py-4 font-bold text-gray-800 text-center border-l min-w-[280px]">
                      {team.name}
                      <div className="mt-1">
                        {statuses[team.id] === 'SUBMITTED' 
                          ? <Badge variant="success">ส่งแล้ว</Badge>
                          : <Badge variant="warning">ร่าง</Badge>
                        }
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* แถวแสดงคะแนนรวม (ช่วยให้ตัดสินใจง่ายขึ้น) */}
                <tr className="bg-blue-50/50 border-b border-gray-200">
                  <td className="px-6 py-3 font-semibold text-blue-800 sticky left-0 bg-blue-50 shadow-[1px_0_0_0_#e5e7eb] z-10">
                    คะแนนรวมโดยประมาณ
                  </td>
                  {eligibleTeams.map(team => (
                    <td key={team.id} className="px-6 py-3 text-center border-l border-gray-200 font-mono text-xl font-bold text-blue-700">
                      {teamTotals[team.id]}
                    </td>
                  ))}
                </tr>

                {/* แถวเกณฑ์ต่างๆ */}
                {criteria.map(criterion => (
                  <tr key={criterion.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                    <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 shadow-[1px_0_0_0_#e5e7eb] z-10 align-top">
                      <p className="font-semibold text-gray-900">{criterion.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Weight: {criterion.weight}%</p>
                    </td>
                    {eligibleTeams.map(team => (
                      <td key={team.id} className="px-6 py-4 border-l border-gray-200 align-top">
                        <CriterionScoreInput
                          criterion={criterion}
                          value={matrixScores[team.id]?.[criterion.id] ?? null}
                          onChange={(val) => handleScoreChange(team.id, criterion.id, val)}
                          disabled={statuses[team.id] === 'SUBMITTED'}
                        />
                        <textarea
                          rows={2}
                          className="mt-2 w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-blue-500 disabled:bg-gray-100"
                          placeholder="หมายเหตุสำหรับเกณฑ์นี้ (ถ้ามี)"
                          value={criteriaComments[team.id]?.[criterion.id] || ''}
                          onChange={(e) => handleCriterionCommentChange(team.id, criterion.id, e.target.value)}
                          disabled={statuses[team.id] === 'SUBMITTED'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* แถวสำหรับ Comment */}
                <tr className="border-b border-gray-200">
                  <td className="px-6 py-4 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] z-10 align-top">
                    <p className="font-semibold text-gray-900">ข้อเสนอแนะเพิ่มเติม</p>
                  </td>
                  {eligibleTeams.map(team => (
                    <td key={team.id} className="px-6 py-4 border-l border-gray-200 align-top">
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="คำแนะนำ..."
                        value={comments[team.id]}
                        onChange={(e) => handleCommentChange(team.id, e.target.value)}
                        disabled={statuses[team.id] === 'SUBMITTED'}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการส่งคะแนนทั้งหมด"
        message="คุณกำลังจะส่งคะแนนให้ทุกทีมพร้อมกัน ข้อมูลที่ส่งแล้วจะถูกล็อกเพื่อรอประมวลผล คุณมั่นใจหรือไม่?"
        onConfirm={confirmSubmitAll}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ส่งคะแนนทุกทีม"
      />
    </div>
  );
}