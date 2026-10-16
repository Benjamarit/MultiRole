const ASSIGNMENTS_KEY = 'ce_judge_team_assignments';

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeAssignments(assignments) {
  const normalized = [];
  const seen = new Set();
  for (const assignment of assignments) {
    const projectId = toId(assignment?.projectId);
    const teamId = toId(assignment?.teamId);
    const judgeId =
      typeof assignment?.judgeId === 'string' ||
      typeof assignment?.judgeId === 'number'
        ? String(assignment.judgeId).trim()
        : '';
    if (!projectId || !teamId || !judgeId) continue;
    const key = `${projectId}:${judgeId}:${teamId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ projectId, judgeId, teamId });
  }
  return normalized;
}

function readAll() {
  const stored = localStorage.getItem(ASSIGNMENTS_KEY);
  if (!stored) return [];

  let assignments;
  try {
    assignments = JSON.parse(stored);
  } catch {
    throw new Error('ข้อมูลการมอบหมายทีมในเบราว์เซอร์อ่านไม่ได้ กรุณาสำรองข้อมูลก่อนแก้ไข');
  }
  if (!Array.isArray(assignments)) {
    throw new Error('รูปแบบข้อมูลการมอบหมายทีมในเบราว์เซอร์ไม่ถูกต้อง');
  }

  const normalized = normalizeAssignments(assignments);
  if (JSON.stringify(assignments) !== JSON.stringify(normalized)) {
    writeAll(normalized);
  }
  return normalized;
}

function writeAll(assignments) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

function requireId(value, message) {
  const id = toId(value);
  if (!id) throw new Error(message);
  return id;
}

function requireJudgeId(value) {
  const judgeId =
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
  if (!judgeId) throw new Error('กรรมการไม่ได้อยู่ในโครงการนี้');
  return judgeId;
}

export function getTeamIdsForJudge(projectId, judgeId) {
  const numericProjectId = toId(projectId);
  const normalizedJudgeId = String(judgeId);
  if (!numericProjectId || !normalizedJudgeId) return [];
  return [
    ...new Set(
      readAll()
        .filter(
          (assignment) =>
            assignment.projectId === numericProjectId &&
            assignment.judgeId === normalizedJudgeId
        )
        .map((assignment) => assignment.teamId)
    ),
  ];
}

export function getJudgeIdsForTeam(projectId, teamId) {
  const numericProjectId = toId(projectId);
  const numericTeamId = toId(teamId);
  if (!numericProjectId || !numericTeamId) return [];
  return [
    ...new Set(
      readAll()
        .filter(
          (assignment) =>
            assignment.projectId === numericProjectId &&
            assignment.teamId === numericTeamId
        )
        .map((assignment) => assignment.judgeId)
    ),
  ];
}

export function replaceJudgeTeamAssignments(projectId, judgeId, teamIds) {
  const numericProjectId = requireId(projectId, 'ไม่พบโครงการที่ต้องการกำหนดทีม');
  const normalizedJudgeId = requireJudgeId(judgeId);
  if (!Array.isArray(teamIds)) throw new Error('รายการทีมที่มอบหมายไม่ถูกต้อง');
  const uniqueTeamIds = [...new Set(
    teamIds.map((teamId) =>
      requireId(teamId, 'พบทีมที่ไม่ได้อยู่ในโครงการนี้')
    )
  )];
  const retained = readAll().filter(
    (assignment) =>
      assignment.projectId !== numericProjectId ||
      assignment.judgeId !== normalizedJudgeId
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
  const numericProjectId = toId(projectId);
  const normalizedJudgeId = String(judgeId);
  if (!numericProjectId || !normalizedJudgeId) return;
  writeAll(
    readAll().filter(
      (assignment) =>
        assignment.projectId !== numericProjectId ||
        assignment.judgeId !== normalizedJudgeId
    )
  );
}

export function removeTeamAssignments(projectId, teamId) {
  const numericProjectId = toId(projectId);
  const numericTeamId = toId(teamId);
  if (!numericProjectId || !numericTeamId) return;
  writeAll(
    readAll().filter(
      (assignment) =>
        assignment.projectId !== numericProjectId ||
        assignment.teamId !== numericTeamId
    )
  );
}

export function removeProjectAssignments(projectId) {
  const numericProjectId = toId(projectId);
  if (!numericProjectId) return;
  writeAll(readAll().filter((assignment) => assignment.projectId !== numericProjectId));
}

export function pruneInvalidJudgeTeamAssignments(isValidAssignment) {
  if (typeof isValidAssignment !== 'function') {
    throw new Error('ต้องระบุเงื่อนไขตรวจสอบการมอบหมายทีม');
  }
  const assignments = readAll();
  const validAssignments = assignments.filter(isValidAssignment);
  if (validAssignments.length !== assignments.length) writeAll(validAssignments);
}

export function importLegacyJudgeTeamAssignments(legacyAssignments) {
  const assignments = readAll();
  const existingKeys = new Set(
    assignments.map(
      (assignment) =>
        `${assignment.projectId}:${assignment.judgeId}:${assignment.teamId}`
    )
  );
  for (const assignment of legacyAssignments) {
    const normalized = normalizeAssignments([assignment])[0];
    if (!normalized) continue;
    const key = `${normalized.projectId}:${normalized.judgeId}:${normalized.teamId}`;
    if (!existingKeys.has(key)) {
      assignments.push(normalized);
      existingKeys.add(key);
    }
  }
  writeAll(assignments);
}
