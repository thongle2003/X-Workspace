import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_PLANS, freshState, getPlan, getUsage, changePlan, changeRole, applyAction,
  refreshUsage, weekKey, nextResetAt, validateState, parseCSV, SAMPLE_CSV, estimateAnalysisTokens, analyze, monthKey,
} from '../web/domain.js';

const sample=parseCSV(SAMPLE_CSV);
const estimate=estimateAnalysisTokens(sample);
const analysisAction={type:'analyze',name:'Test CSV',rows:sample};
const limitError=feature=>error=>error.code==='LIMIT' && error.feature===feature;
const stateFor=(role,tier='free')=>{const state=freshState();changeRole(state,role);changePlan(state,tier);return state;};
const addStartup=(state,id)=>state.startups.push({...state.startups[0],id,name:id});

test('Six role-specific product names and final token budgets are distinct',()=>{
  assert.deepEqual(Object.values(ROLE_PLANS.founder).map(p=>[p.name,p.aiTokens,p.price]),[
    ['Startup Free',2000,0],['Startup Launch',20000,199000],['Startup Scale',60000,399000],
  ]);
  assert.deepEqual(Object.values(ROLE_PLANS.investor).map(p=>[p.name,p.aiTokens,p.price]),[
    ['Investor Free',4000,0],['Investor Analyst',40000,299000],['Investor Pro',120000,699000],
  ]);
  assert.ok(estimate.totalTokens<=2000);
  assert.equal(estimate.inputTokens+estimate.outputTokens,estimate.totalTokens);
  assert.deepEqual(estimateAnalysisTokens(sample),estimate);
});

test('Startup Free can create its first workspace and cannot create a second',()=>{
  let state=stateFor('founder');
  assert.equal(getUsage(state,'workspaces').used,0);
  state=applyAction(state,{type:'create-workspace',name:'Vòng Seed',startupId:'lotus',goal:'Chuẩn bị gọi vốn'});
  assert.equal(getUsage(state,'workspaces').used,1);
  assert.throws(()=>applyAction(state,{type:'create-workspace',name:'Vòng mới',startupId:'verda',goal:'Chuẩn bị vòng sau'}),limitError('workspaces'));
});

for(const role of ['founder','investor']) for(const tier of ['free','plus','pro']) {
  test(`${role}/${tier}: exact token fit succeeds, next analysis fails without mutation`,()=>{
    let state=stateFor(role,tier);
    const maximum=getPlan(state).aiTokens;
    state.usage.aiTokens=maximum-estimate.totalTokens;
    state=applyAction(state,analysisAction);
    assert.equal(state.usage.aiTokens,maximum);
    assert.deepEqual(state.reports[0].tokenUsage,{...estimate,estimated:true});
    const saved=structuredClone(state);
    assert.throws(()=>applyAction(state,analysisAction),error=>limitError('aiTokens')(error)&&error.required===estimate.totalTokens&&error.quota.remaining===0);
    assert.deepEqual(state,saved);
  });
  test(`${role}/${tier}: resource actions enforce workspace, task and document boundaries`,()=>{
    let state=stateFor(role,tier);
    const plan=getPlan(state);
    if(role === 'founder') {
      state.workspaces=Array.from({length:plan.workspaces-1},(_,i)=>({id:`w-${i}`,role,name:`Workspace ${i}`,startupId:'lotus',goal:'Test',tasks:[],documents:[],notes:''}));
      state=applyAction(state,{type:'create-workspace',name:'Last workspace',startupId:'lotus',goal:'Test quota'});
      assert.throws(()=>applyAction(state,{type:'create-workspace',name:'Overflow',startupId:'lotus',goal:'Test quota'}),limitError('workspaces'));
    } else {
      // Previously saved investor workspaces stay editable, but do not grant creation rights.
      state.activeWorkspace=state.workspaces[0].id;
      const retained=structuredClone(state.workspaces);
      assert.equal(plan.workspaces,0);
      assert.equal(getUsage(state,'workspaces').allowed,false);
      assert.throws(()=>applyAction(state,{type:'create-workspace',name:'New workspace',startupId:'lotus',goal:'Test role restriction'}),error=>limitError('workspaces')(error)&&/Chỉ Startup/.test(error.message));
      assert.deepEqual(state.workspaces,retained);
    }
    const id=state.activeWorkspace;
    state.workspaces.at(-1).tasks=Array.from({length:plan.tasks-1},(_,i)=>({id:`t-${i}`,title:`Existing task ${i}`,status:'todo'}));
    state=applyAction(state,{type:'add-task',workspaceId:id,title:'Last task'});
    assert.throws(()=>applyAction(state,{type:'add-task',workspaceId:id,title:'Overflow task'}),limitError('tasks'));
    state.workspaces.at(-1).documents=Array.from({length:plan.documents-1},(_,i)=>({id:`d-${i}`,name:`Existing ${i}.pdf`,size:10}));
    state=applyAction(state,{type:'add-document',workspaceId:id,name:'Last.pdf',size:12,fileType:'application/pdf'});
    assert.throws(()=>applyAction(state,{type:'add-document',workspaceId:id,name:'Overflow.pdf',size:15}),limitError('documents'));
  });
}

test('Analysis count is informational and does not block when tokens remain',()=>{
  const state=stateFor('founder');
  state.usage.analyses=100;
  const next=applyAction(state,analysisAction);
  assert.equal(next.usage.analyses,101);
  assert.equal(next.usage.aiTokens,estimate.totalTokens);
  assert.equal(getUsage(next,'analyses').allowed,true);
});

for(const tier of ['free','plus','pro']) test(`Investor ${tier} cannot create its first workspace`,()=>{
  const state=stateFor('investor',tier);
  state.workspaces=[];state.activeWorkspace='';
  const saved=structuredClone(state);
  const quota=getUsage(state,'workspaces');
  assert.equal(quota.used,0);assert.equal(quota.limit,0);assert.equal(quota.remaining,0);assert.equal(quota.allowed,false);
  assert.throws(()=>applyAction(state,{type:'create-workspace',name:'Forbidden',startupId:'lotus',goal:'Cannot create even with no existing workspace'}),error=>limitError('workspaces')(error)&&/Chỉ Startup/.test(error.message));
  assert.deepEqual(state,saved);
});

test('Insufficient tokens and invalid rows never create a report or debit usage',()=>{
  const state=stateFor('founder');
  state.usage.aiTokens=2000-estimate.totalTokens+1;
  const saved=structuredClone(state);
  assert.throws(()=>applyAction(state,analysisAction),error=>limitError('aiTokens')(error)&&error.quota.remaining===estimate.totalTokens-1);
  assert.throws(()=>applyAction(state,{...analysisAction,rows:[sample[0]]}),error=>error.code==='INVALID');
  assert.deepEqual(state,saved);
});

test('Founder cannot use investor-only actions even on Scale',()=>{
  const state=stateFor('founder','pro');
  for(const [type,feature] of [['toggle-watch','watchlist'],['toggle-compare','compare'],['add-portfolio','portfolio'],['connect','connections']]) {
    assert.throws(()=>applyAction(state,{type,startupId:'lotus',message:'Tôi muốn xem dữ liệu'}),limitError(feature));
  }
});

for(const tier of ['free','plus','pro']) test(`Investor ${tier} enforces watchlist, compare, portfolio and connection limits`,()=>{
  let state=stateFor('investor',tier);
  const plan=getPlan(state);
  for(let i=0;i<60;i++) addStartup(state,`extra-${i}`);
  state.watchlist=Array.from({length:plan.watchlist-1},(_,i)=>`extra-${i}`);
  state=applyAction(state,{type:'toggle-watch',startupId:'lotus'});
  assert.throws(()=>applyAction(state,{type:'toggle-watch',startupId:'verda'}),limitError('watchlist'));
  state=applyAction(state,{type:'toggle-watch',startupId:'lotus'});
  assert.equal(state.watchlist.length,plan.watchlist-1);
  state.compare=Array.from({length:plan.compare-1},(_,i)=>`extra-${i}`);
  state=applyAction(state,{type:'toggle-compare',startupId:'lotus'});
  assert.throws(()=>applyAction(state,{type:'toggle-compare',startupId:'verda'}),limitError('compare'));
  state.portfolio=Array.from({length:plan.portfolio-1},(_,i)=>({id:`p-${i}`,startupId:`extra-${i}`,invested:100,ownership:1,updates:[]}));
  state=applyAction(state,{type:'add-portfolio',startupId:'lotus',invested:100,ownership:1,date:'2026-11-01'});
  assert.throws(()=>applyAction(state,{type:'add-portfolio',startupId:'verda',invested:100,ownership:1,date:'2026-11-01'}),limitError('portfolio'));
  state.usage.connections=plan.connections-1;
  state=applyAction(state,{type:'connect',startupId:'lotus',message:'Tôi muốn trao đổi về dự án.'});
  assert.throws(()=>applyAction(state,{type:'connect',startupId:'verda',message:'Tôi muốn trao đổi về dự án.'}),limitError('connections'));
});

test('Role isolation and plan roundtrips preserve separate free and paid counters',()=>{
  let state=stateFor('founder');
  state=applyAction(state,analysisAction);
  changePlan(state,'plus');
  assert.equal(state.usage.aiTokens,0);
  state=applyAction(state,analysisAction);
  changePlan(state,'pro','annual');
  assert.equal(state.usage.aiTokens,estimate.totalTokens);
  changePlan(state,'free');
  assert.equal(state.usage.aiTokens,estimate.totalTokens);
  changeRole(state,'investor');
  assert.equal(state.usage.aiTokens,0);
  assert.equal(getPlan(state).tier,'free');
  state=applyAction(state,analysisAction);
  state=applyAction(state,analysisAction);
  changeRole(state,'founder');
  assert.equal(state.usage.aiTokens,estimate.totalTokens);
  changePlan(state,'plus');
  assert.equal(state.usage.aiTokens,estimate.totalTokens);
  changeRole(state,'investor');
  assert.equal(state.usage.aiTokens,estimate.totalTokens*2);
});

test('Free tokens and connections never replenish across weeks, months or years',()=>{
  const state=stateFor('investor');
  state.usage.aiTokens=3000;state.usage.connections=2;state.usage.analyses=3;
  for(const date of ['2026-11-08T17:00:00Z','2026-12-01T00:00:00Z','2030-01-01T00:00:00Z']) {
    refreshUsage(state,new Date(date));
    assert.equal(state.usage.aiTokens,3000);assert.equal(state.usage.connections,2);assert.equal(state.usage.analyses,3);
    assert.equal(nextResetAt(state,new Date(date)),null);
  }
});

test('Paid credits reset for both roles only on Monday 00:00 Vietnam, without carryover',()=>{
  const state=stateFor('investor','plus');
  const before=new Date('2026-11-08T16:59:59Z'), boundary=new Date('2026-11-08T17:00:00Z');
  refreshUsage(state,before);
  assert.equal(weekKey(before),'2026-11-02');
  assert.equal(weekKey(boundary),'2026-11-09');
  for(const role of ['founder','investor']) Object.assign(state.usageByRole[role].paid,{aiTokens:1234,connections:1,analyses:1});
  const workspaceCount=state.workspaces.length;
  refreshUsage(state,before);
  assert.equal(state.usage.aiTokens,1234);
  assert.equal(nextResetAt(state,before),'2026-11-08T17:00:00.000Z');
  refreshUsage(state,boundary);
  for(const role of ['founder','investor']) assert.deepEqual(state.usageByRole[role].paid.aiTokens,0);
  assert.equal(state.workspaces.length,workspaceCount);
  assert.equal(state.usage.connections,0);
  assert.equal(nextResetAt(state,boundary),'2026-11-15T17:00:00.000Z');
});

test('Downgrade preserves workspace content and blocks additional resources',()=>{
  let state=stateFor('founder','pro');
  state=applyAction(state,{type:'create-workspace',startupId:'lotus',name:'One',goal:'Test'});
  state=applyAction(state,{type:'create-workspace',startupId:'verda',name:'Two',goal:'Test'});
  const retained=structuredClone(state.workspaces);
  changePlan(state,'free');
  assert.deepEqual(state.workspaces,retained);
  assert.equal(getUsage(state,'workspaces').remaining,0);
  assert.throws(()=>applyAction(state,{type:'create-workspace',startupId:'lotus',name:'Three',goal:'Test'}),limitError('workspaces'));
});

test('Old paid/Free state migrates to correct role and credit bucket without replenishing',()=>{
  for(const oldPlan of ['free','startup','investor']) {
    const legacy=freshState();delete legacy.subscriptions;delete legacy.usageByRole;
    legacy.plan=oldPlan;legacy.role='investor';legacy.billing='annual';
    legacy.usage={month:monthKey(),analyses:2,connections:1};
    delete legacy.workspaces[0].role;
    legacy.reports=[{id:'old-report',name:'Legacy',createdAt:new Date().toISOString(),analysis:analyze(sample),workspaceId:'w-lotus'}];
    const migrated=validateState(legacy);
    const owner=oldPlan==='startup'?'founder':'investor';
    assert.equal(migrated.workspaces[0].role,owner);assert.equal(migrated.reports[0].role,owner);
    const bucket=oldPlan==='free'?'free':'paid';
    assert.equal(migrated.usageByRole[owner][bucket].aiTokens,estimate.totalTokens+2000);
    assert.equal(migrated.usageByRole[owner][bucket].connections,1);
    assert.equal(migrated.subscriptions[owner].tier,oldPlan==='free'?'free':oldPlan==='startup'?'plus':'pro');
  }
});

test('Earlier monthly role ledgers migrate conservatively and keep subscriptions',()=>{
  const state=freshState();
  state.subscriptions.founder={tier:'plus',billing:'monthly'};
  state.usageByRole={founder:{month:monthKey(),analyses:3,connections:0},investor:{month:monthKey(),analyses:1,connections:2}};
  const migrated=validateState(state);
  assert.equal(migrated.usageByRole.founder.paid.aiTokens,6000);
  assert.equal(migrated.usageByRole.investor.free.aiTokens,2000);
  assert.equal(migrated.usageByRole.investor.free.connections,2);
});

test('Free migration accounts for historical reports from previous months',()=>{
  const legacy=freshState();delete legacy.subscriptions;delete legacy.usageByRole;
  legacy.usage={month:monthKey(),analyses:0,connections:0};
  legacy.reports=[{id:'historical',role:'investor',name:'Earlier report',createdAt:'2025-01-01T00:00:00Z',analysis:analyze(sample)}];
  legacy.requests=[{id:'historical-request',startupId:'lotus',createdAt:'2025-01-01T00:00:00Z'}];
  const migrated=validateState(legacy);
  assert.equal(migrated.usageByRole.investor.free.aiTokens,estimate.totalTokens);
  assert.equal(migrated.usageByRole.investor.free.connections,1);
});

test('Export is locked on Free, unlocked on paid, and rejects other-role reports',()=>{
  let state=stateFor('founder');state=applyAction(state,analysisAction);
  const reportId=state.reports[0].id;
  assert.throws(()=>applyAction(state,{type:'export-report',reportId}),limitError('export'));
  changePlan(state,'plus');state=applyAction(state,{type:'export-report',reportId});
  changeRole(state,'investor');changePlan(state,'pro');
  assert.throws(()=>applyAction(state,{type:'export-report',reportId}),error=>error.code==='INVALID');
  assert.throws(()=>applyAction(state,{type:'add-task',workspaceId:'missing',title:'Task'}),error=>error.code==='INVALID');
});

test('Validation rejects corrupt subscriptions, negative counters and invalid investment inputs',()=>{
  const a=freshState();a.subscriptions.founder.tier='unlimited';assert.throws(()=>validateState(a));
  const b=freshState();b.usageByRole.founder.free.aiTokens=-10;assert.throws(()=>validateState(b));
  const c=stateFor('investor','plus');
  assert.throws(()=>applyAction(c,{type:'add-portfolio',startupId:'verda',invested:100,ownership:101,date:'2026-11-01'}),error=>error.code==='INVALID');
  assert.throws(()=>applyAction(c,{type:'add-portfolio',startupId:'verda',invested:100,ownership:1,date:'2026-02-30'}),error=>error.code==='INVALID');
});
