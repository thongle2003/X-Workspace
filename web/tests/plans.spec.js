import {test,expect} from './demo-fixture.js';
import {ACTIVE_ACCOUNT_STORAGE_KEY,getAccountStorageKey} from '../src/demoAccounts.js';
import {freshState,validateState,changeRole,changePlan,refreshUsage,STORAGE_KEY} from '../domain.js';
async function seed(page,state){ const id=state.role==='founder'?'startup-demo':'investor-demo'; await page.addInitScript(({legacy,key,active,id,state})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(legacy,JSON.stringify(state));localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(active,id);sessionStorage.setItem('seeded','1');}},{legacy:STORAGE_KEY,key:getAccountStorageKey(id),active:ACTIVE_ACCOUNT_STORAGE_KEY,id,state}); }
const read = page => page.evaluate(({active,keys})=>JSON.parse(localStorage.getItem(keys[localStorage.getItem(active)||'investor-demo'])),{active:ACTIVE_ACCOUNT_STORAGE_KEY,keys:Object.fromEntries(['investor-demo','startup-demo'].map(id=>[id,getAccountStorageKey(id)]))});
async function selectPlan(page,name,free=false){
  if(name.startsWith('Startup ')) await page.goto('/#/pricing/legacy'); // Old quota controls remain available only for technical demo tests.
  const card=page.locator('section').filter({has:page.getByRole('heading',{name,exact:true})}).first();
  await card.getByRole('button').first().click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button',{name:free?'Xác nhận chuyển gói':'Xác nhận dùng thử'}).click();
}
test('Startup Free can create one workspace; new workspace is blocked and existing notes remain editable',async({page})=>{
  const s=validateState(freshState());changeRole(s,'founder');await seed(page,s);await page.goto('/#/workspace/new');
  await page.getByLabel('Tên workspace',{exact:true}).fill('Gọi vốn mới');await page.getByLabel('Mục tiêu dự án').fill('Hoàn thiện hồ sơ vòng Seed');
  await page.locator('form').getByRole('button',{name:'Tạo workspace',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Gọi vốn mới',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Tạo workspace',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('1 / 1');await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).last().click();
  await page.getByRole('tab',{name:'Ghi chú'}).click();await page.getByLabel('Ghi chú dự án').fill('Giữ dữ liệu khi chạm quota.');await page.getByRole('button',{name:'Lưu ghi chú'}).click();
  const saved=await read(page);expect(saved.workspaces.filter(w=>w.role==='founder')).toHaveLength(1);expect(saved.workspaces.find(w=>w.role==='founder').notes).toContain('Giữ dữ liệu');
});
test('token estimate is charged, insufficient budget and Free export are blocked; upgrading does not refill Free',async({page})=>{
  const s=validateState(freshState());changeRole(s,'founder');await seed(page,s);await page.goto('/#/analysis');
  await page.getByRole('button',{name:'Dùng CSV LotusPay'}).click();await expect(page.getByTestId('token-estimate')).toContainText('841');
  await page.getByRole('button',{name:'Phân tích · 841 token'}).click();await expect(page.getByTestId('token-remaining')).toContainText('1.159');
  await page.getByRole('button',{name:/Xuất báo cáo CSV/}).click();await expect(page.getByRole('dialog')).toContainText('xuất báo cáo');await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).last().click();
  await page.getByRole('button',{name:'Phân tích · 841 token'}).click();await expect(page.getByTestId('token-remaining')).toContainText('318');
  await page.getByRole('button',{name:'Phân tích · 841 token'}).click();await expect(page.getByRole('dialog')).toContainText('còn 318');
  expect((await read(page)).reports.filter(r=>r.role==='founder')).toHaveLength(2);
  await page.getByRole('link',{name:'Xem gói phù hợp'}).click();await selectPlan(page,'Startup Launch');
  await page.goto('/#/analysis');await page.getByRole('button',{name:'Dùng CSV LotusPay'}).click();await page.getByRole('button',{name:'Phân tích · 841 token'}).click();await expect(page.getByTestId('token-remaining')).toContainText('19.159');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất báo cáo CSV',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.goto('/#/pricing');await selectPlan(page,'Startup Free',true);await page.goto('/#/analysis');await expect(page.getByTestId('token-remaining')).toContainText('318');
  await page.reload();await expect(page.getByTestId('token-remaining')).toContainText('318');
  await page.getByLabel('Chọn vai trò').selectOption('investor-demo');await expect(page.getByTestId('token-remaining')).toContainText('4.000');
  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');await expect(page.getByTestId('token-remaining')).toContainText('318');
});
test('paid resets Monday in Vietnam while Free remains spent, including after returning to Free',async({page})=>{
  await page.clock.install({time:new Date('2026-11-01T16:59:50Z')});
  const s=validateState(freshState());changeRole(s,'founder');changePlan(s,'plus');refreshUsage(s,new Date('2026-11-01T16:59:50Z'));s.usageByRole.founder.paid.aiTokens=15000;s.usageByRole.founder.free.aiTokens=2000;
  await seed(page,s);await page.goto('/#/analysis');await expect(page.getByTestId('token-remaining')).toContainText('5.000');
  await page.clock.fastForward(20000);await expect(page.getByTestId('token-remaining')).toContainText('20.000');
  await page.goto('/#/pricing');await selectPlan(page,'Startup Free',true);await page.goto('/#/analysis');await expect(page.getByTestId('token-remaining')).toContainText('0 token');
  await page.clock.fastForward(8*24*60*60*1000);await page.reload();await expect(page.getByTestId('token-remaining')).toContainText('0 token');
});
test('investor watchlist and compare quotas are enforced at both entry points',async({page})=>{
  await page.goto('/#/marketplace');await page.getByRole('button',{name:'Lưu startup',exact:true}).first().click();await page.getByRole('button',{name:'Lưu startup',exact:true}).first().click();await expect(page.getByRole('dialog')).toContainText('startup đã lưu');
  await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).last().click();await page.goto('/#/startup/medflow');await page.getByRole('button',{name:'Lưu startup',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('startup đã lưu');await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).last().click();
  await page.goto('/#/marketplace');for(let i=0;i<3;i++)await page.getByRole('button',{name:'So sánh',exact:true}).first().click();await expect(page.getByRole('dialog')).toContainText('startup so sánh');expect((await read(page)).compare).toHaveLength(2);
});
test('pricing follows the active role and mobile pages fit the viewport',async({page})=>{
  await page.goto('/#/pricing');await expect(page.getByRole('heading',{name:'Startup Launch',exact:true})).toHaveCount(0);await page.getByLabel('Chọn vai trò').selectOption('startup-demo');await expect(page.getByRole('heading',{name:'Startup trả theo hồ sơ',exact:true})).toBeVisible();expect((await read(page)).role).toBe('founder');await expect(page.getByRole('heading',{name:'Investor Basic',exact:true})).toHaveCount(0);
  await page.screenshot({path:'../tmp/pricing-startup-final.png',fullPage:true});
  await page.getByLabel('Chọn vai trò').selectOption('investor-demo');
  const planCard = name => page.locator('section').filter({has:page.getByRole('heading',{name,exact:true})}).first();
  await expect(planCard('Investor Trial')).toContainText('Trial 2 tháng');
  await expect(planCard('Investor Trial')).toContainText('3 startup đã lưu');
  await expect(planCard('Investor Trial')).toContainText('3 startup trong danh mục');
  await expect(planCard('Investor Basic')).toContainText('399.000');
  await expect(planCard('Investor Basic')).toContainText('5 startup đã lưu');
  await expect(planCard('Investor Basic')).toContainText('10 startup trong danh mục');
  await expect(planCard('Investor Pro')).toContainText('699.000');
  await expect(planCard('Investor Pro')).toContainText('20 startup đã lưu');
  await expect(planCard('Investor Pro')).toContainText('50 startup trong danh mục');
  await page.getByRole('button',{name:'Theo năm'}).click();
  await expect(planCard('Investor Basic')).toContainText('3.999.000');
  await expect(planCard('Investor Pro')).toContainText('6.999.000');
  await expect(planCard('Investor Pro')).toContainText('Bản đồ sự kiện/startup gần bạn');
  await page.screenshot({path:'../tmp/pricing-investor-final.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});for(const route of ['pricing','analysis','workspace','marketplace','dashboard']){await page.goto('/#/'+route);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.goto('/#/pricing');await page.screenshot({path:'../tmp/pricing-mobile-final.png',fullPage:true});
  await page.getByRole('button',{name:'Mở menu'}).click();await expect(page.getByRole('button',{name:'Gói dịch vụ',exact:false}).first()).toBeVisible();await page.keyboard.press('Escape');
});

test('investor cannot create a workspace from any entry point or purchase a Startup plan',async({page})=>{
  const state=validateState(freshState());changePlan(state,'pro');await seed(page,state);
  for(const route of ['dashboard','workspace','workspace/new','startup/lotus']){
    await page.goto('/#/'+route);await expect(page.locator('h1')).toBeVisible();await expect(page.getByRole('button',{name:/Tạo workspace/})).toHaveCount(0);await expect(page.getByLabel('Tên workspace',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('link',{name:/CP3/})).toHaveCount(0);
  }
  await expect(page.getByRole('button',{name:/Tạo workspace/})).toHaveCount(0);
  await page.goto('/#/pricing');await expect(page.getByRole('heading',{name:/^Startup /})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Investor Pro',exact:true}).first()).toBeVisible();
  await page.goto('/#/research');await expect(page.locator('h1')).toBeVisible();await expect(page.getByText(/CP3|Tiến độ thu mẫu|phiếu khảo sát/)).toHaveCount(0);
});
