import {
  getProjectById,
  isBeforeEvaluationDeadline,
  isJudgeAssignedToTeam,
} from './ProjectStore';
import { getTeamsByProject } from './TeamStore';
import { getCriteriaByProject } from './CriteriaStore';
import { calculateWeightedScore, isValidCriterionScore } from './Scoring';

const EVALUATIONS_KEY = 'ce_project_evaluations';

function readAll() {
  try {
    const stored = localStorage.getItem(EVALUATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeAll(evaluations) {
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(evaluations));
}

function normalizeEvaluation(evaluation) {
  return {
    ...evaluation,
    projectId: Number(evaluation.projectId),
    teamId: Number(evaluation.teamId),
    judgeId: String(evaluation.judgeId),
    status: evaluation.status || 'DRAFT',
    submittedAt: evaluation.submittedAt || null,
    updatedAt: evaluation.updatedAt || null,
  };
}

export function getEvaluation(projectId, teamId, judgeId) {
  const evaluation = readAll().find(
    (evaluation) =>
      Number(evaluation.projectId) === Number(projectId) &&
      Number(evaluation.teamId) === Number(teamId) &&
      String(evaluation.judgeId) === String(judgeId)
  );
  return evaluation ? normalizeEvaluation(evaluation) : undefined;
}

export function getEvaluationsByProject(projectId) {
  return readAll()
    .filter((evaluation) => Number(evaluation.projectId) === Number(projectId))
    .map(normalizeEvaluation);
}

export function deleteProjectEvaluations(projectId) {
  const numericProjectId = Number(projectId);
  writeAll(readAll().filter((evaluation) => Number(evaluation.projectId) !== numericProjectId));
}

export function saveEvaluation(evaluation) {
  const project = getProjectById(evaluation.projectId);
  if (!project) throw new Error('ไม่พบโครงการที่ต้องการบันทึกผลประเมิน');
  if (!getTeamsByProject(evaluation.projectId).some(
    (team) => Number(team.id) === Number(evaluation.teamId)
  )) {
    throw new Error('ทีมนี้ไม่ได้อยู่ในโครงการที่เลือก');
  }
  if (!isJudgeAssignedToTeam(evaluation.projectId, evaluation.judgeId, evaluation.teamId)) {
    throw new Error('คุณไม่ได้รับมอบหมายให้ประเมินทีมนี้');
  }
  if (!isBeforeEvaluationDeadline(project)) return null;
  if (!['DRAFT', 'SUBMITTED'].includes(evaluation.status)) {
    throw new Error('สถานะผลประเมินไม่ถูกต้อง');
  }

  const criteria = getCriteriaByProject(evaluation.projectId);
  const scores = evaluation.scores || {};
  const criterionById = new Map(criteria.map((criterion) => [String(criterion.id), criterion]));
  for (const [criterionId, value] of Object.entries(scores)) {
    const criterion = criterionById.get(String(criterionId));
    if (!criterion) throw new Error('พบคะแนนของเกณฑ์ที่ไม่ได้อยู่ในโครงการนี้');
    if (!isValidCriterionScore(criterion, value)) {
      throw new Error(`คะแนนของเกณฑ์ "${criterion.name}" อยู่นอกช่วงที่กำหนด`);
    }
  }
  for (const criterionId of Object.keys(evaluation.criteriaComments || {})) {
    if (!criterionById.has(String(criterionId))) {
      throw new Error('พบความคิดเห็นของเกณฑ์ที่ไม่ได้อยู่ในโครงการนี้');
    }
  }
  if (evaluation.status === 'SUBMITTED' && (
    criteria.length === 0 ||
    criteria.some((criterion) =>
      scores[criterion.id] === undefined || scores[criterion.id] === null
    )
  )) {
    throw new Error('กรุณาให้คะแนนครบทุกเกณฑ์ก่อนส่งผลประเมิน');
  }

  const evaluations = readAll();
  const existingIndex = evaluations.findIndex(
    (item) =>
      Number(item.projectId) === Number(evaluation.projectId) &&
      Number(item.teamId) === Number(evaluation.teamId) &&
      String(item.judgeId) === String(evaluation.judgeId)
  );
  const savedEvaluation = normalizeEvaluation({
    ...evaluation,
    totalScore: calculateWeightedScore(criteria, scores),
    submittedAt: evaluation.status === 'SUBMITTED' ? evaluation.submittedAt || new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
  if (existingIndex >= 0) {
    evaluations[existingIndex] = savedEvaluation;
  } else {
    evaluations.push(savedEvaluation);
  }
  writeAll(evaluations);
  return savedEvaluation;
}
