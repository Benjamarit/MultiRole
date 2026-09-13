import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast'; // นำเข้าไลบรารี
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import CriterionScoreInput from '../components/CriteriaScoreInput';
import { getCriteriaByProject } from '../data/CriteriaStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation, saveEvaluation } from '../data/EvaluationStore';
import { useAuth } from '../context/AuthContext';

function scoreLabel(criterion, value) {
  if (value === null || value === undefined) return null;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 'Pass' : 'Fail';
  if (criterion.type === 'STAR') return `${value} / ${criterion.maxScore} ดาว`;
  if (criterion.type === 'PERCENTAGE') return `${value}%`;
  return `${value} / ${criterion.maxScore}`;
}

function normalizedScore(criterion, value) {
  if (value === null || value === undefined) return 0;
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 100 : 0;
  return (value / criterion.maxScore) * 100;
}

export default function JudgeEvaluation() {
  const { projectId, teamId } = useParams();
  const { user } = useAuth();
  const criteria = getCriteriaByProject(projectId);
  const team = getTeamsByProject(projectId).find((item) => item.id === Number(teamId));
  const judgeId = user?.email || 'anonymous-judge';
  const savedEvaluation = getEvaluation(projectId, teamId, judgeId);

  const teamName = team?.name || `ทีม #${teamId}`;

  const [scores, setScores] = useState(() => savedEvaluation?.scores || {});
  const [criteriaComments, setCriteriaComments] = useState(
    () => savedEvaluation?.criteriaComments || {}
  );
  const [comment, setComment] = useState(() => savedEvaluation?.comment || '');
  const [isLocked, setIsLocked] = useState(() => savedEvaluation?.status === 'SUBMITTED');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const allAnswered = useMemo(
    () => criteria.every((c) => scores[c.id] !== undefined && scores[c.id] !== null),
    [criteria, scores]
  );

  const estimatedTotal = useMemo(() => {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
    const weighted = criteria.reduce(
      (sum, c) => sum + normalizedScore(c, scores[c.id]) * (c.weight / totalWeight),
      0
    );
    return weighted.toFixed(1);
  }, [criteria, scores]);

  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleCriterionCommentChange = (criterionId, value) => {
    setCriteriaComments((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleSaveDraft = () => {
    saveEvaluation({
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
    setDraftSavedAt(new Date());
    toast.success('บันทึกแบบร่างเรียบร้อยแล้ว'); // เพิ่มแจ้งเตือนเมื่อบันทึกร่าง
  };

  const handleSubmitClick = () => {
    if (!allAnswered) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmit = () => {
    saveEvaluation({
      projectId,
      teamId,
      judgeId,
      judgeName: user?.name || 'กรรมการ',
      scores,
      criteriaComments,
      comment,
      totalScore: Number(estimatedTotal),
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    });
    setIsLocked(true);
    setIsConfirmOpen(false);
    toast.success('ส่งคะแนนเรียบร้อยแล้ว ระบบได้ล็อกข้อมูลของคุณ'); // เพิ่มแจ้งเตือนเมื่อส่งคะแนน
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to={`/judge/project/${projectId}/teams`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้ารายชื่อทีมที่ต้องประเมิน
      </Link>

      <PageHeader
        title={`ประเมิน: ${teamName}`}
        description={`โครงการ #${projectId} — ให้คะแนนตามเกณฑ์ที่กำหนดไว้ด้านล่าง`}
        action={
          isLocked ? (
            <Badge variant="success">ส่งคะแนนแล้ว</Badge>
          ) : (
            <Badge variant="warning">Draft</Badge>
          )
        }
      />

      {/* คะแนนรวมโดยประมาณ คำนวณจาก weight ของแต่ละเกณฑ์ */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">คะแนนรวมโดยประมาณ (ถ่วงน้ำหนักแล้ว)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              คำนวณจาก weight ของแต่ละเกณฑ์ ค่านี้จะอัปเดตทันทีที่ให้คะแนน
            </p>
          </div>
          <span className="text-3xl font-bold text-blue-700">{estimatedTotal}</span>
        </div>
      </Card>

      <div className="space-y-4">
        {criteria.map((criterion) => (
          <Card key={criterion.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{criterion.name}</p>
                <p className="text-xs text-gray-500">
                  Weight {criterion.weight}%
                  {criterion.type !== 'PASS_FAIL' && criterion.type !== 'PERCENTAGE' && ` · เต็ม ${criterion.maxScore}`}
                </p>
              </div>
              {scoreLabel(criterion, scores[criterion.id]) && (
                <span className="text-sm font-medium text-gray-600">
                  {scoreLabel(criterion, scores[criterion.id])}
                </span>
              )}
            </div>
            <CriterionScoreInput
              criterion={criterion}
              value={scores[criterion.id] ?? null}
              onChange={(value) => handleScoreChange(criterion.id, value)}
              disabled={isLocked}
            />

            <div className="mt-3">
              <label
                htmlFor={`criterion-comment-${criterion.id}`}
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                ความคิดเห็นสำหรับเกณฑ์นี้ (ถ้ามี)
              </label>
              <textarea
                id={`criterion-comment-${criterion.id}`}
                rows={2}
                disabled={isLocked}
                value={criteriaComments[criterion.id] || ''}
                onChange={(e) => handleCriterionCommentChange(criterion.id, e.target.value)}
                placeholder={`เหตุผลของคะแนนที่ให้ ${criterion.name}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              />
            </div>
          </Card>
        ))}

        <Card>
          <label htmlFor="evaluation-comment" className="block text-sm font-medium text-gray-700 mb-2">
            ข้อเสนอแนะเพิ่มเติม (ไม่คิดคะแนน)
          </label>
          <textarea
            id="evaluation-comment"
            rows={4}
            disabled={isLocked}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="แสดงความคิดเห็นเกี่ยวกับทีมนี้"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
          />
        </Card>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-400">
          {draftSavedAt && !isLocked && `บันทึกร่างล่าสุด ${draftSavedAt.toLocaleTimeString('th-TH')}`}
          {!allAnswered && !isLocked && (
            <p className="text-amber-600">กรอกคะแนนให้ครบทุกหัวข้อก่อนส่งคะแนนจริง</p>
          )}
        </div>

        <div className="flex gap-2">
          {isLocked ? (
            <Button variant="secondary" onClick={() => setIsLocked(false)}>
              แก้ไขคะแนน
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleSaveDraft}>
                บันทึกร่าง
              </Button>
              <Button onClick={handleSubmitClick} disabled={!allAnswered}>
                ส่งคะแนน
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการส่งคะแนน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการส่งคะแนนของ "${teamName}"? หลังส่งแล้วคะแนนจะถูกล็อก ต้องกด "แก้ไขคะแนน" ก่อนจึงจะแก้ไขได้อีกครั้ง`}
        onConfirm={confirmSubmit}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ส่งคะแนน"
      />
    </div>
  );
}