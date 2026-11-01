import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bot, ChartNoAxesCombined, ChevronDown, FolderKanban, Hash, LayoutDashboard, Menu, MessageCircle, MessageSquare, Plus, Reply, Rocket, Search, Send, X } from 'lucide-react';
import { loadConversations, saveConversations, ensureScope, createConversation, addMessage } from './conversations.js';
import './chat.css';

const routeTo = (workspaceId, conversationId = '') => `#/conversations/${workspaceId}${conversationId ? `/${conversationId}` : ''}`;
const clock = date => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
const calendar = date => new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));

function ConversationDialog({ onClose, onCreate }) {
  const dialog = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { onCreate({ name: form.get('name'), kind: form.get('kind'), description: form.get('description') }); }
    catch (reason) { setError(reason.message); }
  }
  return <dialog ref={dialog} className="chat-dialog" aria-labelledby="chat-create-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="chat-dialog-inner">
      <div className="chat-dialog-heading"><span className="chat-dialog-symbol"><MessageSquare size={23} /></span><button type="button" onClick={onClose} aria-label="Đóng tạo cuộc trò chuyện"><X size={19} /></button></div>
      <h2 id="chat-create-title">Tạo cuộc trò chuyện</h2><p>Tập hợp trao đổi theo chủ đề hoặc dành một không gian cho cuộc trò chuyện riêng.</p>
      <form onSubmit={submit}>
        <label>Tên cuộc trò chuyện<input name="name" autoFocus required maxLength={80} placeholder="Ví dụ: thẩm định LotusPay" /></label>
        <label>Loại cuộc trò chuyện<select name="kind" defaultValue="channel"><option value="channel">Kênh thảo luận</option><option value="direct">Cuộc trò chuyện</option></select></label>
        <label>Mô tả<textarea name="description" maxLength={500} rows={3} placeholder="Chủ đề hoặc mục tiêu trao đổi (không bắt buộc)" /></label>
        {error && <p role="alert" className="chat-error">{error}</p>}
        <p className="chat-local-note">Lưu trên thiết bị · Chưa đồng bộ nhóm</p>
        <div className="chat-dialog-actions"><button type="button" className="chat-secondary" onClick={onClose}>Hủy</button><button type="submit" className="chat-primary">Tạo</button></div>
      </form>
    </div>
  </dialog>;
}

export function ConversationsPage({ state, id = '', onOpenAgent }) {
  const displayName = state.role === 'founder' ? 'Startup demo' : 'Nhà đầu tư demo';
  const initials = state.role === 'founder' ? 'ST' : 'NĐ';
  const workspaces = state.workspaces.filter(workspace => workspace.role === state.role);
  const [requestedWorkspace, requestedConversation] = id.split('/');
  const workspace = workspaces.find(item => item.id === requestedWorkspace);
  const workspaceId = workspace?.id || 'personal';
  const scopeKey = `${state.role}:${workspaceId}`;
  const [data, setData] = useState(loadConversations);
  const scopedData = useMemo(() => ensureScope(data, scopeKey), [data, scopeKey]);
  const conversations = scopedData.scopes[scopeKey].conversations;
  const selected = conversations.find(item => item.id === requestedConversation) || conversations[0];
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const log = useRef(null);
  const composer = useRef(null);
  const contextKey = `${scopeKey}:${selected.id}`;
  const draft = drafts[contextKey] || '';
  const messages = selected.messages.filter(message => message.text.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const ConversationIcon = selected.kind === 'direct' ? MessageCircle : Hash;

  useEffect(() => { if (scopedData !== data) setData(scopedData); setSaveFailed(!saveConversations(scopedData)); }, [scopedData, data]);
  useEffect(() => { setSearch(''); setReplyTo(null); setSidebarOpen(false); setError(''); }, [contextKey]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [contextKey, selected.messages.length]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = event => { if (event.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [sidebarOpen]);

  function create(details) {
    const result = createConversation(scopedData, scopeKey, details);
    setData(result.data); setCreating(false); setSidebarOpen(false);
    window.location.hash = routeTo(workspaceId, result.conversation.id);
    composer.current?.focus();
  }
  function send(event) {
    event?.preventDefault();
    if (!draft.trim()) return;
    try {
      setData(addMessage(scopedData, scopeKey, selected.id, { text: draft, replyTo: replyTo?.id || null }));
      setDrafts(current => ({ ...current, [contextKey]: '' })); setReplyTo(null); setError(''); setSearch('');
      composer.current?.focus();
    } catch (reason) { setError(reason.message); }
  }

  return <div className="chat-workspace">
    {sidebarOpen && <button type="button" className="chat-drawer-backdrop" aria-label="Đóng danh sách cuộc trò chuyện" onClick={() => setSidebarOpen(false)} />}
    <aside className={`chat-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Kênh và cuộc trò chuyện">
      <div className="chat-scope"><div className="chat-eyebrow">KHÔNG GIAN TRÒ CHUYỆN</div><label className="chat-scope-picker"><select value={workspaceId} aria-label="Workspace trò chuyện" onChange={event => { window.location.hash = routeTo(event.target.value); setSidebarOpen(false); }}><option value="personal">Không gian cá nhân</option>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label><p><span />{state.role === 'founder' ? 'Founder startup' : 'Nhà đầu tư'}</p></div>
      <div className="chat-shortcuts"><a href="#/home" title="Trang chủ"><LayoutDashboard size={15} /><span>Trang chủ</span></a><a href="#/marketplace" title="Startup Marketplace"><Rocket size={15} /><span>Startup</span></a><a href="#/analysis" title="Phân tích tài chính"><ChartNoAxesCombined size={15} /><span>Phân tích</span></a></div>
      <div className="chat-create"><button type="button" onClick={() => setCreating(true)}><Plus size={17} />Tạo cuộc trò chuyện</button></div>
      <nav className="chat-conversations" aria-label="Danh sách kênh">
        {[['channel', 'Kênh thảo luận'], ['direct', 'Cuộc trò chuyện']].map(([kind, label]) => <div key={kind} className="chat-channel-group"><h2><ChevronDown size={13} />{label}<span>{conversations.filter(item => item.kind === kind).length}</span></h2>{conversations.filter(item => item.kind === kind).map(item => <a key={item.id} href={routeTo(workspaceId, item.id)} aria-label={item.name} aria-current={selected.id === item.id ? 'page' : undefined} className={selected.id === item.id ? 'is-active' : ''} onClick={() => setSidebarOpen(false)}>{item.kind === 'direct' ? <MessageCircle size={17} /> : <Hash size={18} />}<span>{item.name}</span>{item.messages.length > 0 && <small aria-hidden="true">{item.messages.length}</small>}</a>)}{!conversations.some(item => item.kind === kind) && <p className="chat-list-empty">Chưa có cuộc trò chuyện.</p>}</div>)}
      </nav>
      <div className="chat-profile"><span className="chat-avatar">{initials}</span><div><strong>{displayName}</strong><p>Không gian của bạn</p></div><span className="chat-online" title="Phiên đang hoạt động" /></div>
    </aside>

    <section className="chat-pane" aria-label="Nội dung cuộc trò chuyện">
      <header className="chat-header"><button type="button" className="chat-mobile-toggle chat-icon-button" aria-label="Danh sách cuộc trò chuyện" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(value => !value)}><Menu size={20} /></button><span className="chat-channel-icon"><ConversationIcon size={24} /></span><div className="chat-title"><h1>{selected.name}</h1><p>{selected.description || (selected.kind === 'direct' ? 'Cuộc trò chuyện trong workspace của bạn' : 'Trao đổi, ghi chú và tiếp tục công việc tại đây')}</p></div><button type="button" className="chat-agent-button" onClick={onOpenAgent}><Bot size={17} /><span>AI Agent</span></button></header>
      <div className="chat-toolbar"><div className="chat-tabs"><span className="chat-tab-active"><MessageSquare size={14} />Trò chuyện</span><a href={workspace ? `#/workspace/${workspace.id}` : '#/workspace'}><FolderKanban size={14} /><span>Công việc & tài liệu</span></a></div><label className="chat-search"><Search size={14} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Tìm trong cuộc trò chuyện" placeholder="Tìm tin nhắn" /></label></div>
      {saveFailed && <div className="chat-save-warning" role="alert">Chưa lưu được trên thiết bị. Nội dung đang giữ tạm; đừng tải lại hoặc đóng trang.</div>}
      <div className="chat-message-log" role="log" aria-label="Tin nhắn" aria-live="polite" ref={log}>
        {!selected.messages.length && !search.trim() && <div className="chat-welcome"><span className="chat-welcome-icon"><ConversationIcon size={34} strokeWidth={1.7} /></span><p className="chat-welcome-title">{selected.kind === 'channel' ? 'Bắt đầu trong' : 'Bắt đầu cuộc trò chuyện'} <strong>{selected.kind === 'channel' ? '# ' : ''}{selected.name}</strong></p><p>{selected.description || 'Đặt câu hỏi, ghi lại ý tưởng hoặc trao đổi về bước tiếp theo. Mọi nội dung trong cuộc trò chuyện này sẽ ở cùng một nơi.'}</p><button type="button" onClick={() => composer.current?.focus()}>Viết tin nhắn đầu tiên <ArrowUpRight size={14} /></button></div>}
        {search.trim() && <div className="chat-search-results">{messages.length ? `${messages.length} tin nhắn phù hợp` : 'Không tìm thấy tin nhắn phù hợp.'}</div>}
        {messages.map((message, index) => {
          const replied = selected.messages.find(item => item.id === message.replyTo);
          const replyCount = selected.messages.filter(item => item.replyTo === message.id).length;
          const newDay = index === 0 || calendar(message.createdAt) !== calendar(messages[index - 1].createdAt);
          return <React.Fragment key={message.id}>{newDay && <div className="chat-day"><span>{calendar(message.createdAt)}</span></div>}<article className="chat-message"><span className="chat-avatar">{initials}</span><div className="chat-message-body"><div className="chat-message-meta"><strong>{displayName} <span>(bạn)</span></strong><time dateTime={message.createdAt} title={calendar(message.createdAt)}>{clock(message.createdAt)}</time></div>{replied && <div className="chat-quoted"><Reply size={13} /><span>Trả lời: {replied.text}</span></div>}<p className="chat-message-text">{message.text}</p>{replyCount > 0 && <span className="chat-reply-count"><MessageCircle size={12} />{replyCount} trả lời</span>}</div><button type="button" className="chat-reply-button" aria-label="Trả lời tin nhắn" title="Trả lời tin nhắn" onClick={() => { setReplyTo(message); composer.current?.focus(); }}><Reply size={16} /></button></article></React.Fragment>;
        })}
      </div>
      <div className="chat-compose-area">
        {error && <p role="alert" className="chat-error">{error}</p>}
        <form onSubmit={send} className="chat-composer">
          {replyTo && <div className="chat-replying"><Reply size={14} /><span><strong>Đang trả lời</strong> {replyTo.text}</span><button type="button" aria-label="Hủy trả lời" onClick={() => setReplyTo(null)}><X size={15} /></button></div>}
          <textarea ref={composer} rows={2} maxLength={4000} aria-label="Soạn tin nhắn" placeholder={`Nhắn tin vào ${selected.kind === 'channel' ? '# ' : ''}${selected.name}`} value={draft} onChange={event => setDrafts(current => ({ ...current, [contextKey]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
          <div className="chat-composer-bottom"><span>Enter để gửi <span className="chat-keyboard-hint">· Shift + Enter xuống dòng</span></span><button type="submit" disabled={!draft.trim()} aria-label="Gửi tin nhắn"><Send size={16} /><span>Gửi</span></button></div>
        </form>
        <p className="chat-local-note">Lưu trên thiết bị · Chưa đồng bộ nhóm</p>
      </div>
    </section>
    {creating && <ConversationDialog onClose={() => setCreating(false)} onCreate={create} />}
  </div>;
}
