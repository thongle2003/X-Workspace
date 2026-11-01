import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createProductionServer, productionAccess } from './start.mjs';

const credentials = password => `Basic ${Buffer.from(`demo:${password}`).toString('base64')}`;
async function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), '2g2bt-production-'));
  const distRoot = path.join(directory, 'dist');
  fs.mkdirSync(path.join(distRoot, 'assets'), {recursive:true});
  fs.writeFileSync(path.join(distRoot, 'index.html'), '<!doctype html><title>2G2BT test</title><div id="app"></div>');
  fs.writeFileSync(path.join(distRoot, 'assets', 'app-hash.js'), 'window.testAsset = true;');
  fs.writeFileSync(path.join(directory, '.env'), 'AI_API_KEY=secret-do-not-serve');
  fs.writeFileSync(path.join(directory, 'api.mjs'), 'secret server source');
  const requests = [];
  const api = options.api || (async (req, res) => { requests.push(req.url); if(req.url === '/api/test') {res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true}));} });
  const server = createProductionServer({distRoot,api,...options});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, {recursive:true,force:true}); });
  const base = `http://127.0.0.1:${server.address().port}`;
  function raw(target, { method = 'GET', headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(base, {path:target, method, headers}, res => {
        const chunks = [];res.on('data', chunk => chunks.push(chunk));res.on('end', () => resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')}));
      }); req.on('error', reject);req.end();
    });
  }
  return {base,requests,raw,distRoot,directory};
}

test('production serves built HTML, assets and HEAD while keeping API routing separate', async t => {
  const app = await fixture(t);
  let response = await app.raw('/');assert.equal(response.status,200);assert.match(response.text, /2G2BT test/);assert.equal(response.headers['cache-control'],'no-cache');assert.equal(response.headers['x-content-type-options'],'nosniff');
  response = await app.raw('/assets/app-hash.js');assert.equal(response.status,200);assert.match(response.headers['content-type'],/javascript/);assert.match(response.headers['cache-control'],/immutable/);
  response = await app.raw('/assets/app-hash.js',{method:'HEAD'});assert.equal(response.status,200);assert.equal(response.text,'');assert.ok(Number(response.headers['content-length'])>0);
  response = await app.raw('/api/test');assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.text),{ok:true});assert.deepEqual(app.requests,['/api/test']);
  response = await app.raw('/api/unknown',{headers:{accept:'text/html'}});assert.equal(response.status,404);assert.match(response.headers['content-type'],/json/);assert.doesNotMatch(response.text,/2G2BT test/);
});
test('production permits SPA navigation only for extensionless HTML requests', async t => {
  const app = await fixture(t);
  assert.equal((await app.raw('/workspace/seed',{headers:{accept:'text/html'}})).status,200);
  assert.equal((await app.raw('/workspace/seed',{headers:{accept:'application/json'}})).status,404);
  assert.equal((await app.raw('/missing.js',{headers:{accept:'text/html'}})).status,404);
  const response = await app.raw('/',{method:'POST'});assert.equal(response.status,405);assert.equal(response.headers.allow,'GET, HEAD');
});
test('source files, hidden files, traversal and malformed paths never become static content', async t => {
  const app = await fixture(t);
  for (const target of ['/.env','/%2eenv','/.git/config','/server/api.mjs','/src/main.jsx','/domain.js','/../.env','/%2e%2e/.env','/assets/%2e%2e/%2e%2e/api.mjs','/assets/..%5c..%5c.env','/%00','/assets/app-hash.js:secret','/%ZZ']) {
    const response = await app.raw(target,{headers:{accept:'text/html'}});
    assert.equal(response.status,404,target);assert.doesNotMatch(response.text,/secret-do-not-serve|secret server source/);
  }
});
test('symlinks outside dist cannot expose a secret', async t => {
  const app = await fixture(t);
  try { fs.symlinkSync(path.join(app.directory,'.env'),path.join(app.distRoot,'leak.txt'),'file'); }
  catch (error) { if(['EPERM','EACCES'].includes(error.code)){t.skip('Host does not allow creating test symlinks.');return;}throw error; }
  assert.equal((await app.raw('/leak.txt')).status,404);
});
test('Basic demo password gates the page and every API except health checks', async t => {
  const app = await fixture(t,{password:'demo-password'});
  let response = await app.raw('/');assert.equal(response.status,401);assert.match(response.headers['www-authenticate'],/Basic/);
  assert.equal((await app.raw('/api/test')).status,401);assert.deepEqual(app.requests,[]);
  response = await app.raw('/api/health');assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.text),{ok:true});
  response = await app.raw('/api/health',{method:'HEAD'});assert.equal(response.status,200);assert.equal(response.text,'');
  assert.equal((await app.raw('/api/test',{headers:{authorization:credentials('wrong')}})).status,401);
  assert.equal((await app.raw('/api/test',{headers:{authorization:credentials('demo-password')}})).status,200);
  assert.equal((await app.raw('/',{headers:{authorization:credentials('demo-password')}})).status,200);
});
test('public hostname is explicitly configured and unexpected hosts are denied', async t => {
  const app = await fixture(t,{publicOrigin:'https://2g2bt.onrender.com'});
  assert.equal((await app.raw('/',{headers:{host:'2g2bt.onrender.com'}})).status,200);
  assert.equal((await app.raw('/',{headers:{host:'attacker.example'}})).status,403);
  assert.equal((await app.raw('/api/health',{headers:{host:'attacker.example'}})).status,403);
});
test('unexpected handler failures return a generic response', async t => {
  const app = await fixture(t,{api:async()=>{throw new Error('API_API_KEY=do-not-expose');}});
  const response = await app.raw('/api/test');assert.equal(response.status,500);assert.doesNotMatch(response.text,/do-not-expose/);
});


test('public demo deliberately opens HTML and API without a password even when an old password exists', async t=>{
  const access=productionAccess({RENDER:'true',PUBLIC_DEMO:'true',SITE_PASSWORD:'old-private-password'});
  assert.equal(access.password,'');assert.equal(access.publicDemo,true);
  const app=await fixture(t,{password:access.password});
  assert.equal((await app.raw('/')).status,200);assert.equal((await app.raw('/assets/app-hash.js')).status,200);assert.equal((await app.raw('/api/test')).status,200);
  assert.throws(()=>productionAccess({RENDER:'true'}));assert.equal(productionAccess({RENDER:'true',SITE_PASSWORD:'still-private'}).password,'still-private');
});
