import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, CreditCard, FileText, MessageSquare, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { CASE_CONNECTION_SHARE_VND, CASE_CONNECTION_TOTAL_VND, STARTUP_LISTING_FEE_VND, caseIsConnected } from './caseWorkflow.js';

const money = amount => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const input = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
const subtle = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50';
const stageText = { draft: 'Bản nháp', mentor: 'Chờ đầu ra mentor', published: 'Đang công bố' };
const requestText = { pending: 'Chờ Startup đồng ý', approved: 'Đã đồng ý · chờ phí kết nối', rejected: 'Đã từ chối', revoked: 'Đã thu hồi quyền' };

function FeeNotice() {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
    <strong>Phí niêm yết một hồ sơ Startup: {money(STARTUP_LISTING_FEE_VND)} / 12 tháng.</strong> Chưa mở thanh toán; thao tác trong chế độ dùng thử không thu tiền.
  </div>;
}

function CreateCase({ onAction }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(''), [summary, setSummary] = useState(''), [industry, setIndustry] = useState('');
  function submit(event) {
    event.preventDefault();
    const next = onAction({ type: 'create-case', title, summary, industry });
    if (!next) return;
    setOpen(false); setTitle(''); setSummary(''); setIndustry('');
    const created = next.cases[0];
    window.location.hash = `/cases/${created.id}`;
  }
  return <div className={card}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Đăng case mới</h2><p className="mt-1 text-sm text-slate-500">Chuẩn bị nội dung trước khi gửi mentor xử lý.</p></div><button className={button} onClick={() => setOpen(value => !value)}><Plus size={16} />{open ? 'Đóng biểu mẫu' : 'Tạo case'}</button></div>
    {open && <form onSubmit={submit} className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Tên case<input className={input} value={title} onChange={event => setTitle(event.target.value)} required minLength={5} maxLength={100} placeholder="Ví dụ: Mở rộng LotusPay vòng Seed" /></label>
      <label className="text-sm font-medium text-slate-700">Lĩnh vực<input className={input} value={industry} onChange={event => setIndustry(event.target.value)} required minLength={2} maxLength={60} placeholder="Fintech" /></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Mô tả case<textarea className={input} value={summary} onChange={event => setSummary(event.target.value)} required minLength={20} maxLength={2000} rows={4} placeholder="Nhu cầu gọi vốn, vấn đề cần giải quyết và dữ liệu có thể chia sẻ…" /></label>
      <div className="sm:col-span-2"><FeeNotice /></div>
      <div className="sm:col-span-2"><button className={button} type="submit">Lưu bản nháp <ArrowRight size={16} /></button></div>
    </form>}
  </div>;
}

function CaseList({ flow, actor, onAction, startups }) {
  const founder = actor === 'startup-demo';
  const visible = founder ? flow.cases : flow.cases.filter(item => item.stage === 'published');
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">CASE & KẾT NỐI</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{founder ? 'Case gọi vốn của Startup' : 'Case đang tìm nhà đầu tư'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{founder ? 'Tạo case, hoàn thiện hồ sơ và xử lý yêu cầu kết nối.' : 'Xem case đã công bố, gửi yêu cầu và theo dõi bước kết nối với Startup.'}</p></div>
    {founder && <CreateCase onAction={onAction} />}
    <div className="grid gap-4 md:grid-cols-2">{visible.map(item => {
      const startup = startups.find(entry => entry.id === item.startupId);
      return <a key={item.id} href={`#/cases/${item.id}`} className={`${card} block transition hover:border-indigo-300 hover:shadow-md`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{item.industry}</span><span className="text-xs text-slate-500">{stageText[item.stage]}</span></div>
        {startup && <div className="mt-4 flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: 'var(--color-royal)' }}>{startup.mark}</span><div><strong className="text-sm text-slate-900">{startup.name}</strong><p className="text-xs text-slate-500">{startup.stage} · {startup.location}</p></div></div>}
        <h2 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary}</p>
        {item.publicBrief && <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500"><FileText size={15} />Có hồ sơ giới thiệu công khai</p>}
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">Xem case <ArrowRight size={15} /></span>
      </a>;
    })}</div>
    {!visible.length && <div className={`${card} text-center text-sm text-slate-500`}>{founder ? 'Chưa có case nào. Tạo case đầu tiên ở trên.' : 'Chưa có case được công bố.'}</div>}
  </div>;
}

function Steps({ item, request }) {
  const steps = [
    ['Tạo case', true],
    ['Phí đăng case', item.listingPayment === 'simulated'],
    ['Rà soát hồ sơ', item.mentor.status === 'sample'],
    ['Startup đồng ý', request?.status === 'approved'],
    ['Hai bên hoàn tất phí', caseIsConnected(request)],
    ['Mở trao đổi', caseIsConnected(request)],
  ];
  return <ol className="flex flex-wrap gap-2" aria-label="Tiến độ case">{steps.map(([label, done], index) => <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{done ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}{index + 1}. {label}</li>)}</ol>;
}

function Chat({ item, request, actor, onAction }) {
  const [draft, setDraft] = useState('');
  function send(event) { event.preventDefault(); if (onAction({ type: 'send-case-message', caseId: item.id, requestId: request.id, text: draft })) setDraft(''); }
  return <section className={card}><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><MessageSquare size={19} className="text-indigo-600" />Trao đổi giữa hai bên</h2>
    <div role="log" aria-label="Tin nhắn của case" className="my-4 max-h-80 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{request.messages.length ? request.messages.map(message => <div key={message.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${message.authorId === actor ? 'ml-auto bg-indigo-100 text-indigo-950' : 'bg-white text-slate-700'}`}><strong className="mb-1 block text-xs">{message.authorId === 'startup-demo' ? 'Startup' : 'Investor'}</strong>{message.text}</div>) : <p className="py-5 text-center text-sm text-slate-500">Kết nối đã mở. Hãy bắt đầu trao đổi về case.</p>}</div>
    <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="case-message">Tin nhắn case</label><input id="case-message" className={`${input} mt-0 flex-1`} value={draft} onChange={event => setDraft(event.target.value)} required maxLength={5000} placeholder="Nhập tin nhắn…" /><button className={button} type="submit">Gửi <ArrowRight size={16} /></button></form>
  </section>;
}

function CaseDetail({ item, actor, onAction, startup }) {
  const founder = actor === 'startup-demo';
  const request = [...item.requests].reverse().find(entry => entry.investorId === 'investor-demo');
  const [message, setMessage] = useState('');
  const connected = caseIsConnected(request);
  function requestConnection(event) { event.preventDefault(); if (onAction({ type: 'request-connection', caseId: item.id, message })) setMessage(''); }
  const doAction = (type, extra = {}) => onAction({ type, caseId: item.id, requestId: request?.id, ...extra });
  return <div className="mx-auto max-w-5xl space-y-5">
    <a href="#/cases" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600"><ArrowLeft size={16} />Tất cả case</a>
    <header className={card}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">{item.industry}</span><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{stageText[item.stage]}</span></div><h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{item.title}</h1><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.summary}</p><div className="mt-5 border-t border-slate-100 pt-5"><Steps item={item} request={request} /></div></header>
    {item.publicBrief && <section className={card}><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileText size={19} className="text-indigo-600" />Hồ sơ giới thiệu công khai</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.publicBrief}</p>{startup && <a className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700" href={`#/startup/${startup.id}`}>Xem hồ sơ {startup.name} <ArrowRight size={15} /></a>}</section>}
    {founder && item.stage === 'draft' && <section className={card}><h2 className="text-lg font-bold">1. Phí đăng case</h2><div className="my-4"><FeeNotice /></div><button className={button} onClick={() => doAction('submit-case')}><CreditCard size={17} />Xác nhận bước phí và gửi rà soát</button></section>}
    {founder && item.stage === 'mentor' && <section className={card}><h2 className="text-lg font-bold">2. Rà soát hồ sơ</h2><p className="my-3 text-sm leading-6 text-slate-600">Xem các điểm cần kiểm tra trước khi công bố case.</p><button className={button} onClick={() => doAction('complete-mentor-sample')}><Sparkles size={17} />Xem gợi ý và công bố</button></section>}
    {item.mentor.status === 'sample' && <section className={card}><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={19} className="text-indigo-600" />Gợi ý rà soát hồ sơ</h2><p className="mt-3 rounded-xl bg-indigo-50 p-4 text-sm leading-7 text-indigo-950">{item.mentor.result}</p></section>}
    {item.stage === 'published' && <section className={card}><h2 className="text-lg font-bold">3. Kết nối Startup–Investor</h2><p className="mt-2 text-sm leading-6 text-slate-600">Phí kết nối {money(CASE_CONNECTION_TOTAL_VND)} tổng cộng, mỗi bên {money(CASE_CONNECTION_SHARE_VND)} sau khi Startup đồng ý. Chưa mở thanh toán.</p>
      {!founder && (!request || ['rejected', 'revoked'].includes(request.status)) && <form onSubmit={requestConnection} className="mt-5 space-y-3"><label className="block text-sm font-medium text-slate-700">Lời nhắn cho Startup<textarea className={input} value={message} onChange={event => setMessage(event.target.value)} required minLength={10} maxLength={1000} rows={3} placeholder="Bạn muốn tìm hiểu gì về case này?" /></label><button className={button} type="submit">Gửi yêu cầu kết nối <ArrowRight size={16} /></button></form>}
      {request && <div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-900">Yêu cầu của Investor</strong><span className="text-xs font-semibold text-slate-600">{connected ? 'Đã kết nối' : requestText[request.status]}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{request.message}</p>
        {founder && request.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><button className={button} onClick={() => doAction('decide-connection', { decision: 'approved' })}>Đồng ý kết nối</button><button className={subtle} onClick={() => doAction('decide-connection', { decision: 'rejected' })}>Từ chối</button></div>}
        {request.status === 'approved' && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">4. Xác nhận phí kết nối</p><p className="mt-1 text-xs leading-5 text-slate-600">Startup: {request.payments.startup === 'simulated' ? 'đã xác nhận' : 'chưa xác nhận'} · Investor: {request.payments.investor === 'simulated' ? 'đã xác nhận' : 'chưa xác nhận'}</p>{request.payments[founder ? 'startup' : 'investor'] === 'due' && <button className={`${button} mt-3`} onClick={() => doAction('simulate-connection-payment')}><CreditCard size={16} />Xác nhận phần phí {money(CASE_CONNECTION_SHARE_VND)}</button>}{!connected && <p className="mt-3 text-xs text-amber-700">Trao đổi vẫn khóa đến khi cả hai bên xác nhận phí. Chưa thu tiền.</p>}</div>}
        {founder && request.status === 'approved' && <button className={`${subtle} mt-4`} onClick={() => doAction('revoke-connection')}>Thu hồi kết nối</button>}
      </div>}
    </section>}
    {connected && <Chat item={item} request={request} actor={actor} onAction={onAction} />}
  </div>;
}

export function CaseWorkflowPage({ flow, accountId, caseId, onAction, startups = [] }) {
  const item = flow.cases.find(entry => entry.id === caseId);
  if (!caseId) return <CaseList flow={flow} actor={accountId} onAction={onAction} startups={startups} />;
  if (!item || accountId === 'investor-demo' && item.stage !== 'published') return <div className={card}><h1 className="text-xl font-bold">Case chưa khả dụng</h1><p className="my-3 text-sm text-slate-500">Case không tồn tại hoặc chưa được công bố.</p><a className="text-sm font-semibold text-indigo-600" href="#/cases">Về danh sách case</a></div>;
  return <CaseDetail item={item} actor={accountId} onAction={onAction} startup={startups.find(entry => entry.id === item.startupId)} />;
}
