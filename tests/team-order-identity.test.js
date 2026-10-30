import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveJudgeIdentity } from '../src/data/JudgeIdentity.js';
import { orderTeams, filterAndSortTeams, moveTeamInOrder } from '../src/data/TeamOrdering.js';

const teams = [{ id: 'ten-uuid', name: 'ทีม 10' }, { id: 'two-uuid', name: 'ทีม 2' }, { id: 'one-uuid', name: 'ทีม 1' }];

test('judge details use names and email from the API, even when the directory no longer contains them', () => {
  assert.deepEqual(resolveJudgeIdentity({ judgeId: 'judge-uuid', judgeName: 'ผู้ประเมิน', judgeEmail: 'judge@example.test' }), { name: 'ผู้ประเมิน', email: 'judge@example.test' });
});

test('legacy evaluations can resolve identities by UUID and never display the raw UUID as a name', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(resolveJudgeIdentity({ judgeId: id }, [], [{ id, name: 'กรรมการเดิม', email: 'judge@example.test' }]), { name: 'กรรมการเดิม', email: 'judge@example.test' });
  assert.deepEqual(resolveJudgeIdentity({ judgeId: id, judgeName: id }), { name: '', email: '' });
});

test('team names use natural numeric sorting and saved order overrides names', () => {
  assert.deepEqual(orderTeams(teams).map((t) => t.name), ['ทีม 1', 'ทีม 2', 'ทีม 10']);
  const saved = teams.map((team, index) => ({ ...team, displayOrder: index + 1 }));
  assert.deepEqual(orderTeams(saved).map((t) => t.name), ['ทีม 10', 'ทีม 2', 'ทีม 1']);
  assert.deepEqual(filterAndSortTeams(saved, { sortBy: 'name-desc' }).map((t) => t.name), ['ทีม 10', 'ทีม 2', 'ทีม 1']);
  assert.deepEqual(filterAndSortTeams(saved, { sortBy: 'name-asc' }).map((t) => t.name), ['ทีม 1', 'ทีม 2', 'ทีม 10']);
});

test('group filtering, search and sorting retain the saved order within a group', () => {
  const groupForTeam = new Map([['ten-uuid', { id: 'group-a', name: 'สาย A' }], ['two-uuid', { id: 'group-a', name: 'สาย A' }]]);
  assert.deepEqual(filterAndSortTeams(teams, { groupId: 'ungrouped', groupForTeam }).map((t) => t.id), ['one-uuid']);
  assert.deepEqual(filterAndSortTeams(teams, { search: 'สาย A', sortBy: 'group', groupForTeam }).map((t) => t.id), ['two-uuid', 'ten-uuid']);
  assert.deepEqual(filterAndSortTeams(teams, { groupId: 'group-a', search: '10', groupForTeam }).map((t) => t.id), ['ten-uuid']);
});

test('moving one team sends a complete permutation of UUIDs and protects boundaries', () => {
  assert.deepEqual(moveTeamInOrder(teams, 'ten-uuid', -1), ['one-uuid', 'ten-uuid', 'two-uuid']);
  assert.equal(moveTeamInOrder(teams, 'one-uuid', -1), null);
  assert.equal(moveTeamInOrder(teams, 'ten-uuid', 1), null);
  assert.equal(moveTeamInOrder(teams, 'unknown', 1), null);
});
