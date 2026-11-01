import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { serveAPI } from './request-adapter.mjs';
import { readSnapshot, writeSnapshot } from './sqlite-snapshot.mjs';
import { createAPI } from '../server/api.mjs';
import { createWorkflowStore } from '../server/workflow-store.mjs';
import { getAIConfig } from '../server/ai-provider.mjs';
import { SAMPLE_CSV } from '../domain.js';

function apiFixture({backupAdminKey=''}={}) {
  const store=createWorkflowStore();
  const handler=createAPI({store,config:()=>getAIConfig({}),publicDemo:true,backupAdminKey});
  async function request(path,{method,body,token,headers={}}={}) {
    const req=new Request(`http://localhost:8787${path}`,{
      method:method|| (body===undefined?'GET':'POST'),
      headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'X-Demo-Session':token}:{}),...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const response=await serveAPI(req,handler);
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  async function session(role){const result=await request('/api/demo/session',{body:{role}});assert.equal(result.status,200);return result.body.sessionToken;}
  return {store,handler,request,session};
}

test('Fetch adapter preserves API sessions, JSON responses and public demo capabilities',async()=>{
  const app=apiFixture();
  const status=await app.request('/api/ai/status');assert.equal(status.status,200);assert.equal(status.body.configured,false);assert.equal(status.body.allowPlanChanges,false);assert.equal(status.headers.get('cache-control'),'no-store');
  assert.equal((await app.request('/api/workflow')).status,401);
  const founder=await app.session('founder'),investor=await app.session('investor');assert.notEqual(founder,investor);
  assert.equal((await app.request('/api/workflow',{token:founder})).body.user.role,'founder');
  assert.equal((await app.request('/api/workflow',{token:investor})).body.user.role,'investor');
  const locked=await app.request('/api/workflow/actions',{token:investor,body:{type:'change-plan',tier:'pro'}});assert.equal(locked.status,403);
});

test('Fetch adapter uses actual URL host and rejects cross-origin API access',async()=>{
  const app=apiFixture();
  const status=await app.request('/api/health',{headers:{host:'forged.example'}});assert.equal(status.status,200);
  const denied=await app.request('/api/demo/session',{body:{role:'founder'},headers:{Origin:'https://forged.example'}});assert.equal(denied.status,403);
});

test('private financial data stays private through the Worker request bridge',async()=>{
  const app=apiFixture();const founder=await app.session('founder'),investor=await app.session('investor');
  let result=await app.request('/api/workflow/actions',{token:founder,body:{type:'create-workspace',name:'Dự án riêng tư',goal:'Chuẩn bị tài liệu gọi vốn',profile:{name:'SecretCorp',industry:'SaaS',stage:'Seed',location:'TP.HCM',summary:'Phần giới thiệu được phép công bố.',target:1000}}});
  const workspaceId=result.body.workspaces[0].id;
  await app.request('/api/workflow/actions',{token:founder,body:{type:'upload-financial',workspaceId,name:'private.csv',csv:SAMPLE_CSV}});
  await app.request('/api/workflow/actions',{token:founder,body:{type:'publish',workspaceId}});
  result=await app.request('/api/workflow',{token:investor});assert.equal(result.body.marketplace[0].profile.name,'SecretCorp');assert.equal(result.body.workspaces.length,0);assert.ok(!JSON.stringify(result.body).includes('private.csv'));
  assert.equal((await app.request(`/api/workflow/workspaces/${workspaceId}/financial`,{token:investor})).status,403);
});

test('Fetch adapter bounds advertised and streamed request bodies before allocating large buffers',async()=>{
  const app=apiFixture();
  const length=await serveAPI(new Request('http://localhost/api/demo/session',{method:'POST',headers:{'content-length':'9999999','content-type':'application/json'},body:'{}'}),app.handler);assert.equal(length.status,413);
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2_200_001));controller.close();}});
  const response=await serveAPI(new Request('http://localhost/api/demo/session',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'}),app.handler);assert.equal(response.status,413);assert.equal((await response.json()).code,'FILE_SIZE');
});

test('Node-style writes, HEAD, fallback and failures become safe Fetch Responses',async()=>{
  const head=await serveAPI(new Request('https://example.com/api/test',{method:'HEAD'}),async(req,res)=>{res.setHeader('X-Test','yes');res.writeHead(200,{'Content-Type':'application/json'});res.write('{"ok":');res.end('true}');});
  assert.equal(head.status,200);assert.equal(head.headers.get('x-test'),'yes');assert.equal(await head.text(),'');
  assert.equal((await serveAPI(new Request('https://example.com/api/missing'),async(req,res,next)=>next())).status,404);
  const failed=await serveAPI(new Request('https://example.com/api/error'),async()=>{throw new Error('secret internal detail');});assert.equal(failed.status,500);assert.ok(!(await failed.text()).includes('secret'));
});

test('authenticated backup restores larger than normal uploads preserve private data and reject stale revisions',async()=>{
  const source=createWorkflowStore();source.act('founder',{type:'create-workspace',name:'Backup project',goal:'Keep private documents'});
  const backup=source.exportData(),workspaceId=backup.workspaces[0].id,createdAt=new Date().toISOString();
  backup.messages=Array.from({length:500},(_,index)=>({id:`message-${index}`,workspaceId,authorId:'founder',authorName:'Startup',text:'x'.repeat(5000),createdAt}));
  const app=apiFixture({backupAdminKey:'test-backup-not-a-real-key'}),headers={Authorization:'Bearer test-backup-not-a-real-key'};
  assert.equal((await app.request('/api/admin/backup')).status,403);
  const body={backup,expectedRevision:0};assert.ok(JSON.stringify(body).length>2_200_000);
  const restored=await app.request('/api/admin/restore',{body,headers});assert.equal(restored.status,200);
  const exported=await app.request('/api/admin/backup',{headers});assert.equal(exported.status,200);assert.equal(exported.body.format,'2g2bt-backup-v1');assert.equal(exported.body.data.messages.length,500);
  const stale=await app.request('/api/admin/restore',{body,headers});assert.equal(stale.status,409);assert.equal(app.store.exportData().messages.length,500);
});

function sqliteFixture(t) {
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const sql={exec(query,...values){const args=values.map(value=>value instanceof ArrayBuffer?Buffer.from(value):value);const rows=db.prepare(query).all(...args);return {toArray:()=>rows};}};
  const storage={sql,transactionSync(callback){db.exec('BEGIN TRANSACTION');try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
  return {db,storage};
}

test('SQLite snapshot chunks survive reconstruction including emoji split at byte boundaries',t=>{
  const {storage}=sqliteFixture(t);assert.equal(readSnapshot(storage),undefined);
  const data={version:1,large:'x'.repeat(64*1024-20)+'🌱Tiếng Việt'.repeat(20000),ledger:{free:767}};
  writeSnapshot(storage,data);assert.deepEqual(readSnapshot(storage),data);
  const chunks=storage.sql.exec('SELECT position,body FROM workflow_snapshot_chunks').toArray();assert.ok(chunks.length>2);assert.ok(chunks.every(row=>row.body.byteLength<=64*1024));
  writeSnapshot(storage,{version:1,small:'replacement'});assert.deepEqual(readSnapshot(storage),{version:1,small:'replacement'});assert.equal(storage.sql.exec('SELECT position FROM workflow_snapshot_chunks').toArray().length,1);
});

test('SQLite failed chunk write rolls back the complete prior snapshot atomically',t=>{
  const {storage}=sqliteFixture(t);const original={version:1,ledger:{used:767}};writeSnapshot(storage,original);
  const real=storage.sql.exec.bind(storage.sql);storage.sql.exec=(query,...values)=>{if(query.startsWith('INSERT INTO workflow_snapshot_chunks')&&values[0]===1)throw new Error('simulated quota/storage failure');return real(query,...values);};
  assert.throws(()=>writeSnapshot(storage,{version:1,large:'x'.repeat(100000)}),/simulated/);
  storage.sql.exec=real;assert.deepEqual(readSnapshot(storage),original);
});

test('corrupt persisted chunks fail closed instead of silently resetting Free budgets',t=>{
  const {storage}=sqliteFixture(t);writeSnapshot(storage,{version:1,ledger:{free:2000}});
  storage.sql.exec('DELETE FROM workflow_snapshot_chunks WHERE position=0');assert.throws(()=>readSnapshot(storage),/Incomplete/);
});
