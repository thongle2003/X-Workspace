import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bot, Send, Sparkles, X } from 'lucide-react';
import { getPlan, getUsage, money } from '../domain.js';

const suggestionsFor = role => ['Tạo cuộc trò chuyện', 'Phân tích tài chính', role === 'founder' ? 'Tạo workspace' : 'Mở workspace', 'Khám phá startup', 'Gói dịch vụ & token'];
const welcome = {
  role: 'assistant',
  text: 'Chào bạn! Mình giúp bạn tìm đúng công cụ trong X Workspace. Bạn muốn bắt đầu từ đâu?',
};

function answer(question, state) {
  const text = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  if (/tro chuyen|kenh|tin nhan|chat/.test(text)) return {text:'Mở mục Trò chuyện, chọn workspace rồi bấm “Tạo cuộc trò chuyện”. Lịch sử được lưu trên thiết bị; bản demo chưa đồng bộ nhóm.',href:'#/conversations',label:'Mở cuộc trò chuyện'};
  if (/token|goi|gia|han muc|nang cap/.test(text)) {
    const snapshot = structuredClone(state);
    const plan = getPlan(snapshot);
    const quota = getUsage(snapshot, 'aiTokens');
    return { text: `Bạn đang dùng ${plan.name}, còn ${money(quota.remaining)} token mô phỏng. ${plan.tier === 'free' ? 'Token Free được cấp một lần, không tự reset.' : 'Token gói trả phí reset vào thứ Hai theo giờ Việt Nam.'} Hướng dẫn trong cửa sổ này không trừ token.`, href: '#/pricing', label: 'Xem gói dịch vụ' };
  }
  if (/phan tich|tai chinh|csv|doanh thu|dong tien|runway/.test(text)) {
    return { text: 'Mở Phân tích tài chính, tải CSV hoặc chọn dữ liệu mẫu LotusPay. Bạn có thể xem token ước tính trước khi chạy, sau đó xem các chỉ báo và công thức tính trong báo cáo.', href: '#/analysis', label: 'Mở phân tích tài chính' };
  }
  if (/workspace|du an|cong viec|ghi chu|ho so/.test(text)) {
    if (state.role === 'investor') return { text: 'Bạn có thể mở các workspace hiện có để xem công việc, tài liệu và ghi chú. Để tạo workspace mới, hãy chọn tài khoản Startup demo ở thanh trên cùng.', href: '#/workspace', label: 'Mở workspace' };
    return { text: 'Tạo workspace để tập hợp mục tiêu, công việc, tài liệu và ghi chú của dự án. Chọn “Tạo workspace”, nhập tên và mục tiêu để bắt đầu; hạn mức theo gói của bạn sẽ được kiểm tra khi lưu.', href: '#/workspace/new', label: 'Tạo workspace mới' };
  }
  if (/startup|marketplace|kham pha|co hoi/.test(text)) {
    return { text: `Trong Startup Marketplace, bạn có thể tìm theo tên, lĩnh vực và giai đoạn rồi mở hồ sơ chi tiết.${state.role === 'investor' ? ' Với vai trò nhà đầu tư, bạn còn có thể lưu và so sánh startup trong hạn mức của gói.' : ''}`, href: '#/marketplace', label: 'Khám phá Marketplace' };
  }
  if (/danh muc|khoan dau tu/.test(text)) {
    return state.role === 'investor'
      ? { text: 'Trong Danh mục đầu tư, bạn có thể ghi nhận khoản đầu tư và cập nhật số liệu theo tháng để theo dõi.', href: '#/portfolio', label: 'Mở danh mục đầu tư' }
      : { text: 'Danh mục đầu tư dành cho vai trò Nhà đầu tư. Bạn có thể chuyển sang tài khoản Nhà đầu tư demo ở thanh trên cùng; với tài khoản Startup demo hiện tại, hãy bắt đầu bằng workspace gọi vốn.', href: '#/workspace', label: 'Mở workspace' };
  }
  return { text: 'Bản demo hiện hỗ trợ hướng dẫn tính năng, chưa trả lời tự do bằng AI. Bạn có thể hỏi về phân tích CSV, tạo workspace, tìm startup hoặc ngân sách token bằng các gợi ý bên dưới.' };
}

export function AIAgent({ state, open, onOpen, onClose, raised = false, workspaceMode = false }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const logRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([welcome]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus.getClientRects().length && previousFocus.getBoundingClientRect().left >= 0) previousFocus.focus();
      else launcherRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => { setMessages([welcome]); setDraft(''); }, [state.role]);

  function send(value) {
    const question = value.trim();
    if (!question) return;
    setMessages(current => [...current, { role: 'user', text: question }, { role: 'assistant', ...answer(question, state) }]);
    setDraft('');
    inputRef.current?.focus();
  }

  return <>
    <button ref={launcherRef} type="button" aria-label="Mở AI Agent" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'ai-agent-panel' : undefined} onClick={onOpen}
      className={'fixed right-4 z-30 flex items-center rounded-2xl border border-white/20 bg-indigo-600 text-sm font-semibold text-white shadow-xl shadow-indigo-950/25 transition hover:-translate-y-1 hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 sm:right-6 '+(workspaceMode?'h-12 w-12 justify-center p-0 bottom-[200px]':'min-h-14 gap-2.5 px-4 py-3 '+(raised?'bottom-28':'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'))}>
      <Bot size={25} strokeWidth={1.8} aria-hidden="true" /><span className={workspaceMode?'sr-only':undefined}>AI Agent</span>{!workspaceMode&&<Sparkles size={14} className="text-indigo-200" aria-hidden="true" />}
    </button>
    {open && <dialog ref={dialogRef} id="ai-agent-panel" aria-labelledby="ai-agent-title" aria-describedby="ai-agent-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}
      className="fixed inset-auto bottom-4 right-4 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[410px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/25 sm:right-6">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start gap-3 bg-[#171717] p-5 text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-500"><Bot size={25} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h2 id="ai-agent-title" className="text-base font-semibold">AI Agent</h2><p id="ai-agent-description" className="mt-1 text-[11px] leading-5 text-indigo-100">Bản demo hướng dẫn · Chưa kết nối AI thật</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng AI Agent" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X size={19} aria-hidden="true" /></button>
        </header>
        <div ref={logRef} role="log" aria-label="Cuộc trò chuyện với AI Agent" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 sm:max-h-[45dvh]">
          {messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'ml-7 rounded-2xl rounded-tr-sm bg-indigo-600 p-3.5 text-sm leading-6 text-white' : 'mr-3 rounded-2xl rounded-tl-sm bg-slate-50 p-3.5 text-sm leading-6 text-slate-600'}>
            <span className="sr-only">{message.role === 'user' ? 'Bạn: ' : 'AI Agent: '}</span><p className="whitespace-pre-wrap break-words">{message.text}</p>
            {message.href && <a href={message.href} onClick={onClose} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800">{message.label}<ArrowUpRight size={16} aria-hidden="true" /></a>}
          </div>)}
        </div>
        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="mb-4 flex flex-wrap gap-2">{suggestionsFor(state.role).map(label => <button key={label} type="button" onClick={() => send(label)} className="rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">{label}</button>)}</div>
          <form onSubmit={event => { event.preventDefault(); send(draft); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <input ref={inputRef} value={draft} maxLength={500} onChange={event => setDraft(event.target.value)} aria-label="Tin nhắn cho AI Agent" placeholder="Bạn cần hướng dẫn gì?" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
            <button type="submit" disabled={!draft.trim()} aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Send size={17} aria-hidden="true" /></button>
          </form>
        </div>
      </div>
    </dialog>}
  </>;
}
