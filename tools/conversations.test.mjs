import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_STORAGE_KEY, loadConversations, saveConversations, ensureScope, createConversation, addMessage } from '../web/src/conversations.js';

function memoryStorage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), items };
}

test('new scopes start with two empty channels, creation is immutable and isolated by role/workspace', () => {
  const initial = loadConversations(null);
  const a = ensureScope(initial, 'founder:lotus');
  assert.deepEqual(Object.keys(initial.scopes), []);
  assert.deepEqual(a.scopes['founder:lotus'].conversations.map(c => [c.name, c.messages.length]), [['chung', 0], ['ghi-chu', 0]]);
  assert.equal(ensureScope(a, 'founder:lotus'), a);
  const b = ensureScope(a, 'investor:lotus');
  const { data, conversation } = createConversation(b, 'founder:lotus', { name: '  Đội sản phẩm  ', description: '  Thảo luận  ', kind: 'direct' });
  assert.equal(conversation.name, 'Đội sản phẩm');
  assert.equal(conversation.description, 'Thảo luận');
  assert.equal(conversation.kind, 'direct');
  assert.equal(b.scopes['founder:lotus'].conversations.length, 2);
  assert.equal(data.scopes['founder:lotus'].conversations.length, 3);
  assert.equal(data.scopes['investor:lotus'], b.scopes['investor:lotus']);
  assert.doesNotThrow(() => createConversation(data, 'founder:other', { name: 'Đội sản phẩm' }));
  assert.throws(() => createConversation(data, 'founder:lotus', { name: 'đỘI SẢN PHẨM' }), /đã tồn tại/);
});

test('send and reply preserve full history through storage reload without changing existing app data', () => {
  const storage = memoryStorage();
  storage.setItem('x-workspace-v1', '{"existing":"untouched"}');
  const scope = 'investor:personal';
  const created = createConversation(loadConversations(storage), scope, { name: 'Thẩm định' });
  const first = addMessage(created.data, scope, created.conversation.id, { text: '  Xin chào\nDòng thứ hai  ' });
  assert.equal(created.conversation.messages.length, 0);
  const message = first.scopes[scope].conversations.at(-1).messages[0];
  const replied = addMessage(first, scope, created.conversation.id, { text: 'Đã ghi nhận.', replyTo: message.id });
  assert.equal(message.author, 'Bạn');
  assert.equal(message.replyTo, null);
  assert.equal(message.text, 'Xin chào\nDòng thứ hai');
  assert.equal(first.scopes[scope].conversations.at(-1).messages.length, 1);
  assert.equal(replied.scopes[scope].conversations.at(-1).messages[1].replyTo, message.id);
  assert.equal(saveConversations(replied, storage), true);
  assert.deepEqual(loadConversations(storage), replied);
  assert.equal(storage.getItem('x-workspace-v1'), '{"existing":"untouched"}');
  assert.throws(() => addMessage(replied, 'founder:personal', created.conversation.id, { text: 'Sai không gian' }), /Không tìm thấy/);
  const other = replied.scopes[scope].conversations[0];
  assert.throws(() => addMessage(replied, scope, other.id, { text: 'Sai luồng', replyTo: message.id }), /không thuộc/);
});

test('input boundaries, blank values, invalid kinds and cross-conversation replies are rejected', () => {
  const scope = 'founder:personal';
  const data = ensureScope(loadConversations(null), scope);
  const conversationId = data.scopes[scope].conversations[0].id;
  for (const name of ['', '   ', 'a'.repeat(81), null]) assert.throws(() => createConversation(data, scope, { name }));
  assert.doesNotThrow(() => createConversation(data, scope, { name: 'a'.repeat(80) }));
  assert.throws(() => createConversation(data, scope, { name: 'A', kind: 'external' }));
  assert.throws(() => createConversation(data, scope, { name: 'A', description: 'a'.repeat(501) }));
  for (const text of ['', ' \n ', 'a'.repeat(4001), null]) assert.throws(() => addMessage(data, scope, conversationId, { text }));
  assert.doesNotThrow(() => addMessage(data, scope, conversationId, { text: 'a'.repeat(4000) }));
  assert.throws(() => addMessage(data, scope, conversationId, { text: 'A', replyTo: 'missing' }));
  assert.throws(() => ensureScope(data, '__proto__'));
});

test('malformed or unavailable storage fails safely and does not overwrite another key', () => {
  const storage = memoryStorage();
  const empty = loadConversations(null);
  for (const raw of ['{broken', 'null', '{"version":9,"scopes":{}}', '{"version":1,"scopes":{"founder:x":{"conversations":[{}]}}}']) {
    storage.setItem(CHAT_STORAGE_KEY, raw);
    assert.deepEqual(loadConversations(storage), empty);
  }
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(loadConversations(throwing), empty);
  assert.equal(saveConversations(empty, throwing), false);
  assert.equal(saveConversations({ version: 1, scopes: [] }, storage), false);
  assert.equal(saveConversations(empty, null), false);
});

test('empty saved scopes recover default channels while preserving scope metadata and other history', () => {
  const storage = memoryStorage();
  const created = createConversation(loadConversations(null), 'founder:other', { name: 'Hồ sơ' });
  const data = { ...created.data, scopes: { ...created.data.scopes, 'investor:personal': { conversations: [], label: 'Giữ nhãn' } } };
  assert.equal(saveConversations(data, storage), true);
  const repaired = ensureScope(loadConversations(storage), 'investor:personal');
  assert.deepEqual(repaired.scopes['investor:personal'].conversations.map(item => item.name), ['chung', 'ghi-chu']);
  assert.equal(repaired.scopes['investor:personal'].label, 'Giữ nhãn');
  assert.deepEqual(repaired.scopes['founder:other'], data.scopes['founder:other']);
  assert.deepEqual(data.scopes['investor:personal'].conversations, []);
});

test('default browser storage failures preserve unsaved history in the app session and injected stores stay isolated', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const empty = loadConversations(null);
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } });
    assert.deepEqual(loadConversations(), empty);
    const created = createConversation(empty, 'investor:personal', { name: 'Không mất tin nhắn' });
    const sent = addMessage(created.data, 'investor:personal', created.conversation.id, { text: 'Giữ trong phiên ngay cả khi đổi trang.' });
    assert.equal(saveConversations(sent), false);
    assert.deepEqual(loadConversations(), sent);
    const loaded = loadConversations();
    loaded.scopes['investor:personal'].conversations.at(-1).messages[0].text = 'Thay đổi bản sao';
    assert.deepEqual(loadConversations(), sent);
    assert.deepEqual(loadConversations(memoryStorage()), empty);
    assert.equal(saveConversations(empty, memoryStorage()), true);
    assert.deepEqual(loadConversations(), sent);

    const quotaStore = { getItem() { return null; }, setItem() { throw new DOMException('Full', 'QuotaExceededError'); } };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: quotaStore });
    const anotherScope = ensureScope(loadConversations(), 'founder:personal');
    assert.equal(saveConversations(anotherScope), false);
    assert.deepEqual(loadConversations(), anotherScope);
    assert.deepEqual(loadConversations(quotaStore), empty);

    const workingStore = memoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: workingStore });
    assert.equal(saveConversations(anotherScope), true);
    assert.deepEqual(loadConversations(), anotherScope);
    workingStore.setItem(CHAT_STORAGE_KEY, JSON.stringify(empty));
    assert.deepEqual(loadConversations(), empty);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
    saveConversations(empty);
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('stale tabs preserve new messages in different account scopes when either saves again', () => {
  const storage = memoryStorage();
  let investorTab = ensureScope(loadConversations(storage), 'investor:personal');
  let startupTab = ensureScope(loadConversations(storage), 'founder:personal');
  const investorChannel = investorTab.scopes['investor:personal'].conversations[0].id;
  const startupChannel = startupTab.scopes['founder:personal'].conversations[0].id;
  investorTab = addMessage(investorTab, 'investor:personal', investorChannel, { text: 'Nhà đầu tư gửi trước.' });
  assert.equal(saveConversations(investorTab, storage), true);
  startupTab = addMessage(startupTab, 'founder:personal', startupChannel, { text: 'Startup gửi từ tab đã mở trước đó.' });
  assert.equal(saveConversations(startupTab, storage), true);
  investorTab = addMessage(investorTab, 'investor:personal', investorChannel, { text: 'Nhà đầu tư gửi tiếp từ bản cũ.' });
  assert.equal(saveConversations(investorTab, storage), true);
  const reloaded = loadConversations(storage);
  assert.deepEqual(new Set(reloaded.scopes['investor:personal'].conversations[0].messages.map(message => message.text)), new Set(['Nhà đầu tư gửi trước.', 'Nhà đầu tư gửi tiếp từ bản cũ.']));
  assert.deepEqual(reloaded.scopes['founder:personal'].conversations[0].messages.map(message => message.text), ['Startup gửi từ tab đã mở trước đó.']);
  assert.equal(startupTab.scopes['investor:personal'], undefined);
});

test('interleaved sends in the same conversation merge once, in time order, with valid reply references', () => {
  const storage = memoryStorage(), scope = 'investor:personal';
  let initial = ensureScope(loadConversations(storage), scope);
  const channelId = initial.scopes[scope].conversations[0].id;
  initial = addMessage(initial, scope, channelId, { text: 'Câu hỏi chung' });
  initial.scopes[scope].conversations[0].messages[0].createdAt = '2026-11-01T08:00:00Z';
  assert.equal(saveConversations(initial, storage), true);
  const parentId = initial.scopes[scope].conversations[0].messages[0].id;
  let tabA = loadConversations(storage), tabB = loadConversations(storage);
  tabA = addMessage(tabA, scope, channelId, { text: 'Trả lời A', replyTo: parentId });
  tabA.scopes[scope].conversations[0].messages.at(-1).createdAt = '2026-11-01T08:03:00Z';
  tabB = addMessage(tabB, scope, channelId, { text: 'Trả lời B', replyTo: parentId });
  const bMessage = tabB.scopes[scope].conversations[0].messages.at(-1);
  bMessage.createdAt = '2026-11-01T08:01:00Z';
  tabB = addMessage(tabB, scope, channelId, { text: 'Chi tiết của B', replyTo: bMessage.id });
  tabB.scopes[scope].conversations[0].messages.at(-1).createdAt = '2026-11-01T08:02:00Z';
  assert.equal(saveConversations(tabA, storage), true);
  assert.equal(saveConversations(tabB, storage), true);
  assert.equal(saveConversations(tabA, storage), true);
  const reloaded = loadConversations(storage);
  const messages = reloaded.scopes[scope].conversations[0].messages;
  assert.deepEqual(messages.map(message => message.text), ['Câu hỏi chung', 'Trả lời B', 'Chi tiết của B', 'Trả lời A']);
  assert.equal(messages[2].replyTo, messages[1].id);
  assert.equal(new Set(messages.map(message => message.id)).size, 4);

  const skewed = addMessage(reloaded, scope, channelId, { text: 'Đồng hồ chạy chậm', replyTo: messages.at(-1).id });
  skewed.scopes[scope].conversations[0].messages.at(-1).createdAt = '2026-11-01T07:00:00Z';
  assert.equal(saveConversations(skewed, storage), true);
  const finalMessages = loadConversations(storage).scopes[scope].conversations[0].messages;
  assert.equal(finalMessages.length, 5);
  assert.ok(finalMessages.findIndex(message => message.text === 'Trả lời A') < finalMessages.findIndex(message => message.text === 'Đồng hồ chạy chậm'));
});

test('two new tabs share default channels and retain separately created conversations with colliding names', () => {
  const storage = memoryStorage(), scope = 'founder:personal';
  const a = createConversation(loadConversations(storage), scope, { name: 'Thảo luận' });
  const b = createConversation(loadConversations(storage), scope, { name: 'thẢO LUẬN' });
  const tabA = addMessage(a.data, scope, a.conversation.id, { text: 'Tin từ A' });
  const tabB = addMessage(b.data, scope, b.conversation.id, { text: 'Tin từ B' });
  assert.equal(saveConversations(tabA, storage), true);
  assert.equal(saveConversations(tabB, storage), true);
  assert.equal(saveConversations(tabB, storage), true);
  const conversations = loadConversations(storage).scopes[scope].conversations;
  assert.equal(conversations.length, 4);
  assert.equal(conversations.find(c => c.id === a.conversation.id).messages[0].text, 'Tin từ A');
  assert.equal(conversations.find(c => c.id === b.conversation.id).messages[0].text, 'Tin từ B');
  assert.equal(new Set(conversations.map(c => c.name.toLocaleLowerCase('vi'))).size, 4);
});
