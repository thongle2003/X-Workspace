import React, { useEffect, useState } from 'react';
import {
  Bot, BriefcaseBusiness, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight,
  Folder, Home, MessageSquare, Rocket, Wallet, X,
} from 'lucide-react';
import { Brand, BrandBadge } from './Brand.jsx';

const storageKey = '2g2bt-startup-sidebar-collapsed';

export function useStartupSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, String(collapsed)); }
    catch { /* The menu remains usable without local storage. */ }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

const primary = [
  { href: '#/home', page: 'home', label: 'Trang chủ', Icon: Home },
  { href: '#/conversations', page: 'conversations', label: 'Trò chuyện', Icon: MessageSquare },
  { href: '#/marketplace', page: 'marketplace', label: 'Quản lý startup', Icon: Rocket },
  { href: '#/analysis', page: 'analysis', label: 'Phân tích tài chính', Icon: ChartNoAxesColumnIncreasing },
  { href: '#/workspace', page: 'workspace', label: 'Workspace dự án', Icon: Folder },
];

export function StartupSidebar({ route, mobileOpen, setMobileOpen, collapsed, setCollapsed, onOpenAgent, accountName, planName, pricingLabel = 'Gói dịch vụ', showCases = false, workspaceCount = 0 }) {
  const closeMobile = () => setMobileOpen(false);
  const narrow = collapsed && !mobileOpen;
  const linkClass = active => `startup-nav-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-medium transition ${active ? 'is-active' : ''}`;
  const item = ({ href, page, label, Icon }) => {
    const active = route.page === page || page === 'marketplace' && route.page === 'startup';
    return <a key={page} href={href} title={narrow ? label : undefined} aria-label={label} aria-current={active ? 'page' : undefined} onClick={closeMobile} className={linkClass(active)}>
      <Icon size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
      {!narrow && <><span className="min-w-0 flex-1 truncate">{label}</span>{page === 'workspace' && <span className="startup-workspace-count rounded-full px-1.5 py-0.5 text-[10px]">{workspaceCount}</span>}</>}
    </a>;
  };
  return <>
    {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" aria-label="Đóng menu" onClick={closeMobile} />}
    <aside aria-label="Điều hướng Startup" className={`startup-sidebar fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto border-r px-3 py-5 transition-all lg:translate-x-0 ${narrow ? 'w-[76px]' : 'w-[260px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="relative mb-7 min-h-[78px]">
        {narrow ? <a href="#/home" title="Trang chủ" aria-label="2G2BT · Trang chủ" onClick={closeMobile} className="mt-1 flex justify-center"><BrandBadge /></a> : <div className="pr-8"><Brand href="#/home" onClick={closeMobile} /></div>}
        <button type="button" className={`startup-collapse-button absolute hidden h-7 w-7 place-items-center rounded-lg border lg:grid ${narrow ? 'left-1/2 top-11 -translate-x-1/2' : 'right-0 top-2'}`} aria-label={narrow ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} aria-expanded={!narrow} onClick={() => setCollapsed(value => !value)}>{narrow ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
        <button type="button" className="startup-mobile-close absolute right-0 top-2 grid h-7 w-7 place-items-center rounded-lg border lg:hidden" aria-label="Đóng thanh điều hướng" onClick={closeMobile}><X size={16} /></button>
      </div>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {!narrow && <p className="startup-nav-heading mb-2 px-3 text-[10px] font-bold tracking-[.19em]">KHÔNG GIAN LÀM VIỆC</p>}
        {primary.map(item)}
        {showCases && item({ href: '#/cases', page: 'cases', label: 'Case & kết nối', Icon: BriefcaseBusiness })}
      </nav>
      <div className="startup-nav-divider my-5 h-px" />
      <nav aria-label="Dịch vụ" className="flex flex-col gap-1">
        <button type="button" title={narrow ? 'AI Agent' : undefined} aria-label="AI Agent" aria-haspopup="dialog" onClick={() => { closeMobile(); onOpenAgent(); }} className={linkClass(false)}><Bot size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />{!narrow && <span>AI Agent</span>}</button>
        {item({ href: '#/pricing', page: 'pricing', label: pricingLabel, Icon: Wallet })}
      </nav>
      <div className="mt-auto pt-5">
        <div className="startup-nav-divider mb-4 h-px" />
        <div className={`flex items-center gap-3 ${narrow ? 'justify-center' : 'px-2'}`}>
          <span className="startup-account-avatar grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold">ST</span>
          {!narrow && <span className="startup-account-copy min-w-0"><strong className="block truncate text-xs">{accountName}</strong><small className="mt-1 block truncate text-[10px]">{planName}</small></span>}
        </div>
      </div>
    </aside>
  </>;
}
