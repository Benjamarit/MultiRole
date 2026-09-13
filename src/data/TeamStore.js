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
  try {
    const stored = localStorage.getItem(TEAMS_KEY);
    return stored ? JSON.parse(stored) : [{ projectId: 1, teams: seedTeams }];
  } catch {
    return [{ projectId: 1, teams: seedTeams }];
  }
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
  const updatedEntries = readAll().map((entry) =>
    entry.projectId === numericProjectId
      ? { ...entry, teams: entry.teams.filter((team) => team.id !== teamId) }
      : entry
  );
  writeAll(updatedEntries);
}
