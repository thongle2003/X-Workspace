import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkflowStore, DEMO_USERS } from './workflow-store.mjs';
import { getAIConfig, aiStatus, buildFinancialPrompt, buildChatPrompt, estimateInputTokens, generateFinancialReport, generateChatReply } from './ai-provider.mjs';
import { parseCSV, analyze } from '../domain.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(webRoot, '.env')); } catch (error) { if(error.code !== 'ENOENT') throw error; }
const fail = (status,code,message) => Object.assign(new Error(message),{status,code});
const hostAllowed = host => ['localhost','127.0.0.1','[::1]'].includes(host);
function send(res,status,value) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value)); }
async function json(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json')) throw fail(415,'CONTENT_TYPE','Yêu cầu phải là JSON.');
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2_200_000)throw fail(413,'FILE_SIZE','Dữ liệu vượt giới hạn 2 MB.');chunks.push(chunk);}
  try { const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data; } catch { throw fail(400,'JSON','JSON phải là một đối tượng hợp lệ.'); }
}
export function createAPI({store=createWorkflowStore({filePath:process.env.WORKFLOW_DATA_FILE||path.resolve(webRoot,'../.runtime/workflow.json')}), config=()=>getAIConfig(), provider=generateFinancialReport, chatProvider=generateChatReply, now=()=>Date.now(), publicOrigin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||'', publicDemo=process.env.PUBLIC_DEMO==='true'}={}) {
  const sessions=new Map();const inFlight=new Set();
  let hostedOrigin=null;
  if(publicOrigin){
    const configured=new URL(publicOrigin);
    if(configured.protocol!=='https:'||configured.username||configured.password||configured.pathname!=='/'||configured.search||configured.hash)throw new Error('APP_ORIGIN phải là origin HTTPS hợp lệ.');
    hostedOrigin=configured.origin;
  }
  function actor(req) { const token=req.headers['x-demo-session'];const session=typeof token==='string'?sessions.get(token):undefined;if(!session||session.expires<now())throw fail(401,'SESSION','Phiên thử nghiệm đã hết hạn. Vui lòng chọn lại vai trò.');return session.userId; }
  return async function handle(req,res,next) {
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/api/')) { if(next)return next();return send(res,404,{message:'Không tìm thấy.'}); }
    try {
      const requestedHost=new URL(`http://${req.headers.host}`);
      const isLocal=hostAllowed(requestedHost.hostname);
      const isHosted=hostedOrigin&&requestedHost.host===new URL(hostedOrigin).host;
      if(!isLocal&&!isHosted)throw fail(403,'HOST','Tên miền chưa được cấu hình cho ứng dụng.');
      if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host||!(isLocal&&hostAllowed(origin.hostname)||isHosted&&origin.origin===hostedOrigin))throw fail(403,'ORIGIN','Nguồn yêu cầu không hợp lệ.');}
      if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true,mode:hostedOrigin?'hosted-demo':'local-demo'});
      if(req.method==='GET'&&url.pathname==='/api/ai/status')return send(res,200,{...aiStatus(config()),publicDemo,allowPlanChanges:!publicDemo});
      if(req.method==='POST'&&url.pathname==='/api/demo/session'){
        const body=await json(req);const userId=body.role==='founder'?'founder':body.role==='investor'?'investor':null;
        if(!userId)throw fail(400,'ROLE','Vai trò không hợp lệ.');
        const sessionToken=randomBytes(32).toString('hex');sessions.set(sessionToken,{userId,expires:now()+12*60*60*1000});
        for(const [token,value] of sessions)if(value.expires<now())sessions.delete(token);
        if(sessions.size>1000)sessions.delete(sessions.keys().next().value);
        return send(res,200,{user:DEMO_USERS[userId],sessionToken,mode:'local-demo'});
      }
      const userId=actor(req);
      if(req.method==='GET'&&url.pathname==='/api/session')return send(res,200,{user:DEMO_USERS[userId]});
      if(req.method==='GET'&&url.pathname==='/api/workflow')return send(res,200,store.snapshot(userId));
      if(req.method==='POST'&&url.pathname==='/api/workflow/actions'){
        const action=await json(req);
        if(publicDemo&&action.type==='change-plan')throw fail(403,'PUBLIC_DEMO_PLAN','Bản chia sẻ công khai giữ gói hiện tại để giới hạn chi phí AI. Bạn vẫn có thể xem bảng giá và trải nghiệm các tính năng trong hạn mức.');
        return send(res,200,store.act(userId,action));
      }
      const financial=url.pathname.match(/^\/api\/workflow\/workspaces\/([^/]+)\/financial$/);
      if(req.method==='GET'&&financial)return send(res,200,store.getFinancial(userId,decodeURIComponent(financial[1])));
      if(req.method==='POST'&&url.pathname==='/api/ai/analysis'){
        const body=await json(req);const settings=config();if(!settings.configured)throw fail(503,'AI_NOT_CONFIGURED','Máy chủ chưa có khóa API AI hợp lệ.');
        if(inFlight.has(userId))throw fail(409,'AI_BUSY','Một phân tích đang chạy. Hãy đợi kết quả trước khi gửi tiếp.');
        // Resolve and authorize workspace data on the server before contacting the provider.
        const financial=body.workspaceId?store.getFinancial(userId,body.workspaceId):{csv:body.csv,name:body.name};
        const rows=parseCSV(financial.csv);const analysis=analyze(rows);const payload=buildFinancialPrompt({rows,analysis});
        const inputTokensEstimate=estimateInputTokens(payload);
        const available=store.snapshot(userId).usage.remaining;
        const maxOutputTokens=Math.min(settings.maxOutputTokens,available-inputTokensEstimate);
        if(maxOutputTokens<256)throw Object.assign(fail(429,'LIMIT','Không đủ token để phân tích. Hãy chọn gói phù hợp.'),{feature:'aiTokens',required:inputTokensEstimate+256,quota:store.snapshot(userId).usage});
        const reservation=store.beginAnalysis(userId,{workspaceId:body.workspaceId,csv:financial.csv,name:financial.name||'Báo cáo tài chính',inputTokensEstimate,maxOutputTokens});
        inFlight.add(userId);
        let result;
        try {
          result=await provider({rows,analysis,config:settings,maxOutputTokens});
          const report=store.finishAnalysis(userId,reservation.id,result);
          return send(res,200,{report,snapshot:store.snapshot(userId)});
        } catch(error) {
          // finishAnalysis may settle usage but deny delivery after access was revoked.
          settleFailure(userId,reservation.id,error,result);
          throw error;
        } finally {inFlight.delete(userId);}
      }
      if(req.method==='POST'&&url.pathname==='/api/ai/chat') {
        const body=await json(req),settings=config();
        if(!settings.configured)throw fail(503,'AI_NOT_CONFIGURED','Máy chủ chưa có khóa API AI hợp lệ.');
        if(inFlight.has(userId))throw fail(409,'AI_BUSY','Một yêu cầu AI đang chạy. Vui lòng đợi.');
        const snapshot=store.snapshot(userId);
        const workspace=body.workspaceId?snapshot.workspaces.find(w=>w.id===body.workspaceId):null;
        if(body.workspaceId&&!workspace)throw fail(403,'FORBIDDEN','Bạn chưa có quyền xem dự án này.');
        const context={role:snapshot.user.role,plan:snapshot.plan.name,remainingTokens:snapshot.usage.remaining,projects:snapshot.marketplace.map(p=>({name:p.profile.name,industry:p.profile.industry,summary:p.profile.summary.slice(0,160)})).slice(0,6)};
        if(workspace){context.workspace={name:workspace.name,goal:workspace.goal,profile:workspace.profile};if(workspace.financial){const a=analyze(parseCSV(workspace.financial.csv));context.financialMetrics={latest:a.latest,margin:a.margin,burn:a.burn,runway:a.runway};}}
        const payload=buildChatPrompt({question:body.question,context});const inputTokensEstimate=estimateInputTokens(payload);
        const maxOutputTokens=Math.min(512,settings.maxOutputTokens,snapshot.usage.remaining-inputTokensEstimate);
        if(maxOutputTokens<128)throw fail(429,'LIMIT','Không đủ token cho câu hỏi này.');
        const reservation=store.beginChat(userId,{workspaceId:body.workspaceId,inputTokensEstimate,maxOutputTokens});inFlight.add(userId);let result;
        try{result=await chatProvider({question:body.question,context,config:settings,maxOutputTokens});const reply=store.finishChat(userId,reservation.id,result);return send(res,200,{reply,snapshot:store.snapshot(userId)});}
        catch(error){settleFailure(userId,reservation.id,error,result);throw error;}finally{inFlight.delete(userId);}
      }
      throw fail(404,'NOT_FOUND','Không tìm thấy API.');
    } catch(error) {
      const status=Number.isInteger(error.status)&&error.status>=400&&error.status<=599?error.status:400;
      send(res,status,{code:error.code||'INVALID',message:status===500?'Máy chủ gặp lỗi. Vui lòng thử lại.':error.message,feature:error.feature,quota:error.quota,required:error.required,usageUnknown:Boolean(error.usageUnknown)});
    }
  };
  function settleFailure(userId,id,error,result) {
    const usage=error.usage||result?.usage;
    try {store.failAnalysis(userId,id,error.usageUnknown||(result&&!usage)?{unknown:true}:usage);}
    catch(settlement) {if(['CONFLICT','ALREADY_SETTLED'].includes(settlement.code))return;try{store.failAnalysis(userId,id,{unknown:true});}catch{/* Already settled after a permission change. */}}
  }
}
