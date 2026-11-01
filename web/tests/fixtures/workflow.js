import { test as base, expect } from '@playwright/test';
import http from 'node:http';
import { createAPI } from '../../server/api.mjs';
import { createWorkflowStore } from '../../server/workflow-store.mjs';
const fixtureReport={summary:'Báo cáo kiểm thử: doanh thu tăng nhưng cần rà soát dòng tiền.',riskLevel:'medium',strengths:['Doanh thu kỳ cuối đạt 480 triệu đồng.'],risks:[{title:'Dòng tiền âm',reason:'Cần kiểm tra kế hoạch vốn.',evidence:'Dòng tiền tháng cuối -50 triệu đồng.'}],questions:['Kế hoạch cân bằng dòng tiền là gì?'],limitations:['Dữ liệu mẫu chưa kiểm toán.']};
export const test=base.extend({
  workflow:async({},use)=>{
    const store=createWorkflowStore();const calls=[];const config=()=>({configured:true,provider:'TestFixture',model:'fixture-model',maxOutputTokens:1024});
    const provider=async input=>{calls.push(input);return {report:fixtureReport,model:'fixture-model',provider:'TestFixture',requestId:'test-report',usage:{inputTokens:300,outputTokens:200,totalTokens:500}};};
    const chatProvider=async input=>{calls.push(input);return {text:'Cần đối chiếu doanh thu và dòng tiền với dữ liệu gốc.',model:'fixture-model',provider:'TestFixture',requestId:'test-chat',usage:{inputTokens:100,outputTokens:50,totalTokens:150}};};
    const server=http.createServer(createAPI({store,config,provider,chatProvider}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
    async function attach(context){await context.route('**/api/**',async route=>{const req=route.request();const url=new URL(req.url());const headers={...req.headers()};delete headers.origin;delete headers.host;delete headers['content-length'];try{const response=await fetch(origin+url.pathname+url.search,{method:req.method(),headers,...(req.postData()?{body:req.postData()}:{})});await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});}catch(error){await route.abort();}});}
    await use({store,calls,attach});await new Promise(resolve=>server.close(resolve));
  },
  context:async({context,workflow},use)=>{await workflow.attach(context);await use(context);},
});
export {expect};
