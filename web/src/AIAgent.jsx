import React, { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import { money } from '../domain.js';
import { useWorkflow } from './InvestmentFlow.jsx';

const suggestionsFor = role => ['Phân tích tài chính', role === 'founder' ? 'Chuẩn bị hồ sơ gọi vốn' : 'Câu hỏi thẩm định', 'Rủi ro dòng tiền', 'Gói dịch vụ & token'];

export function AIAgent({ state, open, onOpen, onClose, raised = false, workspaceMode = false }) {
  const { snapshot, status, aiStatus, api, refresh } = useWorkflow();
  const dialogRef = useRef(null), inputRef = useRef(null), launcherRef = useRef(null), logRef = useRef(null);
  const sequence = useRef(0), sending = useRef(false), actor = useRef(null);
  actor.current = snapshot?.user?.id || null;
  const [draft, setDraft] = useState(''), [messages, setMessages] = useState([]), [pending, setPending] = useState(false), [error, setError] = useState('');
  const requestedWorkspace = window.location.hash.match(/^#\/(?:workspace|home|conversations)\/([^/?#]+)/)?.[1];
  const workspace = snapshot?.workspaces?.find(item => item.id === requestedWorkspace);
  const workspaceId = workspace?.id;
  const ready = status === 'ready' && snapshot?.user?.role === state.role && Boolean(aiStatus?.configured);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement, dialog = dialogRef.current;
    dialog.showModal(); inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => {
      dialog.close(); document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus.getClientRects().length && previousFocus.getBoundingClientRect().left >= 0) previousFocus.focus();
      else launcherRef.current?.focus();
    };
  }, [open]);
  useEffect(() => { if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, pending, error, open]);
  useEffect(() => {
    sequence.current++; sending.current = false; setPending(false); setMessages([]); setDraft(''); setError('');
  }, [state.role, workspaceId]);

  async function send(value) {
    const question = value.trim();
    if (!question || !ready || sending.current) return;
    const run = ++sequence.current, userId = snapshot.user.id;
    sending.current = true; setPending(true); setError(''); setDraft('');
    setMessages(current => [...current, { role: 'user', text: question }]);
    try {
      const data = await api('/api/ai/chat', { method: 'POST', body: { question, ...(workspaceId ? { workspaceId } : {}) } });
      if (run !== sequence.current || actor.current !== userId) return;
      const reply = data?.reply;
      if (!reply || typeof reply.text !== 'string' || !reply.text.trim() || !reply.tokenUsage || !Number.isFinite(reply.tokenUsage.totalTokens)) throw new Error('API chưa trả về câu trả lời và lượng token hợp lệ.');
      setMessages(current => [...current, { role: 'assistant', text: reply.text, tokenUsage: reply.tokenUsage, model: reply.model, provider: reply.provider }]);
    } catch (reason) {
      if (run === sequence.current && actor.current === userId) { setError(reason.message || 'Không nhận được câu trả lời từ AI.'); setDraft(question); }
    } finally {
      if (run === sequence.current && actor.current === userId) {
        await refresh();
        if (run === sequence.current) { sending.current = false; setPending(false); inputRef.current?.focus(); }
      }
    }
  }

  return <>
    <button ref={launcherRef} type="button" aria-label="Mở AI Agent" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'ai-agent-panel' : undefined} onClick={onOpen}
      className={`fixed right-4 z-30 flex items-center rounded-2xl border border-white/20 bg-indigo-600 text-sm font-semibold text-white shadow-xl shadow-indigo-950/25 transition hover:-translate-y-1 hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 sm:right-6 ${workspaceMode ? 'h-12 w-12 justify-center p-0 bottom-[200px]' : `min-h-14 gap-2.5 px-4 py-3 ${raised ? 'bottom-28' : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'}`}`}>
      <Bot size={25} strokeWidth={1.8} aria-hidden="true" /><span className={workspaceMode ? 'sr-only' : undefined}>AI Agent</span>{!workspaceMode && <Sparkles size={14} className="text-indigo-200" aria-hidden="true" />}
    </button>
    {open && <dialog ref={dialogRef} id="ai-agent-panel" aria-labelledby="ai-agent-title" aria-describedby="ai-agent-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}
      className="fixed inset-auto bottom-4 right-4 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[410px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/25 sm:right-6">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start gap-3 bg-[#171717] p-5 text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-500"><Bot size={25} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h2 id="ai-agent-title" className="text-base font-semibold">AI Agent</h2><p id="ai-agent-description" className="mt-1 break-words text-[11px] leading-5 text-indigo-100">{aiStatus?.configured ? `${aiStatus.provider} · ${aiStatus.model}` : status === 'loading' ? 'Đang kết nối máy chủ…' : 'AI chưa sẵn sàng'}</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng AI Agent" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X size={19} aria-hidden="true" /></button>
        </header>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-500">
          <p>Gửi câu hỏi tới AI và trừ token thực tế.</p>
          <p className="mt-1">{snapshot ? `${money(snapshot.usage.remaining)} token còn lại · ${snapshot.plan.name}` : 'Đang tải ngân sách…'}</p>
          {workspace && <p className="mt-1 truncate">Ngữ cảnh được cấp quyền: {workspace.profile?.name || workspace.name}</p>}
        </div>
        <div ref={logRef} role="log" aria-label="Cuộc trò chuyện với AI Agent" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:max-h-[38dvh]">
          {!messages.length && <p className="text-sm leading-6 text-slate-500">Đặt câu hỏi về hồ sơ được cấp quyền, tài chính hoặc các bước thẩm định. Chọn gợi ý để soạn câu hỏi, sau đó nhấn gửi.</p>}
          {messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'ml-7 rounded-2xl rounded-tr-sm bg-indigo-600 p-3.5 text-sm leading-6 text-white' : 'mr-3 rounded-2xl rounded-tl-sm bg-slate-50 p-3.5 text-sm leading-6 text-slate-600'}>
            <span className="sr-only">{message.role === 'user' ? 'Bạn: ' : 'AI Agent: '}</span><p className="whitespace-pre-wrap break-words">{message.text}</p>
            {message.tokenUsage && <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-5 text-slate-400">{message.provider} · {message.model} · {money(message.tokenUsage.totalTokens)} token thực tế</p>}
          </div>)}
          {pending && <p role="status" className="flex items-center gap-2 text-sm text-indigo-600"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />AI đang trả lời…</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-slate-100 p-4">
          {!ready && <p role="status" className="mb-3 text-xs leading-5 text-amber-700">{status === 'loading' ? 'Đang thiết lập phiên làm việc…' : aiStatus?.message || 'Không kết nối được dịch vụ AI. Hãy kiểm tra máy chủ.'}</p>}
          <div className="mb-3 flex flex-wrap gap-2">{suggestionsFor(state.role).map(label => <button key={label} type="button" disabled={pending || !ready} onClick={() => {setDraft(label);inputRef.current?.focus();}} className="rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">{label}</button>)}</div>
          <form onSubmit={event => { event.preventDefault(); send(draft); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <input ref={inputRef} value={draft} maxLength={4000} disabled={pending || !ready} onChange={event => setDraft(event.target.value)} aria-label="Tin nhắn cho AI Agent" placeholder="Nhập câu hỏi cho AI…" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-50" />
            <button type="submit" disabled={!draft.trim() || pending || !ready} aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Send size={17} aria-hidden="true" /></button>
          </form>
        </div>
      </div>
    </dialog>}
  </>;
}
