import api from '../api/client';
import { workspace, projectPath, loadProject, competitionRequest } from '../api/workspace';
import { hasCompleteCriteriaWeights } from './CriteriaStore';
import { getTeamIdsForJudge, getJudgeIdsForTeam, replaceJudgeTeamAssignments } from './JudgeTeamAssignmentStore';
export const getAllProjects = () => workspace.projects;
export const getProjectById = (id) => workspace.projects.find((p) => p.id === String(id));
export const getMyProjects = (email) => workspace.projects.filter((p) => email === workspace.user?.email && ['ADMIN', 'ADMIN_JUDGE'].includes(p.currentRole));
export const getJudgingProjects = (email) => workspace.projects.filter((p) => email === workspace.user?.email && ['JUDGE', 'ADMIN_JUDGE'].includes(p.currentRole));
export const isProjectAdmin = (id, email) => Boolean(email === workspace.user?.email && ['ADMIN', 'ADMIN_JUDGE'].includes(getProjectById(id)?.currentRole));
export const isProjectNameTaken = (name) => workspace.projects.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
export const getJudgeAssignments = (id) => getProjectById(id)?.judgeAssignments || [];
export const getAssignedTeamIds = (id, judgeId) => getTeamIdsForJudge(id, judgeId);
export const getJudgeIdsAssignedToTeam = (id, teamId) => getJudgeAssignments(id).filter((j) => getJudgeIdsForTeam(id, teamId).includes(j.id));
export const isJudgeAssignedToTeam = (id, judgeId, teamId) => getAssignedTeamIds(id, judgeId).includes(teamId);
export const setJudgeAssignedTeams = replaceJudgeTeamAssignments;
export const isProjectReadyForEvaluation = (id) => getProjectById(id)?.status === 'Active' && hasCompleteCriteriaWeights(id);
export function isBeforeEvaluationDeadline(p) {
  return !p?.evaluationDeadline || Date.now() < new Date(p.evaluationDeadline).getTime();
}
export async function addProject(p) {
  const { data } = await api.post('/competitions', competitionRequest(p));
  return loadProject(data.competitionId);
}
export async function deleteProject(id) {
  await api.delete(projectPath(id));
  workspace.projects = workspace.projects.filter((p) => p.id !== id);
  delete workspace.details[id];
  return true;
}
export async function inviteJudgeToProject(id, email) {
  await api.post(projectPath(id) + '/members', { email, role: 'JUDGE' });
  await loadProject(id);
}
export async function removeJudgeAssignment(id, judgeId) {
  await api.delete(projectPath(id) + '/members/' + judgeId);
  await loadProject(id);
}
export async function updateProjectStatus(id, status) {
  await api.patch(projectPath(id) + '/status', { status: status.toUpperCase() });
  await loadProject(id);
  return true;
}
export async function updateProjectDetails(id, details) {
  await api.put(projectPath(id), competitionRequest({ ...getProjectById(id), ...details }));
  return loadProject(id);
}
