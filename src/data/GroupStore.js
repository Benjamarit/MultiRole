import { getProjectById } from './ProjectStore';
import { getTeamsByProject } from './TeamStore';

const GROUPS_KEY = 'ce_project_groups';

function emptyTables() {
  return { groups: [], memberships: [] };
}

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeTables(parsed) {
  let groups;
  let memberships;

  if (Array.isArray(parsed)) {
    groups = [];
    memberships = [];
    for (const projectEntry of parsed) {
      if (!projectEntry || !Array.isArray(projectEntry.groups)) continue;
      for (const group of projectEntry.groups) {
        groups.push({
          projectId: projectEntry.projectId,
          id: group?.id,
          name: group?.name,
        });
        for (const teamId of Array.isArray(group?.teamIds) ? group.teamIds : []) {
          memberships.push({
            projectId: projectEntry.projectId,
            groupId: group?.id,
            teamId,
          });
        }
      }
    }
  } else if (
    parsed &&
    Array.isArray(parsed.groups) &&
    Array.isArray(parsed.memberships)
  ) {
    groups = parsed.groups;
    memberships = parsed.memberships;
  } else {
    throw new Error('รูปแบบข้อมูลกลุ่มในเบราว์เซอร์ไม่ถูกต้อง');
  }

  const validGroups = [];
  const groupKeys = new Set();
  for (const group of groups) {
    const projectId = toId(group?.projectId);
    const id = toId(group?.id);
    const name = typeof group?.name === 'string' ? group.name.trim() : '';
    if (!projectId || !id || !name || !getProjectById(projectId)) continue;
    const key = `${projectId}:${id}`;
    if (groupKeys.has(key)) continue;
    groupKeys.add(key);
    validGroups.push({ projectId, id, name });
  }

  const teamsByProject = new Map();
  const validMemberships = [];
  const seenTeams = new Set();
  for (const membership of memberships) {
    const projectId = toId(membership?.projectId);
    const groupId = toId(membership?.groupId);
    const teamId = toId(membership?.teamId);
    if (!projectId || !groupId || !teamId) continue;
    if (!groupKeys.has(`${projectId}:${groupId}`)) continue;
    if (!teamsByProject.has(projectId)) {
      teamsByProject.set(
        projectId,
        new Set(getTeamsByProject(projectId).map((team) => toId(team.id)))
      );
    }
    if (!teamsByProject.get(projectId).has(teamId)) continue;
    const teamKey = `${projectId}:${teamId}`;
    if (seenTeams.has(teamKey)) continue;
    seenTeams.add(teamKey);
    validMemberships.push({ projectId, groupId, teamId });
  }

  return { groups: validGroups, memberships: validMemberships };
}

function readAll() {
  const stored = localStorage.getItem(GROUPS_KEY);
  if (!stored) return emptyTables();

  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('ข้อมูลกลุ่มในเบราว์เซอร์อ่านไม่ได้ กรุณาสำรองข้อมูลก่อนแก้ไข');
  }

  const normalized = normalizeTables(parsed);
  if (!Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    writeAll(normalized);
  } else if (Array.isArray(parsed)) {
    writeAll(normalized);
  }
  return normalized;
}

function writeAll(tables) {
  localStorage.setItem(
    GROUPS_KEY,
    JSON.stringify({
      groups: tables.groups,
      memberships: tables.memberships,
    })
  );
}

function requireId(value, message) {
  const id = toId(value);
  if (!id) throw new Error(message);
  return id;
}

export function getGroupsByProject(projectId) {
  const numericProjectId = toId(projectId);
  if (!numericProjectId) return [];
  return readAll()
    .groups.filter((group) => group.projectId === numericProjectId)
    .map(({ id, name }) => ({ id, name }));
}

export function getGroupForTeam(projectId, teamId) {
  const numericProjectId = toId(projectId);
  const numericTeamId = toId(teamId);
  if (!numericProjectId || !numericTeamId) return undefined;
  const tables = readAll();
  const membership = tables.memberships.find(
    (item) => item.projectId === numericProjectId && item.teamId === numericTeamId
  );
  if (!membership) return undefined;
  return tables.groups.find(
    (group) => group.projectId === numericProjectId && group.id === membership.groupId
  );
}

export function getTeamIdsInGroup(projectId, groupId) {
  const numericProjectId = toId(projectId);
  const numericGroupId = toId(groupId);
  if (!numericProjectId || !numericGroupId) return [];
  return readAll()
    .memberships.filter(
      (membership) =>
        membership.projectId === numericProjectId &&
        membership.groupId === numericGroupId
    )
    .map((membership) => membership.teamId);
}

export function createGroup(projectId, name) {
  const numericProjectId = requireId(projectId, 'ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  if (!getProjectById(numericProjectId)) {
    throw new Error('ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  }
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) throw new Error('กรุณาระบุชื่อกลุ่ม');

  const tables = readAll();
  const projectGroups = tables.groups.filter(
    (group) => group.projectId === numericProjectId
  );
  if (
    projectGroups.some(
      (group) => group.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    )
  ) {
    throw new Error('ชื่อกลุ่มนี้มีอยู่แล้ว');
  }
  const nextId = projectGroups.length
    ? Math.max(...projectGroups.map((group) => group.id)) + 1
    : 1;
  if (!Number.isSafeInteger(nextId)) throw new Error('ไม่สามารถสร้างรหัสกลุ่มใหม่ได้');
  writeAll({
    ...tables,
    groups: [...tables.groups, { projectId: numericProjectId, id: nextId, name: trimmedName }],
  });
}

export function renameGroup(projectId, groupId, name) {
  const numericProjectId = requireId(projectId, 'ไม่พบกลุ่มที่ต้องการแก้ไข');
  const numericGroupId = requireId(groupId, 'ไม่พบกลุ่มที่ต้องการแก้ไข');
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) throw new Error('กรุณาระบุชื่อกลุ่ม');
  const tables = readAll();
  const projectGroups = tables.groups.filter(
    (group) => group.projectId === numericProjectId
  );
  if (!projectGroups.some((group) => group.id === numericGroupId)) {
    throw new Error('ไม่พบกลุ่มที่ต้องการแก้ไข');
  }
  if (
    projectGroups.some(
      (group) =>
        group.id !== numericGroupId &&
        group.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    )
  ) {
    throw new Error('ชื่อกลุ่มนี้มีอยู่แล้ว');
  }
  writeAll({
    ...tables,
    groups: tables.groups.map((group) =>
      group.projectId === numericProjectId && group.id === numericGroupId
        ? { ...group, name: trimmedName }
        : group
    ),
  });
}

export function moveTeamToGroup(projectId, teamId, groupId) {
  const numericProjectId = requireId(projectId, 'ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  const numericTeamId = requireId(teamId, 'ทีมนี้ไม่ได้อยู่ในโครงการนี้');
  if (!getProjectById(numericProjectId)) {
    throw new Error('ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  }
  if (!getTeamsByProject(numericProjectId).some((team) => toId(team.id) === numericTeamId)) {
    throw new Error('ทีมนี้ไม่ได้อยู่ในโครงการนี้');
  }
  const tables = readAll();
  const numericGroupId =
    groupId === null || groupId === '' ? null : requireId(groupId, 'กลุ่มนี้ไม่ได้อยู่ในโครงการนี้');
  if (
    numericGroupId !== null &&
    !tables.groups.some(
      (group) => group.projectId === numericProjectId && group.id === numericGroupId
    )
  ) {
    throw new Error('กลุ่มนี้ไม่ได้อยู่ในโครงการนี้');
  }

  const memberships = tables.memberships.filter(
    (membership) =>
      membership.projectId !== numericProjectId ||
      membership.teamId !== numericTeamId
  );
  if (numericGroupId !== null) {
    memberships.push({
      projectId: numericProjectId,
      teamId: numericTeamId,
      groupId: numericGroupId,
    });
  }
  writeAll({ ...tables, memberships });
}

export function deleteGroup(projectId, groupId) {
  const numericProjectId = requireId(projectId, 'ไม่พบกลุ่มที่ต้องการลบ');
  const numericGroupId = requireId(groupId, 'ไม่พบกลุ่มที่ต้องการลบ');
  const tables = readAll();
  if (
    !tables.groups.some(
      (group) => group.projectId === numericProjectId && group.id === numericGroupId
    )
  ) {
    throw new Error('ไม่พบกลุ่มที่ต้องการลบ');
  }
  writeAll({
    groups: tables.groups.filter(
      (group) => group.projectId !== numericProjectId || group.id !== numericGroupId
    ),
    memberships: tables.memberships.filter(
      (membership) =>
        membership.projectId !== numericProjectId ||
        membership.groupId !== numericGroupId
    ),
  });
}

export function removeTeamFromGroups(projectId, teamId) {
  const numericProjectId = requireId(projectId, 'ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  const numericTeamId = requireId(teamId, 'ทีมนี้ไม่ได้อยู่ในโครงการนี้');
  const tables = readAll();
  writeAll({
    ...tables,
    memberships: tables.memberships.filter(
      (membership) =>
        membership.projectId !== numericProjectId ||
        membership.teamId !== numericTeamId
    ),
  });
}

export function removeProjectGroups(projectId) {
  const numericProjectId = requireId(projectId, 'ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  const tables = readAll();
  writeAll({
    groups: tables.groups.filter((group) => group.projectId !== numericProjectId),
    memberships: tables.memberships.filter(
      (membership) => membership.projectId !== numericProjectId
    ),
  });
}
