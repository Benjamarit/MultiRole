import test from 'node:test';
import assert from 'node:assert/strict';
import { startVisiblePolling } from '../src/utils/visiblePolling.js';

function environment() {
  const listeners = new Set();
  const timers = new Map();
  let next = 0;
  const visibility = {
    visibilityState: 'visible',
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  };
  return {
    options: { interval: 15000, visibility,
      schedule: (callback, delay) => { timers.set(++next, { callback, delay }); return next; },
      cancel: id => timers.delete(id) },
    timers, listeners,
    setVisible(value) { visibility.visibilityState = value ? 'visible' : 'hidden'; listeners.forEach(listener => listener()); },
    tick() { const [id, timer] = timers.entries().next().value; timers.delete(id); return timer.callback(); },
    delay() { return [...timers.values()][0]?.delay; },
  };
}

test('polling shares an in-flight request and schedules the next request after completion', async () => {
  const env = environment();
  let finish;
  let calls = 0;
  const controller = startVisiblePolling(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, env.options);
  const first = controller.refresh();
  assert.equal(controller.refresh(), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(env.timers.size, 0);
  finish();
  assert.equal(await first, true);
  assert.equal(env.delay(), 15000);
  controller.stop();
});

test('polling pauses while hidden, refreshes on return and removes listeners on unmount', async () => {
  const env = environment();
  let calls = 0;
  const controller = startVisiblePolling(async () => { calls++; }, env.options);
  await controller.refresh();
  env.setVisible(false);
  assert.equal(env.timers.size, 0);
  assert.equal(await controller.refresh(), false);
  assert.equal(calls, 1);
  env.setVisible(true);
  await controller.refresh();
  assert.equal(calls, 2);
  controller.stop();
  assert.equal(env.listeners.size, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(await controller.refresh(), false);
});

test('failures back off to two minutes and successful refresh restores the normal interval', async () => {
  const env = environment();
  let fail = true;
  const controller = startVisiblePolling(async () => { if (fail) throw new Error('offline'); }, env.options);
  assert.equal(await controller.refresh(), false);
  assert.equal(env.delay(), 30000);
  await env.tick(); assert.equal(env.delay(), 60000);
  await env.tick(); assert.equal(env.delay(), 120000);
  await env.tick(); assert.equal(env.delay(), 120000);
  fail = false;
  assert.equal(await env.tick(), true);
  assert.equal(env.delay(), 15000);
  controller.stop();
});

test('leaving during a request prevents rescheduling and marks its result inactive', async () => {
  const env = environment();
  let finish;
  let isActive;
  const controller = startVisiblePolling(active => { isActive = active; return new Promise(resolve => { finish = resolve; }); }, env.options);
  const request = controller.refresh();
  await Promise.resolve();
  controller.stop();
  assert.equal(isActive(), false);
  finish(); await request;
  assert.equal(env.timers.size, 0);
});
