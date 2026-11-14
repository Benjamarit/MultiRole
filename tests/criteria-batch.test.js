import assert from 'node:assert/strict';
import test from 'node:test';
import { criteriaBatchRequest, criteriaFingerprint } from '../src/data/evaluations/CriteriaBatch.js';

const a = { id: 'existing-id', name: 'Quality', type: 'STAR', maxScore: 5, weight: 60, displayOrder: 1 };
const b = { id: 'local-new', name: 'Impact', type: 'NUMERIC', maxScore: 10, weight: 40 };

test('criteria batch retains existing IDs and converts local rows into new entries', () => {
  const body = criteriaBatchRequest([b, { ...a, weight: 50 }], [a]);
  assert.equal(body.criteria[0].criterionId, null);
  assert.equal(body.criteria[1].criterionId, a.id);
  assert.equal(body.expectedCriteria[0].weightPercentage, 60);
  body.criteria[1].title = 'Changed';
  assert.equal(a.name, 'Quality');
});

test('criteria fingerprint detects staged additions, deletion, order and content changes', () => {
  const fingerprint = criteriaFingerprint([a, b]);
  for (const changed of [[b, a], [a], [a, b, { ...b, name: 'Extra' }], [{ ...a, weight: 50 }, b]]) {
    assert.notEqual(criteriaFingerprint(changed), fingerprint);
  }
  assert.equal(criteriaFingerprint([{ ...a, description: null }]), criteriaFingerprint([{ ...a, description: '' }]));
});
