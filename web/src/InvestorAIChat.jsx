import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Clock3, LoaderCircle, Menu, Plus, Sparkles, X } from 'lucide-react';
import { money } from '../domain.js';
import { DEMO_ACCOUNTS } from './demoAccounts.js';
import { useWorkflow } from './InvestmentFlow.jsx';
import { demoAnswer } from './DemoAIAgent.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import './investor-ai-chat.css';

const prompts = ['Phân tích tài chính', 'Câu hỏi thẩm định', 'Rủi ro dòng tiền', 'Khám phá startup'];
const sessionStoragePrefix = 'x-workspace-ai-chat-session-v1';
const pageSessions = new Map();

function makeSessionId() {
  return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function storedSessionKey(actor) { return `${sessionStoragePrefix}:${actor}`; }

function historyFromChats(chats) {
  const sessions = new Map();
  for (const chat of chats) {
    const sessionId = typeof chat.sessionId === 'string' ? chat.sessionId : `legacy-${chat.id}`;
    const date = Date.parse(chat.createdAt) || 0;
    const current = sessions.get(sessionId);
    const title = String(chat.question || '').trim();
    if (!current) sessions.set(sessionId, { id: sessionId, title: title || 'Cuộc trò chuyện cũ', preview: chat.text || '', updatedAt: chat.createdAt, sortDate: date });
    else {
      if (title && (!current.firstQuestionDate || date < current.firstQuestionDate)) { current.title = title; current.firstQuestionDate = date; }
      if (date >= current.sortDate) { current.preview = chat.text || title || current.preview; current.updatedAt = chat.createdAt; current.sortDate = date; }
    }
    if (title && !current) sessions.get(sessionId).firstQuestionDate = date;
  }
  return [...sessions.values()].sort((a, b) => b.sortDate - a.sortDate);
}

function messagesFromChats(chats, sessionId) {
  const selected = chats.filter(chat => (typeof chat.sessionId === 'string' ? chat.sessionId : `legacy-${chat.id}`) === sessionId).slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return selected.flatMap(chat => [
    ...(chat.question ? [{ id: `${chat.id}-question`, role: 'user', text: chat.question }] : []),
    { id: chat.id, role: 'assistant', text: chat.text, tokenUsage: chat.tokenUsage, model: chat.model, provider: chat.provider },
  ]);
}

function formatAssistantText(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part,
  );
}

function ChatCanvas({ messages, pending, ready, statusMessage, onSend, onNewChat, onOpenMenu, accountId, onSwitchAccount, isDemo, history = [], activeSessionId = '', historyOpen = false, onToggleHistory, onSelectSession }) {
  const [draft, setDraft] = useState('');
  const input = useRef(null);
  const log = useRef(null);
  const hasMessages = messages.length > 0;

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, pending]);

  function submit(event) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || !ready || pending) return;
    onSend(question);
    setDraft('');
    input.current?.focus();
  }

  return <section className={`investor-ai-chat ${hasMessages ? 'has-messages' : ''}`} aria-label="AI Chat">
    <div className="investor-ai-atmosphere" aria-hidden="true"><span /><span /><span /></div>
    <header className="investor-ai-header">
      <div className="investor-ai-header-title"><button type="button" className="investor-ai-mobile-menu" aria-label="Mở menu" onClick={onOpenMenu}><Menu size={19} /></button><Sparkles size={16} aria-hidden="true" /><strong>2G2BT AI</strong><span className="investor-ai-header-separator" /><span>Trợ lý đầu tư</span></div>
      <div className="investor-ai-header-actions"><select className="investor-ai-account" aria-label="Chọn vai trò" value={accountId} onChange={event => onSwitchAccount(event.target.value)}>{DEMO_ACCOUNTS.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><ThemeToggle/>{onToggleHistory&&<button type="button" className="investor-ai-history-toggle" onClick={onToggleHistory} aria-expanded={historyOpen} aria-label={historyOpen?'Đóng lịch sử chat':'Mở lịch sử chat'}><Clock3 size={15}/><span>Lịch sử</span></button>}<button type="button" className="investor-ai-new" onClick={() => { onNewChat(); setDraft(''); input.current?.focus(); }} aria-label="Cuộc trò chuyện mới"><Plus size={16} /> <span>Cuộc trò chuyện mới</span></button></div>
    </header>

    {historyOpen&&<><button type="button" className="investor-ai-history-backdrop" aria-label="Đóng lịch sử chat" onClick={onToggleHistory}/><aside className="investor-ai-history" aria-label="Lịch sử chat"><div className="investor-ai-history-heading"><div><strong>Lịch sử chat</strong><span>{history.length} phiên</span></div><button type="button" onClick={onToggleHistory} aria-label="Đóng lịch sử chat"><X size={17}/></button></div>{history.length? <div className="investor-ai-history-list">{history.map(session=><button type="button" key={session.id} className={`investor-ai-history-item ${activeSessionId===session.id?'is-active':''}`} aria-current={activeSessionId===session.id?'page':undefined} onClick={()=>onSelectSession(session.id)}><strong>{session.title.slice(0,72)}</strong><span>{session.preview.slice(0,100)}</span><small>{session.updatedAt?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(session.updatedAt)):''}</small></button>)}</div>:<p className="investor-ai-history-empty">Các cuộc trò chuyện sẽ xuất hiện ở đây sau khi AI trả lời.</p>}</aside></>}

    <div className="investor-ai-body">
      {!hasMessages && <div className="investor-ai-welcome">
        <div className="investor-ai-symbol" aria-hidden="true"><span>2</span></div>
        <p className="investor-ai-eyebrow">2GOOD2BETRUE INTELLIGENCE</p>
        <h1>Mình có thể giúp gì cho bạn?</h1>
        <p className="investor-ai-intro">Đặt câu hỏi về tài chính, thẩm định hoặc cơ hội đầu tư.</p>
      </div>}
      {hasMessages && <div className="investor-ai-messages" role="log" aria-label="Cuộc trò chuyện với AI" aria-live="polite" ref={log}>
        {messages.map((message, index) => <article key={message.id||`${message.role}-${index}`} className={`investor-ai-message is-${message.role}`}>
          {message.role === 'assistant' && <span className="investor-ai-message-mark" aria-hidden="true">2</span>}
          <div className="investor-ai-message-content"><span className="sr-only">{message.role === 'user' ? 'Bạn: ' : 'AI: '}</span><p>{message.role === 'assistant' ? formatAssistantText(message.text) : message.text}</p>
            {message.href && <a href={message.href}>{message.label}<ArrowUpRight size={14} /></a>}
            {message.tokenUsage && <small>{message.provider} · {message.model} · {money(message.tokenUsage.totalTokens)} token</small>}
          </div>
        </article>)}
        {pending && <p className="investor-ai-pending" role="status"><LoaderCircle size={16} className="animate-spin" />AI đang trả lời…</p>}
      </div>}

      <div className="investor-ai-input-wrap">
        {statusMessage && <p className="investor-ai-status" role="status">{statusMessage}</p>}
        <form className="investor-ai-composer" onSubmit={submit}>
          <textarea ref={input} aria-label="Tin nhắn cho AI" placeholder="Bạn muốn hỏi điều gì?" rows={2} maxLength={4000} value={draft} disabled={!ready || pending} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
          <div className="investor-ai-composer-foot"><span>{isDemo ? 'Trợ lý hướng dẫn' : 'Enter để gửi · Shift + Enter xuống dòng'}</span><button type="submit" aria-label="Gửi tin nhắn" disabled={!draft.trim() || !ready || pending}><ArrowUp size={18} /></button></div>
        </form>
        {!hasMessages && <div className="investor-ai-prompts">{prompts.map(prompt => <button type="button" key={prompt} disabled={!ready || pending} onClick={() => { setDraft(prompt); input.current?.focus(); }}>{prompt}<ArrowUpRight size={13} /></button>)}</div>}
        {!hasMessages && <p className="investor-ai-caption">Câu trả lời cần được kiểm chứng trước khi đưa ra quyết định đầu tư.</p>}
      </div>
    </div>
  </section>;
}

export function DemoInvestorAIChat({ state, onOpenMenu, accountId, onSwitchAccount }) {
  const [messages, setMessages] = useState([]);
  useEffect(() => { setMessages([]); }, [state.role]);
  function send(question) {
    const reply = demoAnswer(question, state);
    setMessages(current => [...current, { role: 'user', text: question }, { role: 'assistant', ...reply }]);
  }
  return <ChatCanvas messages={messages} pending={false} ready statusMessage="" onSend={send} onNewChat={() => setMessages([])} onOpenMenu={onOpenMenu} accountId={accountId} onSwitchAccount={onSwitchAccount} isDemo />;
}

export function LiveInvestorAIChat({ state, onOpenMenu, accountId, onSwitchAccount }) {
  const { snapshot, status, aiStatus, api, refresh } = useWorkflow();
  const [activeSessionId, setActiveSessionId] = useState('');
  const [transientMessages, setTransientMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const sequence = useRef(0);
  const actor = snapshot?.user?.id;
  const ready = status === 'ready' && snapshot?.user?.role === state.role && Boolean(aiStatus?.configured);

  useEffect(() => {
    sequence.current++; setPending(false); setError(''); setHistoryOpen(false); setActiveSessionId('');
    if (!actor) return;
    const key = storedSessionKey(actor);
    let sessionId = pageSessions.get(actor) || '';
    try { sessionId ||= sessionStorage.getItem(key) || ''; } catch { /* Storage may be disabled; keep a page-local session. */ }
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(sessionId)) {
      sessionId = makeSessionId();
    }
    pageSessions.set(actor, sessionId);
    try { sessionStorage.setItem(key, sessionId); } catch { /* The current session remains usable until this page closes. */ }
    setActiveSessionId(sessionId);
  }, [actor, state.role]);

  const chats = Array.isArray(snapshot?.aiChats) ? snapshot.aiChats : [];
  const history = historyFromChats(chats);
  const messages = activeSessionId ? [
    ...messagesFromChats(chats, activeSessionId),
    ...transientMessages.filter(message => message.sessionId === activeSessionId),
  ] : [];

  function startNewChat() {
    if (!actor) return;
    sequence.current++; setPending(false); setError(''); setHistoryOpen(false);
    const sessionId = makeSessionId();
    pageSessions.set(actor, sessionId);
    try { sessionStorage.setItem(storedSessionKey(actor), sessionId); } catch { /* Keep the new session in component state. */ }
    setActiveSessionId(sessionId);
  }

  function selectHistory(sessionId) {
    sequence.current++; setPending(false); setError(''); setHistoryOpen(false);
    if (actor) pageSessions.set(actor, sessionId);
    try { if (actor) sessionStorage.setItem(storedSessionKey(actor), sessionId); } catch { /* The selection still applies for this page. */ }
    setActiveSessionId(sessionId);
  }

  async function send(question) {
    if (!ready || pending || !activeSessionId) return;
    const run = ++sequence.current;
    const sessionId = activeSessionId, temporaryId = `pending-${makeSessionId()}`;
    setPending(true); setError('');
    setTransientMessages(current => [...current, { id: `${temporaryId}-question`, sessionId, role: 'user', text: question }]);
    let persistedReplyId = '';
    try {
      const data = await api('/api/ai/chat', { method: 'POST', body: { question, sessionId } });
      if (run !== sequence.current) return;
      const reply = data?.reply;
      if (!reply || typeof reply.text !== 'string' || !reply.text.trim() || !reply.tokenUsage || !Number.isFinite(reply.tokenUsage.totalTokens)) throw new Error('API chưa trả về câu trả lời và lượng token hợp lệ.');
      persistedReplyId = reply.id || '';
      setTransientMessages(current => [...current, { id: reply.id || `${temporaryId}-answer`, sessionId, role: 'assistant', text: reply.text, tokenUsage: reply.tokenUsage, model: reply.model, provider: reply.provider }]);
    } catch (reason) { if (run === sequence.current) setError(reason.message || 'Không nhận được câu trả lời từ AI.'); }
    finally {
      if (run === sequence.current) {
        const updated = await refresh();
        if (persistedReplyId && updated?.aiChats?.some(chat => chat.id === persistedReplyId)) setTransientMessages(current => current.filter(message => message.sessionId !== sessionId || !message.id.startsWith(temporaryId) && message.id !== persistedReplyId));
        setPending(false);
      }
    }
  }
  const statusMessage = error || (!ready ? status === 'loading' ? 'Đang thiết lập phiên làm việc…' : aiStatus?.message || 'Dịch vụ AI chưa được cấu hình.' : '');
  return <ChatCanvas messages={messages} pending={pending} ready={ready&&Boolean(activeSessionId)} statusMessage={statusMessage} onSend={send} onNewChat={startNewChat} onOpenMenu={onOpenMenu} accountId={accountId} onSwitchAccount={onSwitchAccount} isDemo={false} history={history} activeSessionId={activeSessionId} historyOpen={historyOpen} onToggleHistory={()=>setHistoryOpen(value=>!value)} onSelectSession={selectHistory} />;
}
