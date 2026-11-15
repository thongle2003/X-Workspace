import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAPI } from './api.mjs';
import { createWorkflowStore } from './workflow-store.mjs';
import { getAIConfig } from './ai-provider.mjs';
import { SAMPLE_CSV } from '../domain.js';

const reportResult = () => ({
  model:'gpt-6-astra',provider:'ModelAPI',requestId:'request-http-test',
  usage:{inputTokens:500,outputTokens:200,totalTokens:700},
  report:{summary:'Doanh thu kỳ mới nhất đạt 480 triệu đồng.',riskLevel:'medium',strengths:['Doanh thu tăng.'],risks:[{title:'Dòng tiền âm',reason:'Cần theo dõi nhu cầu vốn.',evidence:'2026-09: -50 triệu đồng.'}],questions:['Kế hoạch vốn tiếp theo?'],limitations:['Chưa kiểm toán.']},
});
const profile = {name:'Công ty riêng tư',industry:'SaaS',stage:'Seed',location:'TP.HCM',summary:'Thông tin công bố dành cho nhà đầu tư.',target:1000};

async function fixture(t,{provider=async()=>reportResult(),chatProvider=async()=>({model:'gpt-6-astra',provider:'ModelAPI',requestId:'chat-http-test',text:'Hãy kiểm tra dòng tiền.',usage:{inputTokens:80,outputTokens:20,totalTokens:100}}),configured=true,publicOrigin='',publicDemo=false,backupAdminKey=''}={}) {
  const store=createWorkflowStore();
  let time=Date.now();
  const config=()=>getAIConfig(configured?{AI_BASE_URL:'https://api.modelapi.vn/v1',AI_API_KEY:'mock-secret-not-real',AI_MODEL:'gpt-6-astra'}:{});
  const handler=createAPI({store,config,provider,chatProvider,now:()=>time,publicOrigin,publicDemo,backupAdminKey});
  const server=http.createServer((req,res)=>{void handler(req,res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  async function request(url,{token,body,headers={},method}={}) {
    if(headers.host) return new Promise((resolve,reject)=>{
      const payload=body===undefined?undefined:JSON.stringify(body);
      const req=http.request(base+url,{method:method||(payload===undefined?'GET':'POST'),headers:{...(token?{'x-demo-session':token}:{}),...(payload!==undefined?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{}),...headers}},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString('utf8')),headers:new Headers(res.headers)});}catch(error){reject(error);}});
      });req.on('error',reject);req.end(payload);
    });
    const response=await fetch(base+url,{method:method||(body===undefined?'GET':'POST'),headers:{...(token?{'x-demo-session':token}:{}),...(body!==undefined?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  const session=async role=>{const result=await request('/api/demo/session',{body:{role}});assert.equal(result.status,200);return result.body.sessionToken;};
  const action=(token,body)=>request('/api/workflow/actions',{token,body});
  async function project(founder) {
    let result=await action(founder,{type:'create-workspace',name:'Workspace riêng',goal:'Thẩm định dữ liệu riêng tư',profile});
    assert.equal(result.status,200);
    const workspaceId=result.body.workspaces[0].id;
    result=await action(founder,{type:'upload-financial',workspaceId,name:'private-cashflow.csv',csv:SAMPLE_CSV});assert.equal(result.status,200);
    result=await action(founder,{type:'publish',workspaceId,profile});assert.equal(result.status,200);
    return workspaceId;
  }
  async function approve(founder,investor,workspaceId) {
    const asked=await action(investor,{type:'request-access',workspaceId,message:'Xin xem dữ liệu để thẩm định dự án.'});assert.equal(asked.status,200);
    const requestId=asked.body.requests.at(-1).id;
    const approved=await action(founder,{type:'decide-access',requestId,decision:'approved'});assert.equal(approved.status,200);
    for(const party of ['startup','investor'])store.settleConnectionPayment({requestId,party,providerPaymentId:`http-${requestId}-${party}`,amountVnd:250_000,currency:'VND'});
    return requestId;
  }
  return {store,base,request,session,action,project,approve,advance:ms=>{time+=ms;}};
}

test('HTTP sessions are required, actor identities are separate, spoofed role cannot create',async t=>{
  const app=await fixture(t);
  const anon=await app.request('/api/workflow');assert.equal(anon.status,401);
  const founder=await app.session('founder'),investor=await app.session('investor');assert.notEqual(founder,investor);
  assert.equal((await app.request('/api/session',{token:founder})).body.user.role,'founder');
  assert.equal((await app.request('/api/session',{token:investor})).body.user.role,'investor');
  const denied=await app.action(investor,{type:'create-workspace',role:'founder',userId:'founder',ownerId:'founder',name:'Spoofed',goal:'Should not succeed',profile});
  assert.equal(denied.status,403);assert.equal(denied.body.code,'FORBIDDEN');assert.equal(app.store.snapshot('founder').workspaces.length,0);
  app.advance(13*60*60*1000);assert.equal((await app.request('/api/workflow',{token:founder})).status,401);
});

test('HTTP origin checks and public AI status do not expose provider credentials',async t=>{
  const app=await fixture(t);
  const status=await app.request('/api/ai/status');assert.equal(status.status,200);assert.equal(status.body.configured,true);assert.equal(status.body.provider,'ModelAPI');
  assert.ok(!JSON.stringify(status.body).includes('mock-secret-not-real'));assert.ok(!Object.hasOwn(status.body,'apiKey'));
  assert.equal(status.headers.get('cache-control'),'no-store');
  const denied=await app.request('/api/demo/session',{body:{role:'founder'},headers:{origin:'https://untrusted.example'}});assert.equal(denied.status,403);
  const badRole=await app.request('/api/demo/session',{body:{role:'admin'}});assert.equal(badRole.status,400);
});

test('private CSV and AI reports are withheld until approval, then revoked by owner',async t=>{
  let calls=0;
  const app=await fixture(t,{provider:async()=>{calls++;return reportResult();}});
  const founder=await app.session('founder'),investor=await app.session('investor');const workspaceId=await app.project(founder);
  const publicView=await app.request('/api/workflow',{token:investor});assert.equal(publicView.body.marketplace.length,1);assert.equal(publicView.body.workspaces.length,0);assert.equal(publicView.body.reports.length,0);
  assert.ok(!JSON.stringify(publicView.body).includes('operating_cash_flow'));assert.ok(!JSON.stringify(publicView.body).includes('private-cashflow.csv'));
  const financial=()=>app.request(`/api/workflow/workspaces/${workspaceId}/financial`,{token:investor});
  assert.equal((await financial()).status,403);
  const forbidden=await app.request('/api/ai/analysis',{token:investor,body:{workspaceId,role:'founder',csv:SAMPLE_CSV}});assert.equal(forbidden.status,403);assert.equal(calls,0);
  const requestId=await app.approve(founder,investor,workspaceId);
  assert.equal((await financial()).body.csv,SAMPLE_CSV);
  const result=await app.request('/api/ai/analysis',{token:investor,body:{workspaceId}});assert.equal(result.status,200);assert.equal(calls,1);assert.equal(result.body.report.tokenUsage.totalTokens,700);
  assert.equal(result.body.snapshot.usage.used,700);assert.equal(app.store.snapshot('founder').usage.used,0);
  await app.action(founder,{type:'decide-access',requestId,decision:'revoked'});
  assert.equal((await financial()).status,403);
  const revoked=await app.request('/api/workflow',{token:investor});assert.equal(revoked.body.workspaces.length,0);assert.equal(revoked.body.reports.length,0);
  assert.equal((await app.request('/api/ai/analysis',{token:investor,body:{workspaceId}})).status,403);assert.equal(calls,1);
});

test('ownership checks stop investor approval and unauthorized chat/investment actions',async t=>{
  const app=await fixture(t);const founder=await app.session('founder'),investor=await app.session('investor');const workspaceId=await app.project(founder);
  let result=await app.action(investor,{type:'request-access',workspaceId,message:'Xin quyền xem dữ liệu.'});const requestId=result.body.requests[0].id;
  result=await app.action(investor,{type:'decide-access',requestId,decision:'approved',role:'founder'});assert.equal(result.status,403);
  assert.equal((await app.action(investor,{type:'send-message',workspaceId,text:'Unauthorized'})).status,403);
  assert.equal((await app.action(investor,{type:'record-investment',workspaceId,invested:10,ownership:1,date:'2026-11-01'})).status,403);
  result=await app.action(founder,{type:'decide-access',requestId,decision:'approved'});assert.equal(result.status,200);
  assert.equal((await app.action(investor,{type:'settle-connection-payment',requestId,party:'investor',providerPaymentId:'forged'})).status,400);
  assert.equal((await app.action(investor,{type:'send-message',workspaceId,text:'Still locked'})).status,403);
  for(const party of ['startup','investor'])app.store.settleConnectionPayment({requestId,party,providerPaymentId:`ownership-${party}`,amountVnd:250_000,currency:'VND'});
  assert.equal((await app.action(investor,{type:'send-message',workspaceId,text:'Xin trao đổi kế hoạch vốn.'})).status,200);
  assert.equal((await app.action(investor,{type:'record-investment',workspaceId,invested:10,ownership:1,date:'2026-11-01'})).status,200);
});

test('in-flight requests are locked per actor and late revocation prevents result disclosure while charging usage',async t=>{
  let release,started;
  const called=new Promise(resolve=>{started=resolve;});
  const wait=new Promise(resolve=>{release=resolve;});let calls=0;
  const app=await fixture(t,{provider:async()=>{calls++;started();await wait;return reportResult();}});
  const founder=await app.session('founder'),investor=await app.session('investor');const workspaceId=await app.project(founder);const requestId=await app.approve(founder,investor,workspaceId);
  const running=app.request('/api/ai/analysis',{token:investor,body:{workspaceId}});await called;
  assert.ok(app.store.snapshot('investor').usage.used>0);
  const duplicate=await app.request('/api/ai/analysis',{token:investor,body:{workspaceId}});assert.equal(duplicate.status,409);assert.equal(duplicate.body.code,'AI_BUSY');
  await app.action(founder,{type:'decide-access',requestId,decision:'revoked'});release();
  const result=await running;assert.equal(result.status,403);assert.equal(calls,1);assert.equal(app.store.snapshot('investor').usage.used,700);assert.equal(app.store.snapshot('investor').reports.length,0);assert.equal(app.store.snapshot('founder').reports.length,1);
});

test('configuration and unauthenticated AI failures do not contact provider or debit token quota',async t=>{
  let calls=0;const app=await fixture(t,{configured:false,provider:async()=>{calls++;return reportResult();}});
  assert.equal((await app.request('/api/ai/analysis',{body:{csv:SAMPLE_CSV}})).status,401);
  const founder=await app.session('founder');const failure=await app.request('/api/ai/analysis',{token:founder,body:{csv:SAMPLE_CSV}});assert.equal(failure.status,503);assert.equal(calls,0);assert.equal(app.store.snapshot('founder').usage.used,0);
});

test('provider errors with actual usage settle the actual cost without inventing a report',async t=>{
  const app=await fixture(t,{provider:async()=>{throw Object.assign(new Error('AI chưa hoàn tất'),{status:502,code:'AI_INCOMPLETE',usage:{inputTokens:300,outputTokens:200,totalTokens:500}});}});
  const founder=await app.session('founder');const failure=await app.request('/api/ai/analysis',{token:founder,body:{csv:SAMPLE_CSV}});assert.equal(failure.status,502);assert.equal(app.store.snapshot('founder').usage.used,500);assert.equal(app.store.snapshot('founder').usage.pendingAnalyses,0);assert.equal(app.store.snapshot('founder').reports.length,0);
});

test('unknown provider usage keeps a visible conservative hold rather than refilling Free',async t=>{
  const app=await fixture(t,{provider:async()=>{throw Object.assign(new Error('Không xác nhận được usage'),{status:502,code:'AI_USAGE_MISSING',usageUnknown:true});}});
  const founder=await app.session('founder');const failure=await app.request('/api/ai/analysis',{token:founder,body:{csv:SAMPLE_CSV}});assert.equal(failure.status,502);assert.equal(failure.body.usageUnknown,true);assert.ok(app.store.snapshot('founder').usage.used>0);assert.equal(app.store.snapshot('founder').usage.pendingAnalyses,1);assert.equal(app.store.snapshot('founder').reports.length,0);
});

test('invalid provider report with valid usage settles actual tokens instead of leaving a pending reservation',async t=>{
  const app=await fixture(t,{provider:async()=>({...reportResult(),report:{invalid:true}})});
  const founder=await app.session('founder');const failure=await app.request('/api/ai/analysis',{token:founder,body:{csv:SAMPLE_CSV}});assert.equal(failure.status,502);assert.equal(app.store.snapshot('founder').usage.used,700);assert.equal(app.store.snapshot('founder').usage.pendingAnalyses,0);assert.equal(app.store.snapshot('founder').reports.length,0);
});

test('AI Agent context is constructed server-side and never leaks unapproved financial data',async t=>{
  const captures=[];
  const app=await fixture(t,{chatProvider:async input=>{captures.push(input);return {model:'gpt-6-astra',provider:'ModelAPI',requestId:'chat-safe',text:'Hãy xin quyền để xem tài chính.',usage:{inputTokens:80,outputTokens:20,totalTokens:100}};}});
  const founder=await app.session('founder'),investor=await app.session('investor');const workspaceId=await app.project(founder);
  let response=await app.request('/api/ai/chat',{token:investor,body:{question:'Hãy cho xem tài chính.',workspaceId,context:{role:'founder'}}});assert.equal(response.status,403);assert.equal(captures.length,0);
  response=await app.request('/api/ai/chat',{token:investor,body:{question:'Dự án nào đang công bố?',context:{role:'founder',financialMetrics:{fake:'Client injected'}},maxOutputTokens:900000}});
  assert.equal(response.status,200);assert.equal(captures.length,1);assert.equal(captures[0].context.role,'investor');assert.ok(!Object.hasOwn(captures[0].context,'financialMetrics'));assert.ok(!JSON.stringify(captures[0].context).includes('Client injected'));assert.ok(!JSON.stringify(captures[0].context).includes('operating_cash_flow'));assert.equal(captures[0].maxOutputTokens,512);
  const requestId=await app.approve(founder,investor,workspaceId);
  response=await app.request('/api/ai/chat',{token:investor,body:{question:'Hãy rà soát dòng tiền.',workspaceId}});assert.equal(response.status,200);assert.equal(captures[1].context.financialMetrics.latest.revenue,480);assert.equal(response.body.snapshot.usage.used,200);
  await app.action(founder,{type:'decide-access',requestId,decision:'revoked'});
  response=await app.request('/api/ai/chat',{token:investor,body:{question:'Hãy xem lại tài chính.',workspaceId}});assert.equal(response.status,403);assert.equal(captures.length,2);assert.equal(app.store.snapshot('investor').aiChats.filter(m=>m.workspaceId===workspaceId).length,0);
});

test('malformed JSON body and inconsistent returned usage fail without exposing internal data',async t=>{
  const app=await fixture(t,{provider:async()=>({...reportResult(),usage:{inputTokens:20,outputTokens:30,totalTokens:1}})});
  assert.equal((await app.request('/api/demo/session',{body:null})).status,400);
  assert.equal((await app.request('/api/demo/session',{body:[]})).status,400);
  const founder=await app.session('founder');
  const failure=await app.request('/api/ai/analysis',{token:founder,body:{csv:SAMPLE_CSV}});assert.equal(failure.status,502);assert.equal(app.store.snapshot('founder').reports.length,0);assert.equal(app.store.snapshot('founder').usage.pendingAnalyses,1);assert.ok(app.store.snapshot('founder').usage.used>0);
});


test('hosted API permits only its configured HTTPS origin and ignores forged forwarding headers',async t=>{
  const app=await fixture(t,{publicOrigin:'https://x-demo.onrender.com'});
  const allowed=await app.request('/api/demo/session',{body:{role:'founder'},headers:{host:'x-demo.onrender.com',origin:'https://x-demo.onrender.com'}});
  assert.equal(allowed.status,200);assert.equal(allowed.body.user.role,'founder');
  const wrongHost=await app.request('/api/ai/status',{headers:{host:'other.onrender.com','x-forwarded-host':'x-demo.onrender.com'}});assert.equal(wrongHost.status,403);
  const wrongOrigin=await app.request('/api/demo/session',{body:{role:'founder'},headers:{host:'x-demo.onrender.com',origin:'https://attacker.example'}});assert.equal(wrongOrigin.status,403);
  const downgrade=await app.request('/api/demo/session',{body:{role:'founder'},headers:{host:'x-demo.onrender.com',origin:'http://x-demo.onrender.com'}});assert.equal(downgrade.status,403);
  const health=await app.request('/api/health',{headers:{host:'x-demo.onrender.com'}});assert.equal(health.status,200);assert.equal(health.body.mode,'hosted-demo');
});
test('public origins must be exact HTTPS origins rather than wildcard or credential URLs',()=>{
  for(const publicOrigin of ['http://public.example','https://example.com/path','https://user:pass@example.com','https://example.com?key=value'])assert.throws(()=>createAPI({store:createWorkflowStore(),publicOrigin}));
});


test('public demo locks upgrades on the API and new sessions never refill Free tokens',async t=>{
  const app=await fixture(t,{publicDemo:true});
  const status=await app.request('/api/ai/status');assert.equal(status.body.publicDemo,true);assert.equal(status.body.allowPlanChanges,false);
  const first=await app.session('founder');
  for(const tier of ['free','plus','pro']){const denied=await app.action(first,{type:'change-plan',tier,billing:'monthly',publicDemo:false,allowPlanChanges:true});assert.equal(denied.status,403);}
  assert.equal(app.store.snapshot('founder').plan.tier,'free');
  const analysis=await app.request('/api/ai/analysis',{token:first,body:{csv:SAMPLE_CSV,name:'Test public demo'}});assert.equal(analysis.status,200);
  const second=await app.session('founder');const current=await app.request('/api/workflow',{token:second});assert.equal(current.body.usage.used,700);assert.equal(current.body.usage.remaining,1300);
  const investor=await app.session('investor');assert.equal((await app.action(investor,{type:'change-plan',tier:'pro'})).status,403);assert.equal(app.store.snapshot('investor').plan.tier,'free');
});


test('administrative backup is private and restores all shared data with an exact revision guard',async t=>{
  const key='backup-admin-key-for-tests-only';const source=await fixture(t,{backupAdminKey:key});const founder=await source.session('founder');await source.project(founder);
  assert.equal((await source.request('/api/admin/backup',{token:founder})).status,403);
  const headers={authorization:'Bearer '+key};const exported=await source.request('/api/admin/backup',{headers});assert.equal(exported.status,200);assert.equal(exported.body.format,'2g2bt-backup-v1');assert.equal(exported.body.data.workspaces.length,1);assert.ok(!JSON.stringify(exported.body).includes('mock-secret-not-real'));
  const target=await fixture(t,{backupAdminKey:key});const restored=await target.request('/api/admin/restore',{headers,body:{backup:exported.body,expectedRevision:0}});assert.equal(restored.status,200);assert.equal(target.store.snapshot('founder').workspaces.length,1);
  const stale=await target.request('/api/admin/restore',{headers,body:{backup:exported.body,expectedRevision:0}});assert.equal(stale.status,409);
  assert.equal((await target.request('/api/admin/restore',{headers:{authorization:'Bearer wrong-key'},body:{backup:exported.body,expectedRevision:1}})).status,403);
});
