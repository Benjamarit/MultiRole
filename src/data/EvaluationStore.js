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

export function getEvaluation(projectId, teamId, judgeId) {
  return readAll().find(
    (evaluation) =>
      evaluation.projectId === Number(projectId) &&
      evaluation.teamId === Number(teamId) &&
      evaluation.judgeId === String(judgeId)
  );
}

export function getEvaluationsByProject(projectId) {
  return readAll().filter((evaluation) => evaluation.projectId === Number(projectId));
}

export function saveEvaluation(evaluation) {
  const evaluations = readAll();
  const existingIndex = evaluations.findIndex(
    (item) =>
      item.projectId === Number(evaluation.projectId) &&
      item.teamId === Number(evaluation.teamId) &&
      item.judgeId === String(evaluation.judgeId)
  );
  const savedEvaluation = {
    ...evaluation,
    projectId: Number(evaluation.projectId),
    teamId: Number(evaluation.teamId),
    judgeId: String(evaluation.judgeId),
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    evaluations[existingIndex] = savedEvaluation;
  } else {
    evaluations.push(savedEvaluation);
  }
  writeAll(evaluations);
  return savedEvaluation;
}
