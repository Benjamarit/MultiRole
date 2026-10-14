import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

const vite = await createServer({
  configFile: false,
  plugins: [],
  server: { middlewareMode: true },
  appType: 'custom',
});
const groupStore = await vite.ssrLoadModule('/src/data/GroupStore.js');
const projectStore = await vite.ssrLoadModule('/src/data/ProjectStore.js');
const assignmentStore = await vite.ssrLoadModule('/src/data/JudgeTeamAssignmentStore.js');
const teamStore = await vite.ssrLoadModule('/src/data/TeamStore.js');

const {
  createGroup,
  deleteGroup,
  getGroupForTeam,
  getGroupsByProject,
  getTeamIdsInGroup,
  moveTeamToGroup,
  removeProjectGroups,
  removeTeamFromGroups,
  renameGroup,
} = groupStore;
const {
  deleteProject,
  getAssignedTeamIds,
  getProjectById,
  isJudgeAssignedToTeam,
  removeJudgeAssignment,
  setJudgeAssignedTeams,
} = projectStore;
const {
  getJudgeIdsForTeam,
  getTeamIdsForJudge,
} = assignmentStore;
const { deleteTeam, getTeamsByProject } = teamStore;

const PROJECT_ID = 42;

function seedData() {
  localStorage.clear();
  localStorage.setItem(
    'ce_projects',
    JSON.stringify([
      {
        id: PROJECT_ID,
        name: 'Competition',
        ownerEmail: 'admin@example.com',
        judgeEmails: ['judge-a@example.com', 'judge-b@example.com'],
        judgeAssignments: [
          { id: 'judge-a@example.com', email: 'judge-a@example.com' },
          { id: 'judge-b@example.com', email: 'judge-b@example.com' },
        ],
      },
    ])
  );
  localStorage.setItem(
    'ce_project_teams',
    JSON.stringify([
      {
        projectId: PROJECT_ID,
        teams: [
          { id: 101, name: 'Team A' },
          { id: 102, name: 'Team B' },
        ],
      },
    ])
  );
}

test.beforeEach(seedData);
test.after(() => vite.close());

test('migrates and validates legacy groups, then supports scoped group management', () => {
  localStorage.setItem(
    'ce_project_groups',
    JSON.stringify([
      {
        projectId: String(PROJECT_ID),
        groups: [
          { id: '7', name: 'North', teamIds: ['101', '102', '999'] },
          { id: 8, name: 'South', teamIds: [101] },
        ],
      },
      { projectId: 900, groups: [{ id: 1, name: 'Stale', teamIds: [101] }] },
    ])
  );

  assert.deepEqual(getGroupsByProject(PROJECT_ID), [
    { id: 7, name: 'North' },
    { id: 8, name: 'South' },
  ]);
  assert.deepEqual(getTeamIdsInGroup(PROJECT_ID, 7), [101, 102]);
  assert.equal(getGroupForTeam(PROJECT_ID, 101).id, 7);
  assert.equal(getGroupForTeam(900, 101), undefined);

  const savedGroups = JSON.parse(localStorage.getItem('ce_project_groups'));
  assert.deepEqual(savedGroups.memberships, [
    { projectId: PROJECT_ID, groupId: 7, teamId: 101 },
    { projectId: PROJECT_ID, groupId: 7, teamId: 102 },
  ]);

  renameGroup(PROJECT_ID, 7, 'North Division');
  moveTeamToGroup(PROJECT_ID, 101, 8);
  assert.equal(getGroupForTeam(PROJECT_ID, 101).id, 8);
  moveTeamToGroup(PROJECT_ID, 101, '');
  assert.equal(getGroupForTeam(PROJECT_ID, 101), undefined);
  assert.throws(() => moveTeamToGroup(PROJECT_ID, 999, 8));
  assert.throws(() => moveTeamToGroup(PROJECT_ID, 102, 900));

  deleteGroup(PROJECT_ID, 7);
  assert.equal(getGroupForTeam(PROJECT_ID, 102), undefined);
  assert.equal(getTeamsByProject(PROJECT_ID).length, 2);
  createGroup(PROJECT_ID, 'New Group');
  assert.equal(getGroupsByProject(PROJECT_ID).at(-1).name, 'New Group');
});

test('validates judge assignments and removes them when judges or teams are deleted', () => {
  createGroup(PROJECT_ID, 'Track');
  moveTeamToGroup(PROJECT_ID, 101, 1);
  assert.equal(isJudgeAssignedToTeam(PROJECT_ID, 'judge-a@example.com', 101), false);

  setJudgeAssignedTeams(PROJECT_ID, 'judge-a@example.com', [101, 102, 101]);
  assert.deepEqual(getAssignedTeamIds(PROJECT_ID, 'judge-a@example.com'), [101, 102]);
  assert.deepEqual(getJudgeIdsForTeam(PROJECT_ID, 101), ['judge-a@example.com']);
  assert.equal(isJudgeAssignedToTeam(PROJECT_ID, 'judge-a@example.com', 101), true);
  assert.equal(localStorage.getItem('ce_project_evaluations'), null);
  assert.throws(() => setJudgeAssignedTeams(PROJECT_ID, 'judge-a@example.com', [999]));
  assert.deepEqual(getTeamIdsForJudge(PROJECT_ID, 'judge-a@example.com'), [101, 102]);

  deleteTeam(PROJECT_ID, 101);
  removeTeamFromGroups(PROJECT_ID, 101);
  assert.deepEqual(getAssignedTeamIds(PROJECT_ID, 'judge-a@example.com'), [102]);
  assert.equal(getGroupForTeam(PROJECT_ID, 101), undefined);

  assert.equal(
    removeJudgeAssignment(PROJECT_ID, 'judge-a@example.com', 'judge-a@example.com'),
    true
  );
  assert.deepEqual(getAssignedTeamIds(PROJECT_ID, 'judge-a@example.com'), []);
  assert.equal(isJudgeAssignedToTeam(PROJECT_ID, 'judge-a@example.com', 102), false);
});

test('prunes stale assignments and groups when a competition is deleted', () => {
  localStorage.setItem(
    'ce_project_groups',
    JSON.stringify({
      groups: [
        { projectId: PROJECT_ID, id: 1, name: 'Track' },
        { projectId: 900, id: 1, name: 'Stale' },
      ],
      memberships: [
        { projectId: PROJECT_ID, groupId: 1, teamId: 101 },
        { projectId: PROJECT_ID, groupId: 1, teamId: 999 },
      ],
    })
  );
  localStorage.setItem(
    'ce_judge_team_assignments',
    JSON.stringify([
      { projectId: PROJECT_ID, judgeId: 'judge-a@example.com', teamId: 101 },
      { projectId: PROJECT_ID, judgeId: 'removed@example.com', teamId: 101 },
      { projectId: PROJECT_ID, judgeId: 'judge-a@example.com', teamId: 999 },
    ])
  );

  assert.deepEqual(getAssignedTeamIds(PROJECT_ID, 'judge-a@example.com'), [101]);
  assert.deepEqual(getTeamIdsForJudge(PROJECT_ID, 'removed@example.com'), []);
  assert.deepEqual(getTeamIdsInGroup(PROJECT_ID, 1), [101]);

  removeProjectGroups(PROJECT_ID);
  assert.equal(deleteProject(PROJECT_ID), true);
  assert.deepEqual(getTeamIdsForJudge(PROJECT_ID, 'judge-a@example.com'), []);
  assert.deepEqual(JSON.parse(localStorage.getItem('ce_project_groups')), {
    groups: [],
    memberships: [],
  });
});

test('does not overwrite unreadable group or assignment data', () => {
  const invalidGroups = '{invalid';
  localStorage.setItem('ce_project_groups', invalidGroups);
  assert.throws(() => getGroupsByProject(PROJECT_ID), /อ่านไม่ได้/);
  assert.equal(localStorage.getItem('ce_project_groups'), invalidGroups);

  const invalidAssignments = '{invalid';
  localStorage.setItem('ce_judge_team_assignments', invalidAssignments);
  assert.throws(() => getTeamIdsForJudge(PROJECT_ID, 'judge-a@example.com'), /อ่านไม่ได้/);
  assert.equal(localStorage.getItem('ce_judge_team_assignments'), invalidAssignments);
});

test('does not seed over unreadable competition or team data', () => {
  const invalidProjects = '{invalid';
  localStorage.setItem('ce_projects', invalidProjects);
  assert.throws(() => getProjectById(PROJECT_ID), /อ่านไม่ได้/);
  assert.equal(localStorage.getItem('ce_projects'), invalidProjects);

  seedData();
  const invalidTeams = '{invalid';
  localStorage.setItem('ce_project_teams', invalidTeams);
  assert.throws(() => getTeamsByProject(PROJECT_ID), /อ่านไม่ได้/);
  assert.equal(localStorage.getItem('ce_project_teams'), invalidTeams);
});
