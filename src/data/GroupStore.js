import { getProjectById } from './ProjectStore';
import { getTeamsByProject } from './TeamStore';

const GROUPS_KEY = 'ce_project_groups';

function emptyTables() {
  return { groups: [], memberships: [] };
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
  if (!Array.isArray(parsed)) {
    if (!Array.isArray(parsed?.groups) || !Array.isArray(parsed?.memberships)) {
      throw new Error('รูปแบบข้อมูลกลุ่มในเบราว์เซอร์ไม่ถูกต้อง');
    }
    return {
      groups: parsed.groups,
      memberships: uniqueMemberships(parsed.memberships),
    };
  }

  const groups = [];
  const memberships = [];
  for (const projectEntry of parsed) {
    for (const group of projectEntry.groups || []) {
      groups.push({
        projectId: Number(projectEntry.projectId),
        id: Number(group.id),
        name: group.name,
      });
      for (const teamId of group.teamIds || []) {
        memberships.push({
          projectId: Number(projectEntry.projectId),
          groupId: Number(group.id),
          teamId: Number(teamId),
        });
      }
    }
  }
  const migrated = { groups, memberships: uniqueMemberships(memberships) };
  writeAll(migrated);
  return migrated;
}

function uniqueMemberships(memberships) {
  const seenTeams = new Set();
  return memberships.filter((membership) => {
    const key = `${Number(membership.projectId)}:${Number(membership.teamId)}`;
    if (seenTeams.has(key)) return false;
    seenTeams.add(key);
    return true;
  });
}

function writeAll(tables) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify({
    groups: tables.groups,
    memberships: uniqueMemberships(tables.memberships),
  }));
}

export function getGroupsByProject(projectId) {
  const numericProjectId = Number(projectId);
  return readAll().groups
    .filter((group) => Number(group.projectId) === numericProjectId)
    .map(({ id, name }) => ({ id: Number(id), name }));
}

export function getGroupForTeam(projectId, teamId) {
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  const tables = readAll();
  const membership = tables.memberships.find((item) =>
    Number(item.projectId) === numericProjectId &&
    Number(item.teamId) === numericTeamId
  );
  if (!membership) return undefined;
  return tables.groups.find((group) =>
    Number(group.projectId) === numericProjectId &&
    Number(group.id) === Number(membership.groupId)
  );
}

export function getTeamIdsInGroup(projectId, groupId) {
  const numericProjectId = Number(projectId);
  const numericGroupId = Number(groupId);
  return readAll().memberships
    .filter((membership) =>
      Number(membership.projectId) === numericProjectId &&
      Number(membership.groupId) === numericGroupId
    )
    .map((membership) => Number(membership.teamId));
}

export function createGroup(projectId, name) {
  const numericProjectId = Number(projectId);
  if (!getProjectById(projectId)) throw new Error('ไม่พบโครงการที่ต้องการจัดกลุ่ม');
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('กรุณาระบุชื่อกลุ่ม');

  const tables = readAll();
  const projectGroups = tables.groups.filter(
    (group) => Number(group.projectId) === numericProjectId
  );
  if (projectGroups.some((group) => group.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase())) {
    throw new Error('ชื่อกลุ่มนี้มีอยู่แล้ว');
  }
  const nextId = projectGroups.length
    ? Math.max(...projectGroups.map((group) => Number(group.id))) + 1
    : 1;
  writeAll({
    ...tables,
    groups: [...tables.groups, { projectId: numericProjectId, id: nextId, name: trimmedName }],
  });
}

export function renameGroup(projectId, groupId, name) {
  const numericProjectId = Number(projectId);
  const numericGroupId = Number(groupId);
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('กรุณาระบุชื่อกลุ่ม');
  const tables = readAll();
  const projectGroups = tables.groups.filter(
    (group) => Number(group.projectId) === numericProjectId
  );
  if (!projectGroups.some((group) => Number(group.id) === numericGroupId)) {
    throw new Error('ไม่พบกลุ่มที่ต้องการแก้ไข');
  }
  if (projectGroups.some((group) =>
    Number(group.id) !== numericGroupId &&
    group.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
  )) {
    throw new Error('ชื่อกลุ่มนี้มีอยู่แล้ว');
  }
  writeAll({
    ...tables,
    groups: tables.groups.map((group) =>
      Number(group.projectId) === numericProjectId &&
      Number(group.id) === numericGroupId
        ? { ...group, name: trimmedName }
        : group
    ),
  });
}

export function moveTeamToGroup(projectId, teamId, groupId) {
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (!getTeamsByProject(projectId).some((team) => Number(team.id) === numericTeamId)) {
    throw new Error('ทีมนี้ไม่ได้อยู่ในโครงการนี้');
  }
  const tables = readAll();
  if (groupId !== null && groupId !== '' &&
      !tables.groups.some((group) =>
        Number(group.projectId) === numericProjectId &&
        Number(group.id) === Number(groupId)
      )) {
    throw new Error('กลุ่มนี้ไม่ได้อยู่ในโครงการนี้');
  }

  const memberships = tables.memberships.filter((membership) =>
    Number(membership.projectId) !== numericProjectId ||
    Number(membership.teamId) !== numericTeamId
  );
  if (groupId !== null && groupId !== '') {
    memberships.push({
      projectId: numericProjectId,
      teamId: numericTeamId,
      groupId: Number(groupId),
    });
  }
  writeAll({ ...tables, memberships });
}

export function deleteGroup(projectId, groupId) {
  const numericProjectId = Number(projectId);
  const numericGroupId = Number(groupId);
  const tables = readAll();
  if (!tables.groups.some((group) =>
    Number(group.projectId) === numericProjectId &&
    Number(group.id) === numericGroupId
  )) {
    throw new Error('ไม่พบกลุ่มที่ต้องการลบ');
  }
  writeAll({
    groups: tables.groups.filter((group) =>
      Number(group.projectId) !== numericProjectId ||
      Number(group.id) !== numericGroupId
    ),
    memberships: tables.memberships.filter((membership) =>
      Number(membership.projectId) !== numericProjectId ||
      Number(membership.groupId) !== numericGroupId
    ),
  });
}
