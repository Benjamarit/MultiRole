import api from './client';
import { resolveJudgeIdentity } from '../data/judges/JudgeIdentity';
import { orderTeams } from '../data/teams/TeamOrdering';

// Only server responses enter this cache. IDs remain UUID strings throughout the UI.
export const workspace = { user: null, projects: [], details: {}, notifications: [] };
let generation = 0;
export function clearWorkspace() {
  generation += 1;
  Object.assign(workspace, { user: null, projects: [], details: {}, notifications: [] });
}
export const projectPath = (id) => `/competitions/${id}`;
export const detail = (id) => workspace.details[id] || { teams: [], criteria: [], groups: [], members: [], assignments: [], evaluations: [] };
export const normalizeUser = (u) => ({ ...u, id: u.userId || u.id, name: u.fullName || u.name,
  role: u.role === 'ADMIN' ? 'SYSTEM_ADMIN' : u.role,
  status: u.status?.toUpperCase() === 'SUSPENDED' ? 'Suspended' : 'Active' });
export const normalizeTeam = (t) => ({ id: t.teamId, name: t.teamName, description: t.projectDescription || '', link: t.projectUrl || '', displayOrder: t.displayOrder ?? null });
export const normalizeCriterion = (c) => ({ id: c.criterionId, name: c.title, description: c.description || '', type: c.scoringType, maxScore: c.maxScore, weight: c.weightPercentage });
export const normalizeEvaluation = (e) => ({ ...e, id: e.evaluationId, projectId: e.competitionId,
  judgeName: resolveJudgeIdentity(e, detail(e.competitionId).members).name,
  judgeEmail: resolveJudgeIdentity(e, detail(e.competitionId).members).email,
  scores: Object.fromEntries(e.scores.map((s) => [s.criterionId, s.scoreValue])),
  criteriaComments: Object.fromEntries(e.scores.map((s) => [s.criterionId, s.comment || ''])) });

export async function loadProject(id, user = workspace.user) {
  const currentGeneration = generation;
  const { data: p } = await api.get(projectPath(id));
  const admin = ['ADMIN', 'ADMIN_JUDGE'].includes(p.currentRole) || user.role === 'SYSTEM_ADMIN';
  const results = await Promise.all(['teams', 'criteria', 'groups', 'assignments'].map((path) => api.get(`${projectPath(id)}/${path}`)));
  const [members, evaluations] = await Promise.all([
    admin ? api.get(`${projectPath(id)}/members`) : Promise.resolve({ data: [{ userId: user.id, email: user.email, fullName: user.name, role: 'JUDGE' }] }),
    api.get(`/evaluations/competition/${id}`),
  ]);
  const [teams, criteria, groups, assignments] = results.map((r) => r.data);
  const project = { ...p, id: p.competitionId, name: p.title, type: p.category || '',
    status: ({ DRAFT: 'Draft', ACTIVE: 'Active', CLOSED: 'Closed' })[p.status] || p.status,
    teamsCount: teams.length,
    judgeEmails: members.data.filter((m) => ['JUDGE', 'ADMIN_JUDGE'].includes(m.role)).map((m) => m.email),
    judgeAssignments: members.data.filter((m) => ['JUDGE', 'ADMIN_JUDGE'].includes(m.role)).map((m) => ({ id: m.userId, email: m.email, name: m.fullName })) };
  if (generation !== currentGeneration) return;
  workspace.details[id] = { teams: orderTeams(teams.map(normalizeTeam)), criteria: criteria.map(normalizeCriterion),
    groups: groups.map((g) => ({ id: g.groupId, name: g.groupName, teamIds: g.teamIds })),
    members: members.data, assignments, evaluations: [] };
  workspace.details[id].evaluations = evaluations.data.map(normalizeEvaluation);
  workspace.projects = [...workspace.projects.filter((entry) => entry.id !== id), project];
  return project;
}

export async function refreshNotifications() {
  const currentGeneration = generation;
  const { data } = await api.get('/notifications');
  if (currentGeneration !== generation) return;
  workspace.notifications = data.map((n) => ({ ...n, id: n.notificationId, projectId: n.competitionId }));
}

export async function loadWorkspace(user) {
  const currentGeneration = generation;
  workspace.user = user;
  const { data } = await api.get('/competitions');
  if (currentGeneration !== generation) return;
  // Keep the current cache visible while background requests are in flight.
  await Promise.all(data.map((p) => loadProject(p.competitionId, user)));
  if (currentGeneration !== generation) return;
  const projectIds = new Set(data.map(p => p.competitionId));
  workspace.projects = workspace.projects.filter(p => projectIds.has(p.id));
  workspace.details = Object.fromEntries(Object.entries(workspace.details).filter(([id]) => projectIds.has(id)));
  await refreshNotifications();
}

export const competitionRequest = (p) => ({ title: p.name, description: p.description || '', category: p.type || '', evaluationDeadline: p.evaluationDeadline || null });
