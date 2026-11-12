import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirs = ['web/src', 'web/server', 'web/cloudflare', 'tools'];
const sourceFiles = ['web/domain.js', 'web/diligence.js', 'web/vite.config.js'];
const extensions = ['.jsx', '.js', '.mjs', '.css'];
const slash = value => value.replaceAll(path.sep, '/');

function walk(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = slash(path.join(directory, entry.name));
    if (entry.isDirectory()) return walk(relative);
    return extensions.some(extension => relative.endsWith(extension)) ? [relative] : [];
  });
}

const files = [...sourceDirs.flatMap(walk), ...sourceFiles].sort();
const fileSet = new Set(files);
const group = file => file.endsWith('.test.mjs') || file.includes('/tests/') ? 'Tests'
  : file.startsWith('web/src/') ? 'Giao diện'
  : file.startsWith('web/server/') ? 'API & dữ liệu'
  : file.startsWith('web/cloudflare/') ? 'Cloudflare'
  : file.startsWith('tools/') ? 'Công cụ'
  : 'Logic & cấu hình';
const descriptions = {
  'web/src/main.jsx': 'Điểm vào bản dùng API; định tuyến hash, chọn vai trò, ghép trang.',
  'web/src/DemoApp.jsx': 'Điểm vào bản ?mode=demo; định tuyến và trạng thái trong trình duyệt.',
  'web/src/InvestmentFlow.jsx': 'Trang Marketplace, workspace, hồ sơ, phân tích và danh mục của bản API.',
  'web/src/InvestorAIChat.jsx': 'Giao diện AI Chat cho nhà đầu tư ở hai chế độ.',
  'web/src/InvestorSidebar.jsx': 'Menu điều hướng nhà đầu tư.',
  'web/src/StartupSidebar.jsx': 'Menu điều hướng startup.',
  'web/src/DiligenceSections.jsx': 'Case brief công khai, biểu đồ và thẩm định sâu.',
  'web/src/TeamRoster.jsx': 'Hiển thị và chỉnh sửa leader, co-leader, thành viên chủ chốt.',
  'web/src/CaseWorkflowPage.jsx': 'Quy trình case và kết nối ở chế độ demo.',
  'web/src/ServerCasePage.jsx': 'Nháp case và trạng thái chờ trên máy chủ.',
  'web/src/caseWorkflow.js': 'Trạng thái và thao tác case lưu trong trình duyệt.',
  'web/src/ConversationsPage.jsx': 'Hội thoại cá nhân của workspace.',
  'web/src/StartupManagement.jsx': 'Quản lý thông tin startup ở chế độ demo.',
  'web/src/PlansPage.jsx': 'Gói dịch vụ và quyền lợi.',
  'web/src/CasePricingPage.jsx': 'Phí theo case cho startup ở hai chế độ.',
  'web/src/ThemeToggle.jsx': 'Nút đổi giao diện sáng/tối.',
  'web/server/api.mjs': 'HTTP API: phiên, workflow, AI, sao lưu.',
  'web/server/workflow-store.mjs': 'Quyền truy cập, nghiệp vụ và lưu trạng thái workflow.',
  'web/server/ai-provider.mjs': 'Gọi nhà cung cấp AI và xử lý phản hồi.',
  'web/server/start.mjs': 'Máy chủ production phục vụ API và bản build.',
  'web/cloudflare/worker.mjs': 'Cloudflare Worker và Durable Object.',
  'web/cloudflare/sqlite-snapshot.mjs': 'Lưu snapshot workflow trong SQLite Durable Object.',
  'web/domain.js': 'Quy tắc gói, phân tích CSV và nghiệp vụ demo.',
  'web/diligence.js': 'Danh sách mục thẩm định sâu.',
  'web/vite.config.js': 'Gắn API middleware vào Vite dev/preview.',
};

function resolveImport(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = slash(path.normalize(path.join(path.dirname(from), specifier)));
  return [base, ...extensions.map(ext => base + ext), ...extensions.map(ext => base + '/index' + ext)].find(candidate => fileSet.has(candidate)) || null;
}

const nodes = files.map(file => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const imports = new Set();
  const pattern = /\b(?:import|export)\s+(?:['"]([^'"\r\n]+)['"]|[\s\S]*?\s+from\s*['"]([^'"\r\n]+)['"])/g;
  for (const match of source.matchAll(pattern)) {
    const resolved = resolveImport(file, match[1] || match[2]);
    if (resolved) imports.add(resolved);
  }
  return { id: file, group: group(file), description: descriptions[file] || '', imports: [...imports].sort() };
});

const data = JSON.stringify(nodes).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>2G2BT · Bản đồ project</title>
<style>
:root{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#17213a;background:#f5f6fb}*{box-sizing:border-box}body{margin:0}header{padding:24px 28px;background:#111326;color:#fff}h1{margin:0;font-size:24px}header p{margin:6px 0 0;color:#bfc4e0}main{display:grid;grid-template-columns:minmax(250px,310px) minmax(0,1fr);min-height:calc(100dvh - 112px)}aside{border-right:1px solid #dce0ed;background:#fff;padding:20px;min-height:0}input,select{width:100%;border:1px solid #cdd3e3;border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:inherit}select{margin-top:10px}.count{color:#68738e;font-size:12px;margin:14px 0 8px}.file-list{max-height:calc(100dvh - 245px);overflow:auto}.file-list button{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:9px;padding:8px 10px;font:inherit;color:#17213a;cursor:pointer;overflow-wrap:anywhere}.file-list button:hover,.file-list button.active{background:#eae9ff;color:#4635dc}.file-list small{display:block;color:#778199}.content{padding:28px;min-width:0}.panel{max-width:1100px;margin:auto;background:#fff;border:1px solid #dce0ed;border-radius:16px;padding:24px;box-shadow:0 10px 30px #1c25500d}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#5545e9}h2{margin:6px 0 4px;font-size:22px;overflow-wrap:anywhere}.desc{margin:0 0 14px;color:#536079}.open{display:inline-block;background:#5141ed;color:#fff;text-decoration:none;padding:8px 12px;border-radius:9px;font-weight:600}.graph{width:100%;margin:20px 0;border:1px solid #e0e4ee;border-radius:12px;background:#fafbfe;overflow:auto}.graph svg{display:block;min-width:730px;width:100%}.graph text{font:12px system-ui;fill:#18223d}.graph .selected{fill:#5141ed}.graph .selected-label{fill:#fff;font-weight:700}.graph .node{fill:#fff;stroke:#cbd2e4}.graph .edge{stroke:#b4bce0;stroke-width:1.5}.graph g[role=button]{cursor:pointer}.relations{display:grid;grid-template-columns:1fr 1fr;gap:18px}.relations h3{font-size:14px}.relations button{display:block;width:100%;margin:5px 0;padding:7px 9px;text-align:left;border:1px solid #e1e5ef;background:#fff;border-radius:8px;color:#4234cf;cursor:pointer;overflow-wrap:anywhere}.relations button:hover{background:#f0eeff}.empty{color:#8790a4}footer{margin-top:14px;color:#68738e;font-size:12px}@media(max-width:760px){main{display:block}aside{border-right:0;border-bottom:1px solid #dce0ed}.file-list{max-height:200px}.content{padding:14px}.panel{padding:16px}.relations{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Bản đồ project 2G2BT</h1><p>Tìm tệp, xem nó dùng gì và tệp nào đang dùng nó. Quan hệ được tạo từ import tĩnh trong source.</p></header>
<main><aside><label for="search">Tìm tên tệp hoặc chức năng</label><input id="search" type="search" placeholder="Ví dụ: chat, startup, pricing…" autofocus><select id="group" aria-label="Nhóm tệp"><option value="">Tất cả nhóm</option></select><p id="count" class="count"></p><div id="files" class="file-list"></div></aside>
<section class="content"><div class="panel"><div id="category" class="eyebrow"></div><h2 id="title"></h2><p id="description" class="desc"></p><a id="open" class="open">Mở tệp source ↗</a><div id="graph" class="graph"></div><div class="relations"><div><h3>Đang import</h3><div id="outgoing"></div></div><div><h3>Được import bởi</h3><div id="incoming"></div></div></div><footer>Đường dẫn tệp mở trực tiếp khi xem trang HTML trên máy. Sơ đồ nghiệp vụ: <a href="PROJECT-GRAPH.md">PROJECT-GRAPH.md</a>. Tạo lại: <code>node tools/build-project-graph.mjs</code>.</footer></div></section></main>
<script>const nodes=${data};
const byId=new Map(nodes.map(node=>[node.id,node]));
const incoming=new Map(nodes.map(node=>[node.id,nodes.filter(other=>other.imports.includes(node.id)).map(other=>other.id)]));
const search=document.getElementById('search'),group=document.getElementById('group'),files=document.getElementById('files');
for(const name of [...new Set(nodes.map(node=>node.group))].sort()){const option=document.createElement('option');option.value=name;option.textContent=name;group.append(option)}
let selected='web/src/main.jsx';
function label(id){return id.split('/').at(-1)}
function button(id){const element=document.createElement('button');element.type='button';element.textContent=id;element.onclick=()=>select(id);return element}
function renderList(){const query=search.value.toLocaleLowerCase('vi');const shown=nodes.filter(node=>(!group.value||node.group===group.value)&&(node.id.toLocaleLowerCase('vi').includes(query)||node.description.toLocaleLowerCase('vi').includes(query)));document.getElementById('count').textContent=shown.length+' / '+nodes.length+' tệp';files.replaceChildren();for(const node of shown){const item=button(node.id);if(node.id===selected)item.className='active';const detail=document.createElement('small');detail.textContent=node.group;item.append(detail);files.append(item)}}
function svgElement(name,attributes){const element=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element}
function graphNode(svg,id,x,y,kind){const group=svgElement('g',{role:'button',tabindex:'0','aria-label':id});const rect=svgElement('rect',{x,y,width:220,height:32,rx:8,class:kind==='center'?'selected':'node'});const title=svgElement('title',{});title.textContent=id;const text=svgElement('text',{x:x+10,y:y+21,class:kind==='center'?'selected-label':''});text.textContent=label(id);group.append(rect,text,title);group.onclick=()=>select(id);group.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(id)}};svg.append(group)}
function renderGraph(node){const left=node.imports,right=incoming.get(node.id);const count=Math.max(left.length,right.length,1),height=Math.max(160,count*44+55);const svg=svgElement('svg',{viewBox:'0 0 760 '+height,role:'img','aria-label':'Quan hệ import của '+node.id});const centerY=Math.round(height/2)-16;for(const [items,x1,x2] of [[left,230,270],[right,490,530]])items.forEach((id,index)=>{const y=27+index*44;svg.append(svgElement('line',{x1,y1:y+16,x2,y2:centerY+16,class:'edge'}))});left.forEach((id,index)=>graphNode(svg,id,10,27+index*44));graphNode(svg,node.id,270,centerY,'center');right.forEach((id,index)=>graphNode(svg,id,530,27+index*44));document.getElementById('graph').replaceChildren(svg)}
function renderRelations(target,ids){const container=document.getElementById(target);container.replaceChildren();if(!ids.length){const span=document.createElement('span');span.className='empty';span.textContent='Không có import tĩnh trong nhóm tệp được quét';container.append(span)}else ids.forEach(id=>container.append(button(id)))}
function select(id){const node=byId.get(id);if(!node)return;selected=id;document.getElementById('category').textContent=node.group;document.getElementById('title').textContent=node.id;document.getElementById('description').textContent=node.description||'Tệp source của project';document.getElementById('open').href='../'+node.id;renderGraph(node);renderRelations('outgoing',node.imports);renderRelations('incoming',incoming.get(id));renderList();history.replaceState(null,'','#'+encodeURIComponent(id))}
search.oninput=renderList;group.onchange=renderList;select(byId.has(decodeURIComponent(location.hash.slice(1)))?decodeURIComponent(location.hash.slice(1)):selected);
</script></body></html>`;

const destination = path.join(root, 'docs/PROJECT-GRAPH.html');
fs.writeFileSync(destination, html, 'utf8');
console.log(`Wrote ${slash(path.relative(root, destination))}: ${nodes.length} files, ${nodes.reduce((sum, node) => sum + node.imports.length, 0)} imports`);
