import assert from 'node:assert/strict';
import test from 'node:test';
import { getBatchSubmissionCandidates } from '../src/data/evaluations/BatchSubmission.js';

const numeric = { id: 'quality', name: 'Quality', type: 'NUMERIC', maxScore: 10, weight: 80 };
const pass = { id: 'pass', name: 'Eligibility', type: 'PASS_FAIL', maxScore: 1, weight: 20 };
const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
const base = { teams, criteria: [numeric, pass], statuses: {}, scores: {}, displayedTeamIds: ['a'] };

test('batch readiness includes hidden assigned teams and all hidden criteria', () => {
  const state = getBatchSubmissionCandidates({ ...base, scores: { a: { quality: 8, pass: 1 }, b: { quality: 7, pass: 1 }, c: { quality: 10 } }, statuses: { a: 'DRAFT', b: 'DRAFT' } });
  assert.deepEqual(state.ready.map(team => team.teamId), ['a', 'b']);
  assert.equal(state.ready[0].hidden, false);
  assert.equal(state.ready[1].hidden, true);
  assert.equal(state.ready[0].totalScore, 84);
  assert.deepEqual(state.incomplete[0].missing.map(c => c.id), ['pass']);
});
test('submitted teams are excluded even when their local scores have been edited', () => {
  const state = getBatchSubmissionCandidates({ ...base, statuses: { a: 'SUBMITTED' }, scores: { a: { quality: 2, pass: 0 }, b: { quality: 6, pass: 1 } } });
  assert.deepEqual(state.ready.map(team => team.teamId), ['b']);
  assert.deepEqual(state.submitted.map(team => team.id), ['a']);
});
test('zero numeric and fail scores are complete and valid', () => {
  const state = getBatchSubmissionCandidates({ ...base, scores: { a: { quality: 0, pass: 0 } } });
  assert.equal(state.ready.length, 1);
  assert.equal(state.ready[0].totalScore, 0);
});
test('invalid values and missing scores are excluded with actionable criteria', () => {
  for (const value of [11, -1, NaN, Infinity, '8', '']) {
    const state = getBatchSubmissionCandidates({ ...base, scores: { a: { quality: value, pass: 1 } } });
    assert.equal(state.ready.length, 0);
    assert.deepEqual(state.incomplete[0].invalid.map(c => c.id), ['quality']);
  }
  const state = getBatchSubmissionCandidates({ ...base, scores: { a: { quality: null, pass: 2 } } });
  assert.deepEqual(state.incomplete[0].missing.map(c => c.id), ['quality']);
  assert.deepEqual(state.incomplete[0].invalid.map(c => c.id), ['pass']);
});
test('a competition with no criteria never produces ready submissions', () => {
  const state = getBatchSubmissionCandidates({ ...base, criteria: [] });
  assert.equal(state.ready.length, 0);
  assert.equal(state.incomplete.length, 3);
});
test('review captures scores and feedback without retaining mutable form references', () => {
  const scores = { a: { quality: 8, pass: 1 } };
  const criteriaComments = { a: { quality: 'Original' } };
  const comments = { a: 'Overall' };
  const state = getBatchSubmissionCandidates({ ...base, scores, criteriaComments, comments });
  scores.a.quality = 1; criteriaComments.a.quality = 'Changed'; comments.a = 'Changed';
  assert.equal(state.ready[0].scores.quality, 8);
  assert.equal(state.ready[0].criteriaComments.quality, 'Original');
  assert.equal(state.ready[0].comment, 'Overall');
});
