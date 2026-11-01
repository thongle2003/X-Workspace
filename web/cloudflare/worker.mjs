import { DurableObject } from 'cloudflare:workers';
import { createAPI } from '../server/api.mjs';
import { getAIConfig } from '../server/ai-provider.mjs';
import { createWorkflowStore } from '../server/workflow-store.mjs';
import { serveAPI } from './request-adapter.mjs';
import { readSnapshot, writeSnapshot } from './sqlite-snapshot.mjs';

const objectName='x-workspace-demo';
const jsonError=(status,message)=>new Response(JSON.stringify({message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

/** One SQLite-backed coordinator keeps both roles and token reservations consistent. */
export class Workflow extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.bindings=env;
    this.handlers=new Map();
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      const initialData=readSnapshot(ctx.storage);
      this.store=createWorkflowStore({initialData,onPersist:next=>writeSnapshot(ctx.storage,next)});
    });
  }
  async fetch(request) {
    await this.ready;
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return jsonError(404,'Không tìm thấy API.');
    const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    const publicOrigin=url.protocol==='https:'?url.origin:'';
    if(!publicOrigin&&!local)return jsonError(403,'API yêu cầu HTTPS.');
    // Multiple configured Worker hostnames may point to the same durable data.
    // Sessions remain scoped to their origin and can be reissued after eviction.
    if(!this.handlers.has(url.origin))this.handlers.set(url.origin,createAPI({
      store:this.store,config:()=>getAIConfig(this.bindings),publicOrigin,publicDemo:true,backupAdminKey:this.bindings.BACKUP_ADMIN_KEY||'',
    }));
    return serveAPI(request,this.handlers.get(url.origin));
  }
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/api'||url.pathname.startsWith('/api/')) {
      if(!env.WORKFLOW)return jsonError(503,'Chưa cấu hình lưu trữ Durable Object.');
      return env.WORKFLOW.get(env.WORKFLOW.idFromName(objectName)).fetch(request);
    }
    if(!env.ASSETS)return jsonError(503,'Chưa có bản build giao diện.');
    return env.ASSETS.fetch(request);
  },
};
