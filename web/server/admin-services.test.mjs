import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServiceMonitor, buildServiceSnapshot } from './admin-services.mjs';
import { createWorkflowStore } from './workflow-store.mjs';
import { createAPI } from './api.mjs';

test('service monitor separates unused AI, provider failures, and recovery',()=>{
  let time=Date.parse('2026-11-15T08:00:00.000Z');
  const monitor=createServiceMonitor({now:()=>time});
  const ai={configured:true,provider:'Fixture',model:'fixture-model',apiKey:'never-expose'};
  const workflow={reservations:[],reports:[],aiChats:[]};
  const read=()=>buildServiceSnapshot(workflow,ai,monitor.snapshot(),time);
  assert.equal(read().services.find(item=>item.id==='provider').status,'unverified');
  assert.equal(read().services.find(item=>item.id==='chat').status,'unused');
  monitor.record({kind:'workflow',status:503,code:'INTERNAL'});
  monitor.record({kind:'workflow',status:503,code:'INTERNAL'});
  assert.equal(read().services.find(item=>item.id==='api').status,'down');
  monitor.record({kind:'workflow',status:200});
  assert.equal(read().services.find(item=>item.id==='api').status,'up');
  monitor.record({kind:'chat',status:502,code:'AI_NETWORK',durationMs:1200});
  assert.equal(read().services.find(item=>item.id==='provider').status,'degraded');
  monitor.record({kind:'analysis',status:502,code:'AI_TIMEOUT',durationMs:9000});
  assert.equal(read().services.find(item=>item.id==='provider').status,'down');
  time+=1000;
  monitor.record({kind:'chat',status:200,durationMs:250});
  workflow.aiChats.push({createdAt:new Date(time).toISOString(),question:'private prompt',text:'private answer'});
  workflow.reservations.push({kind:'chat',status:'completed',actualTokens:315});
  const recovered=read();
  assert.equal(recovered.services.find(item=>item.id==='provider').status,'up');
  assert.equal(recovered.services.find(item=>item.id==='chat').status,'active');
  assert.equal(recovered.services.find(item=>item.id==='chat').totalTokens,315);
  assert.equal(recovered.services.find(item=>item.id==='analysis').status,'unused');
  assert.equal(recovered.services.find(item=>item.id==='payments').status,'not_integrated');
  assert.equal(JSON.stringify(recovered).includes('private prompt'),false);
  assert.equal(JSON.stringify(recovered).includes('never-expose'),false);
});

test('admin service API requires admin session and exposes no AI credentials',async t=>{
  const store=createWorkflowStore();
  const server=http.createServer(createAPI({store,adminPassword:'test-admin-secret',
    config:()=>({configured:true,provider:'Fixture',model:'fixture-model',apiKey:'private-key',maxOutputTokens:1024}),
    chatProvider:async()=>{throw Object.assign(new Error('fixture offline'),{status:502,code:'AI_NETWORK',usageUnknown:true});}}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/admin/services')).status,401);
  const login=await fetch(base+'/api/admin/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'test-admin-secret'})});
  const token=(await login.json()).sessionToken;
  const response=await fetch(base+'/api/admin/services',{headers:{'x-admin-session':token}});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.services.find(item=>item.id==='api').status,'up');
  assert.equal(body.services.find(item=>item.id==='provider').status,'unverified');
  assert.equal(JSON.stringify(body).includes('private-key'),false);
  const session=await fetch(base+'/api/demo/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'investor'})});
  const userToken=(await session.json()).sessionToken;
  const failed=await fetch(base+'/api/ai/chat',{method:'POST',headers:{'content-type':'application/json','x-demo-session':userToken},body:JSON.stringify({question:'Tình trạng dự án hôm nay?'})});
  assert.equal(failed.status,502);
  const observed=await fetch(base+'/api/admin/services',{headers:{'x-admin-session':token}});
  const diagnostics=await observed.json();
  assert.equal(diagnostics.services.find(item=>item.id==='provider').status,'degraded');
  assert.equal(diagnostics.recentEvents[0].code,'AI_NETWORK');
  assert.equal(JSON.stringify(diagnostics).includes('Tình trạng dự án'),false);
});
