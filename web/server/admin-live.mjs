import { STARTUP_LISTING_FEE_VND, CASE_CONNECTION_SHARE_VND } from '../src/caseWorkflow.js';
import { DEMO_USERS } from './workflow-store.mjs';

// Project only operational metadata. Financial CSV, diligence answers, messages,
// AI prompts, and document contents never enter the admin dashboard response.
export function buildLiveAdminSnapshot(workflow, now=Date.now()) {
  const workspaces=(workflow.workspaces||[]).map(item=>({
    id:item.id,
    name:item.profile?.name||item.name,
    industry:item.profile?.industry||'',
    ownerId:item.ownerId,
    published:Boolean(item.published),
    catalogListing:Boolean(item.catalogListing),
    flagged:Boolean(item.flagged),
    flaggedAt:item.flaggedAt||null,
    createdAt:item.createdAt,
    updatedAt:item.updatedAt,
  }));
  const byWorkspace=new Map(workspaces.map(item=>[item.id,item]));
  const requests=(workflow.requests||[]).filter(item=>byWorkspace.has(item.workspaceId));
  const accounts=Object.entries(workflow.accounts||{}).filter(([id])=>id==='founder'||id==='investor').map(([id,item])=>({
    id,name:item.name||DEMO_USERS[id]?.name||id,email:item.email||'',role:DEMO_USERS[id]?.role==='founder'?'startup':'investor',
    status:item.status||'active',tier:item.tier,billing:item.billing,permissions:item.permissions,joinedAt:null,
  }));
  const cases=(workflow.cases||[]).filter(item=>byWorkspace.has(item.workspaceId)).map(item=>({
    id:item.id,workspaceId:item.workspaceId,startupId:item.ownerId,
    title:item.title,summary:item.summary,industry:item.industry,
    mentorId:null,status:item.stage,submittedAt:item.submittedAt,
    flagged:Boolean(item.flagged),flaggedAt:item.flaggedAt||null,
    createdAt:item.createdAt,updatedAt:item.updatedAt,
  }));
  const connections=requests.map(item=>{
    const hasBoth=Boolean(item.payments?.startup&&item.payments?.investor);
    const status=item.status==='pending'?'requested':item.status==='rejected'?'declined':item.status==='revoked'?'revoked':hasBoth?'connected':item.demoAccess?'demo_connected':'awaiting_payment';
    return {id:item.id,workspaceId:item.workspaceId,caseId:null,investorId:item.investorId,
      startupId:byWorkspace.get(item.workspaceId)?.ownerId||'',status,demoAccess:Boolean(item.demoAccess),
      createdAt:item.createdAt,updatedAt:item.updatedAt};
  });
  const investments=(workflow.portfolio||[]).filter(item=>byWorkspace.has(item.workspaceId)).map(item=>({
    id:item.id,workspaceId:item.workspaceId,investorId:item.investorId,
    startupName:byWorkspace.get(item.workspaceId)?.name||item.startupName,
    investedMillionVnd:item.invested,ownership:item.ownership,
    date:item.date,createdAt:item.createdAt,
  }));
  const transactions=[];
  for(const item of cases){
    if(item.status==='awaiting_payment')transactions.push({
      id:`listing-${item.id}`,type:'listing',accountId:item.startupId,caseId:item.id,workspaceId:item.workspaceId,
      amount:STARTUP_LISTING_FEE_VND,status:'pending',paymentAvailable:false,
      createdAt:item.submittedAt||item.updatedAt,paidAt:null,reference:'',
    });
  }
  for(const item of requests){
    if(item.status!=='approved'&&!(item.payments?.startup||item.payments?.investor))continue;
    const startupId=byWorkspace.get(item.workspaceId)?.ownerId;
    for(const party of ['startup','investor']){
      const receipt=item.payments?.[party];
      if(!receipt&&item.status!=='approved')continue;
      transactions.push({
        id:`connection-${item.id}-${party}`,type:'connection',accountId:party==='startup'?startupId:item.investorId,
        caseId:null,workspaceId:item.workspaceId,connectionId:item.id,party,
        amount:receipt?.amountVnd||CASE_CONNECTION_SHARE_VND,status:receipt?'paid':'pending',
        paymentAvailable:false,createdAt:item.createdAt,paidAt:receipt?.paidAt||null,
        reference:receipt?.providerPaymentId||'',
      });
    }
  }
  return {source:'live',revision:workflow.revision,syncedAt:new Date(now).toISOString(),
    updatedAt:new Date(now).toISOString(),accounts,workspaces,cases,connections,investments,transactions,audit:[]};
}
