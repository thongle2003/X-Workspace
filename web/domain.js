export const STORAGE_KEY = 'x-workspace-v1';
export const PLAN_ORDER = ['free', 'startup', 'investor'];
export const PLANS = {
  free: {name:'Free', price:0, analyses:2, workspaces:1, portfolio:3, connections:3, export:false, audience:'Khám phá và trải nghiệm', features:['2 lượt phân tích / tháng','1 workspace dự án','Theo dõi 3 startup','3 yêu cầu kết nối / tháng']},
  startup: {name:'Startup Plus', price:199000, analyses:10, workspaces:3, portfolio:3, connections:10, export:true, audience:'Founder chuẩn bị gọi vốn', features:['10 lượt phân tích / tháng','3 workspace dự án','Theo dõi 3 startup','10 yêu cầu kết nối / tháng','Xuất báo cáo phân tích']},
  investor: {name:'Investor Pro', price:499000, analyses:30, workspaces:0, portfolio:20, connections:30, export:true, audience:'Angel và nhà đầu tư cá nhân', features:['30 lượt phân tích / tháng','Theo dõi 20 startup','30 yêu cầu kết nối / tháng','Xuất báo cáo phân tích']}
};
// Pricing hypotheses for prototype validation, not a live billing catalogue.
export const TIER_ORDER = ['free', 'plus', 'pro'];
const founderPlan = (tier, price, aiTokens, workspaces, tasks, documents, exports) => ({
  tier, role:'founder', name:`Startup ${tier === 'free' ? 'Free' : tier === 'plus' ? 'Launch' : 'Scale'}`,
  price, aiTokens, workspaces, tasks, documents, export:exports,
  portfolio:0, watchlist:0, compare:0, connections:0
});
const investorPlan = (tier, price, aiTokens, workspaces, tasks, documents, portfolio, watchlist, compare, connections, exports) => ({
  tier, role:'investor', name:`Investor ${tier === 'free' ? 'Trial' : tier === 'plus' ? 'Basic' : 'Pro'}`,
  price, annualPrice:tier === 'plus' ? 3999000 : tier === 'pro' ? 6999000 : 0,
  trialMonths:tier === 'free' ? 2 : null,
  reportCadence:tier === 'free' ? '1 lần/quý' : tier === 'plus' ? '1 lần/tháng' : '2–3 lần/tháng',
  annualEventsMap:tier === 'pro',
  aiTokens, workspaces, tasks, documents, portfolio, watchlist, compare, connections, export:exports
});
export const ROLE_PLANS = {
  founder: {
    free: founderPlan('free',0,2000,1,10,5,false),
    plus: founderPlan('plus',199000,20000,3,50,30,true),
    pro: founderPlan('pro',399000,60000,10,200,100,true),
  },
  investor: {
    free: investorPlan('free',0,4000,0,10,5,3,3,2,2,false),
    plus: investorPlan('plus',399000,20_000_000,0,50,30,10,5,3,10,true),
    pro: investorPlan('pro',699000,30_000_000,0,200,100,50,20,6,30,true),
  },
};
const roles = ['founder','investor'];
const emptyUsage = () => ({aiTokens:0,analyses:0,connections:0});
const newLedger = (date,role) => ({free:emptyUsage(),paid:role==='investor'?{month:monthKey(date),...emptyUsage()}:{week:weekKey(date),...emptyUsage()}});
// Weeks start Monday at 00:00 Vietnam time (Sunday 17:00 UTC).
export function weekKey(date=new Date()) {
  const local = new Date(date.getTime()+7*60*60*1000);
  local.setUTCDate(local.getUTCDate()-((local.getUTCDay()+6)%7));
  return local.toISOString().slice(0,10);
}
export function nextResetAt(state,date=new Date()) {
  ensurePlanState(state,date);
  if(state.subscriptions[state.role].tier==='free') return null;
  if(state.role==='investor')return new Date(Date.UTC(Number(monthKey(date).slice(0,4)),Number(monthKey(date).slice(5,7)),1)-7*3600000).toISOString();
  return new Date(Date.parse(`${weekKey(date)}T00:00:00+07:00`)+7*24*60*60*1000).toISOString();
}
// Approximate tokens: 3 serialized characters/token + 256 prompt tokens;
// output is the rule-engine summary/flags/formulas at 3 characters/token + 128.
// This is a deterministic demo estimate, not a provider tokenizer or API usage.
export function estimateAnalysisTokens(rows) {
  const result=analyze(rows);
  const inputTokens=Math.ceil(JSON.stringify(rows).length/3)+256;
  const outputTokens=Math.ceil(JSON.stringify({summary:result.summary,flags:result.flags,formulas:result.formulas}).length/3)+128;
  return {inputTokens,outputTokens,totalTokens:inputTokens+outputTokens};
}
function legacyTokens(usage,reports,lifetime=false) {
  const knownTokens=Number.isSafeInteger(usage?.aiTokens) && usage.aiTokens>=0 ? usage.aiTokens : null;
  if(knownTokens!==null && !lifetime) return knownTokens;
  const currentReports=reports.filter(r=>lifetime || !usage?.month || (Number.isFinite(Date.parse(r.createdAt)) && monthKey(new Date(r.createdAt))===usage.month));
  const estimated=currentReports.reduce((sum,r)=>{
    try {return sum+(r.tokenUsage?.totalTokens??estimateAnalysisTokens(r.analysis.rows).totalTokens);} catch {return sum+2000;}
  },0);
  return Math.max(knownTokens||0,estimated+Math.max(0,(usage?.analyses||0)-currentReports.length)*2000);
}
function ensurePlanState(state,date=new Date()) {
  if(!state.subscriptions) {
    const legacyOwner = state.plan === 'startup' ? 'founder' : state.role;
    state.subscriptions = {founder:{tier:'free',billing:'monthly'},investor:{tier:'free',billing:'monthly'}};
    if(state.plan === 'startup') state.subscriptions.founder = {tier:'plus',billing:state.billing === 'annual' ? 'annual' : 'monthly'};
    if(state.plan === 'investor') state.subscriptions.investor = {tier:'pro',billing:state.billing === 'annual' ? 'annual' : 'monthly'};
    const migratedUsage={...state.usage};
    state.usageByRole = {founder:newLedger(date,'founder'),investor:newLedger(date,'investor')};
    for(const w of state.workspaces || []) w.role ||= legacyOwner;
    for(const r of state.reports || []) r.role ||= state.workspaces?.find(w=>w.id===r.workspaceId)?.role || legacyOwner;
    const bucket=state.subscriptions[legacyOwner].tier==='free' ? 'free' : 'paid';
    Object.assign(state.usageByRole[legacyOwner][bucket],migratedUsage,{aiTokens:legacyTokens(migratedUsage,state.reports.filter(r=>r.role===legacyOwner),bucket==='free')});
    if(bucket==='free') state.usageByRole[legacyOwner].free.connections=Math.max(state.usageByRole[legacyOwner].free.connections,(state.requests||[]).filter(r=>(r.role||legacyOwner)===legacyOwner).length);
  }
  // Upgrade the earlier monthly/per-role prototype without replenishing credits.
  for(const role of roles) {
    const previous=state.usageByRole?.[role];
    if(!previous?.free || !previous?.paid) {
      state.usageByRole ||= {};
      state.usageByRole[role]=newLedger(date,role);
      const bucket=state.subscriptions[role].tier==='free' ? 'free' : 'paid';
      Object.assign(state.usageByRole[role][bucket],previous||emptyUsage(),{aiTokens:legacyTokens(previous,state.reports.filter(r=>r.role===role),bucket==='free')});
      if(bucket==='free') state.usageByRole[role].free.connections=Math.max(state.usageByRole[role].free.connections,(state.requests||[]).filter(r=>(r.role||'investor')===role).length);
    }
  }
  return state;
}
function projectActivePlan(state,date=new Date()) {
  const selected = state.subscriptions[state.role];
  state.plan = selected.tier === 'free' ? 'free' : state.role === 'founder' ? 'startup' : 'investor';
  state.billing = selected.billing;
  const period=selected.tier==='free' ? 'lifetime' : state.role==='investor' ? 'monthly' : 'weekly';
  state.usage = state.usageByRole[state.role][selected.tier==='free'?'free':'paid'];
  Object.assign(state.usage,{period,month:monthKey(date),resetAt:period==='lifetime'?null:nextResetAt(state,date)});
  return state;
}
export function getPlan(state) {
  ensurePlanState(state);
  const subscription = state.subscriptions[state.role];
  return {...ROLE_PLANS[state.role][subscription.tier],billing:subscription.billing};
}
export function changePlan(state,tier,billing) {
  ensurePlanState(state);
  if(!TIER_ORDER.includes(tier)) throw invalid('Gói dịch vụ không hợp lệ.');
  const nextBilling = billing ?? state.subscriptions[state.role].billing;
  if(!['monthly','annual'].includes(nextBilling)) throw invalid('Chu kỳ thanh toán không hợp lệ.');
  refreshUsage(state);
  state.subscriptions[state.role] = {tier,billing:nextBilling};
  return projectActivePlan(state);
}
export function changeRole(state,role) {
  if(!roles.includes(role)) throw invalid('Vai trò không hợp lệ.');
  refreshUsage(state);
  state.role = role;
  state.activeWorkspace = state.workspaces.find(w=>w.role===role)?.id || '';
  return projectActivePlan(state);
}
export function getUsage(state,kind,workspaceId) {
  refreshUsage(state);
  const plan = getPlan(state);
  let used = 0;
  let limit = plan[kind];
  const timing={period:state.usage.period,resetAt:state.usage.resetAt};
  if(kind === 'analyses') return {used:state.usage.analyses,limit:null,remaining:null,allowed:true,...timing};
  if(kind === 'aiTokens' || kind === 'connections') used = state.usage[kind];
  else if(kind === 'workspaces') {
    used = state.workspaces.filter(w=>w.role===state.role).length;
    // Creating a workspace belongs to Startup, regardless of investor tier.
    // Existing investor workspaces remain available for their saved data.
    if(state.role !== 'founder') limit = 0;
  }
  else if(['portfolio','watchlist','compare'].includes(kind)) used = state.role === 'investor' ? state[kind].length : 0;
  else if(kind === 'tasks' || kind === 'documents') used = state.workspaces.find(w=>w.id===workspaceId && w.role===state.role)?.[kind].length || 0;
  else if(kind === 'export') return {used:0,limit:plan.export ? 1 : 0,remaining:plan.export ? 1 : 0,allowed:plan.export,...timing};
  else limit = 0;
  return {used,limit,remaining:Math.max(0,limit-used),allowed:used<limit,...timing};
}
function invalid(message) { return Object.assign(new Error(message),{code:'INVALID'}); }
function requireQuota(state,kind,workspaceId) {
  const quota = getUsage(state,kind,workspaceId);
  if(!quota.allowed) {
    const message = kind === 'workspaces' && state.role !== 'founder'
      ? 'Chỉ Startup được tạo workspace. Gói Nhà đầu tư không có quyền tạo workspace.'
      : quota.limit === 0 ? 'Tính năng này không có trong gói đang chọn.' : `Bạn đã sử dụng ${quota.used}/${quota.limit} hạn mức của gói ${getPlan(state).name}.`;
    throw Object.assign(new Error(message),{code:'LIMIT',feature:kind,quota});
  }
}
function textValue(value,label,min=1,max=160) {
  if(typeof value!=='string' || value.trim().length<min || value.trim().length>max) throw invalid(`${label} cần từ ${min} đến ${max} ký tự.`);
  return value.trim();
}
function requireStartup(state,id) {
  const startup=state.startups.find(s=>s.id===id);
  if(typeof id!=='string' || !startup) throw invalid('Không tìm thấy startup.');
  return startup;
}
function requireWorkspace(state,id) {
  const workspace=state.workspaces.find(w=>w.id===id && w.role===state.role);
  if(typeof id!=='string' || !workspace) throw invalid('Workspace không thuộc vai trò đang chọn.');
  return workspace;
}
function numberValue(value,label,min,max) {
  if(typeof value!=='number' || !Number.isFinite(value) || value<min || value>max) throw invalid(`${label} nằm ngoài phạm vi hợp lệ.`);
  return value;
}
export function applyAction(state,action) {
  if(!action || typeof action.type!=='string') throw invalid('Thao tác không hợp lệ.');
  const next = structuredClone(state);
  refreshUsage(next);
  switch(action.type) {
    case 'create-workspace': {
      requireQuota(next,'workspaces');
      requireStartup(next,action.startupId);
      const name = textValue(action.name,'Tên workspace',1,90);
      const goal = textValue(action.goal,'Mục tiêu',1,500);
      if(next.workspaces.some(w=>w.role===next.role && w.name.toLocaleLowerCase()===name.toLocaleLowerCase())) throw invalid('Tên workspace đã tồn tại.');
      const workspace = {id:uid('workspace'),role:next.role,name,startupId:action.startupId,goal,tasks:[],documents:[],notes:''};
      next.workspaces.push(workspace);
      next.activeWorkspace = workspace.id;
      break;
    }
    case 'add-task': {
      const workspace=requireWorkspace(next,action.workspaceId);
      requireQuota(next,'tasks',workspace.id);
      const title=textValue(action.title,'Công việc',1,160);
      if(workspace.tasks.some(t=>t.title.toLocaleLowerCase()===title.toLocaleLowerCase())) throw invalid('Công việc này đã có trong workspace.');
      workspace.tasks.push({id:uid('task'),title,status:'todo',owner:'Minh Khoa'});
      break;
    }
    case 'add-document': {
      const workspace=requireWorkspace(next,action.workspaceId);
      requireQuota(next,'documents',workspace.id);
      const name=textValue(action.name,'Tên tệp',1,255);
      const size=numberValue(action.size,'Dung lượng tệp',0,2_000_000);
      if(action.fileType!==undefined && (typeof action.fileType!=='string' || action.fileType.length>150)) throw invalid('Loại tệp không hợp lệ.');
      const fileType=action.fileType||'';
      if(workspace.documents.some(d=>d.name===name && d.size===size)) throw invalid('Tệp này đã có trong workspace.');
      workspace.documents.push({id:uid('doc'),name,size,type:fileType,fileType,createdAt:new Date().toISOString()});
      break;
    }
    case 'add-portfolio': {
      requireQuota(next,'portfolio');
      requireStartup(next,action.startupId);
      if(next.portfolio.some(p=>p.startupId===action.startupId)) throw invalid('Startup này đã có trong danh mục.');
      const invested=numberValue(action.invested,'Vốn đầu tư',0.01,1e9);
      const ownership=numberValue(action.ownership,'Tỷ lệ sở hữu',0.001,100);
      if(typeof action.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !Number.isFinite(Date.parse(action.date)) || new Date(action.date).toISOString().slice(0,10)!==action.date) throw invalid('Ngày đầu tư không hợp lệ.');
      next.portfolio.push({id:uid('position'),startupId:action.startupId,invested,ownership,date:action.date,updates:[]});
      break;
    }
    case 'toggle-watch':
    case 'toggle-compare': {
      const kind=action.type==='toggle-watch' ? 'watchlist' : 'compare';
      requireStartup(next,action.startupId);
      if(next.role!=='investor') requireQuota(next,kind);
      const index=next[kind].indexOf(action.startupId);
      if(index>=0) next[kind].splice(index,1);
      else {requireQuota(next,kind);next[kind].push(action.startupId);}
      break;
    }
    case 'connect': {
      requireQuota(next,'connections');
      requireStartup(next,action.startupId);
      const message=textValue(action.message,'Lời nhắn',10,1000);
      if(next.requests.some(r=>r.startupId===action.startupId)) throw invalid('Bạn đã tạo yêu cầu kết nối với startup này.');
      next.requests.push({id:uid('request'),role:next.role,startupId:action.startupId,message,createdAt:new Date().toISOString(),status:'pending'});
      next.usage.connections++;
      break;
    }
    case 'analyze': {
      if(action.workspaceId) requireWorkspace(next,action.workspaceId);
      const name=textValue(action.name,'Tên báo cáo',1,255);
      if(!Array.isArray(action.rows) || action.rows.length<2 || action.rows.length>60) throw invalid('Cần từ 2 đến 60 kỳ dữ liệu.');
      const keys=['period','revenue','cogs','opex','cash','operating_cash_flow','receivables'];
      let rows;
      try {rows=parseCSV([keys.join(','),...action.rows.map(row=>keys.map(key=>JSON.stringify(row?.[key]??'')).join(','))].join('\n'));}
      catch(error) {throw invalid(error.message);}
      const tokenUsage={...estimateAnalysisTokens(rows),estimated:true};
      const quota=getUsage(next,'aiTokens');
      if(tokenUsage.totalTokens>quota.remaining) throw Object.assign(new Error(`Phân tích cần khoảng ${tokenUsage.totalTokens} token, bạn còn ${quota.remaining} token.`),{code:'LIMIT',feature:'aiTokens',quota,required:tokenUsage.totalTokens});
      next.reports.unshift({id:uid('report'),role:next.role,name,workspaceId:action.workspaceId||'',createdAt:new Date().toISOString(),analysis:analyze(rows),tokenUsage});
      next.usage.aiTokens+=tokenUsage.totalTokens;
      next.usage.analyses++;
      break;
    }
    case 'export-report': {
      const report=next.reports.find(r=>r.id===action.reportId && r.role===next.role);
      if(typeof action.reportId!=='string' || !report) throw invalid('Báo cáo không thuộc vai trò đang chọn.');
      requireQuota(next,'export');
      break;
    }
    default: throw invalid('Thao tác không được hỗ trợ.');
  }
  recordEvent(next,action.type,{role:next.role,tier:getPlan(next).tier});
  return projectActivePlan(next);
}
export function monthKey(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(date).slice(0,7); }
export const money = n => new Intl.NumberFormat('vi-VN').format(Math.round(n));
export function capitalAmount(millions) {
  const value = Number(millions);
  if (!Number.isFinite(value) || value < 0) return 'Chưa công bố';
  const format = number => new Intl.NumberFormat('vi-VN', {maximumFractionDigits:3}).format(number);
  if (value < 1) return `${format(Math.round(value * 1_000_000))} ₫`;
  if (value < 1000) return `${format(value)} triệu ₫`;
  const billions = Math.floor(value / 1000);
  const remainder = Number((value - billions * 1000).toFixed(3));
  return `${format(billions)} tỷ${remainder ? ` ${format(remainder)} triệu` : ''} ₫`;
}
export const pct = n => n===null || !Number.isFinite(n) ? 'N/A' : `${n>0?'+':''}${n.toFixed(1).replace('.',',')}%`;
export const escapeHTML = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function csvCell(v) { const s=String(v??''); const safe=/^[=+@\-\t\r]/.test(s)?`'${s}`:s; return `"${safe.replace(/"/g,'""')}"`; }
export function toCSV(rows) { return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'); }
export const uid = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
const STARTUPS = [
  {id:'lotus',name:'LotusPay',mark:'L',color:'#6a56d9',industry:'Fintech',stage:'Seed',location:'TP.HCM',tagline:'Hạ tầng thanh toán cho doanh nghiệp nhỏ.',description:'API thu hộ và đối soát giao dịch giúp SME quản lý thanh toán đa kênh. ',target:8000,raised:3200,revenue:480,growth:12.9,runway:34,docs:7,totalDocs:8,users:'240 doanh nghiệp',founded:2024,team:12},
  {id:'verda',name:'Verda',mark:'v',color:'#15836c',industry:'Climate Tech',stage:'Pre-seed',location:'Hà Nội',tagline:'Đo lường phát thải, bắt đầu từ chuỗi cung ứng.',description:'Công cụ tập hợp dữ liệu phát thải và xây báo cáo cho nhà cung ứng. ',target:5000,raised:1750,revenue:155,growth:8.4,runway:10,docs:6,totalDocs:8,users:'38 nhà cung ứng',founded:2025,team:8},
  {id:'edunova',name:'EduNova',mark:'e',color:'#ce7841',industry:'Edtech',stage:'Seed',location:'Đà Nẵng',tagline:'Học theo năng lực, tiến bộ theo từng ngày.',description:'Nền tảng học tập và quản lý bài tập cho trung tâm ngoại ngữ. ',target:6000,raised:4200,revenue:320,growth:9.8,runway:14,docs:8,totalDocs:8,users:'65 trung tâm',founded:2023,team:18},
  {id:'medflow',name:'MedFlow',mark:'m',color:'#4e81b1',industry:'Healthtech',stage:'Seed',location:'TP.HCM',tagline:'Một luồng vận hành cho phòng khám.',description:'Phần mềm lịch hẹn và quản lý vận hành phòng khám tư. ',target:10000,raised:2500,revenue:250,growth:6.2,runway:8,docs:5,totalDocs:8,users:'52 phòng khám',founded:2024,team:14},
  {id:'supply',name:'SupplyOS',mark:'s',color:'#8664ac',industry:'SaaS',stage:'Pre-seed',location:'Hà Nội',tagline:'Quản lý tồn kho cho thương hiệu đang lớn.',description:'Bảng điều khiển tồn kho và mua hàng cho thương hiệu bán lẻ. ',target:4000,raised:800,revenue:110,growth:15.2,runway:11,docs:6,totalDocs:8,users:'90 cửa hàng',founded:2025,team:7},
  {id:'greencart',name:'GreenCart',mark:'g',color:'#70924d',industry:'E-commerce',stage:'Seed',location:'TP.HCM',tagline:'Thực phẩm địa phương, chuỗi cung ứng ngắn.',description:'Kết nối hộ sản xuất với cửa hàng thực phẩm. ',target:7000,raised:2800,revenue:620,growth:-3.2,runway:5,docs:4,totalDocs:8,users:'120 cửa hàng',founded:2023,team:22}
];
export const SAMPLE_CSV = 'period,revenue,cogs,opex,cash,operating_cash_flow,receivables\n2026-04,280,98,260,2200,-78,84\n2026-05,310,108.5,270,2115,-85,93\n2026-06,345,120.75,280,2045,-70,104\n2026-07,380,133,290,1980,-65,114\n2026-08,425,148.75,310,1925,-55,128\n2026-09,480,168,330,1875,-50,144';
function initialState() {return {version:1,role:'investor',plan:'free',billing:'monthly',usage:{month:monthKey(),analyses:0,connections:0},startups:structuredClone(STARTUPS),watchlist:['lotus','verda'],compare:[],requests:[],reports:[],portfolio:[{id:'p-lotus',startupId:'lotus',invested:500,ownership:2,date:'2026-04-01',updates:[{period:'2026-07',revenue:380,cash:1980,valuation:25000},{period:'2026-08',revenue:425,cash:1925,valuation:26000},{period:'2026-09',revenue:480,cash:1875,valuation:27500}]}],workspaces:[{id:'w-lotus',name:'LotusPay · Thẩm định vòng Seed',startupId:'lotus',goal:'Rà soát dòng tiền và hoàn thiện hồ sơ trước buổi gặp founder.',tasks:[{id:'t1',title:'Kiểm tra doanh thu và công nợ',status:'todo',owner:'Minh Khoa'},{id:'t2',title:'Đọc pitch deck và mô hình doanh thu',status:'doing',owner:'Minh Khoa'},{id:'t3',title:'Thu thập báo cáo 6 tháng',status:'done',owner:'Minh Khoa'}],notes:'Cần làm rõ khả năng thu hồi công nợ và giả định tăng trưởng.',documents:[]}],activeWorkspace:'w-lotus',events:[],responses:[],onboarded:true};}
export function freshState() { return refreshUsage(initialState()); }
export function refreshUsage(state, date=new Date()) {
  ensurePlanState(state,date);
  const week=weekKey(date);
  if(state.usageByRole.founder.paid.week!==week) state.usageByRole.founder.paid={week,...emptyUsage()};
  const month=monthKey(date),paid=state.usageByRole.investor.paid;
  const monthStart=Date.parse(`${month}-01T00:00:00+07:00`);
  const legacyWeekStart=paid.week?Date.parse(`${paid.week}T00:00:00+07:00`):NaN;
  if(paid.month!==month)state.usageByRole.investor.paid={month,...(legacyWeekStart<=date.getTime()&&legacyWeekStart+7*86400000>monthStart?{aiTokens:paid.aiTokens,analyses:paid.analyses,connections:paid.connections}:emptyUsage())};
  return projectActivePlan(state,date);
}
export function canUse(state,kind,workspaceId) { return getUsage(state,kind,workspaceId).allowed; }
export function recordEvent(state,type,detail={}) {state.events.push({id:uid('ev'),at:new Date().toISOString(),type,...detail});if(state.events.length>500)state.events=state.events.slice(-500);}
export function parseCSV(text) {
  if(typeof text!=='string'||text.length>2_000_000)throw new Error('CSV không hợp lệ hoặc vượt 2 MB.');
  const input=text.replace(/^\uFEFF/,'').trim(); const records=[];let row=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))records.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('CSV có dấu ngoặc kép chưa đóng.');row.push(cell.trim());if(row.some(Boolean))records.push(row);
  if(records.length<3||records.length>61)throw new Error('Cần từ 2 đến 60 kỳ dữ liệu theo tháng.');
  const required=['period','revenue','cogs','opex','cash','operating_cash_flow','receivables']; const headers=records.shift().map(v=>v.toLowerCase());
  for(const h of required)if(!headers.includes(h))throw new Error(`Thiếu cột ${h}. Hãy kiểm tra định dạng CSV.`);
  if(new Set(headers).size!==headers.length)throw new Error('Tên cột bị trùng.');
  const seen=new Set();const result=records.map((r,i)=>{if(r.length!==headers.length)throw new Error(`Dòng ${i+2}: số cột không khớp.`);const obj={};for(const h of required){const raw=r[headers.indexOf(h)];if(h==='period'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw))throw new Error(`Dòng ${i+2}: kỳ phải có dạng YYYY-MM.`);if(seen.has(raw))throw new Error(`Kỳ ${raw} bị trùng.`);seen.add(raw);obj[h]=raw;}else{if(raw===''||!/^[-+]?\d+(\.\d+)?$/.test(raw))throw new Error(`Dòng ${i+2}: ${h} phải là số, dùng dấu chấm thập phân.`);const n=Number(raw);if(!Number.isFinite(n)||Math.abs(n)>1e12)throw new Error(`Dòng ${i+2}: số liệu vượt phạm vi.`);if(h!=='operating_cash_flow'&&n<0)throw new Error(`Dòng ${i+2}: ${h} không được âm.`);obj[h]=n;}}return obj;});
  result.sort((a,b)=>a.period.localeCompare(b.period));for(let i=1;i<result.length;i++){const [ay,am]=result[i-1].period.split('-').map(Number);const [by,bm]=result[i].period.split('-').map(Number);if(by*12+bm-(ay*12+am)!==1)throw new Error('Các kỳ cần liên tiếp theo tháng để tính dòng tiền chính xác.');}return result;
}
export function analyze(rows) {
  const latest=rows.at(-1), previous=rows.at(-2), trailing=rows.slice(-3);const avgCFO=trailing.reduce((a,r)=>a+r.operating_cash_flow,0)/trailing.length;const burn=Math.max(0,-avgCFO);const runway=burn>0?latest.cash/burn:null;const margin=latest.revenue>0?(latest.revenue-latest.cogs)/latest.revenue*100:null;const growth=previous.revenue>0?(latest.revenue/previous.revenue-1)*100:null;const arGrowth=previous.receivables>0?(latest.receivables/previous.receivables-1)*100:null;
  const flags=[];if(runway!==null&&runway<6)flags.push({level:'high',title:'Runway dưới 6 tháng',detail:`Tiền mặt hiện tại chỉ đủ khoảng ${runway.toFixed(1)} tháng nếu giữ mức đốt tiền trung bình ${trailing.length} tháng gần nhất.`});
  if(margin!==null&&margin<20)flags.push({level:'medium',title:'Biên lợi nhuận gộp dưới 20%',detail:'Rà soát giá vốn và cơ cấu doanh thu. Ngưỡng này cần hiệu chỉnh theo ngành.'});
  if(growth!==null&&growth<0)flags.push({level:'medium',title:'Doanh thu giảm so với tháng trước',detail:'Hỏi thêm về mùa vụ, khách hàng rời bỏ và thời điểm ghi nhận doanh thu.'});
  if(growth!==null&&growth>100)flags.push({level:'medium',title:'Doanh thu tăng đột biến trên 100%',detail:'Đối chiếu hóa đơn và tính lặp lại của doanh thu. Tăng trưởng cao tự nó không chứng minh bất thường.'});
  if(arGrowth!==null&&growth!==null&&arGrowth-growth>20)flags.push({level:'high',title:'Công nợ tăng nhanh hơn doanh thu',detail:'Tăng trưởng khoản phải thu cao hơn tăng trưởng doanh thu trên 20 điểm %. Cần kiểm tra kỳ hạn và khả năng thu hồi.'});
  if(trailing.length>=3&&trailing.every(r=>r.operating_cash_flow<0))flags.push({level:'medium',title:'Dòng tiền kinh doanh âm 3 tháng liên tiếp',detail:'Kiểm tra kế hoạch vốn và lộ trình cân bằng dòng tiền. Điều này có thể phổ biến ở startup đang tăng trưởng.'});
  const opProfit=latest.revenue-latest.cogs-latest.opex;
  return {rows,latest,previous,avgCFO,burn,runway,margin,growth,arGrowth,opProfit,flags,formulas:[['Tăng trưởng tháng','(Doanh thu kỳ này / kỳ trước − 1) × 100%'],['Biên lợi nhuận gộp','(Doanh thu − Giá vốn) / Doanh thu × 100%'],['Đốt tiền thuần','max(0, − Trung bình dòng tiền kinh doanh 3 tháng cuối)'],['Runway','Tiền mặt cuối kỳ / Đốt tiền thuần hàng tháng']],summary:`Doanh thu tháng ${latest.period} đạt ${money(latest.revenue)} triệu đồng, biên lợi nhuận gộp ${margin===null?'chưa tính được':margin.toFixed(1)+'%'}. ${runway===null?'Dòng tiền bình quân không âm, chưa áp dụng công thức runway.':'Runway khoảng '+runway.toFixed(1)+' tháng theo dòng tiền hoạt động.'} Có ${flags.length} chỉ báo cần rà soát. Dữ liệu do người dùng cung cấp, chưa kiểm toán.`};
}
export function portfolioMetrics(positions,startups) {
  let invested=0,estimated=0;for(const p of positions){invested+=p.invested;const val=p.updates.at(-1)?.valuation;if(val)estimated+=val*p.ownership/100;else estimated+=p.invested;}return {invested,estimated,change:invested?(estimated/invested-1)*100:null,count:positions.length};
}
export function eligibleResponse(r) {return r.consent===true && ['investor','founder'].includes(r.persona) && r.active==='yes' && typeof r.evidence==='string' && r.evidence.trim().length>=8 && ['ease','trust','useful'].every(k=>Number.isInteger(Number(r[k]))&&Number(r[k])>=1&&Number(r[k])<=5);}
export function validateState(s) {
  if(!s||s.version!==1||!PLANS[s.plan]||!['investor','founder'].includes(s.role))throw new Error('Bản sao lưu không tương thích.');
  for(const k of ['startups','workspaces','portfolio','watchlist','compare','requests','reports','events','responses'])if(!Array.isArray(s[k])||s[k].length>10000)throw new Error(`Dữ liệu ${k} không hợp lệ.`);
  if(!s.usage||!/^\d{4}-\d{2}$/.test(s.usage.month)||!Number.isFinite(s.usage.analyses)||!Number.isFinite(s.usage.connections)||s.usage.analyses<0||s.usage.connections<0)throw new Error('Hạn mức sử dụng không hợp lệ.');
  for(const w of s.workspaces)if(typeof w.id!=='string'||typeof w.name!=='string'||!Array.isArray(w.tasks)||!Array.isArray(w.documents)||typeof w.notes!=='string'||(w.role!==undefined&&!roles.includes(w.role)))throw new Error('Workspace không hợp lệ.');
  for(const p of s.portfolio)if(!Array.isArray(p.updates)||!Number.isFinite(p.invested)||!Number.isFinite(p.ownership))throw new Error('Danh mục không hợp lệ.');
  for(const t of s.startups)if(typeof t.id!=='string'||typeof t.name!=='string')throw new Error('Hồ sơ startup không hợp lệ.');
  for(const report of s.reports) if(typeof report.id!=='string' || (report.role!==undefined&&!roles.includes(report.role))) throw new Error('Báo cáo không hợp lệ.');
  if(s.subscriptions) {
    for(const role of roles) {
      const subscription=s.subscriptions[role];
      if(!subscription || !TIER_ORDER.includes(subscription.tier) || !['monthly','annual'].includes(subscription.billing)) throw new Error('Gói theo vai trò không hợp lệ.');
      const ledger=s.usageByRole?.[role];
      if(!ledger) throw new Error('Hạn mức theo vai trò không hợp lệ.');
      const buckets=ledger.free || ledger.paid ? [ledger.free,ledger.paid] : [ledger];
      for(const bucket of buckets) {
        if(!bucket || ['analyses','connections'].some(key=>!Number.isSafeInteger(bucket[key]) || bucket[key]<0) || (bucket.aiTokens!==undefined && (!Number.isSafeInteger(bucket.aiTokens) || bucket.aiTokens<0))) throw new Error('Bộ đếm sử dụng không hợp lệ.');
      }
      if(ledger.paid && (role==='founder'?!/^\d{4}-\d{2}-\d{2}$/.test(ledger.paid.week):!/^\d{4}-(0[1-9]|1[0-2])$/.test(ledger.paid.month||'')&&!/^\d{4}-\d{2}-\d{2}$/.test(ledger.paid.week||''))) throw new Error('Kỳ sử dụng không hợp lệ.');
    }
  }
  return refreshUsage(s);
}
