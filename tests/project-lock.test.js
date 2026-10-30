import test from 'node:test';
import assert from 'node:assert/strict';
import { isProjectStructureLocked } from '../src/data/ProjectLock.js';

test('only a draft that has never opened permits setup writes, including legacy status responses', () => {
  assert.equal(isProjectStructureLocked({status:'Draft',criteriaLocked:false}), false);
  assert.equal(isProjectStructureLocked({status:'Draft',criteriaLocked:true}), true);
  for (const status of ['Active','Closed','ACTIVE','CLOSED']) assert.equal(isProjectStructureLocked({status}), true);
  assert.equal(isProjectStructureLocked(null), false);
});
