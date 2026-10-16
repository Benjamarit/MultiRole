import { removeTeamAssignments } from './JudgeTeamAssignmentStore';

const TEAMS_KEY = 'ce_project_teams';

const seedTeams = [
  {
    id: 1,
    name: 'Team Alpha',
    description: 'แอปพลิเคชันจัดการงานสำหรับทีมขนาดเล็ก พัฒนาด้วย React และ Firebase',
    link: 'https://github.com/example/team-alpha',
  },
  {
    id: 2,
    name: 'Team Beta',
    description: 'ระบบแนะนำสินค้าด้วย Machine Learning',
    link: '',
  },
  { id: 3, name: 'Team Gamma', description: '', link: '' },
];

function readAll() {
  const stored = localStorage.getItem(TEAMS_KEY);
  if (!stored) return [{ projectId: 1, teams: seedTeams }];

  let projectTeams;
  try {
    projectTeams = JSON.parse(stored);
  } catch {
    throw new Error('ข้อมูลทีมในเบราว์เซอร์อ่านไม่ได้ กรุณาสำรองข้อมูลก่อนแก้ไข');
  }
  if (!Array.isArray(projectTeams)) {
    throw new Error('รูปแบบข้อมูลทีมในเบราว์เซอร์ไม่ถูกต้อง');
  }
  return projectTeams;
}

function writeAll(projectTeams) {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(projectTeams));
}

export function getTeamsByProject(projectId) {
  const numericProjectId = Number(projectId);
  const projectTeams = readAll().find((entry) => entry.projectId === numericProjectId);
  return projectTeams?.teams || [];
}

export function saveTeam(projectId, teamData) {
  const numericProjectId = Number(projectId);
  const allProjectTeams = readAll();
  const projectEntry = allProjectTeams.find((entry) => entry.projectId === numericProjectId);
  const teams = projectEntry?.teams || [];
  const updatedTeam = teamData.id
    ? { ...teams.find((team) => team.id === teamData.id), ...teamData }
    : { ...teamData, id: teams.length ? Math.max(...teams.map((team) => team.id)) + 1 : 1 };
  const updatedTeams = teamData.id
    ? teams.map((team) => (team.id === teamData.id ? updatedTeam : team))
    : [updatedTeam, ...teams];
  const updatedEntries = allProjectTeams.filter((entry) => entry.projectId !== numericProjectId);
  writeAll([{ projectId: numericProjectId, teams: updatedTeams }, ...updatedEntries]);
  return updatedTeam;
}

export function deleteTeam(projectId, teamId) {
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  const updatedEntries = readAll().map((entry) =>
    entry.projectId === numericProjectId
      ? {
          ...entry,
          teams: entry.teams.filter((team) => Number(team.id) !== numericTeamId),
        }
      : entry
  );
  writeAll(updatedEntries);
  removeTeamAssignments(numericProjectId, numericTeamId);
}

export function deleteProjectTeams(projectId) {
  const numericProjectId = Number(projectId);
  writeAll(readAll().filter((entry) => Number(entry.projectId) !== numericProjectId));
}
