export const CHAT_STORAGE_KEY = 'x-workspace-conversations-v1';
let unsavedSessionData = null;

const emptyData = () => ({ version: 1, scopes: {} });
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const id = () => globalThis.crypto?.randomUUID?.() || `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const nameKey = name => name.normalize('NFC').toLocaleLowerCase('vi');

function boundedText(value, max, label, required = true) {
  if (typeof value !== 'string') throw new Error(`${label} không hợp lệ.`);
  const text = value.trim();
  if ((required && !text) || text.length > max) throw new Error(`${label} ${required ? 'cần có nội dung và ' : ''}không quá ${max} ký tự.`);
  return text;
}

function checkScope(scopeKey) {
  if (typeof scopeKey !== 'string' || !scopeKey.trim() || scopeKey.length > 240 || ['__proto__', 'constructor', 'prototype'].includes(scopeKey)) throw new Error('Không gian trò chuyện không hợp lệ.');
}

function validData(data) {
  if (!data || data.version !== 1 || !data.scopes || typeof data.scopes !== 'object' || Array.isArray(data.scopes)) return false;
  try {
    for (const [scopeKey, scope] of Object.entries(data.scopes)) {
      checkScope(scopeKey);
      if (!scope || !Array.isArray(scope.conversations)) return false;
      const conversationIds = new Set(), names = new Set();
      for (const conversation of scope.conversations) {
        const name = boundedText(conversation.name, 80, 'Tên cuộc trò chuyện');
        boundedText(conversation.description, 500, 'Mô tả', false);
        if (!conversation.id || typeof conversation.id !== 'string' || conversationIds.has(conversation.id) || names.has(nameKey(name))) return false;
        if (!['channel', 'direct'].includes(conversation.kind) || !Number.isFinite(Date.parse(conversation.createdAt)) || !Array.isArray(conversation.messages)) return false;
        conversationIds.add(conversation.id); names.add(nameKey(name));
        const messageIds = new Set();
        for (const message of conversation.messages) {
          boundedText(message.text, 4000, 'Tin nhắn');
          if (!message.id || typeof message.id !== 'string' || messageIds.has(message.id) || message.author !== 'Bạn' || !Number.isFinite(Date.parse(message.createdAt))) return false;
          if (message.replyTo !== null && !messageIds.has(message.replyTo)) return false;
          messageIds.add(message.id);
        }
      }
    }
    return true;
  } catch { return false; }
}

function mergeMessages(saved, incoming) {
  const byId = new Map(saved.map(message => [message.id, message]));
  for (const message of incoming) if (!byId.has(message.id)) byId.set(message.id, message);
  const chronological = [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const ordered = [], emitted = new Set();
  for (const message of chronological) {
    const chain = [], visiting = new Set();
    let current = message;
    while (!emitted.has(current.id)) {
      if (visiting.has(current.id)) throw new Error('Luồng trả lời không hợp lệ.');
      visiting.add(current.id); chain.push(current);
      if (current.replyTo === null || emitted.has(current.replyTo)) break;
      current = byId.get(current.replyTo);
      if (!current) throw new Error('Không tìm thấy tin nhắn được trả lời.');
    }
    while (chain.length) {
      const next = chain.pop();
      emitted.add(next.id); ordered.push(next);
    }
  }
  return ordered;
}

function mergeData(saved, incoming) {
  const scopes = { ...saved.scopes };
  for (const [scopeKey, incomingScope] of Object.entries(incoming.scopes)) {
    const savedScope = scopes[scopeKey];
    if (!savedScope) { scopes[scopeKey] = incomingScope; continue; }
    const conversations = new Map(savedScope.conversations.map(conversation => [conversation.id, conversation]));
    const names = new Set(savedScope.conversations.map(conversation => nameKey(conversation.name)));
    for (const conversation of incomingScope.conversations) {
      const previous = conversations.get(conversation.id);
      if (previous) {
        conversations.set(conversation.id, { ...conversation, ...previous, messages: mergeMessages(previous.messages, conversation.messages) });
      } else {
        let name = conversation.name, suffix = 2;
        while (names.has(nameKey(name))) {
          const ending = ` (${suffix++})`;
          name = conversation.name.slice(0, 80 - ending.length).trimEnd() + ending;
        }
        names.add(nameKey(name));
        conversations.set(conversation.id, { ...conversation, name });
      }
    }
    scopes[scopeKey] = { ...incomingScope, ...savedScope, conversations: [...conversations.values()] };
  }
  return { ...incoming, ...saved, scopes };
}

function readStored(target) {
  const raw = target?.getItem(CHAT_STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const data = JSON.parse(raw);
    return validData(data) ? data : emptyData();
  } catch { return emptyData(); }
}

export function loadConversations(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const saved = readStored(target);
    return storage === undefined && unsavedSessionData ? structuredClone(mergeData(saved, unsavedSessionData)) : saved;
  } catch { return storage === undefined && unsavedSessionData ? structuredClone(unsavedSessionData) : emptyData(); }
}

export function saveConversations(data, storage) {
  try {
    if (!validData(data)) return false;
    let next = storage === undefined && unsavedSessionData ? mergeData(unsavedSessionData, data) : data;
    if (storage === undefined) unsavedSessionData = structuredClone(next);
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== 'function') return false;
    // A tab may have mounted before another tab added scopes or messages.
    next = mergeData(readStored(target), next);
    if (!validData(next)) return false;
    if (storage === undefined) unsavedSessionData = structuredClone(next);
    target.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    if (storage === undefined) unsavedSessionData = null;
    return true;
  } catch { return false; }
}

export function ensureScope(data, scopeKey) {
  checkScope(scopeKey);
  const previous = own(data.scopes, scopeKey) ? data.scopes[scopeKey] : null;
  if (previous?.conversations.length) return data;
  const conversations = ['chung', 'ghi-chu'].map(name => ({ id: `default-${name}`, name, kind: 'channel', description: '', messages: [], createdAt: now() }));
  return { ...data, scopes: { ...data.scopes, [scopeKey]: { ...previous, conversations } } };
}

export function createConversation(data, scopeKey, { name, kind = 'channel', description = '' }) {
  const cleanName = boundedText(name, 80, 'Tên cuộc trò chuyện');
  const cleanDescription = boundedText(description, 500, 'Mô tả', false);
  if (!['channel', 'direct'].includes(kind)) throw new Error('Loại cuộc trò chuyện không hợp lệ.');
  const next = ensureScope(data, scopeKey);
  const scope = next.scopes[scopeKey];
  if (scope.conversations.some(conversation => nameKey(conversation.name) === nameKey(cleanName))) throw new Error('Tên cuộc trò chuyện đã tồn tại trong không gian này.');
  const conversation = { id: id(), name: cleanName, kind, description: cleanDescription, messages: [], createdAt: now() };
  return { data: { ...next, scopes: { ...next.scopes, [scopeKey]: { ...scope, conversations: [...scope.conversations, conversation] } } }, conversation };
}

export function addMessage(data, scopeKey, conversationId, { text, replyTo = null }) {
  checkScope(scopeKey);
  const cleanText = boundedText(text, 4000, 'Tin nhắn');
  const scope = own(data.scopes, scopeKey) ? data.scopes[scopeKey] : null;
  const conversation = scope?.conversations.find(item => item.id === conversationId);
  if (!conversation) throw new Error('Không tìm thấy cuộc trò chuyện trong không gian này.');
  if (replyTo !== null && !conversation.messages.some(message => message.id === replyTo)) throw new Error('Tin nhắn được trả lời không thuộc cuộc trò chuyện này.');
  const message = { id: id(), author: 'Bạn', text: cleanText, createdAt: now(), replyTo };
  return { ...data, scopes: { ...data.scopes, [scopeKey]: { ...scope, conversations: scope.conversations.map(item => item.id === conversationId ? { ...item, messages: [...item.messages, message] } : item) } } };
}
