import api from '../../api/client';
import { detail, loadProject, normalizeEvaluation, workspace } from '../../api/workspace';
import { scorePayload } from './EvaluationPayload';
export const getEvaluationsByProject = (id) => detail(id).evaluations;
export const getEvaluation = (id, teamId, judgeId) => getEvaluationsByProject(id).find((e) => e.teamId === teamId && e.judgeId === judgeId);
export async function saveEvaluation(e) {
  await api.post('/evaluations/save', { competitionId: e.projectId, teamId: e.teamId,
    comment: e.comment || '', status: e.status,
    scores: scorePayload(e.scores, e.criteriaComments) });
  const { data } = await api.get('/evaluations/competition/' + e.projectId + '/team/' + e.teamId + '/mine');
  await loadProject(e.projectId);
  return normalizeEvaluation(data);
}

export async function saveDraftsBatch(projectId, entries) {
  const actorId = workspace.user?.id;
  const { data } = await api.post('/evaluations/draft-batch', { competitionId: projectId,
    teams: entries.map(entry => ({ teamId: entry.teamId, comment: entry.comment || '',
      scores: scorePayload(entry.scores, entry.criteriaComments) })) }, { timeout: 60000 });
  const results = data.results.map(result => ({ ...result,
    evaluation: result.evaluation ? normalizeEvaluation(result.evaluation) : null }));
  if (actorId === workspace.user?.id) {
    const cache = detail(projectId);
    for (const result of results) {
      if (['DRAFT_SAVED', 'ALREADY_SUBMITTED'].includes(result.outcome) && result.evaluation) {
        cache.evaluations = [...cache.evaluations.filter(e => !(e.teamId === result.teamId && e.judgeId === actorId)), result.evaluation];
      }
    }
  }
  return results;
}

// One network request. Only confirmed server receipts enter the shared cache.
export async function submitEvaluationsBatch(projectId, entries) {
  const actorId = workspace.user?.id;
  const { data } = await api.post('/evaluations/submit-batch', {
    competitionId: projectId,
    teams: entries.map(entry => ({ teamId: entry.teamId, comment: entry.comment || '',
      scores: Object.entries(entry.scores).filter(([, value]) => value !== null && value !== undefined)
        .map(([criterionId, scoreValue]) => ({ criterionId, scoreValue, comment: entry.criteriaComments?.[criterionId] || '' })) })),
  }, { timeout: 60000 });
  const results = data.results.map(result => ({ ...result,
    evaluation: result.evaluation ? normalizeEvaluation(result.evaluation) : null }));
  if (actorId === workspace.user?.id) {
    const cache = detail(projectId);
    for (const result of results) {
      if (['SUBMITTED', 'ALREADY_SUBMITTED'].includes(result.outcome) && result.evaluation) {
        cache.evaluations = [...cache.evaluations.filter(e => e.id !== result.evaluation.id), result.evaluation];
      }
    }
  }
  return results;
}
