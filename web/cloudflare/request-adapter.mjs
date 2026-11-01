import { Buffer } from 'node:buffer';

const MAX_BODY_BYTES = 2_200_000;
const jsonError = (status, code, message) => new Response(JSON.stringify({code,message}), {
  status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},
});

/** Bridge the shared Node-style JSON API without opening an HTTP server in Workers. */
export async function serveAPI(request, handler) {
  const url = new URL(request.url);
  // Restore is separately authenticated by createAPI before it consumes this stream.
  const maxBodyBytes=url.pathname==='/api/admin/restore'?20_000_000:MAX_BODY_BYTES;
  const headers = Object.fromEntries(request.headers);
  // The actual Fetch URL, not a client-supplied Host header, identifies this Worker.
  headers.host = url.host;
  const contentLength = headers['content-length'];
  if(contentLength && /^\d+$/.test(contentLength) && Number(contentLength)>maxBodyBytes) return jsonError(413,'FILE_SIZE','Dữ liệu vượt giới hạn của yêu cầu.');
  const req = {
    url:url.pathname+url.search, method:request.method, headers, signal:request.signal,
    async *[Symbol.asyncIterator]() {
      if(!request.body) return;
      const reader=request.body.getReader();let size=0,complete=false;
      try {
        while(true) {
          const {value,done}=await reader.read();
          if(done){complete=true;return;}
          size+=value.byteLength;
          if(size>maxBodyBytes) throw Object.assign(new Error('Dữ liệu vượt giới hạn của yêu cầu.'),{status:413,code:'FILE_SIZE'});
          yield Buffer.from(value);
        }
      } finally {if(!complete)await reader.cancel().catch(()=>{});reader.releaseLock();}
    },
  };
  let status=200,ended=false,response;
  const responseHeaders=new Headers(),chunks=[];
  const res = {
    headersSent:false, writableEnded:false, destroyed:false,
    get statusCode(){return status;},set statusCode(value){status=value;},
    setHeader(name,value){responseHeaders.set(name,String(value));return res;},
    getHeader(name){return responseHeaders.get(name);},
    removeHeader(name){responseHeaders.delete(name);},
    writeHead(code,values={}){status=code;for(const [name,value] of Object.entries(values))responseHeaders.set(name,String(value));res.headersSent=true;return res;},
    write(value){if(ended)throw new Error('Response already ended');if(value!==undefined)chunks.push(Buffer.from(value));return true;},
    end(value){
      if(ended)return res;
      if(value!==undefined)chunks.push(Buffer.from(value));
      ended=true;res.headersSent=true;res.writableEnded=true;
      const body=request.method==='HEAD'||[204,205,304].includes(status)?null:Buffer.concat(chunks);
      response=new Response(body,{status,headers:responseHeaders});return res;
    },
  };
  try {
    await handler(req,res,()=>{if(!ended){response=jsonError(404,'NOT_FOUND','Không tìm thấy API.');ended=true;}});
    return response||jsonError(404,'NOT_FOUND','Không tìm thấy API.');
  } catch {
    return response||jsonError(500,'INTERNAL','Máy chủ gặp lỗi. Vui lòng thử lại.');
  }
}
