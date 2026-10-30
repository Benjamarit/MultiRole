import test from 'node:test';
import assert from 'node:assert/strict';
import { getProjectSetupReadiness as ready, isActivationDeadlineValid } from '../src/data/ProjectReadiness.js';

test('draft setup stays incomplete when empty; teams and judges can be added before criteria', () => {
  assert.equal(ready([], [], [], []).ready, false);
  const result = ready([], [{ id: 'team' }], [{ id: 'judge' }], []);
  assert.equal(result.canAssign, true);
  assert.equal(result.criteriaReady, false);
  assert.equal(result.ready, false);
});

test('every team needs a current judge; duplicate and stale assignments do not inflate coverage', () => {
  const criteria = [{ weight: 100 }], teams = [{ id: 'a' }, { id: 'b' }], judges = [{ id: 'j' }];
  const assignments = [{ teamId: 'a', judgeId: 'j' }, { teamId: 'a', judgeId: 'j' }, { teamId: 'b', judgeId: 'removed' }, { teamId: 'other-project', judgeId: 'j' }];
  const partial = ready(criteria, teams, judges, assignments);
  assert.equal(partial.assignedTeamsCount, 1);
  assert.equal(partial.unassignedTeamsCount, 1);
  assert.equal(partial.ready, false);
  assert.equal(ready(criteria, teams, judges, [...assignments, { teamId: 'b', judgeId: 'j' }]).ready, true);
});

test('decimal weights use persisted hundredths and still require at least one criterion', () => {
  assert.equal(ready([{ weight: 33.33 }, { weight: 33.33 }, { weight: 33.34 }], [], [], []).criteriaReady, true);
  assert.equal(ready([{ weight: 99.99 }], [], [], []).criteriaReady, false);
  assert.equal(ready([{ weight: 100.01 }], [], [], []).criteriaReady, false);
  assert.equal(ready([], [], [], []).criteriaReady, false);
});

test('one judge may cover all teams; neither a group nor a deadline is required', () => {
  const result = ready([{ weight: 100 }], [{ id: 'a' }, { id: 'b' }], [{ id: 'j' }, { id: 'extra' }], [{ teamId: 'a', judgeId: 'j' }, { teamId: 'b', judgeId: 'j' }]);
  assert.equal(result.ready, true);
  assert.equal(ready([{ weight: 100 }], [], [{ id: 'j' }], []).ready, false);
  assert.equal(ready([{ weight: 100 }], [{ id: 'a' }], [], [{ teamId: 'a', judgeId: 'j' }]).ready, false);
});

test('activation deadline permits no deadline and future times, blocks the exact deadline, past and invalid values', () => {
  const now = new Date('2026-10-27T10:00:00+07:00').getTime();
  assert.equal(isActivationDeadlineValid(null, now), true);
  assert.equal(isActivationDeadlineValid('', now), true);
  assert.equal(isActivationDeadlineValid('2026-10-27T10:00:01+07:00', now), true);
  assert.equal(isActivationDeadlineValid('2026-10-27T10:00:00+07:00', now), false);
  assert.equal(isActivationDeadlineValid('2026-10-27T09:59:59+07:00', now), false);
  assert.equal(isActivationDeadlineValid('invalid-date', now), false);
});
