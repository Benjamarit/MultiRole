import api from '../api/client';
import { detail, projectPath, loadProject, normalizeTeam } from '../api/workspace';
export const getTeamsByProject = (id) => detail(id).teams;
export async function saveTeam(id, team) {
  const path = projectPath(id) + '/teams';
  const { data } = await api[team.id ? 'put' : 'post'](team.id ? path + '/' + team.id : path,
    { teamName: team.name, projectDescription: team.description || '', projectUrl: team.link || '' });
  await loadProject(id);
  return normalizeTeam(data);
}
export async function deleteTeam(id, teamId) {
  await api.delete(projectPath(id) + '/teams/' + teamId);
  await loadProject(id);
}
export async function reorderTeams(id, teamIds) {
  const { data } = await api.put(`${projectPath(id)}/teams/order`, { teamIds });
  await loadProject(id);
  return data.map(normalizeTeam);
}
