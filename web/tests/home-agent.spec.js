import { test, expect } from './demo-fixture.js';
import { getAccountStorageKey } from '../src/demoAccounts.js';

const homeTitle = 'Không gian làm việc cho startup và nhà đầu tư.';
const investorStorageKey = getAccountStorageKey('investor-demo');
const agentDialog = page => page.getByRole('dialog', { name: 'AI Agent', exact: true });
const agentLauncher = page => page.getByRole('button', { name: 'Mở AI Agent', exact: true });

test('one homepage includes the overview and keeps dashboard links compatible without changing data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  const sidebar = page.locator('aside').first();
  await expect(sidebar.getByRole('link', { name: 'Trang chủ', exact: true })).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Trang chủ', exact: true })).toHaveAttribute('href', '#/home');
  await expect(sidebar.getByRole('link', { name: 'Tổng quan', exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Trò chuyện', exact: true })).toHaveAttribute('href', '#/conversations');
  await expect(page.getByText('Vốn đã đầu tư', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();

  await page.locator('main').getByRole('button', { name: 'Khám phá AI Agent', exact: true }).click();
  await expect(agentDialog(page)).toBeVisible();
  await agentDialog(page).getByRole('button', { name: 'Đóng AI Agent', exact: true }).click();
  await expect(agentDialog(page)).toBeHidden();

  const readPreserved = () => page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    return Object.fromEntries(['workspaces', 'portfolio', 'reports', 'subscriptions', 'usageByRole'].map(field => [field, state[field]]));
  }, investorStorageKey);
  const before = await readPreserved();
  await page.goto('/#/dashboard');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();
  await expect(page.getByText('Vốn đã đầu tư', { exact: true })).toBeVisible();
  expect(await readPreserved()).toEqual(before);
  await page.reload();
  await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByLabel('Tài khoản dùng thử').selectOption('startup-demo');
  await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workspace gọi vốn', exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
});

test('AI Agent opens from the sidebar and guides users to the financial analysis page', async ({ page }) => {
  await page.goto('/#/home');
  await page.locator('aside').first().getByRole('button', { name: 'AI Agent', exact: true }).click();
  const dialog = agentDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Bản demo hướng dẫn · Chưa kết nối AI thật');
  await expect(dialog.getByRole('textbox', { name: 'Tin nhắn cho AI Agent', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Gửi tin nhắn', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Phân tích tài chính', exact: true }).click();
  const analysisLink = dialog.getByRole('link', { name: 'Mở phân tích tài chính', exact: true }).last();
  await expect(analysisLink).toHaveAttribute('href', '#/analysis');
  await analysisLink.click();
  await expect(page).toHaveURL(/#\/analysis$/);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Dùng dữ liệu mẫu LotusPay', exact: true })).toBeVisible();
  await expect(agentLauncher(page)).toBeVisible();
});

test('Escape closes AI Agent and returns keyboard focus to its launcher', async ({ page }) => {
  await page.goto('/#/pricing');
  await agentLauncher(page).click();
  const dialog = agentDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Tin nhắn cho AI Agent', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(agentLauncher(page)).toBeFocused();
});

test('typed guidance reads the current token budget without charging usage and explains unsupported questions', async ({ page }) => {
  await page.goto('/#/home');
  await expect(agentLauncher(page)).toBeVisible();
  const readTokens = () => page.evaluate(key => {
    const ledger = JSON.parse(localStorage.getItem(key)).usageByRole;
    return Object.fromEntries(Object.entries(ledger).map(([role, buckets]) => [role, {
      free: buckets.free.aiTokens,
      paid: buckets.paid.aiTokens,
    }]));
  }, investorStorageKey);
  const before = await readTokens();
  expect(before.investor.free).toBe(0);

  await agentLauncher(page).click();
  const dialog = agentDialog(page);
  const input = dialog.getByRole('textbox', { name: 'Tin nhắn cho AI Agent', exact: true });
  await input.fill('Tôi còn bao nhiêu token?');
  await dialog.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('còn 4.000 token mô phỏng');
  await expect(dialog.getByRole('link', { name: 'Xem gói dịch vụ', exact: true })).toHaveAttribute('href', '#/pricing');
  await expect(input).toBeEmpty();

  await input.fill('Viết một bài thơ về biển.');
  await input.press('Enter');
  await expect(dialog.getByRole('log')).toContainText('chưa trả lời tự do bằng AI');
  expect(await readTokens()).toEqual(before);
});

test('the floating AI Agent remains available throughout the workspace', async ({ page }) => {
  for (const route of ['home', 'dashboard', 'conversations', 'marketplace', 'analysis', 'portfolio', 'workspace', 'pricing']) {
    await page.goto(`/#/${route}`);
    await expect(agentLauncher(page)).toBeInViewport();
  }
});

for (const width of [390, 320]) {
  test(`homepage and AI Agent work through the mobile menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: homeTitle, exact: true })).toBeVisible();
    await expect(agentLauncher(page)).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.locator('aside').first().getByRole('button', { name: 'AI Agent', exact: true }).click();
    const dialog = agentDialog(page);
    await expect(dialog).toBeInViewport();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await expect(dialog.getByRole('textbox', { name: 'Tin nhắn cho AI Agent', exact: true })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Đóng AI Agent', exact: true })).toBeInViewport();
    await dialog.getByRole('button', { name: 'Đóng AI Agent', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toBeHidden();

    await page.goto('/#/pricing');
    await agentLauncher(page).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(agentLauncher(page)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
