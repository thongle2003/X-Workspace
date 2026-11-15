import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bot, BriefcaseBusiness, Check, ChevronRight, Clock3, CreditCard, FileText, Flag, Handshake, LayoutDashboard, LockKeyhole, LogOut, Menu, RefreshCw, Search, Server, ShieldCheck, Trash2, TrendingUp, Users, X } from 'lucide-react';
import { periodRevenue, revenueBuckets, revenueDays, revenueEvents, revenuePanelIsDown } from './adminRevenue.js';
import './admin.css';

const TOKEN_KEY = '2g2bt-admin-session';
const tabs = [
  { id:'overview', label:'Tổng quan', icon:LayoutDashboard },
  { id:'startup', label:'Startup', icon:BriefcaseBusiness },
  { id:'finance', label:'Tài chính', icon:BarChart3 },
  { id:'connections', label:'Kết nối', icon:Handshake },
  { id:'accounts', label:'Tài khoản', icon:Users },
  { id:'services', label:'API & AI', icon:Activity },
];
const groupOf = tab => ['cases','workspaces'].includes(tab) ? 'startup' : ['revenue','investments'].includes(tab) ? 'finance' : tab;
const defaultPage = group => group === 'startup' ? 'workspaces' : group === 'finance' ? 'revenue' : group;
const sectionTabs = {
  startup:[['workspaces','Dự án'],['cases','Case']],
  finance:[['revenue','Doanh thu'],['investments','Đầu tư']],
};
const statusText = {
  active:'Hoạt động', suspended:'Tạm khóa', draft:'Bản nháp', awaiting_payment:'Chờ thanh toán', awaiting_mentor:'Chờ giao mentor', in_review:'Mentor đang xử lý', ready_to_publish:'Chờ công bố', published:'Đã công bố', private:'Riêng tư', rejected:'Từ chối', requested:'Mới gửi', accepted:'Đã chấp thuận', connected:'Đã kết nối', demo_connected:'Đã mở quyền demo', declined:'Từ chối', revoked:'Đã thu hồi', pending:'Chờ thanh toán', paid:'Đã thanh toán', refunded:'Đã hoàn tiền', flagged:'Cần rà soát',
};
const typeText = { investor_plan:'Gói Investor', listing:'Niêm yết Startup', connection:'Phí kết nối' };
const roleText = { startup:'Startup', investor:'Investor', mentor:'Mentor' };
const accountPermissionText={workspaces:'Quản lý dự án',cases:'Quản lý case',connections:'Kết nối và trao đổi',investments:'Danh mục đầu tư',aiAnalysis:'Phân tích AI',aiChat:'AI Agent'};
const money = value => new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND', maximumFractionDigits:0 }).format(value || 0);
const shortMoney = value => { const sign=value<0?'-':'';const absolute=Math.abs(value);return sign+(absolute>=1_000_000?`${(absolute/1_000_000).toFixed(1).replace('.0','')} tr`:absolute>=1_000?`${Math.round(absolute/1_000)}k`:String(absolute||0)); };
const date = value => value ? new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(value)) : '—';
const dateTime = value => value ? new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value)) : '—';
const since = (value, days) => days === 'all' || new Date(value).getTime() >= Date.now() - Number(days) * 86_400_000;
const statusClass = value => ['paid','published','connected','active','demo_connected'].includes(value) ? 'good' : ['rejected','declined','revoked','suspended','refunded','flagged'].includes(value) ? 'bad' : 'wait';
const routeRecord = () => new URLSearchParams(location.hash.split('?')[1]||'').get('record');
const routeTab = () => {
  const page=location.hash.replace('#/admin/','').split('?')[0];
  return ['overview','workspaces','cases','revenue','investments','connections','accounts','services'].includes(page) ? page : defaultPage(page==='startup'||page==='finance'?page:'overview');
};

function Badge({ value }) { return <span className={`adm-badge ${statusClass(value)}`}><span className="adm-badge-dot" />{statusText[value] || value}</span>; }
function Blank({ text='Không có dữ liệu phù hợp bộ lọc.' }) { return <div className="adm-blank">{text}</div>; }
function Panel({ title, subtitle, action, children, className='' }) { return <section className={`adm-panel ${className}`}><div className="adm-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function Metric({ label, value, hint, icon:Icon, tone='blue', onClick, negative=false }) { const content=<><div className="adm-metric-top"><span>{label}</span><span className={`adm-icon ${tone}`}><Icon size={18}/></span></div><strong>{value}</strong><small>{hint}</small></>; const className=`adm-metric ${negative?'adm-metric-negative':''}`;return onClick ? <button type="button" className={`${className} adm-metric-button`} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>; }

function RevenueChart({ transactions, period }) {
  const width = 700, height = 230, padX = 48, padY = 20, plotHeight = 160;
  const points=revenueBuckets(transactions,period);
  const highest=Math.max(0,...points.map(point=>point.value));
  const bottom=Math.min(0,...points.map(point=>point.value));
  const top=highest===bottom?1:highest;
  const y=value=>padY+(top-value)/(top-bottom)*plotHeight;
  const zeroY=y(0);
  const coords=points.map((point,index)=>({...point,x:padX+index*(width-2*padX)/(points.length-1),y:y(point.value)}));
  const segments=coords.slice(1).flatMap((end,index)=>{
    const start=coords[index];
    const crossing=start.value*end.value<0;
    const fraction=crossing?-start.value/(end.value-start.value):0;
    const middle=crossing?{x:start.x+(end.x-start.x)*fraction,y:zeroY,value:0}:null;
    const parts=crossing?[[start,middle],[middle,end]]:[[start,end]];
    return parts.map(([a,b],part)=>({key:`${index}-${part}`,a,b,negative:a.value+b.value<0}));
  });
  const ticks=[top,0,bottom].filter((value,index,array)=>array.indexOf(value)===index);
  return <div className="adm-chart-wrap"><svg className="adm-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Biểu đồ doanh thu thuần ${period === 'all' ? 'toàn bộ dữ liệu' : period === '365' ? '1 năm' : period === '30' ? '1 tháng' : '1 tuần'}; đoạn tăng màu xanh, đoạn giảm màu đỏ`}>
    {ticks.map((value,index)=><g key={index}><line x1={padX} x2={width-padX} y1={y(value)} y2={y(value)} stroke={value===0?'#c7cfda':'#e7eaf3'} strokeDasharray={value===0?undefined:'4 5'}/><text x="0" y={y(value)+4} className="adm-axis">{shortMoney(value)}</text></g>)}
    {segments.map(({key,a,b,negative})=><path key={`area-${key}`} d={`M ${a.x} ${zeroY} L ${a.x} ${a.y} L ${b.x} ${b.y} L ${b.x} ${zeroY} Z`} fill={negative?'#f5a5ad':'#9edcc5'} fillOpacity={negative?'.28':'.22'}/>)}
    {coords.slice(1).map((end,index)=>{const start=coords[index];const color=end.value>start.value?'#15996f':end.value<start.value?'#db5868':'#9aa8b7';return <path key={`line-${index}`} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"/>;})}
    {coords.map((point,index)=><g key={index}><circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke={point.value<0?'#db5868':'#15996f'} strokeWidth="3"/><text x={point.x} y={height-16} textAnchor="middle" className="adm-axis">{point.label}</text><title>{point.label}: {money(point.value)}</title></g>)}
  </svg></div>;
}

function Login({ onLogin, busy, error }) {
  const [password,setPassword]=useState('');
  return <main className="adm-login-screen"><div className="adm-login-card"><div className="adm-login-mark"><ShieldCheck size={28}/></div><div className="adm-eyebrow">2GOOD2BETRUE · ADMIN</div><h1>Đăng nhập quản trị</h1><p>Truy cập số liệu, doanh thu và hàng đợi vận hành của nền tảng.</p><form onSubmit={event => {event.preventDefault();onLogin(password);}}><label htmlFor="admin-password">Mật khẩu quản trị</label><div className="adm-password"><LockKeyhole size={18}/><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required autoFocus placeholder="Nhập mật khẩu"/></div>{error && <p className="adm-error" role="alert">{error}</p>}<button className="adm-primary adm-login-button" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Vào dashboard'}<ArrowRight size={17}/></button></form><a className="adm-back" href="/#/home">← Về ứng dụng</a></div></main>;
}

export function AdminApp() {
  const [token,setToken]=useState(()=>sessionStorage.getItem(TOKEN_KEY) || '');
  const [data,setData]=useState(null);
  const [services,setServices]=useState(null);
  const [tab,setTab]=useState(routeTab);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [period,setPeriod]=useState('365');
  const [source,setSource]=useState('all');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [selected,setSelected]=useState(routeRecord);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const account = id => data?.accounts.find(item => item.id === id);
  const caseRecord = id => data?.cases.find(item => item.id === id);
  const workspaceRecord = id => data?.workspaces?.find(item => item.id === id);

  async function api(path, options={}) {
    const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(token?{'x-admin-session':token}:{}),...options.headers}});
    const payload=await response.json().catch(()=>({message:'Không đọc được phản hồi máy chủ.'}));
    if(!response.ok){if(response.status===401 && path!=='/api/admin/session'){sessionStorage.removeItem(TOKEN_KEY);setToken('');setData(null);}const cause=new Error(payload.message||'Yêu cầu không thành công.');cause.status=response.status;throw cause;}
    return payload;
  }
  async function refresh(){setError('');try{setData(await api('/api/admin/dashboard'));}catch(cause){setError(cause.message);}}
  async function refreshServices(){setError('');try{setServices(await api('/api/admin/services'));}catch(cause){setError(cause.message);}}
  useEffect(()=>{const onHash=()=>{setTab(routeTab());setSearch('');setFilter('all');setSelected(routeRecord());setConfirmDelete(false);setMobileOpen(false);};window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
  useEffect(()=>{if(!token)return;refresh();const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[token]);
  useEffect(()=>{if(!token||tab!=='services')return;refreshServices();const timer=setInterval(refreshServices,10000);return()=>clearInterval(timer);},[token,tab]);
  useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(timeout);},[notice]);
  async function login(password){setBusy(true);setError('');try{const response=await fetch('/api/admin/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});const payload=await response.json();if(!response.ok)throw new Error(payload.message||'Đăng nhập thất bại.');sessionStorage.setItem(TOKEN_KEY,payload.sessionToken);setToken(payload.sessionToken);}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  async function logout(){try{await api('/api/admin/session',{method:'DELETE'});}catch{/* A local session can already be expired. */}sessionStorage.removeItem(TOKEN_KEY);setToken('');setData(null);}
  async function manageCase(item,operation){setBusy(true);setError('');try{const deleting=operation==='delete';const updated=await api(`/api/admin/cases/${encodeURIComponent(item.id)}`,{method:deleting?'DELETE':'PATCH',body:JSON.stringify({expectedRevision:data.revision,...(deleting?{}:{flagged:operation==='flag'})})});setData(updated);setNotice(deleting?'Đã xóa case khỏi Startup.':operation==='flag'?'Đã đánh dấu case cần rà soát.':'Đã bỏ đánh dấu case.');setConfirmDelete(false);if(deleting)setSelected(null);}catch(cause){if(cause.status===409)try{setData(await api('/api/admin/dashboard'));}catch{/* Keep the original action error. */}setError(cause.message);}finally{setBusy(false);}}
  async function manageWorkspace(item,operation){setBusy(true);setError('');try{const deleting=operation==='delete';const updated=await api(`/api/admin/workspaces/${encodeURIComponent(item.id)}`,{method:deleting?'DELETE':'PATCH',body:JSON.stringify({expectedRevision:data.revision,...(deleting?{}:{flagged:operation==='flag'})})});setData(updated);setNotice(deleting?'Đã xóa dự án khỏi Startup và Marketplace.':operation==='flag'?'Đã đánh dấu dự án cần rà soát.':'Đã bỏ đánh dấu dự án.');setConfirmDelete(false);if(deleting)setSelected(null);}catch(cause){if(cause.status===409)try{setData(await api('/api/admin/dashboard'));}catch{/* Keep the original action error. */}setError(cause.message);}finally{setBusy(false);}}
  async function manageAccount(item,changes){setBusy(true);setError('');try{const updated=await api(`/api/admin/accounts/${encodeURIComponent(item.id)}`,{method:'PATCH',body:JSON.stringify({expectedRevision:data.revision,...changes})});setData(updated);setNotice(changes.status==='suspended'?'Đã tạm khóa tài khoản.':changes.status==='active'?'Đã mở lại tài khoản.':changes.permissions?'Đã cập nhật quyền tính năng.':changes.tier?'Đã cập nhật gói tài khoản.':'Đã cập nhật hồ sơ tài khoản.');}catch(cause){if(cause.status===409)try{setData(await api('/api/admin/dashboard'));}catch{/* Keep the original action error. */}setError(cause.message);}finally{setBusy(false);}}
  function go(id){const page=defaultPage(id);location.hash=`/admin/${page}`;setTab(page);setSearch('');setFilter('all');setSelected(null);setConfirmDelete(false);setMobileOpen(false);}
  function goRecord(page,id){location.hash=`/admin/${page}?record=${encodeURIComponent(id)}`;setTab(page);setSelected(id);setConfirmDelete(false);}
  const group=groupOf(tab);

  const paid = useMemo(()=>data?.transactions.filter(item=>item.status==='paid'&&item.paidAt&&since(item.paidAt,period))||[],[data,period]);
  const visiblePaid = paid.filter(item=>source==='all'||item.type===source);
  const total = periodRevenue(data?.transactions||[],period,Date.now(),source);
  const periodStart = Date.now()-revenueDays(period)*86_400_000;
  const refunds = revenueEvents(data?.transactions||[]).filter(item=>item.amount<0&&new Date(item.at).getTime()>=periodStart&&(source==='all'||item.type===source));
  const refundTotal = -refunds.reduce((sum,item)=>sum+item.amount,0);
  const overviewRevenue = periodRevenue(data?.transactions||[],'all');
  const filteredRevenueTransactions = data?.transactions.filter(item=>source==='all'||item.type===source)||[];
  const revenuePanelDown = data ? revenuePanelIsDown(filteredRevenueTransactions,period) : false;
  const pending = data?.transactions.filter(item=>item.status==='pending')||[];
  const queue = data?.cases.filter(item=>item.flagged||['awaiting_payment','awaiting_mentor','ready_to_publish'].includes(item.status))||[];
  const activity = [
    ...(data?.workspaces||[]).map(item=>({id:`workspace-${item.id}`,at:item.createdAt,title:item.name,detail:'Dự án Startup',page:'workspaces',icon:BriefcaseBusiness})),
    ...(data?.cases||[]).map(item=>({id:`case-${item.id}`,at:item.submittedAt||item.createdAt,title:item.title,detail:'Case Startup',page:'cases',icon:FileText})),
    ...(data?.connections||[]).map(item=>({id:`connection-${item.id}`,at:item.createdAt,title:workspaceRecord(item.workspaceId)?.name||caseRecord(item.caseId)?.title||item.id,detail:'Yêu cầu kết nối',page:'connections',icon:Handshake})),
    ...(data?.investments||[]).map(item=>({id:`investment-${item.id}`,at:item.createdAt,title:item.startupName,detail:'Investor ghi nhận đầu tư',page:'investments',icon:TrendingUp})),
  ].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,6);
  const searchMatch = (...values) => values.some(value=>String(value||'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const transactions = (data?.transactions||[]).filter(item=>(source==='all'||item.type===source)&&(filter==='all'||item.status===filter)&&since(item.status==='refunded'?item.refundedAt||item.createdAt:item.status==='paid'?item.paidAt:item.createdAt,period)&&searchMatch(item.id,account(item.accountId)?.name,item.reference,typeText[item.type])).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const cases = (data?.cases||[]).filter(item=>(filter==='all'||filter==='flagged'&&item.flagged||item.status===filter)&&searchMatch(item.id,item.title,account(item.startupId)?.name)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const workspaces = (data?.workspaces||[]).filter(item=>(filter==='all'||filter==='flagged'&&item.flagged||filter==='published'&&item.published||filter==='private'&&!item.published)&&searchMatch(item.id,item.name,item.industry)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const connections = (data?.connections||[]).filter(item=>(filter==='all'||item.status===filter)&&searchMatch(item.id,caseRecord(item.caseId)?.title,workspaceRecord(item.workspaceId)?.name,account(item.investorId)?.name));
  const investments = (data?.investments||[]).filter(item=>searchMatch(item.id,item.startupName,account(item.investorId)?.name)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const accounts = (data?.accounts||[]).filter(item=>(filter==='all'||item.role===filter||item.status===filter)&&searchMatch(item.name,item.email,item.id));
  const selectedCase = tab==='cases' ? caseRecord(selected) : null;
  const selectedWorkspace = tab==='workspaces' ? data?.workspaces?.find(item=>item.id===selected) : null;
  const selectedConnection = tab==='connections' ? data?.connections.find(item=>item.id===selected) : null;
  const selectedAccount = tab==='accounts' ? account(selected) : null;
  const connectionPayments = selectedConnection ? data.transactions.filter(item=>item.connectionId===selectedConnection.id) : [];

  if(!token)return <Login onLogin={login} busy={busy} error={error}/>;
  return <div className="adm-root"><aside className={`adm-sidebar ${mobileOpen?'open':''}`}><div className="adm-brand"><span className="adm-brand-mark">2G</span><span><strong>2GOOD2BETRUE</strong><small>ADMIN WORKSPACE</small></span><button className="adm-mobile-close" aria-label="Đóng menu" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div><div className="adm-nav-title">ĐIỀU HÀNH</div><nav aria-label="Quản trị">{tabs.map(({id,label,icon:Icon})=><button key={id} className={`adm-nav-item ${group===id?'active':''}`} onClick={()=>go(id)}><Icon size={19}/><span>{label}</span>{group===id&&<ChevronRight size={15} className="adm-nav-chevron"/>}</button>)}</nav><div className="adm-sidebar-bottom"><div className="adm-sample-small"><span className="adm-sample-dot adm-service-dot"/>Dữ liệu ứng dụng · đồng bộ</div><button className="adm-logout" onClick={logout}><LogOut size={18}/>Đăng xuất</button></div></aside>{mobileOpen&&<button className="adm-overlay" aria-label="Đóng menu" onClick={()=>setMobileOpen(false)}/>}
    <div className="adm-main"><header className="adm-topbar"><button className="adm-menu" aria-label="Mở menu" onClick={()=>setMobileOpen(true)}><Menu size={22}/></button><div className="adm-breadcrumb">Quản trị <ChevronRight size={14}/> <strong>{tabs.find(item=>item.id===group)?.label}</strong></div><div className="adm-top-actions"><span className="adm-admin-pill"><ShieldCheck size={16}/> Quản trị viên</span><button className="adm-icon-button" aria-label="Làm mới dữ liệu" title="Làm mới dữ liệu" onClick={tab==='services'?refreshServices:refresh}><RefreshCw size={18}/></button></div></header>
    <main className="adm-content"><div className="adm-page-intro"><div><div className="adm-eyebrow">BẢNG ĐIỀU KHIỂN</div><h1>{tabs.find(item=>item.id===group)?.label}</h1><p>{group==='overview'?'Tình hình nền tảng và các việc cần theo dõi.':group==='startup'?'Workspace và case đang có trong Startup.':group==='finance'?'Phí nền tảng và danh mục đầu tư được theo dõi riêng.':group==='connections'?'Yêu cầu truy cập và phí kết nối giữa hai bên.':group==='services'?'Tình trạng API, nhà cung cấp AI và các tác vụ đang chạy.':'Tài khoản và vai trò trên nền tảng.'}</p></div><div className="adm-intro-actions"><span className="adm-service-source">Dữ liệu ứng dụng</span><span className="adm-updated">{group==='services'?'Kiểm tra':'Đồng bộ'} {dateTime(group==='services'?services?.sampledAt:data?.updatedAt)}</span></div></div>
      {sectionTabs[group]&&<div className="adm-section-tabs" role="tablist" aria-label={`Mục ${tabs.find(item=>item.id===group)?.label}`}>{sectionTabs[group].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>go(id)}>{label}</button>)}</div>}
      {group==='overview'&&<div className="adm-sample-banner adm-live-banner"><span className="adm-sample-dot"/><div><strong>Dữ liệu từ Startup / Investor</strong><span>Workspace, case, yêu cầu, khoản đầu tư và biên nhận được đọc trực tiếp từ ứng dụng dùng API máy chủ. Bản ?mode=demo lưu riêng trong trình duyệt. Khoản chờ không tính vào doanh thu.</span></div></div>}
      {error&&<div className="adm-error-banner" role="alert">{error}<button onClick={()=>setError('')} aria-label="Đóng lỗi"><X size={16}/></button></div>}
      {!data?<div className="adm-loading">Đang tải dữ liệu quản trị…</div>:<>
      {tab==='overview'&&<>
        <div className="adm-metrics">
          <Metric label="Doanh thu thuần" value={money(overviewRevenue)} hint="Biên nhận đã xác nhận · toàn bộ" icon={CreditCard} tone={overviewRevenue<0?'rose':'green'} negative={overviewRevenue<0} onClick={()=>go('revenue')}/>
          <Metric label="Khoản chờ" value={pending.length} hint={money(pending.reduce((sum,item)=>sum+item.amount,0))} icon={Clock3} tone="amber" onClick={()=>go('revenue')}/>
          <Metric label="Case cần xử lý" value={queue.length} hint="Flag · thanh toán · công bố" icon={FileText} tone="violet" onClick={()=>go('cases')}/>
          <Metric label="Yêu cầu kết nối mới" value={data.connections.filter(item=>item.status==='requested').length} hint="Đang chờ Startup phản hồi" icon={Handshake} tone="green" onClick={()=>go('connections')}/>
          <Metric label="Dự án Startup" value={data.workspaces?.length||0} hint="Hồ sơ trên máy chủ" icon={BriefcaseBusiness} tone="blue" onClick={()=>go('workspaces')}/>
        </div>
        <div className="adm-grid-two">
          <Panel title="Việc cần theo dõi" subtitle="Case, kết nối và khoản phí còn chờ">
            <div className="adm-activity">
              {queue.slice(0,4).map(item=><button key={item.id} onClick={()=>go('cases')}><span className="adm-activity-icon"><FileText size={18}/></span><span><strong>{item.title}</strong><small>Case · {date(item.updatedAt)}</small></span><Badge value={item.status}/></button>)}
              {data.connections.filter(item=>item.status==='requested').slice(0,4).map(item=><button key={item.id} onClick={()=>go('connections')}><span className="adm-activity-icon"><Handshake size={18}/></span><span><strong>{workspaceRecord(item.workspaceId)?.name||caseRecord(item.caseId)?.title||item.id}</strong><small>Yêu cầu kết nối · {date(item.createdAt)}</small></span><Badge value={item.status}/></button>)}
              {pending.slice(0,4).map(item=><button key={item.id} onClick={()=>go('revenue')}><span className="adm-activity-icon"><CreditCard size={18}/></span><span><strong>{typeText[item.type]} · {account(item.accountId)?.name||item.id}</strong><small>{money(item.amount)} · {date(item.createdAt)}</small></span><Badge value={item.status}/></button>)}
              {!queue.length&&!pending.length&&!data.connections.some(item=>item.status==='requested')&&<Blank text="Không có việc nào đang chờ."/>}
            </div>
          </Panel>
          <Panel title="Hoạt động mới" subtitle="Workspace, case, kết nối và khoản đầu tư">
            <div className="adm-activity">
              {activity.map(item=><button key={item.id} onClick={()=>go(item.page)}><span className="adm-activity-icon"><item.icon size={18}/></span><span><strong>{item.title}</strong><small>{item.detail} · {date(item.at)}</small></span><ArrowRight size={15}/></button>)}
              {!activity.length&&<Blank text="Chưa có hoạt động nào."/>}
            </div>
          </Panel>
        </div>
      </>}
      {tab==='revenue'&&<>
        <div className="adm-toolbar"><Period value={period} onChange={setPeriod}/><select aria-label="Nguồn doanh thu" value={source} onChange={event=>setSource(event.target.value)}><option value="all">Tất cả nguồn thu</option>{Object.entries(typeText).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
        <div className="adm-metrics three"><Metric label="Doanh thu thuần" value={money(total)} hint={`${visiblePaid.length} giao dịch đã thu trong kỳ`} icon={total<0?ArrowDownRight:ArrowUpRight} tone={total<0?'rose':'green'} negative={total<0}/><Metric label="Đang chờ" value={money(pending.filter(item=>source==='all'||item.type===source).reduce((sum,item)=>sum+item.amount,0))} hint="Chưa tính vào doanh thu" icon={Clock3} tone="amber"/><Metric label="Đã hoàn tiền" value={money(refundTotal)} hint="Đã trừ khỏi doanh thu thuần" icon={ArrowDownRight} tone="violet"/></div>
        <Panel title="Biểu đồ doanh thu" subtitle="Theo ngày thanh toán và ngày hoàn tiền" className={revenuePanelDown?'adm-panel-trend-down':''}><RevenueChart transactions={filteredRevenueTransactions} period={period}/></Panel>
        <Panel title="Danh sách giao dịch" subtitle={`${transactions.length} giao dịch phù hợp bộ lọc`} className="adm-table-panel"><div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm mã, tài khoản, đối soát…"/><select aria-label="Lọc trạng thái" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="paid">Đã thanh toán</option><option value="pending">Chờ thanh toán</option><option value="refunded">Đã hoàn tiền</option></select></div><div className="adm-table-wrap"><table><thead><tr><th>Mã / ngày</th><th>Khoản thu</th><th>Tài khoản</th><th>Số tiền</th><th>Trạng thái</th><th>Đối soát</th></tr></thead><tbody>{transactions.map(item=><tr key={item.id}><td><strong>{item.id}</strong><small>{date(item.status==='refunded'?item.refundedAt||item.createdAt:item.status==='paid'?item.paidAt:item.createdAt)}</small></td><td>{typeText[item.type]}</td><td>{account(item.accountId)?.name}</td><td className="adm-amount">{money(item.amount)}</td><td><Badge value={item.status}/></td><td><span className="adm-reference">{item.reference||(item.status==='pending'?'Chưa mở thanh toán':'—')}</span></td></tr>)}</tbody></table>{!transactions.length&&<Blank/>}</div></Panel>
      </>}
      {tab==='cases'&&<Panel title="Danh sách case" subtitle={`${cases.length} case phù hợp bộ lọc`} className="adm-table-panel"><div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm case hoặc Startup…"/><select aria-label="Lọc trạng thái case" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="flagged">Cần rà soát</option><option value="draft">Bản nháp</option><option value="awaiting_payment">Chờ thanh toán</option></select></div><div className="adm-table-wrap"><table><thead><tr><th>Case</th><th>Startup</th><th>Cập nhật</th><th>Trạng thái</th><th>Rà soát</th><th></th></tr></thead><tbody>{cases.map(item=><tr key={item.id}><td><strong>{item.title}</strong><small>{item.id}</small></td><td>{workspaceRecord(item.workspaceId)?.name||account(item.startupId)?.name}</td><td>{date(item.updatedAt)}</td><td><Badge value={item.status}/></td><td>{item.flagged?<Badge value="flagged"/>:'—'}</td><td><button className="adm-row-open" aria-label={`Mở ${item.title}`} onClick={()=>{setSelected(item.id);setConfirmDelete(false);}}><ChevronRight size={18}/></button></td></tr>)}</tbody></table>{!cases.length&&<Blank text="Startup chưa có case phù hợp bộ lọc."/>}</div></Panel>}
      {tab==='workspaces'&&<WorkspacesPanel items={workspaces} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onSelect={setSelected} data={data}/>}
      {tab==='investments'&&<Panel title="Khoản đầu tư đã ghi nhận" subtitle={`${investments.length} khoản trong danh mục Investor · số liệu do Investor tự nhập, không tính vào doanh thu nền tảng`} className="adm-table-panel"><div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm Startup hoặc Investor…"/></div><div className="adm-table-wrap"><table><thead><tr><th>Startup</th><th>Investor</th><th>Vốn đầu tư</th><th>Sở hữu</th><th>Ngày đầu tư</th><th>Mã khoản đầu tư</th></tr></thead><tbody>{investments.map(item=><tr key={item.id}><td><strong>{item.startupName||workspaceRecord(item.workspaceId)?.name}</strong></td><td>{account(item.investorId)?.name||item.investorId}</td><td className="adm-amount">{money(item.investedMillionVnd*1_000_000)}</td><td>{item.ownership}%</td><td>{date(item.date)}</td><td><small>{item.id}</small></td></tr>)}</tbody></table>{!investments.length&&<Blank text={'Chưa có khoản đầu tư nào được Investor ghi nhận.'}/>}</div></Panel>}
      {tab==='connections'&&<Panel title="Yêu cầu kết nối" subtitle={`${connections.length} yêu cầu phù hợp bộ lọc`} className="adm-table-panel"><div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm workspace hoặc Investor…"/><select aria-label="Lọc trạng thái kết nối" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option>{['requested','accepted','awaiting_payment','connected','demo_connected','declined','revoked'].map(value=><option key={value} value={value}>{statusText[value]}</option>)}</select></div><div className="adm-table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Workspace / Case</th><th>Investor</th><th>Ngày gửi</th><th>Trạng thái</th><th></th></tr></thead><tbody>{connections.map(item=><tr key={item.id}><td><strong>{item.id}</strong></td><td>{caseRecord(item.caseId)?.title||workspaceRecord(item.workspaceId)?.name||'—'}</td><td>{account(item.investorId)?.name}</td><td>{date(item.createdAt)}</td><td><Badge value={item.status}/></td><td><button className="adm-row-open" aria-label={`Mở ${item.id}`} onClick={()=>setSelected(item.id)}><ChevronRight size={18}/></button></td></tr>)}</tbody></table>{!connections.length&&<Blank/>}</div></Panel>}
      {tab==='accounts'&&<Panel title="Danh sách tài khoản" subtitle={`${accounts.length} tài khoản phù hợp bộ lọc`} className="adm-table-panel"><div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm tên hoặc email…"/><select aria-label="Lọc tài khoản" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả tài khoản</option><option value="startup">Startup</option><option value="investor">Investor</option><option value="suspended">Tạm khóa</option></select></div><div className="adm-table-wrap"><table><thead><tr><th>Tên / email</th><th>Vai trò</th><th>Gói</th><th>Trạng thái</th><th></th></tr></thead><tbody>{accounts.map(item=><tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td>{roleText[item.role]}</td><td>{item.tier?.toUpperCase()}</td><td><Badge value={item.status}/></td><td><button className="adm-row-open" aria-label={`Mở ${item.name}`} onClick={()=>setSelected(item.id)}><ChevronRight size={18}/></button></td></tr>)}</tbody></table>{!accounts.length&&<Blank/>}</div></Panel>}
      {tab==='services'&&(services?<ServicesPanel data={services} filter={filter} setFilter={setFilter}/>:<div className="adm-loading">Đang đọc trạng thái API và AI…</div>)}
      </>}</main></div>
       {selected&&<div className="adm-drawer-layer" onMouseDown={event=>{if(event.target===event.currentTarget){setSelected(null);setConfirmDelete(false);}}}><section className="adm-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết quản trị"><div className="adm-drawer-head"><span>CHI TIẾT</span><button onClick={()=>{setSelected(null);setConfirmDelete(false);}} aria-label="Đóng chi tiết"><X size={20}/></button></div>
      {selectedCase&&<><h2>{selectedCase.title}</h2><p>{selectedCase.id} · {workspaceRecord(selectedCase.workspaceId)?.name||account(selectedCase.startupId)?.name}</p><div className="adm-detail-card"><Detail label="Trạng thái" value={<Badge value={selectedCase.status}/>}/><Detail label="Rà soát" value={selectedCase.flagged?<Badge value="flagged"/>:'Chưa đánh dấu'}/><Detail label="Ngày tạo" value={date(selectedCase.createdAt)}/><Detail label="Cập nhật" value={dateTime(selectedCase.updatedAt)}/><Detail label="Phí niêm yết" value={data.transactions.some(item=>item.caseId===selectedCase.id&&item.type==='listing')?<Badge value={data.transactions.find(item=>item.caseId===selectedCase.id&&item.type==='listing').status}/>:'Chưa phát sinh'}/></div><p className="adm-help">Flag chỉ đánh dấu case cần admin rà soát; Startup và Investor vẫn thấy nội dung như trước.</p><div className="adm-drawer-actions"><button className="adm-action-button" disabled={busy} onClick={()=>manageCase(selectedCase,selectedCase.flagged?'unflag':'flag')}><Flag size={16}/>{selectedCase.flagged?'Bỏ flag':'Flag để rà soát'}</button><button className="adm-action-button adm-delete-trigger" disabled={busy} onClick={()=>setConfirmDelete(true)}><Trash2 size={16}/>Xóa case</button>{confirmDelete&&<div className="adm-delete-confirm" role="alert"><strong>Xóa case này khỏi Startup và admin?</strong><p>Workspace, yêu cầu kết nối và hồ sơ tài chính vẫn được giữ.</p><div><button type="button" disabled={busy} onClick={()=>manageCase(selectedCase,'delete')}>Xác nhận xóa</button><button type="button" disabled={busy} onClick={()=>setConfirmDelete(false)}>Hủy</button></div></div>}</div></>}
      {selectedWorkspace&&<><h2>{selectedWorkspace.name}</h2><p>{selectedWorkspace.id}</p><div className="adm-detail-card"><Detail label="Lĩnh vực" value={selectedWorkspace.industry||'—'}/><Detail label="Trạng thái" value={<Badge value={selectedWorkspace.published?'published':'private'}/>}/><Detail label="Rà soát" value={selectedWorkspace.flagged?<Badge value="flagged"/>:'Chưa đánh dấu'}/><Detail label="Chủ sở hữu" value={account(selectedWorkspace.ownerId)?.name}/><Detail label="Case" value={data.cases.filter(item=>item.workspaceId===selectedWorkspace.id).length}/><Detail label="Yêu cầu kết nối" value={data.connections.filter(item=>item.workspaceId===selectedWorkspace.id).length}/><Detail label="Cập nhật" value={dateTime(selectedWorkspace.updatedAt)}/></div><p className="adm-help">Flag chỉ đánh dấu để admin rà soát; dự án vẫn hiển thị trong Startup và Marketplace.</p><div className="adm-drawer-actions"><button className="adm-action-button" disabled={busy} onClick={()=>manageWorkspace(selectedWorkspace,selectedWorkspace.flagged?'unflag':'flag')}><Flag size={16}/>{selectedWorkspace.flagged?'Bỏ flag':'Flag để rà soát'}</button><button className="adm-action-button adm-delete-trigger" disabled={busy} onClick={()=>setConfirmDelete(true)}><Trash2 size={16}/>Xóa dự án</button>{confirmDelete&&<div className="adm-delete-confirm" role="alert"><strong>Xóa dự án này khỏi Startup và Marketplace?</strong><p>Dự án có case, kết nối hoặc dữ liệu hoạt động liên quan sẽ được chặn xóa để tránh mất dữ liệu ngoài ý muốn.</p><div><button type="button" disabled={busy} onClick={()=>manageWorkspace(selectedWorkspace,'delete')}>Xác nhận xóa</button><button type="button" disabled={busy} onClick={()=>setConfirmDelete(false)}>Hủy</button></div></div>}</div></>}
      {selectedConnection&&<><h2>{selectedConnection.id}</h2><p>{caseRecord(selectedConnection.caseId)?.title||workspaceRecord(selectedConnection.workspaceId)?.name}</p><div className="adm-detail-card"><Detail label="Investor" value={account(selectedConnection.investorId)?.name}/><Detail label="Startup" value={account(selectedConnection.startupId||caseRecord(selectedConnection.caseId)?.startupId)?.name}/><Detail label="Trạng thái" value={<Badge value={selectedConnection.status}/>}/><Detail label="Ngày gửi" value={date(selectedConnection.createdAt)}/></div><h3 className="adm-detail-heading">Phí kết nối hai bên</h3>{connectionPayments.length?connectionPayments.map(item=><div className="adm-payment-line" key={item.id}><span>{account(item.accountId)?.name}</span><strong>{money(item.amount)}</strong><Badge value={item.status}/></div>):<Blank text="Chưa tạo khoản phí kết nối."/>}<p className="adm-help">Quyết định kết nối thuộc Startup. Admin theo dõi trạng thái và thanh toán tại đây.</p></>}
      {selectedAccount&&<><h2>{selectedAccount.name}</h2><p>{selectedAccount.email||`Tài khoản ứng dụng · ${selectedAccount.id}`}</p><div className="adm-detail-card"><Detail label="Vai trò" value={roleText[selectedAccount.role]}/><Detail label="Trạng thái" value={<Badge value={selectedAccount.status}/>}/><Detail label="Gói" value={selectedAccount.tier?.toUpperCase()||'—'}/><Detail label="Chu kỳ" value={selectedAccount.billing==='annual'?'Hàng năm':'Hàng tháng'}/><Detail label="Mã tài khoản" value={selectedAccount.id}/></div><AccountDataSummary item={selectedAccount} data={data} onOpen={goRecord}/><AccountControls key={`${selectedAccount.id}-${selectedAccount.tier}-${selectedAccount.billing}`} item={selectedAccount} busy={busy} onSave={changes=>manageAccount(selectedAccount,changes)}/></>}
      </section></div>}{notice&&<div className="adm-toast" role="status"><Check size={17}/>{notice}</div>}
    </div>;
}

function SearchBox({value,onChange,placeholder}) { return <label className="adm-search"><Search size={18}/><input value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder}/></label>; }
function Period({value,onChange}) { return <div className="adm-period-group" role="group" aria-label="Khoảng thời gian">{[['7','1 tuần'],['30','1 tháng'],['365','1 năm'],['all','Toàn bộ']].map(([id,label])=><button key={id} type="button" className={value===id?'active':''} aria-pressed={value===id} onClick={()=>onChange(id)}>{label}</button>)}</div>; }
function Detail({label,value}) { return <div className="adm-detail-row"><span>{label}</span><strong>{value}</strong></div>; }

function WorkspacesPanel({items,search,setSearch,filter,setFilter,onSelect,data}) {
  const accountName=id=>data.accounts.find(item=>item.id===id)?.name||id;
  return <Panel title="Dự án Startup" subtitle={`${items.length} hồ sơ phù hợp bộ lọc`} className="adm-table-panel">
    <div className="adm-filters"><SearchBox value={search} onChange={setSearch} placeholder="Tìm tên hoặc lĩnh vực…"/><select aria-label="Lọc trạng thái workspace" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="flagged">Cần rà soát</option><option value="published">Đã công bố</option><option value="private">Riêng tư</option></select></div>
    <div className="adm-table-wrap"><table><thead><tr><th>Dự án</th><th>Lĩnh vực</th><th>Chủ sở hữu</th><th>Case / yêu cầu</th><th>Cập nhật</th><th>Trạng thái</th><th>Rà soát</th><th></th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong>{item.name}</strong><small>{item.id}</small></td><td>{item.industry||'—'}</td><td>{accountName(item.ownerId)}</td><td>{data.cases.filter(row=>row.workspaceId===item.id).length} / {data.connections.filter(row=>row.workspaceId===item.id).length}</td><td>{date(item.updatedAt)}</td><td><Badge value={item.published?'published':'private'}/></td><td>{item.flagged?<Badge value="flagged"/>:'—'}</td><td><button className="adm-row-open" aria-label={`Mở ${item.name}`} onClick={()=>onSelect(item.id)}><ChevronRight size={18}/></button></td></tr>)}</tbody></table>{!items.length&&<Blank text="Chưa có dự án phù hợp bộ lọc."/>}</div>
  </Panel>;
}

function AccountControls({item,busy,onSave}) {
  const [name,setName]=useState(item.name);
  const [email,setEmail]=useState(item.email||'');
  const [tier,setTier]=useState(item.tier);
  const [billing,setBilling]=useState(item.billing||'monthly');
  const permissions=item.role==='startup'?['workspaces','cases','connections','aiAnalysis','aiChat']:['connections','investments','aiAnalysis','aiChat'];
  return <div className="adm-account-controls">
    <h3 className="adm-detail-heading">Hồ sơ tài khoản</h3>
    <div className="adm-account-plan"><label>Tên hiển thị<input value={name} maxLength={100} onChange={event=>setName(event.target.value)}/></label><label>Email liên hệ<input value={email} type="email" maxLength={254} onChange={event=>setEmail(event.target.value)} placeholder="Chưa có email"/></label></div>
    <button className="adm-action-button" disabled={busy||!name.trim()||name.trim()===item.name&&email.trim()===(item.email||'')} onClick={()=>onSave({name:name.trim(),email:email.trim()})}>Lưu hồ sơ tài khoản</button>
    <h3 className="adm-detail-heading">Quản lý quyền truy cập</h3>
    <p className="adm-help">Tạm khóa sẽ chặn cả phiên hiện tại và lần đăng nhập tiếp theo. Dữ liệu của tài khoản được giữ nguyên.</p>
    <button className={`adm-action-button ${item.status==='active'?'adm-delete-trigger':''}`} disabled={busy} onClick={()=>onSave({status:item.status==='active'?'suspended':'active'})}>{item.status==='active'?'Tạm khóa tài khoản':'Mở lại tài khoản'}</button>
    <div className="adm-account-permissions">{permissions.map(key=><label key={key}><span>{accountPermissionText[key]}</span><input type="checkbox" checked={item.permissions?.[key]!==false} disabled={busy} onChange={event=>onSave({permissions:{[key]:event.target.checked}})}/></label>)}</div>
    <h3 className="adm-detail-heading">Gói và hạn mức</h3>
    <div className="adm-account-plan"><label>Gói<select value={tier} onChange={event=>setTier(event.target.value)}><option value="free">Free</option><option value="plus">Plus</option><option value="pro">Pro</option></select></label><label>Chu kỳ<select value={billing} onChange={event=>setBilling(event.target.value)}><option value="monthly">Hàng tháng</option><option value="annual">Hàng năm</option></select></label></div>
    <button className="adm-action-button" disabled={busy||tier===item.tier&&billing===item.billing} onClick={()=>onSave({tier,billing})}>Lưu gói tài khoản</button>
  </div>;
}

function AccountDataSummary({item,data,onOpen}) {
  const projects=data.workspaces.filter(row=>row.ownerId===item.id);
  const cases=data.cases.filter(row=>row.startupId===item.id);
  const connections=data.connections.filter(row=>row.startupId===item.id||row.investorId===item.id);
  const investments=data.investments.filter(row=>row.investorId===item.id);
  const transactions=data.transactions.filter(row=>row.accountId===item.id);
  const items=[['Dự án','workspaces',projects,record=>record.name],['Case','cases',cases,record=>record.title],['Kết nối','connections',connections,record=>record.id],['Đầu tư','investments',investments,record=>record.startupName],['Giao dịch','revenue',transactions,record=>record.id]];
  return <section className="adm-account-data"><h3 className="adm-detail-heading">Dữ liệu liên quan</h3>{items.map(([label,page,rows,caption])=><div key={label}><strong>{label} <span>{rows.length}</span></strong>{rows.length>0&&<div className="adm-account-related">{rows.slice(0,3).map(row=><button key={row.id} onClick={()=>onOpen(page,row.id)}>{caption(row)} <ChevronRight size={13}/></button>)}{rows.length>3&&<button onClick={()=>onOpen(page,rows[0].id)}>+{rows.length-3} mục khác <ChevronRight size={13}/></button>}</div>}</div>)}</section>;
}

const serviceStatusText={
  up:'Đang chạy',active:'Đã sử dụng',unused:'Chưa sử dụng',unverified:'Chưa kiểm chứng',
  down:'Gián đoạn',degraded:'Có lỗi gần đây',config_error:'Lỗi cấu hình',limited:'Bị giới hạn',
  unconfigured:'Chưa cấu hình',not_integrated:'Chưa tích hợp',
};
const serviceErrorText={
  AI_NETWORK:'Không kết nối được',AI_TIMEOUT:'Quá thời gian chờ',AI_PROVIDER:'Nhà cung cấp trả lỗi',
  AI_AUTH:'Khóa hoặc quyền truy cập lỗi',AI_MODEL:'Model hoặc endpoint không tồn tại',
  AI_RATE_LIMIT:'Bị giới hạn lưu lượng',AI_REQUEST:'Cấu hình yêu cầu lỗi',
};
const serviceTone=status=>['down','config_error'].includes(status)?'bad':
  ['degraded','limited','unconfigured','unverified','not_integrated','unused'].includes(status)?'wait':'good';
const eventName={workflow:'Thao tác ứng dụng',chat:'AI Agent',analysis:'Phân tích tài chính'};

function ServicesPanel({data,filter,setFilter}) {
  const attention=new Set(['down','degraded','config_error','limited','unconfigured']);
  const inactive=new Set(['unused','unverified','not_integrated']);
  const items=data.services.filter(item=>filter==='all'||filter==='attention'&&attention.has(item.status)||filter==='inactive'&&inactive.has(item.status));
  return <>
    <div className="adm-service-note"><Server size={18}/><span>{data.observation} Máy chủ khởi động {dateTime(data.serverStartedAt)}.</span></div>
    <div className="adm-service-toolbar"><strong>{data.services.length} dịch vụ và tác vụ</strong><select aria-label="Lọc trạng thái API và AI" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả</option><option value="attention">Cần chú ý</option><option value="inactive">Chưa dùng / chưa kiểm chứng</option></select></div>
    <div className="adm-service-grid">
      {items.map(item=><article className="adm-service-card" key={item.id}>
        <div className="adm-service-card-head"><span className={`adm-service-icon ${serviceTone(item.status)}`}>{item.id==='chat'?<Bot size={19}/>:item.id==='analysis'?<FileText size={19}/>:item.id==='payments'?<CreditCard size={19}/>:<Server size={19}/>}</span><span className={`adm-service-state ${serviceTone(item.status)}`}><span className="adm-badge-dot"/>{serviceStatusText[item.status]}</span></div>
        <h2>{item.name}</h2>
        <p>{item.id==='api'?item.status==='up'?'Máy chủ đang trả lời trang quản trị và API ứng dụng.':'Thao tác API ứng dụng có lỗi gần đây; trang admin vẫn đang trả lời.':item.id==='payments'?'Chưa có cổng thanh toán và webhook đối soát.':`${item.provider} · ${item.model}`}</p>
        {item.id==='api'?<div className="adm-service-facts"><span>Thao tác từ khi chạy</span><strong>{item.requests}</strong><span>Lỗi máy chủ</span><strong>{item.failed}</strong><span>Lần gần nhất</span><strong>{dateTime(item.lastRequestAt)}</strong></div>:
          item.id==='provider'?<div className="adm-service-facts"><span>Yêu cầu gần nhất</span><strong>{dateTime(item.lastAttemptAt)}</strong><span>Lỗi gần nhất</span><strong>{serviceErrorText[item.lastErrorCode]||item.lastErrorCode||'—'}</strong><span>Lỗi liên tiếp</span><strong>{item.consecutiveFailures}</strong></div>:
          item.id==='payments'?<p className="adm-service-hint">Các khoản phí chờ trong Tài chính chưa thể thanh toán trực tuyến.</p>:
          <div className="adm-service-facts"><span>Hoàn tất / lỗi</span><strong>{item.completed} / {item.failed}</strong><span>Token đã dùng</span><strong>{new Intl.NumberFormat('vi-VN').format(item.totalTokens)}</strong><span>Lần dùng cuối</span><strong>{dateTime(item.lastUsedAt)}</strong></div>}
      </article>)}
      {!items.length&&<div className="adm-service-empty">Không có dịch vụ nào trong bộ lọc này.</div>}
    </div>
    <Panel title="Yêu cầu gần đây" subtitle="Thao tác ứng dụng và lượt gọi AI · không lưu nội dung nhập hoặc khóa API" className="adm-table-panel">
      <div className="adm-table-wrap"><table><thead><tr><th>Thời điểm</th><th>Luồng</th><th>Kết quả</th><th>Thời gian</th><th>Mã lỗi</th></tr></thead><tbody>{data.recentEvents.map((item,index)=><tr key={`${item.at}-${index}`}><td>{dateTime(item.at)}</td><td>{eventName[item.kind]||item.kind}</td><td><span className={`adm-service-state ${item.status>=500?'bad':item.status>=400?'wait':'good'}`}>{item.status>=400?'Lỗi':'Thành công'} · {item.status}</span></td><td>{item.durationMs} ms</td><td>{serviceErrorText[item.code]||item.code||'—'}</td></tr>)}</tbody></table>{!data.recentEvents.length&&<Blank text="Chưa có yêu cầu nào được ghi nhận từ lúc máy chủ khởi động."/>}</div>
    </Panel>
  </>;
}
