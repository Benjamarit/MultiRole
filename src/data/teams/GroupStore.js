import api from '../../api/client';
import { detail, projectPath, loadProject, workspace } from '../../api/workspace';
export const getGroupsByProject = (id) => detail(id).groups;
export const getGroupForTeam = (id, teamId) => getGroupsByProject(id).find((g) => g.teamIds.includes(String(teamId)));
export const getTeamIdsInGroup = (id, groupId) => getGroupsByProject(id).find((g) => g.id === String(groupId))?.teamIds || [];
export async function createGroup(id, name) {
  await api.post(projectPath(id) + '/groups', { groupName: name.trim() });
  await loadProject(id);
}
export async function renameGroup(id, groupId, name) {
  await api.put(projectPath(id) + '/groups/' + groupId, { groupName: name.trim() });
  await loadProject(id);
}
export async function moveTeamToGroup(id, teamId, groupId) {
  await api.put(projectPath(id) + '/teams/' + teamId + '/group', { groupId: groupId || null });
  await loadProject(id);
}
export async function moveTeamsToGroup(id, teamIds, groupId) {
  const current = workspace.details[id];
  const actorId = workspace.user?.id;
  const { data } = await api.put(projectPath(id) + '/teams/group', { teamIds, groupId: groupId || null }, { timeout: 30000 });
  if (workspace.user?.id === actorId && workspace.details[id] === current && current) {
    current.groups = data.groups.map(group => ({ id: group.groupId, name: group.groupName, teamIds: group.teamIds }));
  }
  return data;
}
export async function deleteGroup(id, groupId) {
  await api.delete(projectPath(id) + '/groups/' + groupId);
  await loadProject(id);
}
