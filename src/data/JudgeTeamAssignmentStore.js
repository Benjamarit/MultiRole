const ASSIGNMENTS_KEY = 'ce_judge_team_assignments';

function readAll() {
  const stored = localStorage.getItem(ASSIGNMENTS_KEY);
  if (!stored) return [];
  let assignments;
  try {
    assignments = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(assignments)) {
    return [];
  }
  return assignments;
}

function writeAll(assignments) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function getTeamIdsForJudge(projectId, judgeId) {
  const numericProjectId = Number(projectId);
  return [
    ...new Set(
      readAll()
        .filter(
          (assignment) =>
            Number(assignment.projectId) === numericProjectId &&
            String(assignment.judgeId) === String(judgeId)
        )
        .map((assignment) => Number(assignment.teamId))
    ),
  ];
}

export function getJudgeIdsForTeam(projectId, teamId) {
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  return [
    ...new Set(
      readAll()
        .filter(
          (assignment) =>
            Number(assignment.projectId) === numericProjectId &&
            Number(assignment.teamId) === numericTeamId
        )
        .map((assignment) => String(assignment.judgeId))
    ),
  ];
}

export function replaceJudgeTeamAssignments(projectId, judgeId, teamIds) {
  const numericProjectId = Number(projectId);
  const normalizedJudgeId = String(judgeId);
  const uniqueTeamIds = [...new Set(teamIds.map(Number))];
  const retained = readAll().filter(
    (assignment) =>
      Number(assignment.projectId) !== numericProjectId ||
      String(assignment.judgeId) !== normalizedJudgeId
  );
  writeAll([
    ...retained,
    ...uniqueTeamIds.map((teamId) => ({
      projectId: numericProjectId,
      judgeId: normalizedJudgeId,
      teamId,
    })),
  ]);
}

export function removeJudgeTeamAssignments(projectId, judgeId) {
  const numericProjectId = Number(projectId);
  const normalizedJudgeId = String(judgeId);
  writeAll(
    readAll().filter(
      (assignment) =>
        Number(assignment.projectId) !== numericProjectId ||
        String(assignment.judgeId) !== normalizedJudgeId
    )
  );
}

export function importLegacyJudgeTeamAssignments(legacyAssignments) {
  const assignments = readAll();
  const existingKeys = new Set(
    assignments.map(
      (assignment) =>
        `${Number(assignment.projectId)}:${String(assignment.judgeId)}:${Number(assignment.teamId)}`
    )
  );
  for (const assignment of legacyAssignments) {
    const normalized = {
      projectId: Number(assignment.projectId),
      judgeId: String(assignment.judgeId),
      teamId: Number(assignment.teamId),
    };
    const key = `${normalized.projectId}:${normalized.judgeId}:${normalized.teamId}`;
    if (!existingKeys.has(key)) {
      assignments.push(normalized);
      existingKeys.add(key);
    }
  }
  writeAll(assignments);
}
