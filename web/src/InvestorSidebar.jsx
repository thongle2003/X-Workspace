import React, { useEffect, useState } from 'react';
import {
  ChartNoAxesColumnIncreasing, ChevronDown, ChevronLeft, ChevronRight,
  BriefcaseBusiness, CircleHelp, Crown, Layers, LayoutDashboard, MessageSquare, Rocket, X,
} from 'lucide-react';
import { Brand, BrandBadge } from './Brand.jsx';

const workspaceRoutes = new Set(['workspace', 'due-diligence', 'portfolio', 'collaboration', 'documents']);
const workspaceItems = [
  { label: 'Dự án đang theo dõi', href: '#/workspace', page: 'workspace' },
  { label: 'Thẩm định (Due Diligence)', href: '#/due-diligence', page: 'due-diligence' },
  { label: 'Quản lý danh mục', href: '#/portfolio', page: 'portfolio' },
  { label: 'Hợp tác & Giao dịch', href: '#/collaboration', page: 'collaboration' },
  { label: 'Tài liệu & Báo cáo', href: '#/documents', page: 'documents' },
];
const planItems = [
  { label: 'So sánh gói', href: '#/pricing/compare', id: 'compare' },
  { label: 'Nâng cấp tài khoản', href: '#/pricing/upgrade', id: 'upgrade' },
  { label: 'Quyền lợi & giới hạn', href: '#/pricing/limits', id: 'limits' },
];

export function useInvestorSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('2g2bt-investor-sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('2g2bt-investor-sidebar-collapsed', String(collapsed)); }
    catch { /* Layout still works when storage is unavailable. */ }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

function NavLink({ href, label, icon: Icon, active, collapsed, onNavigate, child = false, badge }) {
  return <a href={href} title={collapsed ? label : undefined} aria-label={label} aria-current={active ? 'page' : undefined}
    onClick={onNavigate} className={`investor-nav-link ${child ? 'investor-nav-child' : ''} ${active ? 'is-active' : ''}`}>
    {Icon && <Icon size={18} strokeWidth={1.8} aria-hidden="true" />}
    {child && <span className="investor-submenu-dot" aria-hidden="true" />}
    <span className="investor-nav-label">{label}</span>
    {badge && <span className="investor-nav-badge">{badge}</span>}
  </a>;
}

export function InvestorSidebar({ route, mobileOpen, setMobileOpen, collapsed, setCollapsed, planName, accountName, showCases = false }) {
  const [workspaceOpen, setWorkspaceOpen] = useState(() => workspaceRoutes.has(route.page));
  const [plansOpen, setPlansOpen] = useState(() => route.page === 'pricing');
  useEffect(() => { if (workspaceRoutes.has(route.page)) setWorkspaceOpen(true); }, [route.page]);
  useEffect(() => { if (route.page === 'pricing') setPlansOpen(true); }, [route.page]);
  const closeMobile = () => setMobileOpen(false);
  const toggleGroup = (group) => {
    if (collapsed) setCollapsed(false);
    if (group === 'workspace') setWorkspaceOpen(current => !current || collapsed);
    else setPlansOpen(current => !current || collapsed);
  };
  return <>
    {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={closeMobile} aria-label="Đóng menu" />}
    <aside aria-label="Điều hướng Nhà đầu tư" className={`investor-sidebar fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col overflow-y-auto px-3 py-5 transition-transform lg:translate-x-0 ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="investor-sidebar-header">
        <div className="investor-brand-full"><Brand href="#/conversations" label="2GOOD2BETRUE · AI Chat" onClick={closeMobile} /><p>Investor × Startup Platform</p></div>
        <a className="investor-brand-compact" href="#/conversations" title="2G2BT · AI Chat" aria-label="2G2BT · AI Chat" onClick={closeMobile}><BrandBadge /></a>
        <button type="button" className="investor-collapse-button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} aria-expanded={!collapsed} title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
        <button type="button" className="investor-mobile-close" onClick={closeMobile} aria-label="Đóng thanh điều hướng" title="Đóng thanh điều hướng"><X size={17} /></button>
      </div>

      <nav aria-label="Điều hướng chính" className="investor-primary-nav">
        <p className="investor-nav-heading">KHÔNG GIAN LÀM VIỆC</p>
        <NavLink href="#/conversations" label="AI Chat" icon={MessageSquare} active={route.page === 'conversations'} collapsed={collapsed} onNavigate={closeMobile} />
        <NavLink href="#/dashboard" label="Dashboard đầu tư" icon={LayoutDashboard} active={route.page === 'dashboard'} collapsed={collapsed} onNavigate={closeMobile} />
        <NavLink href="#/analysis" label="Phân tích tài chính" icon={ChartNoAxesColumnIncreasing} active={route.page === 'analysis'} collapsed={collapsed} onNavigate={closeMobile} />
        <NavLink href="#/marketplace" label="Startup & Cơ hội đầu tư" icon={Rocket} active={route.page === 'marketplace' || route.page === 'startup'} collapsed={collapsed} onNavigate={closeMobile} />
        {showCases && <NavLink href="#/cases" label="Xếp hạng" icon={BriefcaseBusiness} active={route.page === 'cases'} collapsed={collapsed} onNavigate={closeMobile} />}

        <button type="button" className={`investor-nav-link investor-group-button ${workspaceRoutes.has(route.page) ? 'is-group-active' : ''}`} onClick={() => toggleGroup('workspace')} aria-expanded={workspaceOpen} aria-controls="investor-workspace-links" title={collapsed ? 'Workspace (Investor)' : undefined}>
          <Layers size={18} strokeWidth={1.8} aria-hidden="true" /><span className="investor-nav-label">Workspace (Investor)</span><ChevronDown size={15} className={`investor-group-chevron ${workspaceOpen ? 'is-open' : ''}`} aria-hidden="true" />
        </button>
        {workspaceOpen && <div id="investor-workspace-links" className="investor-submenu">{workspaceItems.map(item => <NavLink key={item.page} {...item} active={route.page === item.page} collapsed={collapsed} onNavigate={closeMobile} child />)}</div>}
      </nav>

      <div className="investor-nav-divider" />
      <nav aria-label="Dịch vụ" className="investor-secondary-nav">
        <button type="button" className={`investor-nav-link investor-group-button ${route.page === 'pricing' ? 'is-group-active' : ''}`} onClick={() => toggleGroup('plans')} aria-expanded={plansOpen} aria-controls="investor-plan-links" title={collapsed ? 'Gói dịch vụ' : undefined}>
          <Crown size={18} strokeWidth={1.8} aria-hidden="true" /><span className="investor-nav-label">Gói dịch vụ</span><span className="investor-plan-tier">{planName}</span><ChevronDown size={15} className={`investor-group-chevron ${plansOpen ? 'is-open' : ''}`} aria-hidden="true" />
        </button>
        {plansOpen && <div id="investor-plan-links" className="investor-submenu">{planItems.map(item => <NavLink key={item.id} {...item} active={route.page === 'pricing' && route.id === item.id} collapsed={collapsed} onNavigate={closeMobile} child />)}</div>}
      </nav>

      <div className="investor-sidebar-footer">
        <div className="investor-nav-divider" />
        <NavLink href="#/support" label="Trợ giúp & Hỗ trợ" icon={CircleHelp} active={route.page === 'support'} collapsed={collapsed} onNavigate={closeMobile} />
        <div className="investor-account"><span className="investor-account-avatar">NĐ</span><span className="investor-account-copy"><strong>{accountName}</strong><small>{planName}</small></span></div>
      </div>
    </aside>
  </>;
}
