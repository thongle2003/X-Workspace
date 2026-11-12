import React, { useEffect, useRef, useState } from 'react';
import { ROLE_PLANS, getPlan, getUsage, changePlan, money } from '../domain.js';

const tiers = ['free', 'plus', 'pro'];
const roleLabels = { founder: 'Startup', investor: 'Nhà đầu tư' };
const budgetLabel = role => role === 'investor' ? 'token và kết nối' : 'token';
const cx = (...values) => values.filter(Boolean).join(' ');
const commonFeatures = [
  ['aiTokens', 'AI trong gói', ''],
  ['workspaces', 'Workspace dự án', 'workspace'],
  ['export', 'Xuất báo cáo', ''],
];
const investorFeatures = [
  ['watchlist', 'Startup đã lưu', 'startup'],
  ['portfolio', 'Startup trong danh mục', 'startup'],
  ['reportCadence', 'Yêu cầu Startup cập nhật báo cáo', ''],
];
const planDescriptions = {
  founder: {
    free: 'Bắt đầu với hồ sơ và workspace đầu tiên.',
    plus: 'Chuẩn bị dữ liệu và hồ sơ cho hành trình gọi vốn.',
    pro: 'Thêm không gian để quản lý các vòng gọi vốn.',
  },
  investor: {
    free: 'Dùng thử trong 2 tháng để khám phá và theo dõi cơ hội.',
    plus: 'Theo dõi nhiều cơ hội hơn và yêu cầu báo cáo mỗi tháng.',
    pro: 'Danh mục lớn hơn và quyền lợi báo cáo mở rộng.',
  },
};

function Check({ className = '' }) {
  return <svg viewBox="0 0 20 20" fill="none" className={cx('h-4 w-4 shrink-0', className)} aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function featureValue(plan, key, compact = false) {
  if (key === 'export') return plan.export ? 'Bao gồm' : 'Chưa bao gồm';
  if (key === 'reportCadence') return plan.reportCadence;
  const value = money(plan[key] ?? 0);
  if (key === 'aiTokens') return `${value} token ${plan.tier === 'free' ? 'dùng một lần' : plan.role === 'investor' ? 'mỗi tháng' : 'mỗi tuần'}`;
  if (key === 'connections') return `${value}${compact ? '' : ' yêu cầu'} ${plan.tier === 'free' ? 'dùng một lần' : plan.role === 'investor' ? 'mỗi tháng' : 'mỗi tuần'}`;
  return value;
}
const displayPrice = (plan, billing) => billing === 'annual' ? (plan.annualPrice ?? plan.price * 10) : plan.price;

function ActivationDialog({ state, targetTier, billing, onClose, onConfirm }) {
  const targetRole = state.role;
  const dialogRef = useRef(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const plan = ROLE_PLANS[targetRole][targetTier];
  const previous = ROLE_PLANS[targetRole][state.subscriptions[targetRole].tier];
  const isDowngrade = tiers.indexOf(targetTier) < tiers.indexOf(previous.tier);
  const amount = displayPrice(plan, billing);

  useEffect(() => {
    const focused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')];
    focusable()[0]?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (focused?.isConnected) focused.focus();
    };
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    if (!accepted) { setError('Vui lòng xác nhận đây là thao tác dùng thử.'); return; }
    onConfirm();
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="activation-title" aria-describedby="activation-description" className="relative my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <button type="button" onClick={onClose} aria-label="Đóng xác nhận" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
      <span className="mb-5 inline-flex rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600">Dùng thử không thu tiền</span>
      <h2 id="activation-title" className="pr-5 text-2xl font-bold tracking-tight text-slate-900">{isDowngrade ? 'Chuyển về ' : 'Kích hoạt '}{plan.name}</h2>
      <p id="activation-description" className="mt-2 text-sm leading-6 text-slate-500">Thay đổi gói dùng thử cho vai trò {roleLabels[state.role]} đang dùng.</p>
      <dl className="my-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">Vai trò</dt><dd className="font-semibold text-slate-800">{roleLabels[targetRole]}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">Gói đã lưu</dt><dd className="text-right text-slate-600">{previous.name} · {state.subscriptions[targetRole].billing === 'annual' ? 'Năm' : 'Tháng'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">Gói mới</dt><dd className="text-right font-semibold text-slate-800">{plan.name} · {targetTier === 'free' ? 'Miễn phí' : billing === 'annual' ? 'Năm' : 'Tháng'}</dd></div>
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-3"><dt className="text-slate-500">Giá tham khảo</dt><dd className="text-right font-semibold text-slate-900">{money(amount)} ₫{targetTier !== 'free' && <span className="font-normal text-slate-500"> / {billing === 'annual' ? 'năm' : 'tháng'}</span>}</dd></div>
      </dl>
      <div className="space-y-2 text-xs leading-5 text-slate-500">
        <p>{targetRole === 'founder' ? 'Workspace, công việc và tài liệu' : 'Danh mục và startup đã lưu'} được giữ lại khi chuyển gói. Nếu vượt hạn mức mới, bạn cần giảm số lượng hoặc chọn gói phù hợp để thêm mới.</p>
        <p>Free có {budgetLabel(targetRole)} dùng một lần. Gói trả phí làm mới hạn mức {targetRole === 'investor' ? 'đầu mỗi tháng' : 'vào thứ Hai'}, 00:00 giờ Việt Nam; phần chưa dùng không cộng dồn. Đổi gói không cấp lại phần đã sử dụng; về Free sẽ dùng tiếp hạn mức Free còn lại.</p>
        <p>Gói và hạn mức của vai trò còn lại được giữ riêng.</p>
      </div>
      <form onSubmit={submit} className="mt-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={accepted} onChange={event => { setAccepted(event.target.checked); setError(''); }} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" /><span>Tôi hiểu thao tác này chưa thu tiền và không tự gia hạn thanh toán.</span></label>
        {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Quay lại</button><button type="submit" className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Xác nhận {targetTier === 'free' ? 'chuyển gói' : 'dùng thử'}</button></div>
      </form>
    </section>
  </div>;
}

export function PricingPage({ state, updateState, setNotice, canChangePlan = true }) {
  const selectedRole = state.role;
  const [billing, setBilling] = useState(state.subscriptions[state.role].billing);
  const [pending, setPending] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(state.activeWorkspace || '');
  const currentPlan = getPlan(state);
  const catalog = ROLE_PLANS[selectedRole];
  const features = selectedRole === 'investor'
    ? [...commonFeatures.filter(([key]) => ['aiTokens', 'export'].includes(key)), ...investorFeatures]
    : commonFeatures;
  const workspaces = state.workspaces.filter(workspace => workspace.role === state.role);
  const workspaceId = workspaces.some(workspace => workspace.id === selectedWorkspace) ? selectedWorkspace : workspaces[0]?.id;
  const currentSubscription = state.subscriptions[selectedRole];
  const currentQuotas = features.filter(([key]) => !['export', 'reportCadence'].includes(key)).map(([key, label]) => ({ key, label, ...getUsage(state, key, workspaceId) }));

  useEffect(() => {
    setBilling(state.subscriptions[state.role].billing);
    setPending(null);
    setSelectedWorkspace(state.activeWorkspace || '');
  }, [state.role]);

  async function activatePlan() {
    if (!pending || pending.role !== state.role) {
      setPending(null);
      return;
    }
    const { tier, role } = pending;
    const result = await updateState(previous => {
      if (previous.role !== role) throw new Error('Vai trò đã thay đổi. Hãy chọn lại gói cho vai trò đang dùng.');
      const next = structuredClone(previous);
      changePlan(next, tier, tier === 'free' ? 'monthly' : billing);
      return next;
    });
    setPending(null);
    if (result) setNotice(`Đã kích hoạt ${catalog[tier].name} cho ${roleLabels[role]}. Đây là dùng thử, không thu tiền.`);
  }

  return <div>
    {!canChangePlan && <p className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-700">Bạn có thể xem các gói dịch vụ. Gói đang dùng được giữ cố định để kiểm soát ngân sách AI.</p>}
    <header className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Gói dịch vụ</span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Không gian cho bước tiếp theo.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Các gói subscription dành cho investor. AI nằm trong gói, không phát sinh phí theo lượt sử dụng.</p>
    </header>

    <div className="my-7 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-2 sm:flex-row">
      <div className="px-4 py-2"><p className="text-xs font-medium text-slate-400">Gói dịch vụ của bạn</p><p className="mt-1 text-sm font-semibold text-indigo-700">{roleLabels[selectedRole]}</p></div>
      <div className="flex items-center gap-3 px-2"><div className="flex items-center rounded-lg bg-slate-100 p-1" aria-label="Chu kỳ giá tham khảo"><button type="button" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')} className={cx('rounded-md px-3 py-2 text-xs font-semibold', billing === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>Theo tháng</button><button type="button" aria-pressed={billing === 'annual'} onClick={() => setBilling('annual')} className={cx('rounded-md px-3 py-2 text-xs font-semibold', billing === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>Theo năm</button></div>{selectedRole === 'founder' && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Năm = 10 tháng</span>}</div>
    </div>


    <div id="pricing-plans" className="grid scroll-mt-24 gap-5 xl:grid-cols-3">
      {tiers.map(tier => {
        const plan = catalog[tier];
        const emphasized = tier === 'plus';
        const isSavedTier = currentSubscription.tier === tier;
        const isCurrent = isSavedTier && (tier === 'free' || currentSubscription.billing === billing);
        const shownPrice = displayPrice(plan, billing);
        return <section key={tier} className={cx('relative flex min-w-0 flex-col rounded-3xl border bg-white p-6 sm:p-7', emphasized ? 'border-indigo-400 shadow-lg shadow-indigo-100/60 ring-1 ring-indigo-400' : 'border-slate-200')}>
          <div className="mb-5 flex min-h-6 items-center justify-between gap-2"><span className={cx('grid h-9 w-9 place-items-center rounded-xl text-sm font-bold', emphasized ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}>{tier === 'free' ? '01' : tier === 'plus' ? '02' : '03'}</span>{isSavedTier ? <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">Gói đang dùng</span> : emphasized && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">Lựa chọn cân bằng</span>}</div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{plan.name}</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{planDescriptions[selectedRole][tier]}</p>
          <div className="mb-6 mt-6"><div className="flex flex-wrap items-baseline gap-x-1.5"><strong className="text-3xl font-bold tracking-tight text-slate-900">{money(shownPrice)}<span className="ml-1 text-xl">₫</span></strong><span className="text-xs text-slate-400">{tier === 'free' ? 'miễn phí' : `/ ${billing === 'annual' ? 'năm' : 'tháng'}`}</span></div><p className="mt-2 min-h-4 text-xs text-slate-400">{tier === 'free' && selectedRole === 'investor' ? 'Trial 2 tháng' : tier === 'free' ? 'Bắt đầu với hạn mức dùng thử một lần' : billing === 'annual' ? `Tương đương ${money(shownPrice / 12)} ₫ / tháng` : 'Giá tham khảo'}</p></div>
          <button type="button" disabled={isCurrent || !canChangePlan} onClick={() => setPending({role: state.role, tier})} className={cx('mb-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-default disabled:opacity-60', isCurrent ? 'bg-slate-100 text-slate-400' : emphasized ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600')}>{isCurrent ? 'Đang sử dụng' : !canChangePlan ? 'Xem thông tin gói' : tier === 'free' ? 'Chọn gói miễn phí' : isSavedTier ? 'Đổi chu kỳ dùng thử' : 'Dùng thử gói này'}</button>
          <p className="border-t border-slate-100 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quyền sử dụng</p>
          <ul className="mt-4 space-y-3">
            {features.map(([key, label, unit]) => <li key={key} className={cx('flex items-start gap-2.5 text-[13px] leading-5', key === 'export' && !plan.export ? 'text-slate-400' : 'text-slate-600')}><Check className={key === 'export' && !plan.export ? 'mt-0.5 text-slate-300' : 'mt-0.5 text-indigo-500'} /><span>{key === 'export' ? plan.export ? 'Xuất báo cáo phân tích' : 'Xem báo cáo trong ứng dụng' : key === 'aiTokens' ? featureValue(plan, key) : key === 'reportCadence' ? `${label}: ${featureValue(plan, key)}*` : key === 'connections' ? featureValue(plan, key) : <><strong className="font-semibold text-slate-800">{featureValue(plan, key)}</strong> {key === 'workspaces' ? unit : label.toLowerCase()}</>}</span></li>)}
            {selectedRole === 'investor' && plan.annualEventsMap && billing === 'annual' && <li className="flex items-start gap-2.5 text-[13px] leading-5 text-slate-600"><Check className="mt-0.5 text-indigo-500"/><span>Bản đồ sự kiện/startup gần bạn, lọc theo khoảng cách, lĩnh vực và ngày tổ chức*</span></li>}
          </ul>
          {selectedRole === 'investor' && <p className="mt-4 text-[11px] leading-5 text-slate-500">* Quyền lợi từ bảng giá cũ; chức năng chưa được triển khai.</p>}
        </section>;
      })}
    </div>

    <div className="my-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-amber-900">Giá tham khảo · Dùng thử không thu tiền</p><p className="mt-1 text-xs leading-5 text-amber-800">AI đã gồm trong gói. Hạn mức token bên dưới chỉ để kiểm soát chi phí sử dụng, không phải phí tính theo lượt.</p></div><span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700">Không cần thông tin thẻ</span></div>

    <section id="pricing-limits" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Hạn mức đang sử dụng</p><h2 className="mt-2 text-lg font-bold text-slate-900">{currentPlan.name}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Hạn mức {budgetLabel(state.role)} {currentPlan.tier === 'free' ? 'dùng một lần, không làm mới.' : state.role === 'investor' ? 'làm mới đầu mỗi tháng, 00:00 giờ Việt Nam. Không cộng dồn.' : 'làm mới mỗi thứ Hai, 00:00 giờ Việt Nam. Không cộng dồn.'}</p></div>{selectedRole === 'founder' && workspaces.length > 0 && <label className="text-xs text-slate-500"><span className="mb-1.5 block">Hạn mức công việc và tài liệu của</span><select value={workspaceId} onChange={event => setSelectedWorkspace(event.target.value)} className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:max-w-64">{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>}</div>
      <div className="mt-6 grid gap-x-7 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{currentQuotas.map(quota => {
        const needsWorkspace = ['tasks', 'documents'].includes(quota.key) && !workspaceId;
        return <div key={quota.key}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-slate-500">{quota.label}</span><strong className={quota.used >= quota.limit ? 'text-amber-600' : 'text-slate-700'}>{money(quota.used)} / {money(quota.limit)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', quota.used >= quota.limit ? 'bg-amber-400' : 'bg-indigo-500')} style={{ width: `${Math.min(100, quota.limit ? quota.used / quota.limit * 100 : 0)}%` }} /></div>{needsWorkspace && <p className="mt-1.5 text-[10px] text-slate-400">Tạo workspace để bắt đầu sử dụng.</p>}</div>;
      })}</div>
    </section>

    <section id="pricing-compare" className="mt-8 scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5 sm:px-7"><h2 className="text-lg font-bold text-slate-900">So sánh chi tiết</h2><p className="mt-1 text-xs leading-5 text-slate-500">Các hạn mức áp dụng cho vai trò {roleLabels[selectedRole]}. Chu kỳ giá tháng/năm không thay đổi nhịp làm mới hạn mức.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="bg-slate-50"><th scope="col" className="px-7 py-4 font-medium text-slate-500">Tính năng</th>{tiers.map(tier => <th scope="col" key={tier} className="px-4 py-4 text-center font-semibold text-slate-800">{catalog[tier].name}</th>)}</tr></thead><tbody>{features.map(([key, label]) => <tr key={key} className="border-t border-slate-100"><th scope="row" className="px-7 py-4 font-medium text-slate-600">{label}</th>{tiers.map(tier => <td key={tier} className={cx('px-4 py-4 text-center', tier === 'plus' ? 'bg-indigo-50/30 font-medium text-indigo-700' : 'text-slate-500')}>{featureValue(catalog[tier], key, true)}</td>)}</tr>)}</tbody></table></div>
    </section>

    <div className="mt-6 grid gap-5 text-xs leading-6 text-slate-500 sm:grid-cols-2"><p><strong className="block font-semibold text-slate-700">Hạn mức hoạt động như thế nào?</strong>Free có {budgetLabel(selectedRole)} dùng một lần. Gói trả phí làm mới hạn mức {selectedRole === 'investor' ? 'đầu mỗi tháng' : 'hằng tuần, vào thứ Hai'} lúc 00:00 giờ Việt Nam; phần chưa dùng không cộng dồn. Đổi gói trong kỳ không cấp lại hạn mức đã dùng.</p><p><strong className="block font-semibold text-slate-700">Dữ liệu được giữ khi đổi gói.</strong>{selectedRole === 'founder' ? 'Workspace, công việc và tài liệu' : 'Danh mục và startup đã lưu'} được giữ lại. Số lượng đã tạo không tự đặt lại theo thời gian hoặc khi đổi gói. Trở về Free tiếp tục dùng phần hạn mức Free còn lại.</p></div>
    {pending?.role === state.role && <ActivationDialog state={state} targetTier={pending.tier} billing={billing} onClose={() => setPending(null)} onConfirm={activatePlan} />}
  </div>;
}

export default PricingPage;
