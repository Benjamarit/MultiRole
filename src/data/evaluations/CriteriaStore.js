import api from '../../api/client';
import { detail, projectPath, loadProject, normalizeCriterion, workspace } from '../../api/workspace';
import { criteriaBatchRequest } from './CriteriaBatch';
export const getCriteriaByProject = (id) => detail(id).criteria;
export const getTotalCriteriaWeight = (id) => getCriteriaByProject(id).reduce((sum, c) => sum + Number(c.weight), 0);
export const hasCompleteCriteriaWeights = (id) => getCriteriaByProject(id).length > 0 && getTotalCriteriaWeight(id) === 100;
export async function saveCriterion(id, criterion) {
  const path = projectPath(id) + '/criteria';
  const { data } = await api[criterion.id ? 'put' : 'post'](criterion.id ? path + '/' + criterion.id : path,
    { title: criterion.name, description: criterion.description || '', scoringType: criterion.type,
      maxScore: criterion.maxScore, weightPercentage: criterion.weight });
  await loadProject(id);
  return normalizeCriterion(data);
}
export async function deleteCriterion(id, criterionId) {
  await api.delete(projectPath(id) + '/criteria/' + criterionId);
  await loadProject(id);
}
export async function reorderCriteria(id, criterionIds) {
  await api.put(projectPath(id) + '/criteria/order', { criterionIds });
  await loadProject(id);
}

export async function saveCriteriaBatch(id, criteria, baseline) {
  const actor = workspace.user;
  const { data } = await api.put(projectPath(id) + '/criteria/batch', criteriaBatchRequest(criteria, baseline), { timeout: 60000 });
  const saved = data.map(normalizeCriterion);
  if (actor === workspace.user) detail(id).criteria = saved;
  return saved;
}
