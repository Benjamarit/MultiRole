import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, plugins: [], server: { middlewareMode: true }, appType: 'custom' });
test.after(() => vite.close());
const { default: api } = await vite.ssrLoadModule('/src/api/client.js');
const { loadSystemAdminData, ADMIN_READ_TIMEOUT } = await vite.ssrLoadModule('/src/api/systemAdmin.js');
const user = { id: 'admin-id', name: 'Admin', email: 'admin@example.test', role: 'SYSTEM_ADMIN', status: 'Active' };
const monitoring = { users: [], projects: [], activities: [], totalProjects: 0 };
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} }; }

test('successful users render before slow monitoring finishes, with a longer read timeout', async () => {
  let release;
  let usersLoaded;
  const ready = new Promise(resolve => { usersLoaded = resolve; });
  const received = [];
  api.defaults.adapter = async config => {
    assert.equal(config.timeout, ADMIN_READ_TIMEOUT);
    assert.equal(config.timeout, 30000);
    if (config.url === '/admin/users') return response(config, [user]);
    return new Promise(resolve => { release = () => resolve(response(config, monitoring)); });
  };
  const pending = loadSystemAdminData({ onUsers: users => { received.push(users); usersLoaded(); }, onMonitoring: data => received.push(data) });
  await ready;
  assert.equal(received.length, 1);
  assert.equal(received[0][0].name, 'Admin');
  release(); await pending;
  assert.equal(received[1], monitoring);
});

test('monitoring timeout keeps successful users and identifies the failed section without calling it offline', async () => {
  let loadedUsers;
  api.defaults.adapter = async config => {
    if (config.url === '/admin/users') return response(config, [user]);
    throw Object.assign(new Error('timeout'), { code: 'ECONNABORTED', config });
  };
  await assert.rejects(loadSystemAdminData({ onUsers: users => { loadedUsers = users; }, onMonitoring: () => assert.fail('No monitoring response') }), error => {
    assert.equal(error.failures.length, 1);
    assert.equal(error.failures[0].part, 'monitoring');
    assert.match(error.message, /ข้อมูลติดตามระบบ/);
    assert.match(error.message, /เกินเวลารอ/);
    assert.doesNotMatch(error.message, /เชื่อมต่อ BackEnd ไม่ได้/);
    return true;
  });
  assert.equal(loadedUsers[0].email, user.email);
});

test('users failure still applies valid monitoring and a subsequent success recovers', async () => {
  let loaded;
  let fail = true;
  api.defaults.adapter = async config => {
    if (config.url === '/admin/users' && fail) throw Object.assign(new Error('Network Error'), { config });
    return response(config, config.url === '/admin/users' ? [user] : monitoring);
  };
  const callbacks = { onUsers: () => {}, onMonitoring: data => { loaded = data; } };
  await assert.rejects(loadSystemAdminData(callbacks), error => error.failures[0].part === 'users');
  assert.equal(loaded, monitoring);
  fail = false;
  await loadSystemAdminData(callbacks);
});

test('responses arriving after the page becomes inactive do not update either section', async () => {
  api.defaults.adapter = async config => response(config, config.url === '/admin/users' ? [user] : monitoring);
  await loadSystemAdminData({ isActive: () => false, onUsers: () => assert.fail('Inactive users update'), onMonitoring: () => assert.fail('Inactive monitoring update') });
});
