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

export function saveEvaluation(evaluation) {
  const evaluations = readAll();
  const existingIndex = evaluations.findIndex(
    (item) =>
      Number(item.projectId) === Number(evaluation.projectId) &&
      Number(item.teamId) === Number(evaluation.teamId) &&
      String(item.judgeId) === String(evaluation.judgeId)
  );
  const savedEvaluation = normalizeEvaluation({
    ...evaluation,
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
