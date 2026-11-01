const CHUNK_BYTES=64*1024;
const MAX_SNAPSHOT_BYTES=32*1024*1024;
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});

function schema(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS workflow_snapshot_meta (id INTEGER PRIMARY KEY CHECK(id=1), byte_length INTEGER NOT NULL, chunk_count INTEGER NOT NULL)');
  sql.exec('CREATE TABLE IF NOT EXISTS workflow_snapshot_chunks (position INTEGER PRIMARY KEY, body BLOB NOT NULL)');
}
function bytes(value) {
  if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  throw new Error('Workflow snapshot contains an invalid chunk; refusing to reset data.');
}

/** A missing snapshot is new state; a malformed existing snapshot must fail closed. */
export function readSnapshot(storage) {
  const sql=storage.sql;schema(sql);
  const metadata=sql.exec('SELECT byte_length, chunk_count FROM workflow_snapshot_meta WHERE id=1').toArray();
  if(!metadata.length) {
    if(sql.exec('SELECT position FROM workflow_snapshot_chunks LIMIT 1').toArray().length)throw new Error('Incomplete workflow snapshot; refusing to reset data.');
    return undefined;
  }
  const {byte_length:size,chunk_count:count}=metadata[0];
  if(!Number.isSafeInteger(size)||size<1||size>MAX_SNAPSHOT_BYTES||!Number.isSafeInteger(count)||count!==Math.ceil(size/CHUNK_BYTES))throw new Error('Invalid workflow snapshot metadata.');
  const rows=sql.exec('SELECT position, body FROM workflow_snapshot_chunks ORDER BY position').toArray();
  if(rows.length!==count)throw new Error('Incomplete workflow snapshot; refusing to reset data.');
  const buffer=new Uint8Array(size);let offset=0;
  rows.forEach((row,index)=>{
    const part=bytes(row.body),expected=index===count-1?size-index*CHUNK_BYTES:CHUNK_BYTES;
    if(row.position!==index||part.byteLength!==expected)throw new Error('Invalid workflow snapshot chunk.');
    buffer.set(part,offset);offset+=part.byteLength;
  });
  return JSON.parse(decoder.decode(buffer));
}

/** A SQLite transaction writes metadata and chunks together; callback failure rolls back. */
export function writeSnapshot(storage,data) {
  const serialized=JSON.stringify(data),buffer=encoder.encode(serialized);
  if(buffer.byteLength<1||buffer.byteLength>MAX_SNAPSHOT_BYTES)throw new Error('Workflow snapshot exceeds the 32 MB prototype storage limit.');
  const count=Math.ceil(buffer.byteLength/CHUNK_BYTES);
  storage.transactionSync(()=>{
    const sql=storage.sql;schema(sql);
    sql.exec('DELETE FROM workflow_snapshot_chunks');
    for(let index=0;index<count;index++) {
      const body=buffer.slice(index*CHUNK_BYTES,Math.min(buffer.byteLength,(index+1)*CHUNK_BYTES));
      sql.exec('INSERT INTO workflow_snapshot_chunks (position,body) VALUES (?,?)',index,body.buffer);
    }
    sql.exec('INSERT INTO workflow_snapshot_meta (id,byte_length,chunk_count) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET byte_length=excluded.byte_length,chunk_count=excluded.chunk_count',buffer.byteLength,count);
  });
}
