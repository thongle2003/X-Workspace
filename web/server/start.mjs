import http from 'node:http';
import fs from 'node:fs';
import { promises as files } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const digest = value => createHash('sha256').update(value).digest();

function writeJSON(req, res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Content-Length':Buffer.byteLength(body), ...headers });
  res.end(req.method === 'HEAD' ? undefined : body);
}
function checkedOrigin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('APP_ORIGIN must be an HTTPS origin without a path.');
  return url.origin;
}
function requestPath(target) {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return null;
  let decoded;
  try { decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]); } catch { return null; }
  if (/[\\\x00-\x1f\x7f:]/.test(decoded)) return null;
  // Deny dot paths before resolving, including encoded traversal and hidden files.
  if (decoded.split('/').some(segment => segment.startsWith('.'))) return null;
  return decoded;
}

/** Serve only compiled frontend files. All API requests stay behind the same demo gate. */
export function createProductionServer({ api, distRoot = path.join(webRoot, 'dist'), password = '', publicOrigin = '' } = {}) {
  if (typeof api !== 'function') throw new Error('A server API handler is required.');
  if (typeof password !== 'string' || /[\r\n]/.test(password)) throw new Error('SITE_PASSWORD is invalid.');
  const origin = checkedOrigin(publicOrigin);
  const publicHost = origin ? new URL(origin).host : '';
  const root = fs.realpathSync(distRoot);
  if (!fs.statSync(path.join(root, 'index.html')).isFile()) throw new Error('Frontend build missing. Run npm run build before starting the production server.');
  const expectedCredentials = password ? digest(`demo:${password}`) : null;

  async function staticFile(file) {
    try {
      const real = await files.realpath(file);
      if (!real.startsWith(root + path.sep)) return null;
      const stat = await files.stat(real);
      return stat.isFile() ? { path:real, stat } : null;
    } catch (error) { if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) return null; throw error; }
  }
  function authenticated(req) {
    if (!expectedCredentials) return true;
    const value = req.headers.authorization;
    if (typeof value !== 'string' || !/^Basic [A-Za-z\d+/]+=*$/i.test(value) || value.length > 8192) return false;
    const supplied = Buffer.from(value.slice(value.indexOf(' ') + 1), 'base64').toString('utf8');
    return timingSafeEqual(expectedCredentials, digest(supplied));
  }
  const server = http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    void (async () => {
      const requestHost = new URL(`http://${req.headers.host || ''}`);
      if (!localHosts.has(requestHost.hostname) && requestHost.host !== publicHost) return writeJSON(req, res, 403, { message:'Host không được cấu hình.' });
      const pathname = requestPath(req.url);
      if (pathname === null) return writeJSON(req, res, 404, { message:'Không tìm thấy.' });
      if (pathname === '/api/health' && ['GET', 'HEAD'].includes(req.method)) return writeJSON(req, res, 200, { ok:true });
      if (!authenticated(req)) return writeJSON(req, res, 401, { message:'Nhập tài khoản demo và mật khẩu truy cập để tiếp tục.' }, { 'WWW-Authenticate':'Basic realm="2G2BT demo", charset="UTF-8"' });
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        await api(req, res, () => writeJSON(req, res, 404, { message:'Không tìm thấy API.' }));
        if (!res.headersSent && !res.writableEnded) writeJSON(req, res, 404, { message:'Không tìm thấy API.' });
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) return writeJSON(req, res, 405, { message:'Phương thức không được hỗ trợ.' }, { Allow:'GET, HEAD' });
      let found = await staticFile(path.join(root, pathname === '/' ? 'index.html' : pathname));
      if (!found && !path.extname(pathname) && String(req.headers.accept || '').includes('text/html')) found = await staticFile(path.join(root, 'index.html'));
      if (!found) return writeJSON(req, res, 404, { message:'Không tìm thấy.' });
      const extension = path.extname(found.path).toLowerCase();
      res.writeHead(200, {
        'Content-Type':mimeTypes[extension] || 'application/octet-stream',
        'Content-Length':found.stat.size,
        'Cache-Control':found.path.startsWith(path.join(root, 'assets') + path.sep) ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      await pipeline(fs.createReadStream(found.path), res);
    })().catch(() => {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) res.destroy();
      else writeJSON(req, res, 500, { message:'Máy chủ gặp lỗi. Vui lòng thử lại.' });
    });
  });
  server.requestTimeout = 90_000;
  server.headersTimeout = 30_000;
  return server;
}

export function productionAccess(env = process.env) {
  const publicDemo = env.PUBLIC_DEMO === 'true' || env.RENDER === 'true' && env.PUBLIC_DEMO !== 'false';
  const password = publicDemo ? '' : env.SITE_PASSWORD || '';
  if (env.RENDER === 'true' && !password && !publicDemo) throw new Error('Set SITE_PASSWORD or explicitly enable PUBLIC_DEMO before publishing on Render.');
  return { publicDemo, password, publicOrigin: env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || '' };
}

export async function startProduction() {
  // Import after startup so the API can load local .env before reading settings.
  const { createAPI } = await import('./api.mjs');
  const { publicOrigin, password, publicDemo } = productionAccess();
  const port = Number(process.env.PORT || 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
  const server = createProductionServer({ api:createAPI({publicOrigin,publicDemo}), password, publicOrigin });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', resolve); });
  console.log(`2G2BT production server listening on port ${port}`);
  let stopping = false;
  function shutdown() {
    if (stopping) return;
    stopping = true;
    server.close(() => process.exit(0));
    setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 10_000).unref();
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startProduction().catch(error => { console.error(error.message); process.exitCode = 1; });
}
