import assert from 'node:assert/strict';
import test from 'node:test';
import { rankEvaluatedTeams } from '../src/data/evaluations/Ranking.js';
import { getDraftSnapshots, evaluationSnapshot, scorePayload, evaluationFingerprint, getUnsavedTeamIds } from '../src/data/evaluations/EvaluationPayload.js';

test('ranking excludes unscored teams but keeps a legitimately submitted zero', () => {
  assert.deepEqual(rankEvaluatedTeams([{ id: 'empty', evaluatedCount: 0, averageScore: 0 }]), []);
  assert.deepEqual(rankEvaluatedTeams([{ id: 'empty', evaluatedCount: 0, averageScore: 0 },
    { id: 'zero', evaluatedCount: 1, averageScore: 0 }]).map(t => [t.id, t.rank]), [['zero', 1]]);
});
test('shared ranks follow 1, 1, 3 and use displayed precision without mutating inputs', () => {
  const teams = [70, 90.001, 90.002, 70, 0].map((averageScore, id) => ({ id, averageScore, evaluatedCount: 2 }));
  const ranked = rankEvaluatedTeams(teams);
  assert.deepEqual(ranked.map(t => [t.averageScore, t.rank]), [[90, 1], [90, 1], [70, 3], [70, 3], [0, 5]]);
  assert.equal(teams[1].averageScore, 90.001);
});
test('draft-all captures hidden/incomplete teams with content, skips empty and submitted teams', () => {
  const input = { teams: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id })), statuses: { a: 'DRAFT', c: 'SUBMITTED' },
    scores: { a: { x: 0 }, b: { x: 7 }, c: { x: 9 } }, criteriaComments: { e: { y: 'Feedback only' } } };
  const snapshots = getDraftSnapshots(input);
  assert.deepEqual(snapshots.map(t => t.teamId), ['a', 'b', 'e']);
  input.scores.a.x = 10;
  assert.equal(snapshots[0].scores.x, 0);
  assert.deepEqual(scorePayload(snapshots[2].scores, snapshots[2].criteriaComments),
    [{ criterionId: 'y', scoreValue: null, comment: 'Feedback only' }]);
});
test('a per-team draft snapshot never copies another team or changes its scores', () => {
  const scores = { a: { quality: 2 }, b: { quality: 9 } };
  const saved = evaluationSnapshot('a', scores.a, { quality: 'A only' }, 'Team A');
  saved.scores.quality = 5;
  assert.deepEqual(scores, { a: { quality: 2 }, b: { quality: 9 } });
  assert.equal(saved.teamId, 'a');
});

test('dirty detection includes hidden teams, saved drafts, submitted edits and comment-only changes', () => {
  const input = { teams: ['a', 'hidden', 'published'].map(id => ({ id })),
    savedSnapshots: { a: evaluationSnapshot('a', { x: 2 }), published: evaluationSnapshot('published', { x: 8 }) },
    scores: { a: { x: 3 }, hidden: {}, published: { x: 9 } },
    criteriaComments: { hidden: { x: 'Needs review' } }, comments: {} };
  assert.deepEqual(getUnsavedTeamIds(input), ['a', 'hidden', 'published']);
  input.savedSnapshots.a = evaluationSnapshot('a', { x: 3 });
  assert.deepEqual(getUnsavedTeamIds(input), ['hidden', 'published'], 'A confirmed single save must clear only A');
  input.scores.published.x = 8;
  assert.deepEqual(getUnsavedTeamIds(input), ['hidden'], 'Reverting a value removes its dirty state');
});

test('dirty detection preserves zero and detects clearing a previously saved draft', () => {
  const input = { teams: [{ id: 'a' }], savedSnapshots: { a: evaluationSnapshot('a', { x: 0 }) },
    scores: { a: { x: 0 } }, criteriaComments: {}, comments: {} };
  assert.deepEqual(getUnsavedTeamIds(input), []);
  input.scores.a.x = null;
  assert.deepEqual(getUnsavedTeamIds(input), ['a']);
  input.savedSnapshots.a = evaluationSnapshot('a', {});
  assert.deepEqual(getUnsavedTeamIds(input), [], 'Confirmed empty drafts are clean');
});

test('fingerprints ignore object key ordering, blank missing scores and trimmed criterion feedback', () => {
  assert.equal(evaluationFingerprint({ scores: { b: 0, a: 2, c: null }, criteriaComments: { a: ' Feedback ' } }),
    evaluationFingerprint({ scores: { a: 2, b: 0 }, criteriaComments: { a: 'Feedback', c: '' } }));
  assert.notEqual(evaluationFingerprint({ comment: 'New overall feedback' }), evaluationFingerprint({}));
});
