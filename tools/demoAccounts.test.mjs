import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, freshState, changeRole, changePlan, getPlan } from '../web/domain.js';
import { DEMO_ACCOUNTS, ACTIVE_ACCOUNT_STORAGE_KEY, getAccountStorageKey, getActiveAccountId, setActiveAccountId, loadAccount, saveAccount } from '../web/src/demoAccounts.js';

function storage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}

test('two fixed demo roles start independently and Startup Scale can cover all sample companies', () => {
  const store = storage();
  assert.deepEqual(DEMO_ACCOUNTS.map(a => [a.id, a.role]), [['investor-demo', 'investor'], ['startup-demo', 'founder']]);
  assert.equal(getActiveAccountId(store), 'investor-demo');
  const investor = loadAccount('investor-demo', store);
  const founder = loadAccount('startup-demo', store);
  assert.equal(investor.role, 'investor');
  assert.equal(getPlan(investor).tier, 'free');
  assert.equal(founder.role, 'founder');
  assert.equal(getPlan(founder).name, 'Startup Scale');
  assert.ok(getPlan(founder).workspaces >= founder.startups.length);
  assert.equal(founder.workspaces.filter(w => w.role === 'founder').length, 0);
  assert.notEqual(getAccountStorageKey('investor-demo'), getAccountStorageKey('startup-demo'));
  assert.equal(saveAccount('investor-demo', investor, store), true);
  assert.equal(saveAccount('startup-demo', founder, store), true);
  assert.equal(store.getItem(STORAGE_KEY), null);
});

test('legacy workspaces, tasks, notes, portfolio and usage are retained without rewriting the original snapshot', () => {
  const store = storage();
  const previous = freshState();
  changeRole(previous, 'founder');
  previous.workspaces.push({ id: 'w-existing-founder', role: 'founder', startupId: 'verda', name: 'Hồ sơ thật đã lưu', goal: 'Giữ nguyên', notes: 'Ghi chú quan trọng', tasks: [{ id: 'existing-task', title: 'Việc đã lưu', status: 'doing', owner: 'Tôi' }], documents: [{ id: 'existing-doc', name: 'Hồ sơ.pdf', size: 55 }] });
  previous.activeWorkspace = 'w-existing-founder';
  previous.usageByRole.founder.free.aiTokens = 850;
  const raw = JSON.stringify(previous);
  store.setItem(STORAGE_KEY, raw);
  assert.equal(getActiveAccountId(store), 'startup-demo');
  const founder = loadAccount('startup-demo', store);
  assert.deepEqual(founder.workspaces, previous.workspaces);
  assert.deepEqual(founder.portfolio, previous.portfolio);
  assert.equal(founder.activeWorkspace, 'w-existing-founder');
  assert.equal(founder.usageByRole.founder.free.aiTokens, 850);
  assert.equal(getPlan(founder).tier, 'pro');
  assert.equal(saveAccount('startup-demo', founder, store), true);
  assert.equal(saveAccount('investor-demo', loadAccount('investor-demo', store), store), true);
  assert.equal(store.getItem(STORAGE_KEY), raw);
});

test('account edits and saved plan changes persist independently across switches and reloads', () => {
  const store = storage();
  const investor = loadAccount('investor-demo', store);
  investor.watchlist = ['supply'];
  investor.usageByRole.investor.free.aiTokens = 700;
  assert.equal(saveAccount('investor-demo', investor, store), true);
  const investorSnapshot = store.getItem(getAccountStorageKey('investor-demo'));
  const founder = loadAccount('startup-demo', store);
  founder.startups[0].name = 'Tên công ty đã sửa';
  founder.usageByRole.founder.paid.aiTokens = 1200;
  changePlan(founder, 'plus');
  assert.equal(saveAccount('startup-demo', founder, store), true);
  assert.equal(setActiveAccountId('startup-demo', store), true);
  assert.equal(getActiveAccountId(store), 'startup-demo');
  assert.equal(loadAccount('startup-demo', store).startups[0].name, 'Tên công ty đã sửa');
  assert.equal(getPlan(loadAccount('startup-demo', store)).tier, 'plus');
  assert.equal(setActiveAccountId('investor-demo', store), true);
  assert.deepEqual(loadAccount('investor-demo', store).watchlist, ['supply']);
  assert.equal(loadAccount('investor-demo', store).usageByRole.investor.free.aiTokens, 700);
  assert.equal(loadAccount('investor-demo', store).startups[0].name, 'LotusPay');
  assert.equal(store.getItem(getAccountStorageKey('investor-demo')), investorSnapshot);
  assert.equal(saveAccount('investor-demo', founder, store), false);
  assert.equal(store.getItem(getAccountStorageKey('investor-demo')), investorSnapshot);
});

test('invalid selections and corrupted state fall back safely while original stored bytes remain available', () => {
  const store = storage();
  store.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, 'unknown-account');
  store.setItem(STORAGE_KEY, '{broken legacy');
  store.setItem(getAccountStorageKey('startup-demo'), '{broken account');
  assert.equal(getActiveAccountId(store), 'investor-demo');
  assert.equal(getPlan(loadAccount('startup-demo', store)).tier, 'pro');
  assert.equal(store.getItem(STORAGE_KEY), '{broken legacy');
  assert.equal(store.getItem(getAccountStorageKey('startup-demo')), '{broken account');
  assert.equal(saveAccount('investor-demo', { role: 'investor' }, store), false);
  assert.throws(() => loadAccount('unknown-account', store), /không hợp lệ/);
  assert.throws(() => setActiveAccountId('unknown-account', store), /không hợp lệ/);
  store.setItem(getAccountStorageKey('startup-demo'), JSON.stringify(freshState()));
  assert.equal(loadAccount('startup-demo', store).role, 'founder');
});

test('blocked browser storage preserves account state and selection in session without contaminating injected stores', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } });
    const founder = loadAccount('startup-demo');
    founder.startups[0].name = 'Giữ khi đổi tài khoản';
    assert.equal(saveAccount('startup-demo', founder), false);
    assert.equal(setActiveAccountId('startup-demo'), false);
    assert.equal(getActiveAccountId(), 'startup-demo');
    assert.equal(loadAccount('startup-demo').startups[0].name, 'Giữ khi đổi tài khoản');
    assert.equal(loadAccount('startup-demo', storage()).startups[0].name, 'LotusPay');
    assert.equal(getActiveAccountId(storage()), 'investor-demo');
    const loaded = loadAccount('startup-demo');
    loaded.startups[0].name = 'Chỉ thay bản sao';
    assert.equal(loadAccount('startup-demo').startups[0].name, 'Giữ khi đổi tài khoản');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage() });
    saveAccount('investor-demo', loadAccount('investor-demo', storage()));
    saveAccount('startup-demo', loadAccount('startup-demo', storage()));
    setActiveAccountId('investor-demo');
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
