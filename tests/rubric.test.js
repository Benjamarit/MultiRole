import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRubricLevels, hydrateRubricRowsFromDescription, serializeRubricRows, buildDefaultRubricRows } from '../src/data/evaluations/Rubric.js';

test('editing an existing plain description does not erase it', () => {
  const description = 'พิจารณาความชัดเจนของผลงาน\nและการตอบคำถาม';
  const rows = hydrateRubricRowsFromDescription('STAR', 5, description);
  assert.equal(serializeRubricRows(rows), description);
});

test('custom star ranges and percentage labels survive repeated editing', () => {
  for (const [type, maxScore, description] of [
    ['STAR', 5, '★ 5 ดาว: อธิบายได้ครบ\n★ 1-2 ดาว: ยังไม่ชัดเจน'],
    ['PERCENTAGE', 100, '80-100%: ดีมาก\n0-39%: ควรปรับปรุง'],
    ['PASS_FAIL', 1, 'Pass: Meets requirements\nFail: Incomplete'],
  ]) {
    const firstSave = serializeRubricRows(hydrateRubricRowsFromDescription(type, maxScore, description));
    assert.equal(firstSave, description);
    assert.equal(serializeRubricRows(hydrateRubricRowsFromDescription(type, maxScore, firstSave)), description);
  }
});

test('both evaluation views can display inline star rubric descriptions consistently', () => {
  const parsed = parseRubricLevels('★ 5 ดาว: ดีมาก ★ 4 ดาว: ดี');
  assert.deepEqual(parsed, [{ label: '★ 5 ดาว', detail: 'ดีมาก' }, { label: '★ 4 ดาว', detail: 'ดี' }]);
  assert.deepEqual(parseRubricLevels('https://example.com/project'), [{ label: null, detail: 'https://example.com/project' }]);
});

test('low numeric maximum scores do not produce negative or reversed ranges', () => {
  assert.deepEqual(buildDefaultRubricRows('NUMERIC', 1).map((row) => row.label), ['1 คะแนน', '0 คะแนน']);
});
