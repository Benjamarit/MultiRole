import api from '../api/client';
import { detail, projectPath, loadProject } from '../api/workspace';
export const getTeamIdsForJudge = (id, judgeId) => detail(id).assignments.filter((a) => a.judgeId === judgeId).map((a) => a.teamId);
export const getJudgeIdsForTeam = (id, teamId) => detail(id).assignments.filter((a) => a.teamId === teamId).map((a) => a.judgeId);
export async function replaceJudgeTeamAssignments(id, judgeId, teamIds) {
  const path = projectPath(id) + '/assignments';
  const requested = new Set(teamIds);
  const existing = detail(id).assignments.filter((a) => a.judgeId === judgeId);
  try {
    for (const a of existing.filter((a) => !requested.has(a.teamId))) await api.delete(path + '/' + a.assignmentId);
    for (const teamId of requested) {
      if (!existing.some((a) => a.teamId === teamId)) await api.post(path, { judgeId, teamId });
    }
  } finally {
    await loadProject(id);
  }
}
