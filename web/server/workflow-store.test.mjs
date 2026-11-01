import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorkflowStore } from './workflow-store.mjs';
import { SAMPLE_CSV, ROLE_PLANS } from '../domain.js';

const profile={name:'New Lotus',industry:'Fintech',stage:'Seed',location:'TP.HCM',summary:'Giải pháp thanh toán minh bạch cho doanh nghiệp nhỏ.',target:8000};
const create=store=>store.act('founder',{type:'create-workspace',name:'Gọi vốn Seed',goal:'Chuẩn bị hồ sơ và thẩm định',profile}).workspaces[0];
const code=expected=>e=>e.code===expected;
function publishAndUpload(store) {
  const project=create(store);
  store.act('founder',{type:'publish',workspaceId:project.id});
  store.act('founder',{type:'upload-financial',workspaceId:project.id,name:'financial.csv',csv:SAMPLE_CSV});
  return project;
}
function approve(store,workspaceId,investor='investor') {
  const snap=store.act(investor,{type:'request-access',workspaceId,message:'Tôi muốn thẩm định tài chính trước khi trao đổi.'});
  const request=snap.requests.find(r=>r.workspaceId===workspaceId&&r.status==='pending');
  store.act('founder',{type:'decide-access',requestId:request.id,decision:'approved'});
  return request;
}
const aiResult=(tokens=150)=>({model:'test-model',provider:'test-provider',requestId:'request-test',report:{summary:'Dữ liệu cho thấy tăng trưởng doanh thu nhưng dòng tiền âm.',riskLevel:'medium',strengths:['Doanh thu tăng'],risks:[{title:'Dòng tiền âm',reason:'Cần vốn hoạt động',evidence:'Dòng tiền hoạt động -50 triệu đồng tháng 2026-09'}],questions:['Khi nào hòa vốn?'],limitations:['Chỉ dữ liệu được cung cấp']},usage:{inputTokens:tokens-50,outputTokens:50,totalTokens:tokens}});

test('full workflow protects private finance until founder approves and then enables messages and investment tracking',()=>{
  const store=createWorkflowStore();const project=create(store);
  assert.equal(store.snapshot('investor').marketplace.length,0);
  assert.equal(store.snapshot('investor').workspaces.length,0);
  store.act('founder',{type:'upload-financial',workspaceId:project.id,name:'private.csv',csv:SAMPLE_CSV});
  store.act('founder',{type:'publish',workspaceId:project.id});
  let investor=store.snapshot('investor');
  assert.equal(investor.marketplace.length,1);
  assert.equal(investor.marketplace[0].profile.summary,profile.summary);
  assert.equal(JSON.stringify(investor).includes('operating_cash_flow'),false);
  assert.equal(JSON.stringify(investor).includes('private.csv'),false);
  assert.throws(()=>store.getFinancial('investor',project.id),code('FORBIDDEN'));
  const requested=store.act('investor',{type:'request-access',workspaceId:project.id,message:'Cho tôi xem hồ sơ để thẩm định.'});
  assert.equal(requested.requests[0].status,'pending');
  assert.equal(requested.workspaces.length,0);
  assert.throws(()=>store.act('investor',{type:'send-message',workspaceId:project.id,text:'Bình luận'}),code('FORBIDDEN'));
  assert.throws(()=>store.act('investor',{type:'record-investment',workspaceId:project.id,invested:200,ownership:2,date:'2026-11-01'}),code('FORBIDDEN'));
  assert.equal(store.snapshot('founder').requests[0].investorName,'Nhà đầu tư');
  store.act('founder',{type:'decide-access',requestId:requested.requests[0].id,decision:'approved'});
  assert.equal(store.getFinancial('investor',project.id).csv,SAMPLE_CSV);
  investor=store.snapshot('investor');assert.equal(investor.workspaces[0].isOwner,false);
  store.act('investor',{type:'send-message',workspaceId:project.id,text:'Doanh thu này đã đối soát với ngân hàng chưa?'});
  store.act('founder',{type:'send-message',workspaceId:project.id,text:'Sẽ bổ sung đối soát cho kỳ này.'});
  assert.equal(store.snapshot('investor').messages.length,2);
  investor=store.act('investor',{type:'record-investment',workspaceId:project.id,invested:200,ownership:2,date:'2026-11-01'});
  const position=investor.portfolio[0];assert.equal(position.investorId,'investor');
  investor=store.act('investor',{type:'update-investment',positionId:position.id,period:'2026-11',revenue:500,cash:1500,valuation:20000});
  assert.equal(investor.portfolio[0].updates[0].revenue,500);
  assert.equal(store.snapshot('investor2').messages.length,0);
  assert.equal(store.snapshot('investor2').portfolio.length,0);
});

test('actor identity, ownership and resource boundaries cannot be forged in action bodies',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store);
  for(const tier of ['free','plus','pro']) {
    store.act('investor',{type:'change-plan',tier});
    assert.throws(()=>store.act('investor',{type:'create-workspace',role:'founder',ownerId:'founder',name:'Spoof',goal:'Spoof',profile}),code('FORBIDDEN'));
  }
  assert.throws(()=>store.act('__proto__',{type:'change-plan',tier:'pro'}),code('SESSION'));
  assert.throws(()=>store.act('investor',{type:'publish',workspaceId:project.id,ownerId:'investor',role:'founder'}),code('FORBIDDEN'));
  assert.throws(()=>store.act('investor',{type:'upload-financial',workspaceId:project.id,name:'spoof.csv',csv:SAMPLE_CSV}),code('FORBIDDEN'));
  const request=store.act('investor',{type:'request-access',workspaceId:project.id,message:'Tôi muốn xem hồ sơ tài chính.',investorId:'investor2'}).requests[0];
  assert.equal(request.investorId,'investor');
  assert.throws(()=>store.act('investor',{type:'decide-access',requestId:request.id,decision:'approved',ownerId:'founder'}),code('FORBIDDEN'));
  approve(store,project.id,'investor2');
  assert.throws(()=>store.beginAnalysis('investor',{workspaceId:project.id,csv:SAMPLE_CSV,inputTokensEstimate:1,maxOutputTokens:1}),code('FORBIDDEN'));
  assert.throws(()=>store.act('founder',{type:'request-access',workspaceId:project.id,message:'Not an investor'}),code('FORBIDDEN'));
  assert.throws(()=>create(store),code('LIMIT'));
});

test('revoking access removes private data, messages, workspace reports and blocks further analysis',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store),request=approve(store,project.id);
  store.act('investor',{type:'send-message',workspaceId:project.id,text:'Private due diligence message'});
  const pending=store.beginAnalysis('investor',{workspaceId:project.id,inputTokensEstimate:100,maxOutputTokens:100});
  store.finishAnalysis('investor',pending.id,aiResult());
  assert.equal(store.snapshot('investor').reports.length,1);
  store.act('founder',{type:'decide-access',requestId:request.id,decision:'revoked'});
  const revoked=store.snapshot('investor');
  assert.equal(revoked.workspaces.length,0);assert.equal(revoked.reports.length,0);assert.equal(revoked.messages.length,0);
  assert.equal(revoked.marketplace.length,1);assert.equal(revoked.requests[0].status,'revoked');
  assert.throws(()=>store.getFinancial('investor',project.id),code('FORBIDDEN'));
  assert.throws(()=>store.beginAnalysis('investor',{workspaceId:project.id}),code('FORBIDDEN'));
  assert.equal(store.snapshot('founder').reports.length,1);
});

test('approval revoked during an in-flight provider request settles cost without returning the private result',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store),request=approve(store,project.id);
  const pending=store.beginAnalysis('investor',{workspaceId:project.id,inputTokensEstimate:100,maxOutputTokens:100});
  store.act('founder',{type:'decide-access',requestId:request.id,decision:'revoked'});
  assert.throws(()=>store.finishAnalysis('investor',pending.id,aiResult()),code('FORBIDDEN'));
  assert.equal(store.snapshot('investor').usage.used,150);
  assert.equal(store.snapshot('investor').reports.length,0);
  assert.equal(store.snapshot('founder').reports.length,1);
  assert.throws(()=>store.failAnalysis('investor',pending.id),code('ALREADY_SETTLED'));
});

test('token reservation prevents concurrent overspend and settles actual provider usage exactly once',()=>{
  const store=createWorkflowStore();
  const first=store.beginAnalysis('founder',{csv:SAMPLE_CSV,name:'Independent',inputTokensEstimate:500,maxOutputTokens:500});
  assert.equal(store.snapshot('founder').usage.remaining,1000);
  const second=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});
  assert.equal(store.snapshot('founder').usage.remaining,0);
  assert.throws(()=>store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:1,maxOutputTokens:1}),code('LIMIT'));
  const report=store.finishAnalysis('founder',first.id,aiResult(800));
  assert.equal(report.tokenUsage.totalTokens,800);assert.equal(report.tokenUsage.estimated,false);
  assert.equal(store.snapshot('founder').usage.remaining,200);
  assert.throws(()=>store.finishAnalysis('founder',first.id,aiResult(800)),code('ALREADY_SETTLED'));
  store.failAnalysis('founder',second.id);
  assert.equal(store.snapshot('founder').usage.used,800);
  assert.equal(store.snapshot('founder').usage.analyses,1);
  assert.equal(store.snapshot('investor').usage.used,0);
});

test('Free lifetime and shared paid weekly ledgers survive plan changes and Vietnam Monday boundary',()=>{
  let clock=new Date('2026-11-01T16:59:00Z');const store=createWorkflowStore({now:()=>clock});
  const free=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});store.finishAnalysis('founder',free.id,aiResult(700));
  store.act('founder',{type:'change-plan',tier:'plus'});
  const paid=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});store.finishAnalysis('founder',paid.id,aiResult(700));
  store.act('founder',{type:'change-plan',tier:'pro'});assert.equal(store.snapshot('founder').usage.used,700);
  store.act('founder',{type:'change-plan',tier:'free'});assert.equal(store.snapshot('founder').usage.used,700);
  clock=new Date('2026-11-01T17:00:00Z');assert.equal(store.snapshot('founder').usage.used,700);
  store.act('founder',{type:'change-plan',tier:'plus'});assert.equal(store.snapshot('founder').usage.used,0);
  assert.equal(store.snapshot('founder').usage.resetAt,'2026-11-08T17:00:00.000Z');
  clock=new Date('2028-01-01T00:00:00Z');store.act('founder',{type:'change-plan',tier:'free'});assert.equal(store.snapshot('founder').usage.used,700);assert.equal(store.snapshot('founder').usage.resetAt,null);
});

test('settlement after a new week or after a downgrade debits the reserved period only',()=>{
  let clock=new Date('2026-11-01T16:59:00Z');const store=createWorkflowStore({now:()=>clock});
  store.act('founder',{type:'change-plan',tier:'plus'});
  const oldWeek=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});
  clock=new Date('2026-11-01T17:00:00Z');assert.equal(store.snapshot('founder').usage.used,0);
  const newWeek=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:100,maxOutputTokens:100});
  store.finishAnalysis('founder',oldWeek.id,aiResult(700));assert.equal(store.snapshot('founder').usage.used,200);
  store.act('founder',{type:'change-plan',tier:'free'});store.finishAnalysis('founder',newWeek.id,aiResult());assert.equal(store.snapshot('founder').usage.used,0);
  store.act('founder',{type:'change-plan',tier:'plus'});assert.equal(store.snapshot('founder').usage.used,150);
});

test('persistent snapshots and pending reservations survive server restart without granting new credits',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'2g2bt-workflow-'));
  try {
    const filePath=path.join(directory,'data.json');let store=createWorkflowStore({filePath});const project=publishAndUpload(store);approve(store,project.id);
    const pending=store.beginAnalysis('founder',{workspaceId:project.id,inputTokensEstimate:500,maxOutputTokens:500});
    store=createWorkflowStore({filePath});assert.equal(store.snapshot('founder').usage.remaining,1000);assert.equal(store.getFinancial('investor',project.id).csv,SAMPLE_CSV);
    store.finishAnalysis('founder',pending.id,aiResult(700));store=createWorkflowStore({filePath});assert.equal(store.snapshot('founder').usage.used,700);assert.equal(store.snapshot('founder').reports.length,1);
    const copied=store.snapshot('founder');copied.workspaces[0].financial.csv='tampered';assert.equal(store.getFinancial('investor',project.id).csv,SAMPLE_CSV);
  } finally { fs.rmSync(directory,{recursive:true,force:true}); }
});

test('failed AI output charges reported usage but invalid financial data never reserves tokens',()=>{
  const store=createWorkflowStore();
  assert.throws(()=>store.beginAnalysis('founder',{csv:'invalid'}));assert.equal(store.snapshot('founder').usage.used,0);
  const pending=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});
  assert.throws(()=>store.finishAnalysis('founder',pending.id,{...aiResult(),report:{summary:'incomplete'}}));
  store.failAnalysis('founder',pending.id,{inputTokens:200,outputTokens:50,totalTokens:250});assert.equal(store.snapshot('founder').usage.used,250);assert.equal(store.snapshot('founder').reports.length,0);
});

test('unknown provider usage retains the reservation across restart until actual usage is reconciled',()=>{
  const store=createWorkflowStore();
  const pending=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:500,maxOutputTokens:500});
  store.failAnalysis('founder',pending.id,{unknown:true});
  assert.equal(store.snapshot('founder').usage.used,1000);assert.equal(store.snapshot('founder').usage.pendingTokens,1000);assert.equal(store.snapshot('founder').reports.length,0);
  store.finishAnalysis('founder',pending.id,aiResult(700));
  assert.equal(store.snapshot('founder').usage.used,700);assert.equal(store.snapshot('founder').usage.pendingTokens,0);
});

test('unpublishing removes listing and blocks new requests without silently revoking existing approval',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store);approve(store,project.id);
  store.act('founder',{type:'unpublish',workspaceId:project.id});
  assert.equal(store.snapshot('investor2').marketplace.length,0);
  assert.throws(()=>store.act('investor2',{type:'request-access',workspaceId:project.id,message:'Tôi muốn xem thông tin tài chính.'}),code('NOT_FOUND'));
  assert.equal(store.getFinancial('investor',project.id).csv,SAMPLE_CSV);
});

test('connection quotas are one-time for Free and workspace uploads cannot be spoofed during AI calls',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store);
  for(let i=0;i<2;i++) {
    const request=store.act('investor',{type:'request-access',workspaceId:project.id,message:'Cho tôi xem hồ sơ tài chính.'}).requests.find(r=>r.status==='pending');
    store.act('founder',{type:'decide-access',requestId:request.id,decision:'rejected'});
  }
  assert.throws(()=>store.act('investor',{type:'request-access',workspaceId:project.id,message:'Cho tôi xem hồ sơ tài chính.'}),code('LIMIT'));
  store.act('investor',{type:'change-plan',tier:'plus'});approve(store,project.id);
  const pending=store.beginAnalysis('investor',{workspaceId:project.id,csv:SAMPLE_CSV.replace('480,168','999,168'),inputTokensEstimate:100,maxOutputTokens:100});
  assert.equal(pending.rows.at(-1).revenue,480);
  store.act('investor',{type:'change-plan',tier:'free'});assert.equal(store.snapshot('investor').usage.connections.used,2);
});

test('AI chat shares the token wallet, has private history, and cannot be settled as a financial report',()=>{
  const store=createWorkflowStore();
  const pending=store.beginChat('founder',{inputTokensEstimate:200,maxOutputTokens:400});
  assert.equal(pending.kind,'chat');assert.equal(store.snapshot('founder').usage.used,600);
  assert.throws(()=>store.finishAnalysis('founder',pending.id,aiResult()),code('CONFLICT'));
  const message=store.finishChat('founder',pending.id,{...aiResult(250),text:'Bạn có thể tải CSV để bắt đầu phân tích.'});
  assert.equal(message.tokenUsage.totalTokens,250);assert.equal(message.tokenUsage.estimated,false);
  assert.equal(store.snapshot('founder').usage.used,250);assert.equal(store.snapshot('founder').usage.analyses,0);
  assert.equal(store.snapshot('founder').reports.length,0);assert.equal(store.snapshot('founder').aiChats.length,1);assert.equal(store.snapshot('investor').aiChats.length,0);
  assert.throws(()=>store.finishChat('founder',pending.id,{...aiResult(250),text:'Duplicate'}),code('ALREADY_SETTLED'));
  const analysis=store.beginAnalysis('founder',{csv:SAMPLE_CSV,inputTokensEstimate:100,maxOutputTokens:100});
  assert.throws(()=>store.finishChat('founder',analysis.id,{...aiResult(),text:'Wrong reservation kind'}),code('CONFLICT'));
  store.failAnalysis('founder',analysis.id);assert.equal(store.snapshot('founder').usage.used,250);
});

test('workspace AI chat enforces access before reservation and after completion without refunding real usage',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store);
  assert.throws(()=>store.beginChat('investor',{workspaceId:project.id,inputTokensEstimate:100,maxOutputTokens:100}),code('FORBIDDEN'));
  const request=approve(store,project.id);
  const pending=store.beginChat('investor',{workspaceId:project.id,inputTokensEstimate:100,maxOutputTokens:100});
  store.act('founder',{type:'decide-access',requestId:request.id,decision:'revoked'});
  assert.throws(()=>store.finishChat('investor',pending.id,{...aiResult(),text:'Private financial insight'}),code('FORBIDDEN'));
  assert.equal(store.snapshot('investor').usage.used,150);assert.equal(store.snapshot('investor').aiChats.length,0);assert.equal(store.snapshot('founder').aiChats.length,0);
});

test('AI chat respects pinned weekly ledger and failure accounting',()=>{
  let clock=new Date('2026-11-01T16:59:00Z');const store=createWorkflowStore({now:()=>clock});store.act('founder',{type:'change-plan',tier:'plus'});
  const old=store.beginChat('founder',{inputTokensEstimate:100,maxOutputTokens:100});
  clock=new Date('2026-11-01T17:00:00Z');
  store.finishChat('founder',old.id,{...aiResult(),text:'Week boundary result'});assert.equal(store.snapshot('founder').usage.used,0);
  store.act('founder',{type:'change-plan',tier:'free'});
  const free=store.beginChat('founder',{inputTokensEstimate:500,maxOutputTokens:1500});assert.equal(store.snapshot('founder').usage.remaining,0);
  assert.throws(()=>store.beginChat('founder',{inputTokensEstimate:1,maxOutputTokens:1}),code('LIMIT'));
  store.failAnalysis('founder',free.id,{unknown:true});assert.equal(store.snapshot('founder').usage.pendingTokens,2000);
  store.failAnalysis('founder',free.id,{inputTokens:100,outputTokens:50,totalTokens:150});assert.equal(store.snapshot('founder').usage.used,150);
});

test('paid report export checks entitlement and access without charging additional AI tokens',()=>{
  const store=createWorkflowStore(),project=publishAndUpload(store),request=approve(store,project.id);
  const pending=store.beginAnalysis('founder',{workspaceId:project.id,inputTokensEstimate:100,maxOutputTokens:100});
  const report=store.finishAnalysis('founder',pending.id,aiResult());
  assert.throws(()=>store.act('founder',{type:'export-report',reportId:report.id}),code('LIMIT'));
  store.act('investor',{type:'change-plan',tier:'plus'});const before=store.snapshot('investor').usage.used;
  store.act('investor',{type:'export-report',reportId:report.id});assert.equal(store.snapshot('investor').usage.used,before);
  store.act('investor2',{type:'change-plan',tier:'pro'});assert.throws(()=>store.act('investor2',{type:'export-report',reportId:report.id}),code('FORBIDDEN'));
  store.act('founder',{type:'decide-access',requestId:request.id,decision:'revoked'});assert.throws(()=>store.act('investor',{type:'export-report',reportId:report.id}),code('FORBIDDEN'));
});

function catalogFixture(t,count,tier='free',legacy=false) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'2g2bt-catalog-'));
  const filePath=path.join(directory,'catalog.json');
  t.after(()=>{fs.unlinkSync(filePath);fs.rmdirSync(directory);});
  const initial=createWorkflowStore({filePath});publishAndUpload(initial);
  const data=JSON.parse(fs.readFileSync(filePath,'utf8'));
  const template=data.workspaces[0];
  data.workspaces=Array.from({length:count},(_,index)=>({...structuredClone(template),id:`listing-${index}`,name:`Workspace ${index}`,profile:{...template.profile,name:`Startup ${index}`}}));
  data.accounts.investor.tier=tier;
  if(legacy)for(const account of Object.values(data.accounts)){delete account.watchlist;delete account.compare;}
  fs.writeFileSync(filePath,JSON.stringify(data));
  return {store:createWorkflowStore({filePath}),filePath};
}

for(const tier of ['free','plus','pro'])for(const kind of ['watchlist','compare']) {
  test(`${tier} ${kind}: additions obey server quota and removals release capacity`,t=>{
    const limit=ROLE_PLANS.investor[tier][kind];
    const {store}=catalogFixture(t,limit+1,tier);
    const type=kind==='watchlist'?'toggle-watch':'toggle-compare';
    let snapshot=store.act('investor',{type,workspaceId:'listing-0'});
    assert.deepEqual(snapshot[kind],['listing-0']);
    for(let i=1;i<limit;i++)snapshot=store.act('investor',{type,workspaceId:`listing-${i}`});
    assert.equal(snapshot[kind].length,limit);
    const before=store.snapshot('investor');
    assert.throws(()=>store.act('investor',{type,workspaceId:`listing-${limit}`}),e=>e.code==='LIMIT'&&e.feature===kind&&e.quota.limit===limit);
    assert.deepEqual(store.snapshot('investor'),before);
    store.act('investor',{type,workspaceId:'listing-0'});
    snapshot=store.act('investor',{type,workspaceId:`listing-${limit}`});assert.equal(snapshot[kind].length,limit);
    assert.deepEqual(store.snapshot('investor2')[kind],[]);
    assert.equal(snapshot.workspaces.length,0);
    assert.equal(JSON.stringify(snapshot.marketplace).includes('operating_cash_flow'),false);
  });
}

test('saved opportunity and comparison state migrate and persist without exposing other actors',t=>{
  const {store,filePath}=catalogFixture(t,3,'free',true);
  assert.deepEqual(store.snapshot('investor').watchlist,[]);assert.deepEqual(store.snapshot('investor').compare,[]);
  store.act('investor',{type:'toggle-watch',workspaceId:'listing-0'});store.act('investor',{type:'toggle-compare',workspaceId:'listing-1'});
  const reloaded=createWorkflowStore({filePath});assert.deepEqual(reloaded.snapshot('investor').watchlist,['listing-0']);assert.deepEqual(reloaded.snapshot('investor').compare,['listing-1']);assert.deepEqual(reloaded.snapshot('investor2').watchlist,[]);
  const copy=reloaded.snapshot('investor');copy.watchlist.push('tamper');assert.equal(reloaded.snapshot('investor').watchlist.includes('tamper'),false);
});

test('only investors can save published listings and removals remain possible after unpublishing',()=>{
  const store=createWorkflowStore(),project=create(store);
  for(const type of ['toggle-watch','toggle-compare']) {
    assert.throws(()=>store.act('founder',{type,workspaceId:project.id,role:'investor'}),code('FORBIDDEN'));
    assert.throws(()=>store.act('investor',{type,workspaceId:project.id}),code('NOT_FOUND'));
  }
  store.act('founder',{type:'publish',workspaceId:project.id});
  store.act('investor',{type:'toggle-watch',workspaceId:project.id});store.act('investor',{type:'toggle-compare',workspaceId:project.id});
  store.act('founder',{type:'unpublish',workspaceId:project.id});
  assert.deepEqual(store.act('investor',{type:'toggle-watch',workspaceId:project.id}).watchlist,[]);
  assert.deepEqual(store.act('investor',{type:'toggle-compare',workspaceId:project.id}).compare,[]);
  assert.throws(()=>store.act('investor',{type:'toggle-watch',workspaceId:project.id}),code('NOT_FOUND'));
});

test('downgrades preserve selections but comparison opening and new saves obey the reduced plan',t=>{
  const {store}=catalogFixture(t,8,'pro');
  for(let i=0;i<6;i++){store.act('investor',{type:'toggle-watch',workspaceId:`listing-${i}`});store.act('investor',{type:'toggle-compare',workspaceId:`listing-${i}`});}
  store.act('investor',{type:'compare'});
  store.act('investor',{type:'change-plan',tier:'free'});
  assert.equal(store.snapshot('investor').watchlist.length,6);assert.equal(store.snapshot('investor').compare.length,6);
  assert.throws(()=>store.act('investor',{type:'compare'}),e=>e.code==='LIMIT'&&e.feature==='compare');
  assert.throws(()=>store.act('investor',{type:'toggle-watch',workspaceId:'listing-7'}),e=>e.code==='LIMIT'&&e.feature==='watchlist');
  for(let i=2;i<6;i++)store.act('investor',{type:'toggle-compare',workspaceId:`listing-${i}`});
  assert.equal(store.act('investor',{type:'compare'}).compare.length,2);
  store.act('founder',{type:'unpublish',workspaceId:'listing-0'});
  assert.throws(()=>store.act('investor',{type:'compare'}),code('NOT_FOUND'));
  store.act('investor',{type:'toggle-compare',workspaceId:'listing-0'});
  assert.throws(()=>store.act('investor',{type:'compare'}),code('INVALID'));
});
