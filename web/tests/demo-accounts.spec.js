import { test, expect } from './demo-fixture.js';
import { STORAGE_KEY, freshState, validateState } from '../domain.js';
import { ACTIVE_ACCOUNT_STORAGE_KEY, getAccountStorageKey } from '../src/demoAccounts.js';

const accountPicker = page => page.getByRole('combobox', { name: 'Chọn vai trò', exact: true });
const readAccount = (page, accountId) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), getAccountStorageKey(accountId));
async function useStartupAccount(page) {
  await page.goto('/#/home');
  await accountPicker(page).selectOption('startup-demo');
  await expect(accountPicker(page)).toHaveValue('startup-demo');
}

test('demo accounts retain the existing investor data and keep Startup edits separate across reloads', async ({ page }) => {
  const legacy = validateState(freshState());
  legacy.workspaces[0].notes = 'Ghi chú của nhà đầu tư phải được giữ nguyên.';
  legacy.portfolio[0].invested = 777;
  const legacyRaw = JSON.stringify(legacy);
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem('account-fixture')) {
      localStorage.setItem(key, raw);
      sessionStorage.setItem('account-fixture', '1');
    }
  }, { key: STORAGE_KEY, raw: legacyRaw });
  await page.goto('/#/home');
  await expect(accountPicker(page)).toHaveValue('investor-demo');
  const investorBefore = await readAccount(page, 'investor-demo');
  expect(investorBefore.workspaces[0].notes).toBe(legacy.workspaces[0].notes);
  expect(investorBefore.portfolio[0].invested).toBe(777);

  await accountPicker(page).selectOption('startup-demo');
  await expect(accountPicker(page)).toHaveValue('startup-demo');
  const startup = await readAccount(page, 'startup-demo');
  expect(startup.role).toBe('founder');
  expect(startup.subscriptions.founder.tier).toBe('pro');
  await page.goto('/#/startup/lotus');
  await page.getByRole('button', { name: 'Chỉnh sửa startup', exact: true }).click();
  await page.getByLabel('Tên startup', { exact: true }).fill('LotusPay Studio');
  await page.getByRole('button', { name: 'Lưu hồ sơ startup', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LotusPay Studio', exact: true })).toBeVisible();

  await accountPicker(page).selectOption('investor-demo');
  await expect(page.getByRole('heading', { name: 'LotusPay', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chỉnh sửa startup', exact: true })).toHaveCount(0);
  const investorAfter = await readAccount(page, 'investor-demo');
  for (const field of ['workspaces', 'portfolio', 'reports', 'startups', 'subscriptions', 'usageByRole']) {
    expect(investorAfter[field]).toEqual(investorBefore[field]);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(legacyRaw);
  await accountPicker(page).selectOption('startup-demo');
  await page.reload();
  await expect(accountPicker(page)).toHaveValue('startup-demo');
  await expect(page.getByRole('heading', { name: 'LotusPay Studio', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), ACTIVE_ACCOUNT_STORAGE_KEY)).toBe('startup-demo');
});

test('Startup demo can update every sample startup and rejects invalid profile counts', async ({ page }) => {
  await useStartupAccount(page);
  await page.locator('aside').first().getByRole('link', { name: 'Quản lý startup', exact: true }).click();
  await expect(page).toHaveURL(/#\/marketplace$/);
  const original = (await readAccount(page, 'startup-demo')).startups;
  expect(original.length).toBeGreaterThan(1);
  for (const startup of original) {
    await page.goto(`/#/startup/${startup.id}`);
    await expect(page.getByRole('heading', { name: startup.name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Chỉnh sửa startup', exact: true }).click();
    await expect(page.getByLabel('Tên startup', { exact: true })).toHaveValue(startup.name);
    await page.getByLabel('Giới thiệu ngắn', { exact: true }).fill(`Đã cập nhật hồ sơ ${startup.name}.`);
    await page.getByLabel('Doanh thu / tháng (triệu ₫)', { exact: true }).fill(String(startup.revenue + 1));
    if (startup.id === original[0].id) {
      await page.getByLabel('Hồ sơ đã hoàn thành', { exact: true }).fill(String(startup.totalDocs + 1));
      await page.getByRole('button', { name: 'Lưu hồ sơ startup', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('Hồ sơ đã hoàn thành không được lớn hơn tổng số mục hồ sơ.');
      expect((await readAccount(page, 'startup-demo')).startups).toEqual(original);
      await page.getByLabel('Hồ sơ đã hoàn thành', { exact: true }).fill(String(startup.docs));
    }
    await page.getByRole('button', { name: 'Lưu hồ sơ startup', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Lưu hồ sơ startup', exact: true })).toHaveCount(0);
  }
  await page.reload();
  const updated = (await readAccount(page, 'startup-demo')).startups;
  expect(updated.map(startup => startup.id)).toEqual(original.map(startup => startup.id));
  for (const startup of original) {
    const saved = updated.find(item => item.id === startup.id);
    expect(saved.tagline).toBe(`Đã cập nhật hồ sơ ${startup.name}.`);
    expect(saved.revenue).toBe(startup.revenue + 1);
  }
});

test('creating a workspace from a startup profile keeps that startup selected and preserves other data', async ({ page }) => {
  await useStartupAccount(page);
  const before = await readAccount(page, 'startup-demo');
  await page.goto('/#/startup/verda');
  await page.getByRole('link', { name: 'Tạo workspace cho startup này', exact: true }).click();
  await expect(page).toHaveURL(/#\/workspace\/new\?startupId=verda$/);
  await expect(page.getByRole('combobox', { name: 'Startup liên quan', exact: true })).toHaveValue('verda');
  await page.evaluate(() => { window.location.hash = '/workspace/new?startupId=lotus'; });
  await expect(page.getByRole('combobox', { name: 'Startup liên quan', exact: true })).toHaveValue('lotus');
  await page.evaluate(() => { window.location.hash = '/workspace/new?startupId=verda'; });
  await expect(page.getByRole('combobox', { name: 'Startup liên quan', exact: true })).toHaveValue('verda');
  await page.getByLabel('Tên workspace', { exact: true }).fill('Hồ sơ Verda vòng mới');
  await page.getByLabel('Mục tiêu dự án', { exact: true }).fill('Tập hợp tài liệu cho startup đã chọn.');
  await page.locator('form').getByRole('button', { name: 'Tạo workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hồ sơ Verda vòng mới', exact: true })).toBeVisible();
  const after = await readAccount(page, 'startup-demo');
  const created = after.workspaces.find(workspace => workspace.name === 'Hồ sơ Verda vòng mới');
  expect(created.startupId).toBe('verda');
  expect(created.role).toBe('founder');
  expect(after.workspaces).toHaveLength(before.workspaces.length + 1);
  for (const existing of before.workspaces) expect(after.workspaces.find(workspace => workspace.id === existing.id)).toEqual(existing);
  expect(after.startups).toEqual(before.startups);
  expect(after.reports).toEqual(before.reports);
});
