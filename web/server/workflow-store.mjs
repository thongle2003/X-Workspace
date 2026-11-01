import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ROLE_PLANS, weekKey, parseCSV, analyze } from '../domain.js';

export const DEMO_USERS = Object.freeze({
  founder: Object.freeze({ id: 'founder', role: 'founder', name: 'Startup' }),
  investor: Object.freeze({ id: 'investor', role: 'investor', name: 'Nhà đầu tư' }),
  investor2: Object.freeze({ id: 'investor2', role: 'investor', name: 'Nhà đầu tư thứ hai' }),
});

function error(status, code, message, details = {}) { return Object.assign(new Error(message), { status, code, ...details }); }
function text(value, label, min = 1, max = 500) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw error(400, 'INVALID', `${label} cần từ ${min} đến ${max} ký tự.`);
  return value.trim();
}
function number(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw error(400, 'INVALID', `${label} không hợp lệ.`);
  return value;
}
function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  number(value, label, min, max);
  if (!Number.isSafeInteger(value)) throw error(400, 'INVALID', `${label} phải là số nguyên.`);
  return value;
}
function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw error(400, 'INVALID', 'Ngày đầu tư không hợp lệ.');
  return value;
}
const id = prefix => `${prefix}-${randomUUID()}`;
const freshBucket = () => ({ aiTokens: 0, connections: 0, analyses: 0 });
const freshData = () => ({ version: 1, revision: 0, accounts: Object.fromEntries(Object.keys(DEMO_USERS).map(userId => [userId, { tier: 'free', billing: 'monthly', ledgers: { free: freshBucket() }, watchlist: [], compare: [] }])), workspaces: [], requests: [], messages: [], portfolio: [], reports: [], aiChats: [], reservations: [] });

function normalizeProfile(input, previous = {}) {
  const profile = { ...previous, ...(input || {}) };
  return {
    name: text(profile.name, 'Tên startup', 1, 90),
    industry: text(profile.industry, 'Lĩnh vực', 1, 80),
    stage: text(profile.stage, 'Giai đoạn', 1, 50),
    location: text(profile.location, 'Địa điểm', 1, 100),
    summary: text(profile.summary, 'Thông tin giới thiệu', 10, 2000),
    target: number(profile.target, 'Mục tiêu gọi vốn (triệu đồng)', 0.01, 1e10),
  };
}
function actualUsage(value) {
  if (!value || typeof value !== 'object') throw error(502, 'AI_USAGE', 'Nhà cung cấp chưa trả về lượng token thực tế.');
  const inputTokens = integer(value.inputTokens, 'Token đầu vào', 0);
  const outputTokens = integer(value.outputTokens, 'Token đầu ra', 0);
  const totalTokens = integer(value.totalTokens, 'Tổng token', 1);
  if (inputTokens + outputTokens !== totalTokens) throw error(502, 'AI_USAGE', 'Số token trả về không nhất quán.');
  return { inputTokens, outputTokens, totalTokens };
}
function validateReport(value) {
  if (!value || typeof value !== 'object') throw error(502, 'AI_REPORT', 'Không có báo cáo AI hợp lệ.');
  if (!['low','medium','high','insufficient'].includes(value.riskLevel)) throw error(502, 'AI_REPORT', 'Mức rủi ro AI không hợp lệ.');
  const report = { summary: text(value.summary, 'Tóm tắt AI', 1, 16000), riskLevel:value.riskLevel };
  for (const key of ['strengths', 'questions', 'limitations']) {
    if (!Array.isArray(value[key]) || value[key].length > 40) throw error(502, 'AI_REPORT', 'Báo cáo AI không đúng cấu trúc.');
    report[key] = value[key].map(item => text(item, key, 1, 4000));
  }
  if (!Array.isArray(value.risks) || value.risks.length > 40) throw error(502, 'AI_REPORT', 'Danh sách rủi ro không hợp lệ.');
  report.risks = value.risks.map(risk => ({ title:text(risk?.title,'Tên rủi ro',1,1000), reason:text(risk?.reason,'Lý do rủi ro',1,4000), evidence:text(risk?.evidence,'Dữ liệu dẫn chứng',1,4000) }));
  return report;
}

/** Local demo persistence. Actor identity must come from the HTTP session, never the action body. */
export function createWorkflowStore({ filePath, now = () => new Date() } = {}) {
  let data = freshData();
  if (filePath && fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.version !== 1 || !data.accounts || !['workspaces','requests','messages','portfolio','reports','reservations'].every(key => Array.isArray(data[key]))) throw new Error('Workflow store không đúng cấu trúc; không tự xóa dữ liệu.');
    if(data.aiChats === undefined) data.aiChats=[];
    if(!Array.isArray(data.aiChats)) throw new Error('Lịch sử AI không đúng cấu trúc; không tự xóa dữ liệu.');
    for (const userId of Object.keys(DEMO_USERS)) if (!data.accounts[userId]) data.accounts[userId] = freshData().accounts[userId];
  }
  // Existing stores predate saved opportunities. Preserve every other account field.
  for (const account of Object.values(data.accounts)) for (const kind of ['watchlist','compare']) {
    if (account[kind] === undefined) account[kind] = [];
    if (!Array.isArray(account[kind]) || account[kind].length > 10000 || account[kind].some(value => typeof value !== 'string' || value.length < 1 || value.length > 200)) throw new Error('Danh sách startup đã lưu không đúng cấu trúc; không tự xóa dữ liệu.');
  }
  function user(userId) {
    if (!Object.hasOwn(DEMO_USERS, userId)) throw error(401, 'SESSION', 'Chọn tài khoản thử nghiệm để tiếp tục.');
    return DEMO_USERS[userId];
  }
  function plan(state, userId) { return { ...ROLE_PLANS[user(userId).role][state.accounts[userId].tier], billing: state.accounts[userId].billing }; }
  function bucketKey(state, userId) { return state.accounts[userId].tier === 'free' ? 'free' : `week:${weekKey(now())}`; }
  function bucket(state, userId, key = bucketKey(state, userId)) {
    state.accounts[userId].ledgers[key] ||= freshBucket();
    return state.accounts[userId].ledgers[key];
  }
  function usage(state, userId) {
    const selected = plan(state, userId), key = bucketKey(state, userId), current = state.accounts[userId].ledgers[key] || freshBucket();
    const period = selected.tier === 'free' ? 'lifetime' : 'weekly';
    const resetAt = period === 'lifetime' ? null : new Date(Date.parse(`${key.slice(5)}T00:00:00+07:00`) + 7*86400000).toISOString();
    const awaiting=state.reservations.filter(r=>r.userId===userId && r.bucketKey===key && ['pending','uncertain'].includes(r.status));
    return { used: current.aiTokens, limit: selected.aiTokens, remaining: Math.max(0, selected.aiTokens-current.aiTokens), period, resetAt, connections: { used: current.connections, limit: selected.connections, remaining: Math.max(0, selected.connections-current.connections) }, analyses: current.analyses, pendingTokens:awaiting.reduce((sum,r)=>sum+r.reservedTokens,0), pendingAnalyses:awaiting.length };
  }
  function persist(next) {
    next.revision = data.revision + 1;
    if (filePath) {
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
      const temporary = `${filePath}.${randomUUID()}.tmp`;
      try { fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 }); fs.renameSync(temporary, filePath); }
      finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    }
    data = next;
  }
  function workspace(state, workspaceId) {
    const found = state.workspaces.find(w => w.id === workspaceId);
    if (!found) throw error(404, 'NOT_FOUND', 'Không tìm thấy workspace.');
    return found;
  }
  function canRead(state, userId, project) {
    return project.ownerId === userId || state.requests.some(request => request.workspaceId === project.id && request.investorId === userId && request.status === 'approved');
  }
  function readable(state, userId, workspaceId) {
    const project = workspace(state, workspaceId);
    if (!canRead(state, userId, project)) throw error(403, 'FORBIDDEN', 'Startup chưa cấp quyền xem hồ sơ tài chính của workspace này.');
    return project;
  }
  function owned(state, userId, workspaceId) {
    const project = workspace(state, workspaceId);
    if (user(userId).role !== 'founder' || project.ownerId !== userId) throw error(403, 'FORBIDDEN', 'Chỉ Startup sở hữu workspace được thực hiện thao tác này.');
    return project;
  }
  function requireInvestor(userId) { if (user(userId).role !== 'investor') throw error(403, 'FORBIDDEN', 'Thao tác này dành cho Nhà đầu tư.'); }
  function requireRoom(used, limit, feature) {
    if (used >= limit) throw error(409, 'LIMIT', `Đã sử dụng ${used}/${limit} hạn mức.`, { feature, quota: { used, limit, remaining: Math.max(0,limit-used) } });
  }
  function publicProject(project) {
    return { id: project.id, workspaceId: project.id, ownerId: project.ownerId, ownerName: user(project.ownerId).name, profile: structuredClone(project.profile), publishedAt: project.publishedAt };
  }
  function snapshot(userId) {
    const actor = user(userId);
    const accessible = data.workspaces.filter(w => canRead(data, userId, w));
    const accessibleIds = new Set(accessible.map(w => w.id));
    return structuredClone({
      revision: data.revision, user: actor, plan: plan(data,userId), usage: usage(data,userId),
      workspaces: accessible.map(w => ({ ...w, isOwner: w.ownerId === userId, canManage: w.ownerId === userId })),
      marketplace: data.workspaces.filter(w => w.published).map(publicProject),
      watchlist: data.accounts[userId].watchlist,
      compare: data.accounts[userId].compare,
      requests: data.requests.filter(r => r.investorId === userId || data.workspaces.find(w => w.id === r.workspaceId)?.ownerId === userId).map(r => ({ ...r, investorName: user(r.investorId).name, workspaceName: data.workspaces.find(w => w.id === r.workspaceId)?.profile.name })),
      portfolio: data.portfolio.filter(p => p.investorId === userId),
      reports: data.reports.filter(r => r.workspaceId ? accessibleIds.has(r.workspaceId) : r.authorId === userId),
      aiChats: data.aiChats.filter(m => m.authorId === userId && (!m.workspaceId || accessibleIds.has(m.workspaceId))),
      messages: data.messages.filter(m => accessibleIds.has(m.workspaceId)),
    });
  }
  function act(userId, action) {
    user(userId);
    if (!action || typeof action.type !== 'string') throw error(400, 'INVALID', 'Thao tác không hợp lệ.');
    const next = structuredClone(data), stamp = now().toISOString();
    const currentPlan = plan(next, userId);
    switch (action.type) {
      case 'create-workspace': {
        if (user(userId).role !== 'founder') throw error(403, 'FORBIDDEN', 'Chỉ Startup được tạo workspace.');
        requireRoom(next.workspaces.filter(w => w.ownerId === userId).length, currentPlan.workspaces, 'workspaces');
        const name = text(action.name, 'Tên workspace', 1, 90), goal = text(action.goal, 'Mục tiêu', 1, 500);
        const profile = action.profile ? normalizeProfile(action.profile) : { name, industry:'Chưa công bố', stage:'Pre-seed', location:'Việt Nam', summary:goal.padEnd(10,'.'), target:1 };
        next.workspaces.push({ id:id('workspace'), ownerId:userId, name, goal, profile, published:false, publishedAt:null, financial:null, createdAt:stamp, updatedAt:stamp });
        break;
      }
      case 'publish': {
        const project = owned(next,userId,action.workspaceId);
        project.profile = normalizeProfile(action.profile,project.profile); project.published = true; project.publishedAt = stamp; project.updatedAt = stamp;
        break;
      }
      case 'unpublish': { const project=owned(next,userId,action.workspaceId);project.published=false;project.updatedAt=stamp;break; }
      case 'toggle-watch':
      case 'toggle-compare': {
        requireInvestor(userId);
        const kind=action.type==='toggle-watch'?'watchlist':'compare';
        const workspaceId=text(action.workspaceId,'Mã workspace',1,200);
        const list=next.accounts[userId][kind], index=list.indexOf(workspaceId);
        // Removing an old selection is always available, even after unpublishing
        // or downgrading to a plan below the current saved-item count.
        if(index>=0) {list.splice(index,1);break;}
        const project=workspace(next,workspaceId);
        if(!project.published) throw error(404,'NOT_FOUND','Dự án chưa được công bố.');
        requireRoom(list.length,currentPlan[kind],kind);
        list.push(project.id);break;
      }
      case 'compare': {
        requireInvestor(userId);
        const selected=next.accounts[userId].compare;
        if(selected.length>currentPlan.compare) throw error(409,'LIMIT','Số startup đã chọn vượt hạn mức so sánh của gói hiện tại.',{feature:'compare',quota:{used:selected.length,limit:currentPlan.compare,remaining:0}});
        if(selected.length<2) throw error(400,'INVALID','Chọn ít nhất 2 startup để so sánh.');
        for(const workspaceId of selected) if(!workspace(next,workspaceId).published) throw error(404,'NOT_FOUND','Một dự án đã ngừng công bố. Bỏ chọn dự án đó trước khi so sánh.');
        break;
      }
      case 'request-access': {
        requireInvestor(userId);
        const project=workspace(next,action.workspaceId);
        if(!project.published) throw error(404,'NOT_FOUND','Dự án chưa được công bố.');
        const existing=next.requests.find(r=>r.investorId===userId && r.workspaceId===project.id && ['pending','approved'].includes(r.status));
        if(existing) throw error(409,'DUPLICATE','Bạn đã gửi yêu cầu hoặc được cấp quyền cho dự án này.');
        const current=bucket(next,userId);requireRoom(current.connections,currentPlan.connections,'connections');
        next.requests.push({ id:id('access'), workspaceId:project.id, investorId:userId, message:text(action.message,'Lời nhắn',10,1000), status:'pending', createdAt:stamp, updatedAt:stamp });
        current.connections++;
        break;
      }
      case 'decide-access': {
        const request=next.requests.find(r=>r.id===action.requestId);
        if(!request) throw error(404,'NOT_FOUND','Không tìm thấy yêu cầu.');
        owned(next,userId,request.workspaceId);
        if(!['approved','rejected','revoked'].includes(action.decision)) throw error(400,'INVALID','Quyết định không hợp lệ.');
        if(action.decision==='revoked' && request.status!=='approved') throw error(409,'CONFLICT','Chỉ thu hồi yêu cầu đang được duyệt.');
        if(action.decision!=='revoked' && request.status!=='pending') throw error(409,'CONFLICT','Yêu cầu đã được xử lý.');
        request.status=action.decision;request.updatedAt=stamp;
        break;
      }
      case 'upload-financial': {
        const project=owned(next,userId,action.workspaceId);const name=text(action.name,'Tên tệp',1,255);
        if(typeof action.csv!=='string'||Buffer.byteLength(action.csv,'utf8')>2_000_000) throw error(400,'INVALID','CSV không hợp lệ hoặc vượt 2 MB.');
        parseCSV(action.csv);
        project.financial={csv:action.csv,name,updatedAt:stamp};project.updatedAt=stamp;
        break;
      }
      case 'send-message': {
        const project=readable(next,userId,action.workspaceId);
        next.messages.push({id:id('message'),workspaceId:project.id,authorId:userId,authorName:user(userId).name,text:text(action.text,'Nội dung',1,5000),createdAt:stamp});
        break;
      }
      case 'record-investment': {
        requireInvestor(userId);const project=readable(next,userId,action.workspaceId);
        if(next.portfolio.some(p=>p.investorId===userId&&p.workspaceId===project.id)) throw error(409,'DUPLICATE','Khoản đầu tư này đã nằm trong danh mục.');
        requireRoom(next.portfolio.filter(p=>p.investorId===userId).length,currentPlan.portfolio,'portfolio');
        next.portfolio.push({id:id('position'),investorId:userId,workspaceId:project.id,startupName:project.profile.name,invested:number(action.invested,'Vốn đầu tư',0.01,1e9),ownership:number(action.ownership,'Tỷ lệ sở hữu',0.001,100),date:dateOnly(action.date),updates:[],createdAt:stamp});
        break;
      }
      case 'update-investment': {
        requireInvestor(userId);const position=next.portfolio.find(p=>p.id===action.positionId&&p.investorId===userId);
        if(!position) throw error(404,'NOT_FOUND','Không tìm thấy khoản đầu tư.');
        if(typeof action.period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(action.period)) throw error(400,'INVALID','Kỳ báo cáo phải có dạng YYYY-MM.');
        const update={period:action.period,revenue:number(action.revenue,'Doanh thu',0,1e9),cash:number(action.cash,'Tiền mặt',0,1e9),valuation:number(action.valuation,'Định giá',0.01,1e10)};
        position.updates=[...position.updates.filter(u=>u.period!==update.period),update].sort((a,b)=>a.period.localeCompare(b.period));break;
      }
      case 'change-plan': {
        if(!['free','plus','pro'].includes(action.tier)||!['monthly','annual'].includes(action.billing||'monthly')) throw error(400,'INVALID','Gói không hợp lệ.');
        next.accounts[userId].tier=action.tier;next.accounts[userId].billing=action.billing||'monthly';break;
      }
      case 'export-report': {
        const report=next.reports.find(r=>r.id===action.reportId);
        if(!report) throw error(404,'NOT_FOUND','Không tìm thấy báo cáo.');
        if(report.workspaceId) readable(next,userId,report.workspaceId);
        else if(report.authorId!==userId) throw error(403,'FORBIDDEN','Báo cáo không thuộc tài khoản của bạn.');
        if(!currentPlan.export) throw error(409,'LIMIT','Gói Free chỉ xem báo cáo trong ứng dụng. Nâng cấp để xuất báo cáo.',{feature:'export',quota:{used:0,limit:0,remaining:0}});
        break;
      }
      default: throw error(400,'INVALID','Thao tác không được hỗ trợ.');
    }
    persist(next);return snapshot(userId);
  }
  function getFinancial(userId, workspaceId) {
    user(userId);const project=readable(data,userId,workspaceId);
    if(!project.financial) throw error(404,'NOT_FOUND','Startup chưa tải báo cáo tài chính.');
    return structuredClone(project.financial);
  }
  function beginAnalysis(userId, options = {}) {
    user(userId);const next=structuredClone(data);
    let csv=options.csv,name=options.name||'Phân tích tài chính';
    if(options.workspaceId) {
      const project=readable(next,userId,options.workspaceId);
      if(!project.financial) throw error(404,'NOT_FOUND','Startup chưa tải báo cáo tài chính.');
      // Workspace analyses always use its approved server-side dataset.
      csv=project.financial.csv;name=project.financial.name;
    }
    if(typeof csv!=='string'||Buffer.byteLength(csv,'utf8')>2_000_000) throw error(400,'INVALID','CSV không hợp lệ hoặc vượt 2 MB.');
    const rows=parseCSV(csv), analysis=analyze(rows);
    const inputEstimate=integer(options.inputTokensEstimate ?? Math.ceil(JSON.stringify(rows).length/3)+400,'Token đầu vào ước tính',1,1_000_000);
    const maxOutputTokens=integer(options.maxOutputTokens ?? 700,'Giới hạn đầu ra',1,32000);
    const requiredTokens=inputEstimate+maxOutputTokens, quota=usage(next,userId);
    if(requiredTokens>quota.remaining) throw error(409,'LIMIT','Không đủ token để chạy phân tích AI.',{feature:'aiTokens',quota,required:requiredTokens});
    const key=bucketKey(next,userId), reservation={id:id('reservation'),kind:'analysis',userId,bucketKey:key,reservedTokens:requiredTokens,workspaceId:options.workspaceId||null,name:text(name,'Tên báo cáo',1,255),rows,analysis,status:'pending',createdAt:now().toISOString()};
    bucket(next,userId,key).aiTokens+=requiredTokens;next.reservations.push(reservation);persist(next);
    return {id:reservation.id,rows,analysis,inputEstimate,maxOutputTokens,requiredTokens,workspaceId:reservation.workspaceId,remaining:quota.remaining-requiredTokens};
  }
  function beginChat(userId, options = {}) {
    user(userId);const next=structuredClone(data);
    if(options.workspaceId) readable(next,userId,options.workspaceId);
    const inputEstimate=integer(options.inputTokensEstimate,'Token đầu vào ước tính',1,1_000_000);
    const maxOutputTokens=integer(options.maxOutputTokens ?? 400,'Giới hạn đầu ra',1,32000);
    const requiredTokens=inputEstimate+maxOutputTokens, quota=usage(next,userId);
    if(requiredTokens>quota.remaining) throw error(409,'LIMIT','Không đủ token để trò chuyện với AI.',{feature:'aiTokens',quota,required:requiredTokens});
    const key=bucketKey(next,userId), pending={id:id('reservation'),kind:'chat',userId,bucketKey:key,reservedTokens:requiredTokens,workspaceId:options.workspaceId||null,status:'pending',createdAt:now().toISOString()};
    bucket(next,userId,key).aiTokens+=requiredTokens;next.reservations.push(pending);persist(next);
    return {id:pending.id,kind:'chat',inputEstimate,maxOutputTokens,requiredTokens,workspaceId:pending.workspaceId,remaining:quota.remaining-requiredTokens};
  }
  function reservation(state,userId,reservationId) {
    user(userId);const found=state.reservations.find(r=>r.id===reservationId&&r.userId===userId);
    if(!found) throw error(404,'NOT_FOUND','Không tìm thấy lượt phân tích.');
    if(!['pending','uncertain'].includes(found.status)) throw error(409,'ALREADY_SETTLED','Lượt phân tích đã được ghi nhận.');
    return found;
  }
  function finishAnalysis(userId,reservationId,result) {
    const next=structuredClone(data), pending=reservation(next,userId,reservationId);
    if(pending.kind && pending.kind!=='analysis') throw error(409,'CONFLICT','Lượt này không phải phân tích tài chính.');
    const consumed=actualUsage(result.usage), report=validateReport(result.report);
    const current=bucket(next,userId,pending.bucketKey);
    // Actual provider usage is authoritative, including a rare estimate overrun.
    current.aiTokens=Math.max(0,current.aiTokens-pending.reservedTokens+consumed.totalTokens);current.analyses++;
    pending.status='completed';pending.actualTokens=consumed.totalTokens;pending.finishedAt=now().toISOString();
    const completed={id:id('report'),authorId:userId,workspaceId:pending.workspaceId,name:pending.name,analysis:pending.analysis,ai:report,model:text(result.model,'Model',1,150),provider:text(result.provider,'Nhà cung cấp',1,150),tokenUsage:{...consumed,estimated:false},requestId:typeof result.requestId==='string'?result.requestId:null,createdAt:now().toISOString()};
    next.reports.push(completed);pending.reportId=completed.id;persist(next);
    // Approval may have been revoked while the provider was running. Still settle costs,
    // but never send the private result back to a user who lost access.
    if(completed.workspaceId&&!canRead(data,userId,workspace(data,completed.workspaceId))) throw error(403,'FORBIDDEN','Quyền truy cập đã bị thu hồi trong lúc phân tích.');
    return structuredClone(completed);
  }
  function finishChat(userId,reservationId,result) {
    const next=structuredClone(data), pending=reservation(next,userId,reservationId);
    if(pending.kind!=='chat') throw error(409,'CONFLICT','Lượt này không phải trò chuyện AI.');
    const consumed=actualUsage(result.usage), reply=text(result.text,'Nội dung AI',1,16000);
    const current=bucket(next,userId,pending.bucketKey);
    current.aiTokens=Math.max(0,current.aiTokens-pending.reservedTokens+consumed.totalTokens);
    pending.status='completed';pending.actualTokens=consumed.totalTokens;pending.finishedAt=now().toISOString();
    const message={id:id('ai-chat'),authorId:userId,workspaceId:pending.workspaceId,text:reply,tokenUsage:{...consumed,estimated:false},model:text(result.model,'Model',1,150),provider:text(result.provider,'Nhà cung cấp',1,150),requestId:typeof result.requestId==='string'?result.requestId:null,createdAt:now().toISOString()};
    next.aiChats.push(message);pending.messageId=message.id;persist(next);
    if(message.workspaceId&&!canRead(data,userId,workspace(data,message.workspaceId))) throw error(403,'FORBIDDEN','Quyền truy cập đã bị thu hồi trong lúc AI trả lời.');
    return structuredClone(message);
  }
  function failAnalysis(userId,reservationId,providerUsage) {
    const next=structuredClone(data), pending=reservation(next,userId,reservationId);
    if(providerUsage?.unknown===true) {
      // A timeout can occur after the provider charged the request. Keep the hold
      // until a trusted operator/provider receipt can reconcile actual usage.
      pending.status='uncertain';pending.failedAt=now().toISOString();persist(next);return snapshot(userId);
    }
    const charged=providerUsage?actualUsage(providerUsage).totalTokens:0;
    const current=bucket(next,userId,pending.bucketKey);current.aiTokens=Math.max(0,current.aiTokens-pending.reservedTokens+charged);
    pending.status='failed';pending.actualTokens=charged;pending.finishedAt=now().toISOString();persist(next);return snapshot(userId);
  }
  return { snapshot, act, getFinancial, beginAnalysis, finishAnalysis, beginChat, finishChat, failAnalysis };
}
