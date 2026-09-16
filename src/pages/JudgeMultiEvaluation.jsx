import { useState, useMemo, useCallback } from 'react';
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

  const [confirmTarget, setConfirmTarget] = useState(null); // null=ปิด | 'all' | teamId

  // แบ่งหน้าทีมที่แสดงในตาราง (แยกจาก eligibleTeams ที่ใช้บันทึก/ส่งคะแนนทั้งหมดเสมอ)
  const [pageSize, setPageSize] = useState(5); // 5 | 10 | Infinity (ทั้งหมด)
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(eligibleTeams.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const pagedTeams = useMemo(() => {
    if (!Number.isFinite(pageSize)) return eligibleTeams;
    const start = currentPageIndex * pageSize;
    return eligibleTeams.slice(start, start + pageSize);
  }, [eligibleTeams, pageSize, currentPageIndex]);

  const handlePageSizeChange = (value) => {
    setPageSize(value === 'all' ? Infinity : Number(value));
    setPageIndex(0);
  };

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

  // เช็กว่าทีมนี้กรอกครบทุกเกณฑ์แล้วหรือยัง (ใช้ตัดสินว่าส่งทีมนี้ได้เลยหรือยัง)
  const isTeamAnswered = useCallback(
    (teamId) =>
      criteria.every(c => matrixScores[teamId]?.[c.id] !== undefined && matrixScores[teamId]?.[c.id] !== null),
    [criteria, matrixScores]
  );

  // ทีมที่ยังไม่ได้ส่งและกรอกครบแล้ว พร้อมส่งได้ทันที
  const readyToSubmitTeamIds = useMemo(
    () => eligibleTeams.filter(t => statuses[t.id] !== 'SUBMITTED' && isTeamAnswered(t.id)).map(t => t.id),
    [eligibleTeams, statuses, isTeamAnswered]
  );

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

  // ปลดล็อกทีมที่ส่งคะแนนไปแล้วให้แก้ไขได้อีกครั้ง (เหมือนปุ่ม "แก้ไขคะแนน" ในหน้าประเมินทีมเดียว)
  // เป็นการปลดล็อกฝั่ง UI เท่านั้น ข้อมูลใน storage จะยังเป็น SUBMITTED จนกว่าจะกดบันทึกร่าง/ส่งคะแนนซ้ำ
  const handleUnlockTeam = (teamId) => {
    setStatuses(prev => ({ ...prev, [teamId]: 'DRAFT' }));
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

  // แกนกลางของการส่งคะแนน — รับ array ของ teamId ที่จะส่ง ใช้ร่วมกันทั้งส่งทีเดียวหลายทีมและส่งทีละทีม
  const submitTeams = (teamIds) => {
    const now = new Date().toISOString();
    const newStatuses = { ...statuses };

    teamIds.forEach(teamId => {
      if (statuses[teamId] === 'SUBMITTED') return;
      saveEvaluation({
        projectId,
        teamId,
        judgeId,
        judgeName: user?.name || 'กรรมการ',
        scores: matrixScores[teamId],
        criteriaComments: criteriaComments[teamId] || {},
        comment: comments[teamId] || '',
        totalScore: Number(teamTotals[teamId]),
        status: 'SUBMITTED',
        submittedAt: now,
      });
      newStatuses[teamId] = 'SUBMITTED';
    });

    setStatuses(newStatuses);
  };

  const handleConfirmSubmit = () => {
    if (confirmTarget === 'all') {
      submitTeams(readyToSubmitTeamIds);
      toast.success(`ส่งคะแนนสำเร็จ ${readyToSubmitTeamIds.length} ทีม (ทีมที่ยังกรอกไม่ครบถูกข้ามไว้)`);
    } else if (confirmTarget) {
      const team = eligibleTeams.find(t => t.id === confirmTarget);
      submitTeams([confirmTarget]);
      toast.success(`ส่งคะแนนทีม "${team?.name}" สำเร็จแล้ว`);
    }
    setConfirmTarget(null);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Link to={`/judge/project/${projectId}/teams`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้ารายชื่อทีม
      </Link>

      <PageHeader
        title="ประเมินเปรียบเทียบ (Multi-Team Evaluation)"
        description={`ให้คะแนนทุกทีมพร้อมกันในหน้าเดียว โครงการ #${projectId} — ส่งคะแนนได้ทีละทีมทันทีที่กรอกครบ ไม่ต้องรอทีมอื่น`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSaveDraft}>บันทึกแบบร่างทั้งหมด</Button>
            <Button
              onClick={() => setConfirmTarget('all')}
              disabled={readyToSubmitTeamIds.length === 0}
            >
              ส่งคะแนนที่กรอกครบแล้ว {readyToSubmitTeamIds.length > 0 ? `(${readyToSubmitTeamIds.length})` : ''}
            </Button>
          </div>
        }
      />

      {eligibleTeams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-10">ไม่มีทีมที่คุณสามารถประเมินได้ในขณะนี้</p></Card>
      ) : (
        <>
          {eligibleTeams.length > 5 && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label htmlFor="page-size" className="text-gray-600">
                แสดงต่อหน้า:
              </label>
              <select
                id="page-size"
                value={Number.isFinite(pageSize) ? pageSize : 'all'}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={5}>5 ทีม</option>
                <option value={10}>10 ทีม</option>
                <option value="all">ทั้งหมด ({eligibleTeams.length} ทีม)</option>
              </select>

              {Number.isFinite(pageSize) && pageCount > 1 && (
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={currentPageIndex === 0}
                  >
                    &larr; ก่อนหน้า
                  </Button>
                  <span className="text-gray-500">
                    ทีม {currentPageIndex * pageSize + 1}-
                    {Math.min((currentPageIndex + 1) * pageSize, eligibleTeams.length)} จาก{' '}
                    {eligibleTeams.length} (หน้า {currentPageIndex + 1}/{pageCount})
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={currentPageIndex >= pageCount - 1}
                  >
                    ถัดไป &rarr;
                  </Button>
                </div>
              )}
            </div>
          )}

          <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 font-bold text-gray-800 sticky left-0 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb] z-10 w-64">
                    เกณฑ์ประเมิน / ชื่อทีม
                  </th>
                  {pagedTeams.map(team => (
                    <th key={team.id} className="px-6 py-4 font-bold text-gray-800 text-center border-l min-w-[280px]">
                      {team.name}
                      <div className="mt-1 flex items-center justify-center gap-2">
                        {statuses[team.id] === 'SUBMITTED' ? (
                          <>
                            <Badge variant="success">ส่งแล้ว</Badge>
                            <button
                              type="button"
                              onClick={() => handleUnlockTeam(team.id)}
                              className="text-xs font-normal text-blue-600 hover:underline"
                            >
                              แก้ไขคะแนน
                            </button>
                          </>
                        ) : (
                          <>
                            <Badge variant="warning">ร่าง</Badge>
                            <button
                              type="button"
                              onClick={() => setConfirmTarget(team.id)}
                              disabled={!isTeamAnswered(team.id)}
                              className="text-xs font-normal text-blue-600 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed disabled:no-underline"
                            >
                              ส่งคะแนนทีมนี้
                            </button>
                          </>
                        )}
                      </div>
                      {team.link && (
                        <a
                          href={team.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-normal text-blue-600 hover:underline"
                        >
                          ดูผลงาน &rarr;
                        </a>
                      )}
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
                  {pagedTeams.map(team => (
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
                    {pagedTeams.map(team => (
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
                  {pagedTeams.map(team => (
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
        </>
      )}

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title={confirmTarget === 'all' ? 'ยืนยันการส่งคะแนนที่กรอกครบแล้ว' : 'ยืนยันการส่งคะแนน'}
        message={
          confirmTarget === 'all'
            ? `จะส่งคะแนน ${readyToSubmitTeamIds.length} ทีมที่กรอกครบแล้ว (ทีมที่ยังกรอกไม่ครบจะถูกข้ามไว้ ส่งทีหลังได้) หลังส่งแล้วแต่ละทีมจะถูกล็อก ต้องกด "แก้ไขคะแนน" ก่อนจึงจะแก้ไขได้อีกครั้ง คุณมั่นใจหรือไม่?`
            : `คุณกำลังจะส่งคะแนนของทีม "${eligibleTeams.find(t => t.id === confirmTarget)?.name}" หลังส่งแล้วคะแนนจะถูกล็อก ต้องกด "แก้ไขคะแนน" ก่อนจึงจะแก้ไขได้อีกครั้ง คุณมั่นใจหรือไม่?`
        }
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmTarget(null)}
        confirmText={confirmTarget === 'all' ? 'ส่งคะแนนที่กรอกครบแล้ว' : 'ส่งคะแนนทีมนี้'}
      />
    </div>
  );
}