import React, { useEffect, useRef, useState } from 'react';
import './index.css';
import { PricingPage } from './PlansPage.jsx';
import { WorkspacePage, PortfolioPage } from './ProjectPages.jsx';
import { HomePage } from './HomePage.jsx';
import { InvestorSidebar, useInvestorSidebarCollapsed } from './InvestorSidebar.jsx';
import { StartupSidebar, useStartupSidebarCollapsed } from './StartupSidebar.jsx';
import { InvestorDashboard, InvestorSectionPage, InvestorSupportPage } from './InvestorPages.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { CaseWorkflowPage } from './CaseWorkflowPage.jsx';
import { CasePricingPage } from './CasePricingPage.jsx';
import { applyCaseAction, loadCaseWorkflow, saveCaseWorkflow } from './caseWorkflow.js';
import { ConversationsPage } from './ConversationsPage.jsx';
import { DemoInvestorAIChat } from './InvestorAIChat.jsx';
import { AIAgent } from './DemoAIAgent.jsx';
import { StartupManagement } from './StartupManagement.jsx';
import { DEMO_ACCOUNTS, getActiveAccountId, loadAccount, saveAccount, setActiveAccountId } from './demoAccounts.js';
import { AnalysisPage, BudgetCard, LimitDialog, ConnectionPanel } from './UsageUI.jsx';
import {
  STORAGE_KEY, getPlan, getUsage, changeRole, changePlan, applyAction, freshState, validateState, refreshUsage,
  recordEvent, parseCSV, analyze, SAMPLE_CSV, uid, money, pct, portfolioMetrics,
} from '../domain.js';

const navItems = [
  { id: 'home', label: 'Trang chủ', icon: 'home' },
  { id: 'conversations', label: 'Trò chuyện', icon: 'chat' },
  { id: 'marketplace', label: 'Startup Marketplace', icon: 'rocket' },
  { id: 'analysis', label: 'Phân tích tài chính', icon: 'chart' },
  { id: 'portfolio', label: 'Danh mục đầu tư', icon: 'briefcase' },
  { id: 'workspace', label: 'Workspace dự án', icon: 'folder' },
  { id: 'cases', label: 'Case gọi vốn', icon: 'briefcase' },
];

const cn = (...values) => values.filter(Boolean).join(' ');

function Icon({ name, size = 18, className = '' }) {
  const paths = {
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z" /><path d="M7 9h9M7 13h6" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1V10Z" /></>,
    bot: <><rect x="4" y="7" width="16" height="14" rx="4" /><path d="M12 3v4M2 12v4M22 12v4M9 16h6" /><circle cx="9" cy="12" r=".5" /><circle cx="15" cy="12" r=".5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    rocket: <><path d="M13.6 4.1c2.7-2.2 5.3-2.2 6.3-2 .2 1 .2 3.6-2 6.3l-5.3 5.3-3.9-.4-.4-3.9 5.3-5.3Z" /><path d="m8.7 15.3-3.2 3.2M5.2 13.5l-2.1.7.7-2.1M8.5 18.8l-.7 2.1 2.1-.7" /><circle cx="16.5" cy="7.5" r="1.4" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3.2-4 3 2.2L19 7" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    folder: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2h7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z" /></>,
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.4h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m6 9 6 6 6-6" />,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v4M12 16h.01" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M4 7h15M16 13h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? validateState(JSON.parse(saved)) : validateState(freshState());
  } catch {
    return validateState(freshState());
  }
}

function routeFromHash(defaultPage = 'home') {
  const raw = (window.location.hash.replace(/^#\/?/, '') || defaultPage).split('?')[0].split('/');
  const id = raw.slice(1).join('/');
  if (raw[0] === 'dashboard') {
    if (defaultPage === 'conversations') return { page: 'dashboard', id: '' };
    window.history.replaceState(null, '', '#/home'); return { page: 'home', id: '' };
  }
  if (raw[0] === 'home' && id) { window.history.replaceState(null, '', `#/conversations/${id}`); return { page: 'conversations', id }; }
  if (raw[0] === 'home' && defaultPage === 'conversations') { window.history.replaceState(null, '', '#/conversations'); return { page: 'conversations', id: '' }; }
  const query = new URLSearchParams(window.location.hash.split('?')[1] || '');
  return { page: raw[0], id, startupId: query.get('startupId') || '' };
}

function navigate(route) {
  window.location.hash = `/${route}`;
}

function Sidebar({ state, route, mobileOpen, setMobileOpen, onOpenAgent, account, collapsed, setCollapsed }) {
  if (state.role === 'investor') return <InvestorSidebar route={route} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} collapsed={collapsed} setCollapsed={setCollapsed} planName={getPlan(state).name} accountName={account.name} showCases />;
  return <StartupSidebar route={route} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} collapsed={collapsed} setCollapsed={setCollapsed} onOpenAgent={onOpenAgent} accountName={account.name} planName={getPlan(state).name} pricingLabel="Phí theo case" showCases workspaceCount={state.workspaces.filter(workspace => workspace.role === state.role).length} />;
}

function Topbar({ state, route, setMobileOpen, accountId, switchAccount }) {
  const investorTitles = { conversations: 'AI Chat', dashboard: 'Dashboard đầu tư', marketplace: 'Startup & Cơ hội đầu tư', workspace: 'Workspace (Investor)', cases: 'Xếp hạng', portfolio: 'Quản lý danh mục', 'due-diligence': 'Thẩm định', collaboration: 'Hợp tác & Giao dịch', documents: 'Tài liệu & Báo cáo', support: 'Trợ giúp & Hỗ trợ' };
  const title = (state.role === 'investor' && investorTitles[route.page]) || (route.page === 'marketplace' && state.role === 'founder' ? 'Quản lý startup' : navItems.find(x => x.id === route.page)?.label) || ({ pricing: state.role === 'founder' ? 'Phí theo case' : 'Gói dịch vụ', privacy: 'Dữ liệu & quyền riêng tư', startup: 'Hồ sơ startup' }[route.page] || 'Tổng quan');
  return <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-9"><div className="flex min-w-0 items-center gap-3"><button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Icon name="menu" size={17} /></button><div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><span>Workspace</span><span>/</span><span className="font-semibold text-slate-700">{title}</span></div><span className="truncate font-semibold text-slate-800 sm:hidden max-[360px]:hidden">{title}</span></div><div className="flex shrink-0 items-center gap-2.5"><select className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 outline-none max-w-[145px] sm:max-w-[200px]" value={accountId} onChange={e => switchAccount(e.target.value)} aria-label="Chọn vai trò">{DEMO_ACCOUNTS.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 max-[420px]:hidden" onClick={() => navigate('privacy')} aria-label="Cài đặt"><Icon name="settings" size={16} /></button><ThemeToggle/></div></header>;
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="mb-7 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0">{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.17em] text-indigo-500">{eyebrow}</p>}<h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 md:text-[30px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}</div>;
}

function Button({ children, variant = 'primary', icon, onClick, className = '', type = 'button' }) {
  const styles = { primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700', soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800', danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100' };
  return <button type={type} onClick={onClick} className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition', styles[variant], className)}>{icon && <Icon name={icon} size={16} />}{children}</button>;
}

function Card({ children, className = '' }) { return <section className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30', className)}>{children}</section>; }

function StartupMark({ startup, size = 'md' }) { return <span style={{ backgroundColor: 'var(--color-royal)' }} className={cn('grid shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm', size === 'lg' ? 'h-12 w-12 text-xl' : 'h-9 w-9 text-sm')}>{startup?.mark || startup?.name?.[0] || 'X'}</span>; }

function MetricCard({ label, value, suffix, helper, icon, tone = 'indigo' }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-500">{label}</p><span className={cn('grid h-8 w-8 place-items-center rounded-lg', tone === 'teal' ? 'bg-teal-50 text-teal-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600')}><Icon name={icon} size={16} /></span></div><p className="mt-4 text-[27px] font-bold tracking-tight text-slate-900">{value} <span className="text-xs font-medium text-slate-400">{suffix}</span></p><p className="mt-2 text-[11px] text-slate-400">{helper}</p></Card>;
}

function LineChart({ values }) {
  const max = Math.max(...values, 1); const min = Math.min(...values, 0); const range = max - min || 1;
  const points = values.map((v, i) => `${i * (100 / (values.length - 1))},${92 - ((v - min) / range) * 72}`).join(' ');
  const area = `0,92 ${points} 100,92`;
  return <div className="relative h-56 w-full overflow-hidden rounded-xl bg-slate-50/80 p-2"><div className="pointer-events-none absolute inset-x-3 top-5 space-y-8">{[0, 1, 2].map(i => <div key={i} className="border-t border-dashed border-slate-200" />)}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-lavender)" stopOpacity=".24" /><stop offset="1" stopColor="var(--color-lavender)" stopOpacity="0" /></linearGradient></defs><polygon points={area} fill="url(#chartFill)" /><polyline points={points} fill="none" stroke="var(--color-royal)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{values.map((v, i) => <circle key={i} cx={i * (100 / (values.length - 1))} cy={92 - ((v - min) / range) * 72} r="1.8" fill="var(--surface)" stroke="var(--color-royal)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}</svg><div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] text-slate-400">{values.map((_, i) => <span key={i}>{String(i + 7).padStart(2, '0')}</span>)}</div></div>;
}

function Dashboard({ state, setNotice }) {
  const metrics = portfolioMetrics(state.portfolio, state.startups); const lotus = state.startups.find(s => s.id === 'lotus'); const ws = state.workspaces.find(w => w.role === state.role);
  const values = state.portfolio.find(p => p.startupId === 'lotus')?.updates?.map(x => x.revenue) || [0, 0];
  return <div className="mx-auto max-w-[1500px]"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Tổng quan của bạn</h2><p className="mt-2 text-sm text-slate-500">Theo dõi cơ hội, kết nối và tiến độ thẩm định của bạn.</p></div><Button icon="search" onClick={() => navigate('marketplace')}>Khám phá startup</Button></div>

    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Vốn đã đầu tư" value={money(metrics.invested)} suffix="triệu ₫" helper="Theo giao dịch bạn nhập" icon="wallet" /><MetricCard label="Startup trong danh mục" value={metrics.count} suffix="startup" helper={`${state.watchlist.length} đang quan tâm`} icon="briefcase" tone="teal" /><MetricCard label="Workspace đang làm việc" value={state.workspaces.filter(w => w.role === state.role).length} suffix="dự án" helper="Chỉ Startup được tạo workspace" icon="folder" tone="amber" /><MetricCard label="Token AI còn lại" value={money(getUsage(state, "aiTokens").remaining)} suffix="token" helper={getPlan(state).tier === "free" ? "Cấp một lần · Không reset" : "Reset mỗi tuần · Thứ Hai"} icon="spark" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,1fr)]"><Card className="p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">Doanh thu startup trong danh mục</h2><p className="mt-1 text-xs text-slate-500">LotusPay · Triệu đồng, dữ liệu nhập theo tháng</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">3 kỳ cập nhật</span></div><LineChart values={values} /><div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-indigo-500" />Doanh thu thực nhập</span><span>Không phải lợi nhuận đầu tư</span></div></Card><Card className="p-6"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-base font-bold text-slate-900">Workspace của bạn</h2><p className="mt-1 text-xs text-slate-500">Biến thông tin thành việc cần làm</p></div><a href="#/workspace" className="text-xs font-semibold text-indigo-600">Tất cả <Icon name="chevron" size={13} className="inline" /></a></div>{ws ? <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><StartupMark startup={lotus} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{ws.name}</p><p className="mt-1 text-[11px] text-slate-500">{ws.tasks.filter(t => t.status === 'done').length}/{ws.tasks.length} việc hoàn tất</p></div></div><div className="mt-4 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${ws.tasks.length ? (ws.tasks.filter(t => t.status === 'done').length / ws.tasks.length) * 100 : 0}%` }} /></div><div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>{ws.goal}</span><span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-600">Đang thực hiện</span></div></div> : <EmptyState title="Chưa có workspace" action="Khám phá startup" onClick={() => navigate('marketplace')} />}</Card></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,1fr)]"><Card className="p-6"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-base font-bold text-slate-900">Cơ hội đang quan tâm</h2><p className="mt-1 text-xs text-slate-500">Tiếp tục khám phá các startup bạn đã lưu</p></div><a href="#/marketplace" className="text-xs font-semibold text-indigo-600">Marketplace <Icon name="arrow" size={13} className="inline" /></a></div><div className="divide-y divide-slate-100">{state.startups.filter(s => state.watchlist.includes(s.id)).slice(0, 3).map(startup => <button key={startup.id} onClick={() => navigate(`startup/${startup.id}`)} className="flex w-full items-center gap-3 py-4 text-left transition hover:bg-slate-50"><StartupMark startup={startup} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{startup.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{startup.industry} · {startup.location}</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{startup.stage}</span><span className="w-24 text-right text-sm font-semibold text-slate-800">{money(startup.revenue)} <small className="text-[10px] font-normal text-slate-400">triệu ₫</small></span><Icon name="chevron" size={16} className="text-slate-400" /></button>)}</div><p className="mt-4 text-[11px] text-slate-400">Mức hoàn thiện hồ sơ phản ánh số tài liệu đã có, không phản ánh khả năng sinh lời.</p></Card><BudgetCard state={state} /></div></div>;
}

function EmptyState({ title, action, onClick }) { return <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center"><p className="text-sm font-semibold text-slate-700">{title}</p>{action && <Button className="mt-4" variant="soft" onClick={onClick}>{action}</Button>}</div>; }

function Marketplace({ state, updateState, setNotice, act, onLimit }) {
  const [query, setQuery] = useState(''); const [industry, setIndustry] = useState(''); const [stage, setStage] = useState(''); const [sort, setSort] = useState('default'); const [compareOpen, setCompareOpen] = useState(false);
  const industries = [...new Set(state.startups.map(s => s.industry))]; const stages = [...new Set(state.startups.map(s => s.stage))];
  let list = state.startups.filter(s => (!query || `${s.name} ${s.tagline} ${s.industry}`.toLowerCase().includes(query.toLowerCase())) && (!industry || s.industry === industry) && (!stage || s.stage === stage));
  if (sort === 'revenue') list = [...list].sort((a, b) => b.revenue - a.revenue); if (sort === 'growth') list = [...list].sort((a, b) => b.growth - a.growth);
  const toggleWatch = id => act({type:'toggle-watch',startupId:id});
  const toggleCompare = id => act({type:'toggle-compare',startupId:id});
  return <div className="mx-auto max-w-[1500px]"><PageHeading eyebrow="Khám phá" title={state.role === 'founder' ? 'Quản lý startup' : 'Startup Marketplace'} description={state.role === 'founder' ? `Tài khoản Startup có thể chỉnh sửa cả ${state.startups.length} hồ sơ và tạo workspace cho từng startup.` : 'Một góc nhìn có cấu trúc để bắt đầu cuộc trò chuyện đúng chỗ.'} actions={<Button icon="chart" onClick={() => navigate('analysis')}>Phân tích CSV</Button>} /><div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(200px,1.5fr)_repeat(3,minmax(140px,1fr))]"><label className="relative flex items-center"><Icon name="search" size={16} className="absolute left-3 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm startup, lĩnh vực..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label><select value={industry} onChange={e => setIndustry(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-400"><option value="">Tất cả lĩnh vực</option>{industries.map(x => <option key={x}>{x}</option>)}</select><select value={stage} onChange={e => setStage(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-400"><option value="">Tất cả giai đoạn</option>{stages.map(x => <option key={x}>{x}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-400"><option value="default">Sắp xếp mặc định</option><option value="revenue">Doanh thu cao nhất</option><option value="growth">Tăng trưởng cao nhất</option></select></div><div className="mb-4 flex items-center justify-between text-xs text-slate-500"><span><strong className="text-slate-800">{list.length}</strong> startup phù hợp</span><button onClick={() => { setQuery(''); setIndustry(''); setStage(''); setSort('default'); }} className="font-semibold text-indigo-600 hover:text-indigo-700">Đặt lại bộ lọc</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map(startup => <StartupCard investor={state.role === "investor"} key={startup.id} startup={startup} watched={state.watchlist.includes(startup.id)} compared={state.compare.includes(startup.id)} onWatch={() => toggleWatch(startup.id)} onCompare={() => toggleCompare(startup.id)} onOpen={() => navigate(`startup/${startup.id}`)} />)}</div>{!list.length && <EmptyState title="Chưa có startup phù hợp" action="Xóa bộ lọc" onClick={() => { setQuery(''); setIndustry(''); setStage(''); }} />}{state.role === "investor" && state.compare.length > 0 && <div className="fixed bottom-5 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl bg-[#171717] px-4 py-3 text-white shadow-2xl"><span className="text-sm"><strong>{state.compare.length}</strong> startup đang chọn</span><div className="flex gap-2"><Button variant="ghost" className="text-slate-300" onClick={() => updateState(s => ({ ...structuredClone(s), compare: [] }))}>Bỏ chọn</Button><Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { if (state.compare.length > getPlan(state).compare) onLimit('compare'); else if(state.compare.length < 2) setNotice('Chọn ít nhất 2 startup để so sánh.'); else setCompareOpen(true); }}>So sánh <Icon name="arrow" size={15} /></Button></div></div>}{compareOpen && <CompareModal state={state} onClose={() => setCompareOpen(false)} />}</div>;
}

function StartupCard({ investor, startup, watched, compared, onWatch, onCompare, onOpen }) { return <Card className="group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40"><div className="flex items-start justify-between"><button className="flex items-center gap-3 text-left" onClick={onOpen}><StartupMark startup={startup} size="lg" /><span><span className="block text-base font-bold text-slate-900">{startup.name}</span><span className="mt-1 block text-xs text-slate-500">{startup.industry} · {startup.location}</span></span></button>{investor && <button onClick={onWatch} className={cn('grid h-9 w-9 place-items-center rounded-xl transition', watched ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500')} aria-label={watched ? 'Bỏ lưu' : 'Lưu startup'}>★</button>}</div><p className="mt-5 min-h-12 text-sm leading-6 text-slate-600">{startup.tagline}</p><div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Doanh thu</p><p className="mt-1 text-sm font-bold text-slate-800">{money(startup.revenue)} <small className="font-normal text-slate-400">tr</small></p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Tăng trưởng</p><p className={cn('mt-1 text-sm font-bold', startup.growth >= 0 ? 'text-teal-600' : 'text-rose-600')}>{pct(startup.growth)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Hồ sơ</p><p className="mt-1 text-sm font-bold text-slate-800">{Math.round(startup.docs / startup.totalDocs * 100)}%</p></div></div><div className="mt-4 flex items-center justify-between"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">{startup.stage}</span><div className="flex items-center gap-2">{investor && <button onClick={onCompare} className={cn('rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition', compared ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100')}>{compared ? 'Đã chọn' : 'So sánh'}</button>}<button onClick={onOpen} aria-label={`${investor ? 'Xem' : 'Quản lý'} ${startup.name}`} className="flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-2 text-indigo-600 transition hover:bg-indigo-100">{!investor && <span className="text-[11px] font-semibold">Quản lý</span>}<Icon name="arrow" size={15} /></button></div></div></Card>; }

function CompareModal({ state, onClose }) { const list = state.startups.filter(s => state.compare.includes(s.id)); return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onClick={onClose}><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">Góc nhìn chung</p><h2 className="mt-2 text-xl font-bold text-slate-900">So sánh startup</h2><p className="mt-1 text-sm text-slate-500">Đặt dữ liệu cạnh nhau để biết câu hỏi tiếp theo cần hỏi.</p></div><button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500" onClick={onClose}><Icon name="close" size={16} /></button></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tiêu chí</th>{list.map(s => <th key={s.id} className="px-3 py-3 font-bold text-slate-800">{s.name}</th>)}</tr></thead><tbody>{[['Lĩnh vực', s => s.industry], ['Giai đoạn', s => s.stage], ['Doanh thu / tháng', s => `${money(s.revenue)} triệu ₫`], ['Tăng trưởng tháng', s => pct(s.growth)], ['Runway', s => `${s.runway} tháng`], ['Mục tiêu gọi vốn', s => `${money(s.target)} triệu ₫`], ['Hồ sơ đầy đủ', s => `${s.docs}/${s.totalDocs} mục`]].map(([label, fn]) => <tr key={label} className="border-b border-slate-100"><td className="px-3 py-3 text-slate-500">{label}</td>{list.map(s => <td key={s.id} className="px-3 py-3 font-medium text-slate-800">{fn(s)}</td>)}</tr>)}</tbody></table></div><p className="mt-5 text-xs leading-5 text-slate-400">Chỉ số do Startup cung cấp. Cần thẩm định trước khi đầu tư.</p></div></div>; }

function AnalysisResult({ report }) { const a = report.analysis; return <div className="mt-8 border-t border-slate-100 pt-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">Kết quả phân tích</p><h2 className="mt-2 text-lg font-bold text-slate-900">{report.name}</h2><p className="mt-1 text-xs text-slate-500">{a.rows.length} tháng · kỳ mới nhất {a.latest.period} · Dữ liệu chưa kiểm toán</p></div><span className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">{a.flags.length} chỉ báo cần rà soát</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Doanh thu tháng cuối" value={money(a.latest.revenue)} suffix="triệu ₫" helper={`${pct(a.growth)} so với tháng trước`} icon="chart" /><MetricCard label="Biên lợi nhuận gộp" value={a.margin === null ? 'N/A' : a.margin.toFixed(1)} suffix={a.margin === null ? '' : '%'} helper="Ngưỡng cảnh báo: dưới 20%" icon="briefcase" tone="teal" /><MetricCard label="Đốt tiền bình quân" value={money(a.burn)} suffix="triệu ₫" helper={`Trung bình ${Math.min(3, a.rows.length)} tháng`} icon="wallet" tone="amber" /><MetricCard label="Runway ước tính" value={a.runway === null ? 'N/A' : a.runway.toFixed(1)} suffix={a.runway === null ? '' : 'tháng'} helper="Giả định đốt tiền không đổi" icon="chart" /></div><div className="mt-5 rounded-2xl bg-indigo-50/60 p-4 text-sm leading-6 text-indigo-900"><Icon name="spark" size={16} className="mr-2 inline text-indigo-500" />{a.summary}</div><div className="mt-6 grid gap-6 md:grid-cols-2"><div><h3 className="text-sm font-bold text-slate-900">Điểm cần rà soát</h3><div className="mt-3 space-y-3">{a.flags.length ? a.flags.map(flag => <div key={flag.title} className={cn('flex gap-3 rounded-xl border p-3', flag.level === 'high' ? 'border-rose-100 bg-rose-50/60' : 'border-amber-100 bg-amber-50/60')}><Icon name="alert" size={17} className={flag.level === 'high' ? 'text-rose-500' : 'text-amber-500'} /><div><p className="text-xs font-bold text-slate-800">{flag.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{flag.detail}</p></div></div>) : <p className="text-sm text-slate-500">Không chạm ngưỡng cảnh báo.</p>}</div></div><div><h3 className="text-sm font-bold text-slate-900">Công thức sử dụng</h3><div className="mt-3 space-y-2">{a.formulas.map(([name, formula]) => <div key={name} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-700">{name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{formula}</p></div>)}</div></div></div></div>; }

function StartupDetail({ state, id, act, setNotice, updateState }) { const startup = state.startups.find(s => s.id === id) || state.startups[0]; if (!startup) return <EmptyState title="Không tìm thấy startup" action="Quay lại marketplace" onClick={() => navigate('marketplace')} />; const saved = state.watchlist.includes(startup.id); return <div className="mx-auto max-w-[1100px]"><button onClick={() => navigate('marketplace')} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600"><Icon name="arrow" size={14} className="rotate-180" />Quay lại Marketplace</button><Card className="overflow-hidden"><div className="bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-7 md:p-10"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-start"><div className="flex items-start gap-4"><StartupMark startup={startup} size="lg" /><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-slate-900">{startup.name}</h1><span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{startup.stage}</span></div><p className="mt-2 text-sm text-slate-500">{startup.industry} · {startup.location} · Thành lập {startup.founded}</p><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{startup.description}</p></div></div><div className="flex gap-2">{state.role === 'investor' && <Button variant={saved ? 'soft' : 'secondary'} onClick={() => act({type:'toggle-watch',startupId:startup.id})}>{saved ? 'Đã lưu' : 'Lưu startup'}</Button>}{state.role === 'founder' && <Button onClick={() => navigate(`workspace/new?startupId=${encodeURIComponent(startup.id)}`)} icon="plus">Tạo workspace</Button>}</div></div></div><div className="grid gap-px bg-slate-100 sm:grid-cols-4"><div className="bg-white p-5"><p className="text-[10px] uppercase tracking-wide text-slate-400">Doanh thu / tháng</p><p className="mt-2 text-xl font-bold text-slate-900">{money(startup.revenue)} <small className="text-xs font-medium text-slate-400">triệu ₫</small></p></div><div className="bg-white p-5"><p className="text-[10px] uppercase tracking-wide text-slate-400">Tăng trưởng</p><p className={cn('mt-2 text-xl font-bold', startup.growth >= 0 ? 'text-teal-600' : 'text-rose-600')}>{pct(startup.growth)}</p></div><div className="bg-white p-5"><p className="text-[10px] uppercase tracking-wide text-slate-400">Runway</p><p className="mt-2 text-xl font-bold text-slate-900">{startup.runway} <small className="text-xs font-medium text-slate-400">tháng</small></p></div><div className="bg-white p-5"><p className="text-[10px] uppercase tracking-wide text-slate-400">Hồ sơ</p><p className="mt-2 text-xl font-bold text-slate-900">{Math.round(startup.docs / startup.totalDocs * 100)}%</p></div></div></Card><div className="mt-5 grid gap-5 md:grid-cols-2"><Card className="p-6"><h2 className="text-base font-bold text-slate-900">Những gì cần biết thêm</h2><div className="mt-4 space-y-3">{['Nguồn tăng trưởng hiện tại có lặp lại không?', 'Kỳ hạn công nợ và khả năng thu hồi?', 'Mục tiêu gọi vốn được phân bổ thế nào?'].map((q, i) => <div key={q} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{i + 1}</span><p className="text-sm leading-5 text-slate-600">{q}</p></div>)}</div></Card><Card className="p-6"><h2 className="text-base font-bold text-slate-900">Thông tin gọi vốn</h2><div className="mt-4 space-y-4"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Mục tiêu</span><strong className="text-slate-800">{money(startup.target)} triệu ₫</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, startup.raised / startup.target * 100)}%` }} /></div><div className="flex items-center justify-between text-xs text-slate-400"><span>Đã gọi {money(startup.raised)} triệu ₫</span><span>{Math.round(startup.raised / startup.target * 100)}%</span></div><p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Dữ liệu chưa kiểm toán. Bắt đầu cuộc trò chuyện bằng các câu hỏi cụ thể.</p></div></Card></div><StartupManagement state={state} startup={startup} updateState={updateState} setNotice={setNotice} /><ConnectionPanel state={state} startup={startup} act={act} setNotice={setNotice} /></div>; }


function Privacy({ state, updateState, setNotice }) { return <div className="mx-auto max-w-[1000px]"><PageHeading eyebrow="Minh bạch" title="Bạn kiểm soát dữ liệu của mình." description="Cách dữ liệu được xử lý và lưu trữ." /><div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]"><Card className="p-6"><h2 className="text-base font-bold text-slate-900">Ứng dụng hoạt động như thế nào?</h2><ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><li>Workspace và báo cáo phân tích được lưu trong localStorage trên trình duyệt hiện tại.</li><li>Phân tích CSV thực hiện ngay trên thiết bị. Chưa kết nối AI, OCR, tài khoản ngân hàng hoặc dịch vụ kiểm toán.</li><li>Yêu cầu kết nối và nâng cấp được lưu trên thiết bị; chưa gửi tin và chưa thu tiền.</li><li>Hạn mức tài khoản phục vụ kiểm soát sử dụng. Bản sản xuất cần xác thực và máy chủ quản lý quyền.</li></ul></Card><Card className="p-6"><h2 className="text-base font-bold text-slate-900">Trạng thái hiện tại</h2><div className="mt-5 space-y-3 text-sm text-slate-600"><p className="flex justify-between"><span>Gói</span><strong>{getPlan(state).name}</strong></p><p className="flex justify-between"><span>Workspace</span><strong>{state.workspaces.filter(w => w.role === state.role).length}</strong></p><p className="flex justify-between"><span>Báo cáo</span><strong>{state.reports.length}</strong></p></div><p className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-800">Token Free cấp một lần, không tự reset. Gói Startup trả phí reset token mỗi thứ Hai; gói Investor trả phí reset đầu mỗi tháng theo giờ Việt Nam. Ngân sách hai vai trò được giữ riêng.</p></Card></div></div>; }


function FounderDashboard({ state }) {
  const workspaces = state.workspaces.filter(w => w.role === 'founder');
  return <div className="mx-auto max-w-[1200px]"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Tổng quan startup của bạn</h2><p className="mt-2 text-sm text-slate-500">Chuẩn bị hồ sơ, kiểm tra số liệu và theo dõi công việc.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon="rocket" onClick={() => navigate('marketplace')}>Quản lý tất cả startup</Button><Button icon="plus" onClick={() => navigate('workspace/new')}>Tạo workspace</Button></div></div><div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5"><Card className="p-6"><div className="flex justify-between gap-3"><h2 className="text-lg font-bold">Workspace gọi vốn</h2><span className="text-sm text-slate-500">{workspaces.length}/{getPlan(state).workspaces} đã dùng</span></div><p className="mb-5 mt-2 text-sm text-slate-500">Gói {getPlan(state).name} có tối đa {getPlan(state).workspaces} workspace. Workspace được giữ khi ngân sách token reset.</p>{workspaces.length ? workspaces.map(w => <a key={w.id} href={`#/workspace/${w.id}`} className="mt-3 block rounded-xl bg-slate-50 p-4"><p className="font-semibold">{w.name}</p><p className="mt-1 text-sm text-slate-500">{w.goal}</p><p className="mt-3 text-xs text-indigo-600">{w.tasks.filter(t=>t.status==='done').length}/{w.tasks.length} việc hoàn thành →</p></a>) : <EmptyState title="Bắt đầu với workspace đầu tiên" action="Tạo workspace" onClick={() => navigate('workspace/new')} />}</Card><Card className="p-6"><h2 className="font-bold">Phân tích hồ sơ tài chính</h2><p className="my-3 text-sm leading-6 text-slate-500">Dùng CSV để rà soát dòng tiền, biên lợi nhuận và runway. Xem trước token ước tính rồi mới chạy.</p><Button onClick={() => navigate('analysis')} icon="chart">Mở phân tích</Button></Card></div><BudgetCard state={state} /></div></div>;
}



export function DemoApp() {
  const [accountId, setAccountId] = useState(getActiveAccountId);
  const account = DEMO_ACCOUNTS.find(item => item.id === accountId);
  const [state, setState] = useState(() => loadAccount(accountId));
  const [caseFlow, setCaseFlow] = useState(loadCaseWorkflow);
  const stateRef = useRef(state);
  const [route, setRoute] = useState(() => routeFromHash(state.role === 'investor' ? 'conversations' : 'home'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [investorCollapsed, setInvestorCollapsed] = useInvestorSidebarCollapsed();
  const [startupCollapsed, setStartupCollapsed] = useStartupSidebarCollapsed();
  const sidebarCollapsed = state.role === 'investor' ? investorCollapsed : startupCollapsed;
  const setSidebarCollapsed = state.role === 'investor' ? setInvestorCollapsed : setStartupCollapsed;
  const [notice, setNotice] = useState('');
  const [limit, setLimit] = useState(null);
  function commit(next) { stateRef.current = next; setState(next); return next; }
  function switchAccount(nextId) {
    if (nextId === accountId) return;
    saveAccount(accountId, stateRef.current);
    const next = loadAccount(nextId);
    setActiveAccountId(nextId); setAccountId(nextId); commit(next);
    setRoute(routeFromHash(next.role === 'investor' ? 'conversations' : 'home'));
    setMobileOpen(false); setLimit(null); setAgentOpen(false);
    if (!location.hash || location.hash === '#/') navigate(next.role === 'investor' ? 'conversations' : 'home');
    setNotice('Đã chuyển sang ' + DEMO_ACCOUNTS.find(item => item.id === nextId).name + '.');
  }
  function updateState(updater) {
    try { const copy = structuredClone(stateRef.current); return commit(refreshUsage(updater(copy) || copy)); }
    catch (error) { setNotice(error.message); return null; }
  }
  function act(action) {
    try { return commit(applyAction(stateRef.current, action)); }
    catch (error) { if(error.code === 'LIMIT') setLimit({feature:error.feature,quota:error.quota,required:error.required}); else setNotice(error.message); return null; }
  }
  function actCase(action) {
    try {
      const next = applyCaseAction(caseFlow, accountId, action);
      setCaseFlow(next);
      if (!saveCaseWorkflow(next)) setNotice('Chưa lưu được case trên thiết bị. Đừng tải lại trang.');
      return next;
    } catch (error) { setNotice(error.message); return null; }
  }
  function onLimit(feature, workspaceId) { setLimit({feature,quota:getUsage(structuredClone(stateRef.current),feature,workspaceId)}); }
  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash(stateRef.current.role === 'investor' ? 'conversations' : 'home')); setMobileOpen(false); if (stateRef.current.role === 'investor') setAgentOpen(false); window.scrollTo({top:0}); };
    window.addEventListener('hashchange',onHash);
    const timer = setInterval(() => { const next = refreshUsage(structuredClone(stateRef.current)); if(JSON.stringify(next.usageByRole) !== JSON.stringify(stateRef.current.usageByRole)) commit(next); },15000);
    return () => { window.removeEventListener('hashchange',onHash); clearInterval(timer); };
  }, []);
  useEffect(() => { if(!saveAccount(accountId,state)) setNotice('Chưa lưu được trên thiết bị. Dữ liệu đang giữ tạm; đừng đóng hoặc tải lại trang.'); },[accountId,state]);
  useEffect(() => {if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
  useEffect(() => {if(!mobileOpen)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';const close=e=>{if(e.key==='Escape')setMobileOpen(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',close);};},[mobileOpen]);
  const props={state,updateState,act,onLimit,setNotice};
  const homePage=state.role==='founder'?<HomePage onOpenAgent={()=>setAgentOpen(true)}><FounderDashboard {...props}/></HomePage>:<InvestorDashboard state={state}/>;
  const isChat=route.page==='conversations';
  const isInvestorAIChat=isChat&&state.role==='investor'&&!route.id;
  let page;
  if(route.page==='dashboard'&&state.role==='investor')page=<InvestorDashboard state={state}/>;
  else if(route.page==='home')page=homePage;
  else if(isInvestorAIChat)page=<DemoInvestorAIChat state={state} onOpenMenu={()=>setMobileOpen(true)} accountId={accountId} onSwitchAccount={switchAccount}/>;
  else if(isChat)page=<ConversationsPage state={state} id={route.id} onOpenAgent={()=>setAgentOpen(true)}/>;
  else if(route.page==='pricing')page=state.role==='founder'&&route.id!=='legacy'?<CasePricingPage/>:<PricingPage {...props}/>;
  else if(route.page==='cases')page=<CaseWorkflowPage flow={caseFlow} accountId={accountId} caseId={route.id} onAction={actCase} startups={state.startups}/>;
  else if(state.role==='investor'&&['due-diligence','collaboration','documents'].includes(route.page))page=<InvestorSectionPage section={route.page} state={state}/>;
  else if(state.role==='investor'&&route.page==='support')page=<InvestorSupportPage/>;
  else if(route.page==='workspace')page=<WorkspacePage {...props} id={route.id} startupId={route.startupId}/>;
  else if(route.page==='portfolio')page=<PortfolioPage {...props}/>;
  else if(route.page==='analysis')page=<AnalysisPage {...props} id={route.id} renderReport={report=><AnalysisResult report={report}/>}/>;
  else if(route.page==='marketplace')page=<Marketplace {...props}/>;
  else if(route.page==='startup')page=<StartupDetail {...props} id={route.id}/>;
  else if(route.page==='privacy')page=<Privacy {...props}/>;
  else page=homePage;
  useEffect(()=>{if(route.page!=='pricing'||!route.id)return;const id={compare:'pricing-compare',upgrade:'pricing-plans',limits:'pricing-limits'}[route.id];if(!id)return;const frame=requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame);},[route.page,route.id]);
  return <div className="min-h-screen min-w-0 bg-[#090909] text-slate-900">
    <a className="skip-link" href="#main" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus();}}>Đến nội dung</a>
    <Sidebar account={account} state={state} route={route} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onOpenAgent={()=>setAgentOpen(true)} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}/>
    <div className={cn('min-w-0', sidebarCollapsed?'lg:pl-[76px]':'lg:pl-[260px]')}>
      {!isInvestorAIChat&&<Topbar state={state} route={route} setMobileOpen={setMobileOpen} accountId={accountId} switchAccount={switchAccount}/>}
      <main id="main" tabIndex={-1} className={cn('min-w-0',isInvestorAIChat?'h-dvh overflow-hidden':isChat?'h-[calc(100dvh-112px)] overflow-hidden':'px-5 py-7 lg:px-9 lg:py-9')}>
        <div className={isChat?'h-full':undefined} key={accountId+'/'+route.page+'/'+(isChat?'':route.id)+'/'+(route.startupId||'')}>{page}</div>
      </main>
      {!isInvestorAIChat&&<footer className={cn('flex flex-wrap justify-between text-slate-400',isChat?'h-10 items-center gap-x-3 border-t border-white/10 px-4 text-[10px]':'gap-3 px-5 pb-28 text-xs lg:px-9')}><span>© 2026 X Workspace · 2good2betrue</span><a href="#/privacy" className="text-indigo-600">Dữ liệu & quyền riêng tư →</a></footer>}
    </div>
    <AIAgent state={state} workspaceMode={isChat} showLauncher={state.role!=='investor'&&!['cases','pricing'].includes(route.page)} open={agentOpen} onOpen={()=>setAgentOpen(true)} onClose={()=>setAgentOpen(false)} raised={isChat||(route.page==='marketplace'&&state.role==='investor'&&state.compare.length>0)}/>
    {notice&&<div role="status" className="fixed bottom-5 left-1/2 z-[60] w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">{notice}</div>}
    {limit&&<LimitDialog state={state} limit={limit} onClose={()=>setLimit(null)}/>}
  </div>;
}
