const PROVIDER_FAILURES=new Set(['AI_NETWORK','AI_TIMEOUT','AI_PROVIDER','AI_EMPTY_RESPONSE','AI_INCOMPLETE','AI_INVALID_RESPONSE','AI_USAGE_MISSING']);
const CONFIG_FAILURES=new Set(['AI_AUTH','AI_MODEL','AI_REQUEST']);
const AI_KINDS=new Set(['analysis','chat']);
const RECENT_MS=15*60*1000;

export function createServiceMonitor({now=()=>Date.now()}={}) {
  const startedAt=new Date(now()).toISOString();
  const events=[];
  const counts={workflow:{requests:0,failed:0},analysis:{requests:0,failed:0},chat:{requests:0,failed:0}};
  return {
    startedAt,
    record({kind,status,code='',durationMs=0}={}) {
      if(!['workflow','analysis','chat'].includes(kind))return;
      counts[kind].requests++;
      if(status>=500)counts[kind].failed++;
      events.push({kind,status:Number.isInteger(status)?status:500,
        code:typeof code==='string'&&/^[A-Z_]{1,60}$/.test(code)?code:'',
        durationMs:Math.max(0,Math.round(durationMs)),at:new Date(now()).toISOString()});
      if(events.length>200)events.splice(0,events.length-200);
    },
    snapshot(){return {startedAt,events:events.map(item=>({...item})),counts:structuredClone(counts)};},
  };
}

function providerState(events, configured, now) {
  if(!configured)return {status:'unconfigured',failures:0};
  const relevant=events.filter(item=>AI_KINDS.has(item.kind)&&
    (item.status<400||PROVIDER_FAILURES.has(item.code)||CONFIG_FAILURES.has(item.code)||item.code==='AI_RATE_LIMIT'));
  const latest=relevant.at(-1);
  if(!latest||now-new Date(latest.at).getTime()>24*60*60*1000)return {status:'unverified',failures:0,lastAttemptAt:latest?.at||null};
  if(latest.status<400)return {status:'up',failures:0,lastAttemptAt:latest.at};
  if(CONFIG_FAILURES.has(latest.code))return {status:'config_error',failures:0,lastAttemptAt:latest.at,lastErrorCode:latest.code};
  if(latest.code==='AI_RATE_LIMIT')return {status:'limited',failures:0,lastAttemptAt:latest.at,lastErrorCode:latest.code};
  let failures=0;
  for(let i=relevant.length-1;i>=0;i--){
    const event=relevant[i];
    if(now-new Date(event.at).getTime()>RECENT_MS||!PROVIDER_FAILURES.has(event.code))break;
    failures++;
  }
  return {status:failures>=2?'down':'degraded',failures,lastAttemptAt:latest.at,lastErrorCode:latest.code};
}

function apiState(events, now) {
  const last=events.at(-1);
  if(!last||last.status<500||now-new Date(last.at).getTime()>RECENT_MS)return 'up';
  let failures=0;
  for(let i=events.length-1;i>=0;i--){
    if(events[i].status<500||now-new Date(events[i].at).getTime()>RECENT_MS)break;
    failures++;
  }
  return failures>=2?'down':'degraded';
}

export function buildServiceSnapshot(workflow, ai, runtime, now=Date.now()) {
  const events=runtime?.events||[];
  const provider=providerState(events,ai.configured,now);
  const reservations=workflow.reservations||[];
  const feature=(kind,name,records)=>{
    const related=reservations.filter(item=>(item.kind||'analysis')===kind);
    const used=related.filter(item=>item.status==='completed');
    const failed=related.filter(item=>['failed','uncertain'].includes(item.status));
    const pending=related.filter(item=>item.status==='pending');
    const lastUsedAt=records.reduce((latest,item)=>!latest||item.createdAt>latest?item.createdAt:latest,null);
    const lastAttempt=events.filter(item=>item.kind===kind).at(-1);
    const status=!ai.configured?'unconfigured':['down','degraded','config_error','limited'].includes(provider.status)?provider.status:
      lastUsedAt&&now-new Date(lastUsedAt).getTime()<30*86_400_000?'active':'unused';
    return {id:kind,name,status,model:ai.model,provider:ai.provider,
      completed:used.length,failed:failed.length,pending:pending.length,
      totalTokens:used.reduce((sum,item)=>sum+(item.actualTokens||0),0),
      lastUsedAt,lastAttemptAt:lastAttempt?.at||null};
  };
  const workflowEvents=events.filter(item=>item.kind==='workflow');
  const services=[
    {id:'api',name:'API ứng dụng',status:apiState(workflowEvents,now),requests:runtime?.counts?.workflow?.requests||workflowEvents.length,
      failed:runtime?.counts?.workflow?.failed||workflowEvents.filter(item=>item.status>=500).length,
      lastRequestAt:workflowEvents.at(-1)?.at||null},
    {id:'provider',name:'Nhà cung cấp AI',status:provider.status,provider:ai.provider,
      model:ai.model,configured:Boolean(ai.configured),lastAttemptAt:provider.lastAttemptAt||null,
      lastErrorCode:provider.lastErrorCode||'',consecutiveFailures:provider.failures},
    feature('chat','AI Agent · Chat',workflow.aiChats||[]),
    feature('analysis','Phân tích tài chính',workflow.reports||[]),
    {id:'payments',name:'API thanh toán',status:'not_integrated',requests:0},
  ];
  return {sampledAt:new Date(now).toISOString(),serverStartedAt:runtime?.startedAt||null,
    observation:'Trạng thái nhà cung cấp dựa trên yêu cầu AI thực tế; chưa gửi yêu cầu kiểm tra riêng. Chỉ giữ 200 kết quả gần nhất trong bộ nhớ.',
    services,recentEvents:events.slice(-20).reverse()};
}
