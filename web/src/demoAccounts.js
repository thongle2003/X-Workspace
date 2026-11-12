import { STORAGE_KEY, freshState, validateState, changeRole, changePlan } from '../domain.js';

export const DEMO_ACCOUNTS = Object.freeze([
  Object.freeze({ id: 'investor-demo', role: 'investor', name: 'Nhà đầu tư' }),
  Object.freeze({ id: 'startup-demo', role: 'founder', name: 'Startup' }),
]);
export const ACTIVE_ACCOUNT_STORAGE_KEY = 'x-workspace-active-demo-account-v1';
const pendingStates = new Map();
let pendingActiveId = null;

function accountFor(id) {
  const account = DEMO_ACCOUNTS.find(item => item.id === id);
  if (!account) throw new Error('Tài khoản dùng thử không hợp lệ.');
  return account;
}

export function getAccountStorageKey(id) {
  accountFor(id);
  return `x-workspace-demo-account-v1:${id}`;
}

function read(key, storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    return target?.getItem(key) ?? null;
  } catch { return null; }
}

function parseState(raw) {
  try { return raw ? validateState(JSON.parse(raw)) : null; }
  catch { return null; }
}

function forAccount(state, account) {
  const copy = validateState(structuredClone(state));
  for (const startup of copy.startups) {
    startup.description = startup.description
      .replace(/\s*Startup và các số liệu dưới đây là dữ liệu hư cấu dùng để thử nghiệm\./u, '')
      .replace(/\s*Dữ liệu minh họa, chưa kiểm toán\./u, '')
      .trim();
  }
  if (copy.role !== account.role) changeRole(copy, account.role);
  return copy;
}

export function getActiveAccountId(storage) {
  if (storage === undefined && pendingActiveId) return pendingActiveId;
  const saved = read(ACTIVE_ACCOUNT_STORAGE_KEY, storage);
  if (DEMO_ACCOUNTS.some(account => account.id === saved)) return saved;
  const previous = parseState(read(STORAGE_KEY, storage));
  return previous?.role === 'founder' ? 'startup-demo' : 'investor-demo';
}

export function setActiveAccountId(id, storage) {
  accountFor(id);
  if (storage === undefined) pendingActiveId = id;
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== 'function') return false;
    target.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, id);
    if (storage === undefined) pendingActiveId = null;
    return true;
  } catch { return false; }
}

export function loadAccount(id, storage) {
  const account = accountFor(id);
  if (storage === undefined && pendingStates.has(id)) return forAccount(pendingStates.get(id), account);
  const saved = parseState(read(getAccountStorageKey(id), storage));
  if (saved) return forAccount(saved, account);
  // Copy the previous shared workspace without deleting, rewriting or filtering it.
  const previous = parseState(read(STORAGE_KEY, storage)) || freshState();
  const initial = forAccount(previous, account);
  if (account.role === 'founder') changePlan(initial, 'pro');
  return initial;
}

export function saveAccount(id, state, storage) {
  const account = accountFor(id);
  try {
    if (state?.role !== account.role) return false;
    const copy = forAccount(state, account);
    if (storage === undefined) pendingStates.set(id, copy);
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== 'function') return false;
    target.setItem(getAccountStorageKey(id), JSON.stringify(copy));
    if (storage === undefined) pendingStates.delete(id);
    return true;
  } catch { return false; }
}
