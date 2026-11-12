import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ROLE_PLANS, weekKey, monthKey, parseCSV, analyze } from '../domain.js';
import { DEEP_DILIGENCE_KEYS } from '../diligence.js';
import { createInvestorCaseListings, createMarketplaceStartups, LEGACY_MARKETPLACE_IDS } from './marketplace-startups.mjs';

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
const freshData = () => ({ version: 1, revision: 0, accounts: Object.fromEntries(Object.keys(DEMO_USERS).map(userId => [userId, { tier: 'free', billing: 'monthly', ledgers: { free: freshBucket() }, watchlist: [], compare: [] }])), workspaces: [], cases: [], requests: [], messages: [], portfolio: [], reports: [], aiChats: [], reservations: [], workspaceDraft: null });

function publicImage(value, label, maxBytes) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || !/^data:image\/webp;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw error(400, 'INVALID', `${label} phải là ảnh WebP hợp lệ.`);
  const bytes = Buffer.from(value.slice('data:image/webp;base64,'.length), 'base64');
  if (bytes.length > maxBytes || bytes.length < 16 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw error(400, 'INVALID', `${label} vượt giới hạn hoặc không đúng định dạng.`);
  return value;
}
function privateDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error(400, 'INVALID', 'Tài liệu không hợp lệ.');
  const name = text(value.name, 'Tên tài liệu', 1, 120);
  const mimeType = /\.pdf$/i.test(name) ? 'application/pdf' : /\.xlsx$/i.test(name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '';
  const prefix = `data:${mimeType};base64,`;
  if (!mimeType || typeof value.data !== 'string' || !value.data.startsWith(prefix) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data.slice(prefix.length))) throw error(400, 'INVALID', 'Chỉ nhận PDF hoặc Excel XLSX.');
  const bytes = Buffer.from(value.data.slice(prefix.length), 'base64');
  const pdf = mimeType === 'application/pdf';
  if (bytes.length < 5 || bytes.length > 1_500_000 || (pdf ? bytes.toString('ascii', 0, 5) !== '%PDF-' : bytes.toString('ascii', 0, 4) !== 'PK\x03\x04')) throw error(400, 'INVALID', 'Tài liệu không hợp lệ hoặc vượt 1,5 MB.');
  if (!pdf && (!bytes.includes(Buffer.from('[Content_Types].xml')) || !bytes.includes(Buffer.from('xl/workbook.xml')) || bytes.includes(Buffer.from('vbaProject.bin')))) throw error(400, 'INVALID', 'XLSX không hợp lệ hoặc chứa macro.');
  return { name, data:value.data };
}
function normalizeMedia(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['cover','logo','productImage','productDemoUrl'].includes(key))) throw error(400, 'INVALID', 'Hình ảnh sản phẩm không hợp lệ.');
  const cover = publicImage(value.cover, 'Ảnh bìa', 200_000);
  const logo = publicImage(value.logo, 'Logo', 80_000);
  const productImage = publicImage(value.productImage, 'Ảnh sản phẩm', 200_000);
  const productDemoUrl = value.productDemoUrl ? text(value.productDemoUrl, 'Link sản phẩm', 1, 500) : '';
  if (productDemoUrl) {
    let url;try { url = new URL(productDemoUrl); } catch { throw error(400, 'INVALID', 'Link sản phẩm không hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw error(400, 'INVALID', 'Link sản phẩm phải là HTTPS và không chứa tài khoản.');
  }
  return cover || logo || productImage || productDemoUrl ? { cover, logo, productImage, productDemoUrl } : null;
}
function normalizeTeamPerson(value, label) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['name','title','bio','photo','photoConsent'].includes(key))) throw error(400, 'INVALID', `${label} không hợp lệ.`);
  if (!String(value.name || '').trim() && !String(value.title || '').trim() && !String(value.bio || '').trim()) return null;
  const photo = publicImage(value.photo, `Ảnh ${label}`, 80_000);
  if (photo && value.photoConsent !== true) throw error(400, 'INVALID', `Cần xác nhận quyền công bố ảnh ${label}.`);
  return { name: text(value.name, `Tên ${label}`, 1, 100), title: text(value.title || '', `Chức danh ${label}`, 0, 120), bio: text(value.bio || '', `Giới thiệu ${label}`, 0, 500), ...(photo ? { photo, photoConsent:true } : {}) };
}
function normalizeTeamRoster(value) {
  if (value == null) return { leader: null, coLeader: null, members: [] };
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['leader','coLeader','members'].includes(key))) throw error(400, 'INVALID', 'Danh sách đội ngũ không hợp lệ.');
  const members = value.members || [];
  if (!Array.isArray(members) || members.length > 8) throw error(400, 'INVALID', 'Tối đa 8 thành viên chủ chốt.');
  return { leader: normalizeTeamPerson(value.leader, 'Leader'), coLeader: normalizeTeamPerson(value.coLeader, 'Co-leader'), members: members.map(member => normalizeTeamPerson(member, 'thành viên chủ chốt')).filter(Boolean) };
}

function normalizeProfile(input, previous = {}) {
  const profile = { ...previous, ...(input || {}) };
  const optional = (value, label) => value == null ? '' : text(value, label, 0, 2000);
  const target = number(profile.target, 'Mục tiêu gọi vốn (triệu đồng)', 0.01, 1e10);
  const fundingRoundIndex = profile.fundingRoundIndex == null || profile.fundingRoundIndex === '' ? null : integer(profile.fundingRoundIndex, 'Giai đoạn huy động hiện tại', 1, 20);
  const fundingRoundTotal = profile.fundingRoundTotal == null || profile.fundingRoundTotal === '' ? null : integer(profile.fundingRoundTotal, 'Tổng giai đoạn huy động dự kiến', 1, 20);
  if ((fundingRoundIndex === null) !== (fundingRoundTotal === null) || fundingRoundIndex > fundingRoundTotal) throw error(400, 'INVALID', 'Hãy nhập đủ giai đoạn hiện tại và tổng giai đoạn; giai đoạn hiện tại không được lớn hơn tổng.');
  const raised = profile.raised == null || profile.raised === '' ? null : number(profile.raised, 'Vốn đã huy động (triệu đồng)', 0, target);
  const media = normalizeMedia(profile.media);
  return {
    name: text(profile.name, 'Tên startup', 1, 90),
    industry: text(profile.industry, 'Lĩnh vực', 1, 80),
    stage: text(profile.stage, 'Giai đoạn', 1, 50),
    location: text(profile.location, 'Địa điểm', 1, 100),
    summary: text(profile.summary, 'Thông tin giới thiệu', 10, 2000),
    target,
    fundingRoundIndex,
    fundingRoundTotal,
    raised,
    traction: optional(profile.traction, 'Bằng chứng thị trường'),
    customerReferences: optional(profile.customerReferences, 'Doanh nghiệp tiêu biểu'),
    market: optional(profile.market, 'Thị trường và đối thủ'),
    team: optional(profile.team, 'Đội ngũ'),
    teamRoster: normalizeTeamRoster(profile.teamRoster),
    useOfFunds: optional(profile.useOfFunds, 'Sử dụng vốn'),
    ...(media ? { media } : {}),
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

function backupInvalid() { return error(400, 'BACKUP_INVALID', 'Bản sao lưu workflow không hợp lệ; dữ liệu hiện tại được giữ nguyên.'); }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw backupInvalid();
}
function timestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw backupInvalid();
}
function sameValue(a,b) {
  if (Object.is(a,b)) return true;
  if (a===null || b===null || typeof a!=='object' || typeof b!=='object' || Array.isArray(a)!==Array.isArray(b)) return false;
  const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
  return aa.length===bb.length && aa.every((key,index)=>key===bb[index] && sameValue(a[key],b[key]));
}
function checkedAnalysis(value) {
  if (!object(value) || !Array.isArray(value.rows) || value.rows.length<2 || value.rows.length>60) throw backupInvalid();
  const columns=['period','revenue','cogs','opex','cash','operating_cash_flow','receivables'];
  for (const row of value.rows) {
    keys(row,columns);
    if (typeof row.period!=='string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period)) throw backupInvalid();
    for (const column of columns.slice(1)) number(row[column],column,column==='operating_cash_flow'?-1e12:0,1e12);
  }
  const rows=parseCSV([columns.join(','),...value.rows.map(row=>columns.map(column=>row[column]).join(','))].join('\n'));
  const calculated=analyze(rows);
  if (!sameValue(value,calculated)) throw backupInvalid();
  return calculated;
}

/** Validate trusted backups as well as disk state before they can change permissions or wallets. */
function validatedState(value) {
  try {
    const state=structuredClone(value);
    keys(state,['version','revision','accounts','workspaces','cases','requests','messages','portfolio','reports','aiChats','reservations','workspaceDraft']);
    if (state.version!==1) throw backupInvalid();
    integer(state.revision,'Revision');
    keys(state.accounts,Object.keys(DEMO_USERS));
    // The third test identity and these lists were absent in the first file format.
    // Never manufacture a fresh primary wallet when restoring incomplete data.
    if (!state.accounts.founder || !state.accounts.investor) throw backupInvalid();
    if(state.accounts.investor2===undefined)state.accounts.investor2=freshData().accounts.investor2;
    const actorId=(value,role)=>{if(typeof value!=='string'||!Object.hasOwn(DEMO_USERS,value)||role&&DEMO_USERS[value].role!==role)throw backupInvalid();return value;};
    const bucketValid=value=>value==='free'||typeof value==='string'&&(/^week:\d{4}-\d{2}-\d{2}$/.test(value)&&weekKey(new Date(`${value.slice(5)}T12:00:00+07:00`))===value.slice(5)||/^month:\d{4}-(0[1-9]|1[0-2])$/.test(value));
    for (const [userId,account] of Object.entries(state.accounts)) {
      keys(account,['tier','billing','ledgers','watchlist','compare']);
      if(typeof account.tier!=='string'||!Object.hasOwn(ROLE_PLANS[DEMO_USERS[userId].role],account.tier)||!['monthly','annual'].includes(account.billing)||!object(account.ledgers)||!Object.hasOwn(account.ledgers,'free'))throw backupInvalid();
      if(Object.keys(account.ledgers).length>10000)throw backupInvalid();
      for(const [key,bucket] of Object.entries(account.ledgers)) {
        if(!bucketValid(key))throw backupInvalid();keys(bucket,['aiTokens','connections','analyses']);
        for(const field of ['aiTokens','connections','analyses'])integer(bucket[field],field);
      }
      for(const kind of ['watchlist','compare']) {
        if(account[kind]===undefined)account[kind]=[];
        if(!Array.isArray(account[kind])||account[kind].length>10000||new Set(account[kind]).size!==account[kind].length)throw backupInvalid();
        account[kind].forEach(value=>text(value,'Mã workspace',1,200));
      }
    }
    if(state.aiChats===undefined)state.aiChats=[];
    if(state.cases===undefined)state.cases=[];
    if(state.workspaceDraft===undefined)state.workspaceDraft=null;
    if(state.workspaceDraft!==null){
      const draft=state.workspaceDraft;
      keys(draft,['ownerId','name','goal','profile','savedAt']);
      if(draft.ownerId!=='founder')throw backupInvalid();
      text(draft.name,'Tên workspace',1,90);text(draft.goal,'Mục tiêu',1,500);
      keys(draft.profile,['name','industry','stage','location','summary','target','fundingRoundIndex','fundingRoundTotal','raised','traction','customerReferences','market','team','teamRoster','useOfFunds','media']);
      draft.profile=normalizeProfile(draft.profile);timestamp(draft.savedAt);
    }
    const indexes={};
    for(const name of ['workspaces','cases','requests','messages','portfolio','reports','aiChats','reservations']) {
      if(!Array.isArray(state[name])||state[name].length>100000)throw backupInvalid();
      indexes[name]=new Map();for(const row of state[name]) {
        if(!object(row))throw backupInvalid();const key=text(row.id,'ID',1,200);
        if(indexes[name].has(key))throw backupInvalid();indexes[name].set(key,row);
      }
    }
    const project=id=>{const w=indexes.workspaces.get(id);if(!w)throw backupInvalid();return w;};
    const historicalAccess=(userId,workspaceId)=>project(workspaceId).ownerId===userId||state.requests.some(request=>request.workspaceId===workspaceId&&request.investorId===userId&&['approved','revoked'].includes(request.status));
    const optionalWorkspace=(workspaceId,userId)=>{if(workspaceId!==null){if(typeof workspaceId!=='string'||!historicalAccess(userId,workspaceId))throw backupInvalid();}};
    for(const w of state.workspaces) {
      keys(w,['id','ownerId','name','goal','profile','published','publishedAt','financial','diligence','createdAt','updatedAt','catalogListing','attachments']);actorId(w.ownerId,'founder');text(w.name,'Tên workspace',1,90);text(w.goal,'Mục tiêu',1,500);if(w.catalogListing!==undefined&&typeof w.catalogListing!=='boolean')throw backupInvalid();
      if(w.attachments===undefined)w.attachments=[];
      if(!Array.isArray(w.attachments)||w.attachments.length>3)throw backupInvalid();
      for(const document of w.attachments){keys(document,['id','name','data','createdAt']);text(document.id,'Mã tài liệu',1,200);privateDocument(document);timestamp(document.createdAt);}
      if(new Set(w.attachments.map(document=>document.id)).size!==w.attachments.length)throw backupInvalid();
      keys(w.profile,['name','industry','stage','location','summary','target','fundingRoundIndex','fundingRoundTotal','raised','traction','customerReferences','market','team','teamRoster','useOfFunds','media']);w.profile=normalizeProfile(w.profile);
      if(w.diligence===undefined)w.diligence={};
      keys(w.diligence,[...DEEP_DILIGENCE_KEYS]);
      for(const value of Object.values(w.diligence))text(value,'Nội dung thẩm định',0,5000);
      if(typeof w.published!=='boolean'||w.published&&w.publishedAt===null)throw backupInvalid();
      if(w.publishedAt!==null)timestamp(w.publishedAt);timestamp(w.createdAt);timestamp(w.updatedAt);
      if(w.financial!==null){keys(w.financial,['csv','name','updatedAt']);text(w.financial.name,'Tên tệp',1,255);timestamp(w.financial.updatedAt);if(typeof w.financial.csv!=='string'||Buffer.byteLength(w.financial.csv,'utf8')>2_000_000)throw backupInvalid();parseCSV(w.financial.csv);}
    }
    for(const item of state.cases){
      keys(item,['id','workspaceId','ownerId','title','summary','industry','stage','submittedAt','createdAt','updatedAt']);
      const parent=project(item.workspaceId);actorId(item.ownerId,'founder');if(item.ownerId!==parent.ownerId)throw backupInvalid();
      text(item.title,'Tên case',5,100);text(item.summary,'Mô tả case',20,2000);text(item.industry,'Lĩnh vực',2,80);
      if(item.stage==='awaiting_fee_configuration')item.stage='awaiting_payment';
      if(!['draft','awaiting_payment'].includes(item.stage))throw backupInvalid();
      if(item.stage==='draft'&&item.submittedAt!==null||item.stage==='awaiting_payment'&&item.submittedAt===null)throw backupInvalid();
      if(item.submittedAt!==null)timestamp(item.submittedAt);timestamp(item.createdAt);timestamp(item.updatedAt);
    }
    const activeRequests=new Set(),paymentIds=new Set(),requestCounts={};
    for(const r of state.requests) {
      keys(r,['id','workspaceId','investorId','message','status','payments','demoAccess','createdAt','updatedAt']);project(r.workspaceId);actorId(r.investorId,'investor');text(r.message,'Lời nhắn',10,1000);timestamp(r.createdAt);timestamp(r.updatedAt);if(r.demoAccess!==undefined&&(typeof r.demoAccess!=='boolean'||r.demoAccess&&r.status!=='approved'))throw backupInvalid();
      if(!['pending','approved','rejected','revoked'].includes(r.status))throw backupInvalid();
      if(r.payments!==undefined){
        keys(r.payments,['startup','investor']);
        for(const party of ['startup','investor']){
          const receipt=r.payments[party];
          if(receipt!==null){
            keys(receipt,['providerPaymentId','amountVnd','currency','paidAt']);
            const paymentId=text(receipt.providerPaymentId,'Mã giao dịch',1,200);
            if(paymentIds.has(paymentId)||receipt.amountVnd!==250_000||receipt.currency!=='VND'||r.status==='pending'||r.status==='rejected')throw backupInvalid();
            paymentIds.add(paymentId);timestamp(receipt.paidAt);
          }
        }
      }
      requestCounts[r.investorId]=(requestCounts[r.investorId]||0)+1;
      if(['pending','approved'].includes(r.status)){const pair=`${r.workspaceId}:${r.investorId}`;if(activeRequests.has(pair))throw backupInvalid();activeRequests.add(pair);}
    }
    for(const [userId,account] of Object.entries(state.accounts))for(const kind of ['watchlist','compare']) {
      if(DEMO_USERS[userId].role!=='investor'&&account[kind].length)throw backupInvalid();account[kind].forEach(project);
    }
    for(const [userId,count] of Object.entries(requestCounts))if(Object.values(state.accounts[userId].ledgers).reduce((sum,bucket)=>sum+bucket.connections,0)<count)throw backupInvalid();
    for(const m of state.messages) {
      keys(m,['id','workspaceId','authorId','authorName','text','createdAt']);actorId(m.authorId);if(!historicalAccess(m.authorId,m.workspaceId))throw backupInvalid();text(m.authorName,'Tên người gửi',1,100);text(m.text,'Tin nhắn',1,5000);timestamp(m.createdAt);
    }
    const positions=new Set();
    for(const p of state.portfolio) {
      keys(p,['id','investorId','workspaceId','startupName','invested','ownership','date','updates','createdAt']);actorId(p.investorId,'investor');if(!historicalAccess(p.investorId,p.workspaceId))throw backupInvalid();
      const pair=`${p.investorId}:${p.workspaceId}`;if(positions.has(pair))throw backupInvalid();positions.add(pair);
      text(p.startupName,'Tên startup',1,90);number(p.invested,'Vốn đầu tư',0.01,1e9);number(p.ownership,'Tỷ lệ sở hữu',0.001,100);dateOnly(p.date);timestamp(p.createdAt);
      if(!Array.isArray(p.updates)||p.updates.length>10000)throw backupInvalid();const periods=new Set();
      for(const u of p.updates){keys(u,['period','revenue','cash','valuation']);if(typeof u.period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(u.period)||periods.has(u.period))throw backupInvalid();periods.add(u.period);number(u.revenue,'Doanh thu',0,1e9);number(u.cash,'Tiền mặt',0,1e9);number(u.valuation,'Định giá',0.01,1e10);}
    }
    for(const r of state.reports) {
      keys(r,['id','authorId','workspaceId','name','analysis','ai','model','provider','tokenUsage','requestId','createdAt']);actorId(r.authorId);optionalWorkspace(r.workspaceId,r.authorId);text(r.name,'Tên báo cáo',1,255);r.analysis=checkedAnalysis(r.analysis);r.ai=validateReport(r.ai);timestamp(r.createdAt);
      for(const field of ['model','provider'])text(r[field],field,1,150);
      keys(r.tokenUsage,['inputTokens','outputTokens','totalTokens','estimated']);actualUsage(r.tokenUsage);if(r.tokenUsage.estimated!==false)throw backupInvalid();
      if(r.requestId!==null)text(r.requestId,'Mã yêu cầu',1,1000);
    }
    for(const m of state.aiChats) {
      keys(m,['id','authorId','workspaceId','sessionId','question','text','tokenUsage','model','provider','requestId','createdAt']);actorId(m.authorId);optionalWorkspace(m.workspaceId,m.authorId);if(m.sessionId!==undefined)text(m.sessionId,'Phiên chat',1,100);else delete m.sessionId;if(m.question!==undefined)text(m.question,'Câu hỏi',1,4000);else delete m.question;text(m.text,'Phản hồi AI',1,16000);timestamp(m.createdAt);for(const field of ['model','provider'])text(m[field],field,1,150);
      keys(m.tokenUsage,['inputTokens','outputTokens','totalTokens','estimated']);actualUsage(m.tokenUsage);if(m.tokenUsage.estimated!==false)throw backupInvalid();if(m.requestId!==null)text(m.requestId,'Mã yêu cầu',1,1000);
    }
    const charged={},linkedReports=new Set(),linkedChats=new Set();
    for(const r of state.reservations) {
      keys(r,['id','kind','userId','bucketKey','reservedTokens','workspaceId','name','rows','analysis','status','createdAt','actualTokens','finishedAt','failedAt','reportId','messageId']);actorId(r.userId);optionalWorkspace(r.workspaceId,r.userId);
      if(r.kind===undefined)r.kind='analysis';if(!['analysis','chat'].includes(r.kind)||!bucketValid(r.bucketKey)||!Object.hasOwn(state.accounts[r.userId].ledgers,r.bucketKey))throw backupInvalid();
      integer(r.reservedTokens,'Token tạm giữ',1);timestamp(r.createdAt);if(r.bucketKey!=='free'&&r.bucketKey!==`week:${weekKey(new Date(r.createdAt))}`&&r.bucketKey!==`month:${monthKey(new Date(r.createdAt))}`)throw backupInvalid();
      if(!['pending','uncertain','completed','failed'].includes(r.status))throw backupInvalid();
      if(r.kind==='analysis'){text(r.name,'Tên báo cáo',1,255);r.analysis=checkedAnalysis(r.analysis);if(!sameValue(r.rows,r.analysis.rows))throw backupInvalid();}
      else if(r.name!==undefined||r.rows!==undefined||r.analysis!==undefined)throw backupInvalid();
      if(r.failedAt!==undefined)timestamp(r.failedAt);
      if(r.status==='uncertain'&&r.failedAt===undefined)throw backupInvalid();
      let charge=r.reservedTokens;
      if(['completed','failed'].includes(r.status)){integer(r.actualTokens,'Token đã tính',r.status==='completed'?1:0);timestamp(r.finishedAt);charge=r.actualTokens;}
      else if(r.actualTokens!==undefined||r.finishedAt!==undefined||r.reportId!==undefined||r.messageId!==undefined)throw backupInvalid();
      if(r.status==='completed') {
        const record=r.kind==='analysis'?indexes.reports.get(r.reportId):indexes.aiChats.get(r.messageId);
        if(!record||record.authorId!==r.userId||record.workspaceId!==r.workspaceId||record.tokenUsage.totalTokens!==r.actualTokens||r.kind==='analysis'&&!sameValue(record.analysis,r.analysis))throw backupInvalid();
        const links=r.kind==='analysis'?linkedReports:linkedChats;if(links.has(record.id))throw backupInvalid();links.add(record.id);
      } else if(r.reportId!==undefined||r.messageId!==undefined)throw backupInvalid();
      const ledger=`${r.userId}:${r.bucketKey}`;charged[ledger] ||= {tokens:0,analyses:0};charged[ledger].tokens+=charge;if(r.kind==='analysis'&&r.status==='completed')charged[ledger].analyses++;
      if(!Number.isSafeInteger(charged[ledger].tokens))throw backupInvalid();
      const wallet=state.accounts[r.userId].ledgers[r.bucketKey];if(wallet.aiTokens<charged[ledger].tokens||wallet.analyses<charged[ledger].analyses)throw backupInvalid();
    }
    if(linkedReports.size!==state.reports.length||linkedChats.size!==state.aiChats.length)throw backupInvalid();
    return state;
  } catch { throw backupInvalid(); }
}

/** Synchronous persistence also supports a Durable Object SQLite callback. */
export function createWorkflowStore({ filePath, now = () => new Date(), initialData, onPersist, seedMarketplace = false } = {}) {
  if(onPersist!==undefined&&(typeof onPersist!=='function'||onPersist.constructor?.name==='AsyncFunction'))throw new TypeError('onPersist must be a synchronous function.');
  if(filePath&&onPersist)throw new TypeError('Choose file persistence or onPersist, not both.');
  let loaded=initialData;
  if(loaded===undefined&&filePath&&fs.existsSync(filePath)){const bytes=fs.readFileSync(filePath,'utf8');try{loaded=JSON.parse(bytes);}catch{throw backupInvalid();}}
  let catalogChanged=false;
  if(loaded&&typeof loaded==='object'&&Array.isArray(loaded.workspaces)){
    loaded=structuredClone(loaded);
    const replaceId=id=>LEGACY_MARKETPLACE_IDS[id]||id;
    for(const workspace of loaded.workspaces){
      const nextId=replaceId(workspace?.id);
      if(nextId!==workspace?.id){workspace.id=nextId;workspace.catalogListing=true;catalogChanged=true;}
      if(workspace&&Object.hasOwn(workspace,'isDemo')){workspace.catalogListing=Boolean(workspace.isDemo);delete workspace.isDemo;catalogChanged=true;}
    }
    for(const account of Object.values(loaded.accounts||{}))for(const key of ['watchlist','compare'])if(Array.isArray(account[key]))account[key]=account[key].map(replaceId);
    for(const name of ['cases','requests','messages','portfolio','reports','aiChats','reservations'])if(Array.isArray(loaded[name]))for(const row of loaded[name])if(typeof row?.workspaceId==='string')row.workspaceId=replaceId(row.workspaceId);
  }
  if(seedMarketplace){
    const stamp=new Date(now()).toISOString(), examples=createMarketplaceStartups(stamp);
    if(loaded===undefined){loaded={...freshData(),workspaces:examples};catalogChanged=true;}
    else if(Array.isArray(loaded.workspaces)){
      const byId=new Map(examples.map(workspace=>[workspace.id,workspace]));
      const existing=new Set(loaded.workspaces.map(workspace=>workspace?.id));
      const workspaces=loaded.workspaces.map(current=>{
        const example=byId.get(current?.id);
        if(!example)return current;
        const next={...current,...example,financial:current.financial||example.financial,diligence:{...example.diligence,...(current.diligence||{})},createdAt:current.createdAt,publishedAt:current.publishedAt||example.publishedAt,updatedAt:current.updatedAt};
        if(!sameValue(next,current)){next.updatedAt=stamp;catalogChanged=true;}
        return next;
      });
      const missing=examples.filter(workspace=>!existing.has(workspace.id));
      if(missing.length){workspaces.push(...missing);catalogChanged=true;}
      if(catalogChanged)loaded={...loaded,workspaces};
    }
  }
  let data=validatedState(loaded===undefined?freshData():loaded);
  function user(userId) {
    if (!Object.hasOwn(DEMO_USERS, userId)) throw error(401, 'SESSION', 'Chọn vai trò để tiếp tục.');
    return DEMO_USERS[userId];
  }
  function plan(state, userId) { return { ...ROLE_PLANS[user(userId).role][state.accounts[userId].tier], billing: state.accounts[userId].billing }; }
  function bucketKey(state, userId) { return state.accounts[userId].tier === 'free' ? 'free' : user(userId).role==='investor' ? `month:${monthKey(now())}` : `week:${weekKey(now())}`; }
  function initialBucket(state,userId,key){
    if(!key.startsWith('month:'))return freshBucket();
    const month=key.slice(6),start=Date.parse(`${month}-01T00:00:00+07:00`),end=Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)-7*3600000;
    const weeks=Object.entries(state.accounts[userId].ledgers).filter(([name])=>name.startsWith('week:')&&Date.parse(`${name.slice(5)}T00:00:00+07:00`)+7*86400000>start&&Date.parse(`${name.slice(5)}T00:00:00+07:00`)<end);
    return {aiTokens:weeks.reduce((sum,[,value])=>sum+value.aiTokens,0),connections:weeks.reduce((sum,[,value])=>sum+value.connections,0),analyses:weeks.reduce((sum,[,value])=>sum+value.analyses,0)};
  }
  function bucket(state, userId, key = bucketKey(state, userId)) {
    state.accounts[userId].ledgers[key] ||= initialBucket(state,userId,key);
    return state.accounts[userId].ledgers[key];
  }
  function usage(state, userId) {
    const selected = plan(state, userId), key = bucketKey(state, userId), current = state.accounts[userId].ledgers[key] || initialBucket(state,userId,key);
    const period = selected.tier === 'free' ? 'lifetime' : user(userId).role==='investor' ? 'monthly' : 'weekly';
    const resetAt = period === 'lifetime' ? null : period==='weekly' ? new Date(Date.parse(`${key.slice(5)}T00:00:00+07:00`) + 7*86400000).toISOString() : new Date(Date.UTC(Number(key.slice(6,10)),Number(key.slice(11,13)),1)-7*3600000).toISOString();
    const awaiting=state.reservations.filter(r=>r.userId===userId && r.bucketKey===key && ['pending','uncertain'].includes(r.status));
    return { used: current.aiTokens, limit: selected.aiTokens, remaining: Math.max(0, selected.aiTokens-current.aiTokens), period, resetAt, connections: { used: current.connections, limit: selected.connections, remaining: Math.max(0, selected.connections-current.connections) }, analyses: current.analyses, pendingTokens:awaiting.reduce((sum,r)=>sum+r.reservedTokens,0), pendingAnalyses:awaiting.length };
  }
  function persist(next) {
    if(data.revision===Number.MAX_SAFE_INTEGER)throw error(409,'REVISION_LIMIT','Revision đã vượt phạm vi lưu trữ an toàn.');
    next.revision = data.revision + 1;
    if(onPersist) {
      const result=onPersist(structuredClone(next));
      if(result&&typeof result.then==='function')throw new TypeError('onPersist must finish synchronously.');
    }
    if (filePath) {
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
      const temporary = `${filePath}.${randomUUID()}.tmp`;
      try { fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 }); fs.renameSync(temporary, filePath); }
      finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    }
    data = next;
  }
  if(catalogChanged)persist(data);
  function exportData() { return structuredClone(data); }
  function restoreData(backup, { expectedRevision } = {}) {
    integer(expectedRevision,'Revision mong đợi');
    if(expectedRevision!==data.revision)throw error(409,'REVISION_CONFLICT','Dữ liệu đã thay đổi. Hãy tải lại revision trước khi khôi phục.');
    if(data.reservations.some(value=>['pending','uncertain'].includes(value.status)))throw error(409,'AI_PENDING','Chờ hoàn tất hoặc đối soát các yêu cầu AI hiện tại trước khi khôi phục.');
    const next=validatedState(backup);persist(next);return exportData();
  }
  function workspace(state, workspaceId) {
    const found = state.workspaces.find(w => w.id === workspaceId);
    if (!found) throw error(404, 'NOT_FOUND', 'Không tìm thấy workspace.');
    return found;
  }
  function canRead(state, userId, project) {
    return project.ownerId === userId || state.requests.some(request => request.workspaceId === project.id && request.investorId === userId && request.status === 'approved' && (request.demoAccess===true||request.payments?.startup&&request.payments?.investor));
  }
  function readable(state, userId, workspaceId) {
    const project = workspace(state, workspaceId);
    if (!canRead(state, userId, project)) throw error(403, 'FORBIDDEN', 'Hồ sơ riêng chỉ mở sau khi Startup đồng ý và hai khoản phí được xác nhận, hoặc được bỏ qua trong chế độ demo.');
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
      workspaceDraft: actor.role==='founder' ? data.workspaceDraft : null,
      workspaces: accessible.map(w => ({ ...w, attachments:(w.attachments||[]).map(({id,name,createdAt})=>({id,name,createdAt})), isOwner: w.ownerId === userId, canManage: w.ownerId === userId })),
      marketplace: data.workspaces.filter(w => w.published).map(publicProject),
      publicCases: createInvestorCaseListings(data.workspaces),
      cases: data.cases.filter(item=>item.ownerId===userId),
      watchlist: data.accounts[userId].watchlist,
      compare: data.accounts[userId].compare,
      requests: data.requests.filter(r => r.investorId === userId || data.workspaces.find(w => w.id === r.workspaceId)?.ownerId === userId).map(r => ({ ...r, payments:{startup:Boolean(r.payments?.startup),investor:Boolean(r.payments?.investor)}, investorName: user(r.investorId).name, workspaceName: data.workspaces.find(w => w.id === r.workspaceId)?.profile.name })),
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
      case 'save-workspace-draft': {
        if (user(userId).role !== 'founder') throw error(403, 'FORBIDDEN', 'Chỉ Startup được lưu nháp workspace.');
        const name=text(action.name,'Tên workspace',1,90), goal=text(action.goal,'Mục tiêu',1,500);
        const profile=normalizeProfile(action.profile);
        next.workspaceDraft={ownerId:userId,name,goal,profile,savedAt:stamp};
        break;
      }
      case 'create-workspace': {
        if (user(userId).role !== 'founder') throw error(403, 'FORBIDDEN', 'Chỉ Startup được tạo workspace.');
        requireRoom(next.workspaces.filter(w => w.ownerId === userId && !w.catalogListing).length, currentPlan.workspaces, 'workspaces');
        const name = text(action.name, 'Tên workspace', 1, 90), goal = text(action.goal, 'Mục tiêu', 1, 500);
        const profile = action.profile ? normalizeProfile(action.profile) : { name, industry:'Chưa công bố', stage:'Pre-seed', location:'Việt Nam', summary:goal.padEnd(10,'.'), target:1 };
        next.workspaces.push({ id:id('workspace'), ownerId:userId, name, goal, profile, published:false, publishedAt:null, financial:null, diligence:{}, createdAt:stamp, updatedAt:stamp });
        next.workspaceDraft=null;
        break;
      }
      case 'add-attachment': {
        const project=owned(next,userId,action.workspaceId);
        project.attachments ||= [];
        if(project.attachments.length>=3)throw error(409,'LIMIT','Tối đa 3 tài liệu riêng cho mỗi workspace.');
        const document=privateDocument(action);
        project.attachments.push({id:id('document'),...document,createdAt:stamp});project.updatedAt=stamp;
        break;
      }
      case 'remove-attachment': {
        const project=owned(next,userId,action.workspaceId);
        const index=(project.attachments||[]).findIndex(document=>document.id===action.documentId);
        if(index<0)throw error(404,'NOT_FOUND','Không tìm thấy tài liệu.');
        project.attachments.splice(index,1);project.updatedAt=stamp;
        break;
      }
      case 'create-case': {
        const project=owned(next,userId,action.workspaceId);
        next.cases.push({id:id('case'),workspaceId:project.id,ownerId:userId,title:text(action.title,'Tên case',5,100),summary:text(action.summary,'Mô tả case',20,2000),industry:project.profile.industry,stage:'draft',submittedAt:null,createdAt:stamp,updatedAt:stamp});
        break;
      }
      case 'update-case':
      case 'submit-case':
      case 'withdraw-case': {
        const item=next.cases.find(entry=>entry.id===action.caseId);
        if(!item)throw error(404,'NOT_FOUND','Không tìm thấy case.');
        owned(next,userId,item.workspaceId);
        if(action.type==='update-case'){
          if(item.stage!=='draft')throw error(409,'CONFLICT','Rút case về bản nháp trước khi sửa.');
          item.title=text(action.title,'Tên case',5,100);item.summary=text(action.summary,'Mô tả case',20,2000);
        }else if(action.type==='submit-case'){
          if(item.stage!=='draft')throw error(409,'CONFLICT','Case đã được gửi.');
          item.stage='awaiting_payment';item.submittedAt=stamp;
        }else{
          if(item.stage!=='awaiting_payment')throw error(409,'CONFLICT','Chỉ rút case đang chờ mở thanh toán.');
          item.stage='draft';item.submittedAt=null;
        }
        item.updatedAt=stamp;break;
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
        request.status=action.decision;if(action.decision==='approved'){request.payments={startup:null,investor:null};request.demoAccess=false;}request.updatedAt=stamp;
        break;
      }
      case 'bypass-connection-fee-demo': {
        const request=next.requests.find(r=>r.id===action.requestId);
        if(!request)throw error(404,'NOT_FOUND','Không tìm thấy yêu cầu.');
        if(request.status!=='approved'||request.investorId!==userId&&workspace(next,request.workspaceId).ownerId!==userId)throw error(403,'FORBIDDEN','Chỉ hai bên trong yêu cầu đã được duyệt mới có thể mở quyền demo.');
        request.demoAccess=true;request.updatedAt=stamp;
        break;
      }
      case 'upload-financial': {
        const project=owned(next,userId,action.workspaceId);const name=text(action.name,'Tên tệp',1,255);
        if(typeof action.csv!=='string'||Buffer.byteLength(action.csv,'utf8')>2_000_000) throw error(400,'INVALID','CSV không hợp lệ hoặc vượt 2 MB.');
        parseCSV(action.csv);
        project.financial={csv:action.csv,name,updatedAt:stamp};project.updatedAt=stamp;
        break;
      }
      case 'update-diligence': {
        const project=owned(next,userId,action.workspaceId);
        if(!DEEP_DILIGENCE_KEYS.has(action.field))throw error(400,'INVALID','Mục thẩm định không hợp lệ.');
        const value=text(action.value,'Nội dung thẩm định',0,5000);
        project.diligence ||= {};
        if(value)project.diligence[action.field]=value;
        else delete project.diligence[action.field];
        project.updatedAt=stamp;
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
  // This method is deliberately absent from user actions and HTTP routes.
  // A future payment webhook adapter must authenticate the provider before calling it.
  function settleConnectionPayment({requestId,party,providerPaymentId,amountVnd,currency}={}) {
    const next=structuredClone(data),request=next.requests.find(row=>row.id===requestId);
    if(!request)throw error(404,'NOT_FOUND','Không tìm thấy yêu cầu kết nối.');
    if(!['startup','investor'].includes(party))throw error(400,'INVALID','Bên thanh toán không hợp lệ.');
    if(amountVnd!==250_000||currency!=='VND')throw error(400,'AMOUNT','Khoản phí kết nối không khớp.');
    const paymentId=text(providerPaymentId,'Mã giao dịch',1,200);
    if(request.status!=='approved')throw error(409,'CONFLICT','Yêu cầu chưa được Startup đồng ý hoặc đã thu hồi.');
    const existing=request.payments?.[party];
    if(existing){if(existing.providerPaymentId===paymentId)return structuredClone(request);throw error(409,'ALREADY_PAID','Bên này đã thanh toán.');}
    if(next.requests.some(row=>Object.values(row.payments||{}).some(receipt=>receipt?.providerPaymentId===paymentId)))throw error(409,'DUPLICATE_PAYMENT','Mã giao dịch đã được ghi nhận.');
    request.payments ||= {startup:null,investor:null};
    request.payments[party]={providerPaymentId:paymentId,amountVnd,currency,paidAt:now().toISOString()};
    request.updatedAt=now().toISOString();persist(next);return structuredClone(request);
  }
  function getFinancial(userId, workspaceId) {
    user(userId);const project=readable(data,userId,workspaceId);
    if(!project.financial) throw error(404,'NOT_FOUND','Startup chưa tải báo cáo tài chính.');
    return structuredClone(project.financial);
  }
  function getAttachment(userId, workspaceId, documentId) {
    const project=readable(data,userId,workspaceId);
    const document=(project.attachments||[]).find(item=>item.id===documentId);
    if(!document)throw error(404,'NOT_FOUND','Không tìm thấy tài liệu.');
    return {name:document.name,data:document.data};
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
  function finishChat(userId,reservationId,result,metadata={}) {
    const next=structuredClone(data), pending=reservation(next,userId,reservationId);
    if(pending.kind!=='chat') throw error(409,'CONFLICT','Lượt này không phải trò chuyện AI.');
    const consumed=actualUsage(result.usage), reply=text(result.text,'Nội dung AI',1,16000);
    const current=bucket(next,userId,pending.bucketKey);
    current.aiTokens=Math.max(0,current.aiTokens-pending.reservedTokens+consumed.totalTokens);
    pending.status='completed';pending.actualTokens=consumed.totalTokens;pending.finishedAt=now().toISOString();
    const message={id:id('ai-chat'),authorId:userId,workspaceId:pending.workspaceId,sessionId:metadata.sessionId===undefined?undefined:text(metadata.sessionId,'Phiên chat',1,100),question:metadata.question===undefined?undefined:text(metadata.question,'Câu hỏi',1,4000),text:reply,tokenUsage:{...consumed,estimated:false},model:text(result.model,'Model',1,150),provider:text(result.provider,'Nhà cung cấp',1,150),requestId:typeof result.requestId==='string'?result.requestId:null,createdAt:now().toISOString()};
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
  return { snapshot, act, settleConnectionPayment, getFinancial, getAttachment, beginAnalysis, finishAnalysis, beginChat, finishChat, failAnalysis, exportData, restoreData };
}
