import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, plugins: [], server: { middlewareMode: true }, appType: 'custom' });
const { default: api } = await vite.ssrLoadModule('/src/api/client.js');
const { workspace, loadWorkspace, clearWorkspace } = await vite.ssrLoadModule('/src/api/workspace.js');
const projects = await vite.ssrLoadModule('/src/data/projects/ProjectStore.js');
const groups = await vite.ssrLoadModule('/src/data/teams/GroupStore.js');
const evaluations = await vite.ssrLoadModule('/src/data/evaluations/EvaluationStore.js');
const teams = await vite.ssrLoadModule('/src/data/teams/TeamStore.js');
const criteria = await vite.ssrLoadModule('/src/data/evaluations/CriteriaStore.js');
const id = '11111111-1111-4111-8111-111111111111';
const teamA = '22222222-2222-4222-8222-222222222222';
const teamB = '33333333-3333-4333-8333-333333333333';
const judgeId = '44444444-4444-4444-8444-444444444444';
const criterionId = '55555555-5555-4555-8555-555555555555';
const groupId = '66666666-6666-4666-8666-666666666666';
const user = { id: judgeId, name: 'Judge', email: 'judge@test.local', role: 'USER' };
const requests = [];
let role = 'JUDGE';
let failure = false;
let criterionDescription = '';
let teamRows = [{ teamId: teamA, teamName: 'A' }, { teamId: teamB, teamName: 'B' }];
const project = () => ({ competitionId: id, title: 'Competition', status: 'ACTIVE', currentRole: role, ownerEmail: 'owner@test.local', ownerName: 'Owner' });
const evaluation = { evaluationId: 'evaluation-uuid', competitionId: id, teamId: teamA, judgeId, status: 'DRAFT', totalScore: 80,
  scores: [{ criterionId, scoreValue: 8, comment: 'Good' }] };
api.defaults.adapter = async (config) => {
  requests.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(config.data) : undefined });
  if (failure) throw new Error('Server unavailable');
  if (config.method === 'put' && config.url === '/competitions/' + id + '/teams/group') {
    const body = JSON.parse(config.data);
    return { data: { movedCount: body.teamIds.length, unchangedCount: 0, groups: [
      { groupId, groupName: 'Group A', teamIds: body.groupId ? body.teamIds : [] },
    ] }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (config.method === 'post' && config.url === '/evaluations/submit-batch') {
    return { data: { results: [
      { teamId: teamA, outcome: 'SUBMITTED', httpStatus: 200, evaluation: { ...evaluation, status: 'SUBMITTED', totalScore: 90, scores: [{ criterionId, scoreValue: 9, comment: 'Saved' }] } },
      { teamId: teamB, outcome: 'FAILED', httpStatus: 409, message: 'Deadline passed', evaluation: null },
    ] }, status: 200, statusText: 'OK', headers: {}, config };
  }
  if (config.method === 'post' && config.url === '/evaluations/draft-batch') {
    return { data: { results: [
      { teamId: teamA, outcome: 'DRAFT_SAVED', httpStatus: 200, evaluation: { ...evaluation, totalScore: 20, scores: [{ criterionId, scoreValue: 2, comment: 'A draft' }] } },
      { teamId: teamB, outcome: 'FAILED', httpStatus: 409, message: 'Deadline passed', evaluation: null },
    ] }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (config.method === 'put' && config.url === '/competitions/' + id + '/teams/order') {
    const { teamIds } = JSON.parse(config.data);
    teamRows = teamIds.map((teamId, index) => ({ ...teamRows.find((t) => t.teamId === teamId), displayOrder: index + 1 }));
    return { data: teamRows, status: 200, statusText: 'OK', headers: {}, config };
  }
  const criterion = { criterionId, title: 'Quality', description: criterionDescription, scoringType: 'NUMERIC', maxScore: 10, weightPercentage: 100 };
  if (config.method === 'post' && config.url === '/competitions/' + id + '/criteria') {
    criterionDescription = JSON.parse(config.data).description;
    return { data: { ...criterion, description: criterionDescription }, status: 200, statusText: 'OK', headers: {}, config };
  }
  const paths = {
    '/competitions': [project()],
    ['/competitions/' + id]: project(),
    ['/competitions/' + id + '/teams']: teamRows,
    ['/competitions/' + id + '/criteria']: [criterion],
    ['/competitions/' + id + '/groups']: [{ groupId, groupName: 'Group A', teamIds: [teamA] }],
    ['/competitions/' + id + '/members']: [{ userId: judgeId, email: user.email, fullName: user.name, role: role === 'ADMIN_JUDGE' ? 'ADMIN_JUDGE' : 'JUDGE' }],
    ['/competitions/' + id + '/assignments']: [{ assignmentId: 'assignment-uuid', judgeId, teamId: teamA }],
    ['/evaluations/competition/' + id]: [evaluation],
    ['/evaluations/competition/' + id + '/team/' + teamA + '/mine']: evaluation,
    '/notifications': [],
    '/evaluations/save': 'Saved',
  };
  assert.ok(config.url in paths, 'Unexpected endpoint: ' + config.url);
  return { data: paths[config.url], status: 200, statusText: 'OK', headers: {}, config };
};

test('UUIDs distinguish projects, teams, memberships and judge ownership after server hydration', async () => {
  await loadWorkspace(user);
  assert.equal(projects.getProjectById(id).name, 'Competition');
  assert.equal(projects.getProjectById('other-uuid'), undefined);
  assert.deepEqual(projects.getAssignedTeamIds(id, judgeId), [teamA]);
  assert.equal(projects.isJudgeAssignedToTeam(id, judgeId, teamA), true);
  assert.equal(projects.isJudgeAssignedToTeam(id, judgeId, teamB), false);
  assert.equal(groups.getGroupForTeam(id, teamA).id, groupId);
  assert.equal(groups.getGroupForTeam(id, teamB), undefined);
  assert.deepEqual(groups.getTeamIdsInGroup(id, groupId), [teamA]);
  assert.equal(evaluations.getEvaluation(id, teamA, judgeId).scores[criterionId], 8);
  assert.equal(evaluations.getEvaluation(id, teamB, judgeId), undefined);
  assert.equal(requests.some(r => r.url.endsWith('/members')), false, 'Judges cannot request the admin-only members endpoint');
});

test('evaluation writes use API score arrays and reload saved server results', async () => {
  const saved = await evaluations.saveEvaluation({ projectId: id, teamId: teamA, judgeId,
    status: 'DRAFT', scores: { [criterionId]: 8 }, criteriaComments: { [criterionId]: 'Good' }, totalScore: 999 });
  const request = requests.find(r => r.url === '/evaluations/save');
  assert.equal(request.body.competitionId, id);
  assert.deepEqual(request.body.scores, [{ criterionId, scoreValue: 8, comment: 'Good' }]);
  assert.equal('totalScore' in request.body, false, 'The server calculates totals');
  assert.equal(saved.totalScore, 80);
  assert.equal(evaluations.getEvaluation(id, teamB, judgeId), undefined, 'Saving A must not create B');
});

test('draft-all sends one API request and applies only confirmed drafts, preserving failed teams', async () => {
  await loadWorkspace(user);
  const savedB = { id: 'saved-b', teamId: teamB, judgeId, status: 'DRAFT', scores: { [criterionId]: 9 }, totalScore: 90 };
  workspace.details[id].evaluations.push(savedB);
  const start = requests.length;
  const result = await evaluations.saveDraftsBatch(id, [
    { teamId: teamA, scores: { [criterionId]: 2 } },
    { teamId: teamB, scores: {}, criteriaComments: { [criterionId]: 'Feedback before scoring' } },
  ]);
  assert.equal(requests.length - start, 1);
  assert.equal(requests[start].url, '/evaluations/draft-batch');
  assert.deepEqual(requests[start].body.teams[1].scores, [{ criterionId, scoreValue: null, comment: 'Feedback before scoring' }]);
  assert.equal(result[1].outcome, 'FAILED');
  assert.equal(evaluations.getEvaluation(id, teamA, judgeId).scores[criterionId], 2);
  assert.equal(evaluations.getEvaluation(id, teamB, judgeId), savedB);
});

test('failed writes reject and leave the server cache unchanged', async () => {
  const previous = teams.getTeamsByProject(id);
  failure = true;
  await assert.rejects(teams.saveTeam(id, { name: 'Unsaved' }));
  assert.deepEqual(teams.getTeamsByProject(id), previous);
  assert.equal(teams.getTeamsByProject(id).some(t => t.name === 'Unsaved'), false);
  failure = false;
});

test('competition membership role comes from the server and logout clears private data', async () => {
  role = 'ADMIN';
  await loadWorkspace(user);
  assert.equal(projects.isProjectAdmin(id, user.email), true);
  assert.equal(projects.getMyProjects(user.email).length, 1);
  assert.equal(projects.getJudgingProjects(user.email).length, 0);
  clearWorkspace();
  assert.deepEqual(workspace.projects, []);
  assert.deepEqual(teams.getTeamsByProject(id), []);
  assert.equal(workspace.user, null);
});

test.after(async () => { await vite.close(); });

test('an admin who judges appears in both workspaces and retains admin access', async () => {
  role = 'ADMIN_JUDGE';
  await loadWorkspace(user);
  assert.equal(projects.isProjectAdmin(id, user.email), true);
  assert.equal(projects.getMyProjects(user.email).length, 1);
  assert.equal(projects.getJudgingProjects(user.email).length, 1);
  assert.equal(projects.getJudgeAssignments(id).some((judge) => judge.id === user.id), true);
  assert.equal(projects.isJudgeAssignedToTeam(id, judgeId, teamA), true);
});

test('new rubric criteria use server UUIDs and persist multiline descriptions via the API', async () => {
  const description = '9-10 คะแนน: ครบถ้วน\n0-4 คะแนน: ต้องปรับปรุง';
  const saved = await criteria.saveCriterion(id, { name: 'Quality', type: 'NUMERIC', maxScore: 10, weight: 100, description });
  const request = requests.findLast((r) => r.method === 'post' && r.url.endsWith('/criteria'));
  assert.equal(request.body.description, description);
  assert.equal('id' in request.body, false);
  assert.equal(saved.id, criterionId);
  assert.equal(criteria.getCriteriaByProject(id)[0].description, description);
});

test('reordering teams persists UUID order and reloads it from the server', async () => {
  await teams.reorderTeams(id, [teamB, teamA]);
  assert.deepEqual(teams.getTeamsByProject(id).map((team) => team.id), [teamB, teamA]);
  await loadWorkspace(user);
  assert.deepEqual(teams.getTeamsByProject(id).map((team) => team.displayOrder), [1, 2]);
  const previous = teams.getTeamsByProject(id);
  failure = true;
  await assert.rejects(teams.reorderTeams(id, [teamA, teamB]));
  assert.deepEqual(teams.getTeamsByProject(id), previous);
  failure = false;
});

test('deadline locks editing at the exact deadline and permits editing when unset', (context) => {
  context.mock.method(Date, 'now', () => new Date('2026-10-21T12:00:00Z').getTime());
  assert.equal(projects.isBeforeEvaluationDeadline({ evaluationDeadline: '2026-10-21T12:00:01Z' }), true);
  assert.equal(projects.isBeforeEvaluationDeadline({ evaluationDeadline: '2026-10-21T12:00:00Z' }), false);
  assert.equal(projects.isBeforeEvaluationDeadline({ evaluationDeadline: '2026-10-21T11:59:59Z' }), false);
  assert.equal(projects.isBeforeEvaluationDeadline({ evaluationDeadline: null }), true);
});


test('batch submission uses one request and accepts only confirmed per-team receipts into the cache', async () => {
  await loadWorkspace(user);
  const previous = requests.length;
  const results = await evaluations.submitEvaluationsBatch(id, [
    { teamId: teamA, scores: { [criterionId]: 9 }, criteriaComments: { [criterionId]: 'Feedback' }, comment: 'Overall', totalScore: 999, judgeId: 'untrusted' },
    { teamId: teamB, scores: { [criterionId]: 7 } },
  ]);
  const sent = requests.slice(previous);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, '/evaluations/submit-batch');
  assert.deepEqual(sent[0].body, { competitionId: id, teams: [
    { teamId: teamA, comment: 'Overall', scores: [{ criterionId, scoreValue: 9, comment: 'Feedback' }] },
    { teamId: teamB, comment: '', scores: [{ criterionId, scoreValue: 7, comment: '' }] },
  ] });
  assert.equal(results[1].outcome, 'FAILED');
  assert.equal(evaluations.getEvaluation(id, teamA, judgeId).status, 'SUBMITTED');
  assert.equal(evaluations.getEvaluation(id, teamA, judgeId).totalScore, 90);
  assert.equal(evaluations.getEvaluation(id, teamB, judgeId), undefined);
});

test('a lost batch response leaves cached scores unchanged for a safe retry', async () => {
  const previous = structuredClone(evaluations.getEvaluationsByProject(id));
  failure = true;
  try { await assert.rejects(evaluations.submitEvaluationsBatch(id, [{ teamId: teamA, scores: { [criterionId]: 2 } }])); }
  finally { failure = false; }
  assert.deepEqual(evaluations.getEvaluationsByProject(id), previous);
});

test('bulk grouping makes one request and hydrates memberships from the confirmed response', async () => {
  await loadWorkspace(user);
  const previous = requests.length;
  const receipt = await groups.moveTeamsToGroup(id, [teamA, teamB], groupId);
  assert.equal(receipt.movedCount, 2);
  assert.deepEqual(requests.slice(previous), [{ method: 'put', url: '/competitions/' + id + '/teams/group', body: { teamIds: [teamA, teamB], groupId } }]);
  assert.deepEqual(groups.getTeamIdsInGroup(id, groupId), [teamA, teamB]);
  await groups.moveTeamsToGroup(id, [teamA, teamB], null);
  assert.equal(requests.at(-1).body.groupId, null);
  assert.equal(groups.getGroupForTeam(id, teamA), undefined);
});

test('failed bulk grouping preserves cached memberships and teams', async () => {
  await loadWorkspace(user);
  const previous = structuredClone(workspace.details[id]);
  failure = true;
  try { await assert.rejects(groups.moveTeamsToGroup(id, [teamA, teamB], groupId)); }
  finally { failure = false; }
  assert.deepEqual(workspace.details[id], previous);
});

test('a late bulk response cannot restore private cache after logout', async context => {
  await loadWorkspace(user);
  let finish;
  context.mock.method(api, 'put', () => new Promise(resolve => { finish = resolve; }));
  const pending = groups.moveTeamsToGroup(id, [teamA, teamB], groupId);
  clearWorkspace();
  finish({ data: { movedCount: 2, unchangedCount: 0, groups: [{ groupId, groupName: 'Group A', teamIds: [teamA, teamB] }] } });
  await pending;
  assert.equal(workspace.user, null);
  assert.deepEqual(workspace.details, {});
});

test('workspace background refresh keeps cached projects visible until requests finish', async () => {
  await loadWorkspace(user);
  const previousDetails = workspace.details[id];
  const adapter = api.defaults.adapter;
  let release;
  let reached;
  const blocked = new Promise(resolve => { reached = resolve; });
  api.defaults.adapter = async config => {
    if (config.url === `/competitions/${id}/teams`) {
      await new Promise(resolve => { release = resolve; reached(); });
    }
    return adapter(config);
  };
  const pending = loadWorkspace(user);
  try {
    await blocked;
    assert.equal(workspace.projects.some(p => p.id === id), true);
    assert.equal(workspace.details[id], previousDetails);
  } finally {
    release();
    await pending;
    api.defaults.adapter = adapter;
  }
});
