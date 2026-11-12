import { test, expect } from './demo-fixture.js';

const investorSidebar = page => page.getByRole('complementary', { name: 'Điều hướng Nhà đầu tư' });
const startupSidebar = page => page.getByRole('complementary', { name: 'Điều hướng Startup' });

async function openInvestorMenu(page) {
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(investorSidebar(page)).toBeInViewport();
}

test('Investor opens in the full-page AI chatbot without the workspace conversation panel', async ({ page }) => {
  await page.goto('/');
  const sidebar = investorSidebar(page);
  await expect(sidebar.getByRole('link', { name: 'AI Chat', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('button', { name: 'AI Agent' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mở AI Agent' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mình có thể giúp gì cho bạn?' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Kênh và cuộc trò chuyện' })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tin nhắn cho AI' }).fill('Phân tích tài chính');
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click();
  await expect(page.getByRole('log', { name: 'Cuộc trò chuyện với AI' })).toContainText('Phân tích tài chính');
  await expect(page.getByRole('log', { name: 'Cuộc trò chuyện với AI' })).toContainText('Mở Phân tích tài chính');
  await page.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click();
  await expect(page.getByRole('heading', { name: 'Mình có thể giúp gì cho bạn?' })).toBeVisible();
  await page.reload();
  await expect(sidebar.getByRole('link', { name: 'AI Chat', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('light is the default and the theme choice persists across pages and roles', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Bật chế độ tối' })).toBeVisible();
  await expect.poll(() => page.locator('.investor-ai-chat').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(243, 244, 246)');
  await page.getByRole('button', { name: 'Bật chế độ tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.locator('.investor-ai-chat').evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(17, 24, 39)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/#/home');
  await expect(page.getByRole('button', { name: 'Bật chế độ sáng' })).toBeVisible();
  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Bật chế độ sáng' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.getByRole('button', { name: 'Bật chế độ tối' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Investor dashboard keeps its own route while Home opens AI Chat', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page.getByRole('heading', { name: 'Danh mục của bạn, trong một góc nhìn.' })).toBeVisible();
  await expect(page.getByText('500 triệu ₫', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('550 triệu ₫', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Chưa ghi nhận', { exact: true })).toBeVisible();
  await expect(investorSidebar(page).getByRole('link', { name: 'Dashboard đầu tư' })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/#\/dashboard$/);
  await page.goto('/#/home');
  await expect(page).toHaveURL(/#\/conversations$/);
  await expect(page.getByRole('heading', { name: 'Mình có thể giúp gì cho bạn?' })).toBeVisible();
});

test('the investor logo opens AI Chat and the Startup logo opens its home page', async ({ page }) => {
  await page.goto('/#/cases');
  const sidebar = investorSidebar(page);
  await sidebar.getByRole('link', { name: '2GOOD2BETRUE · AI Chat' }).click();
  await expect(page).toHaveURL(/#\/conversations$/);
  await expect(page.getByRole('heading', { name: 'Mình có thể giúp gì cho bạn?' })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Thu gọn sidebar' }).click();
  await page.goto('/#/cases');
  await sidebar.getByRole('link', { name: '2G2BT · AI Chat' }).click();
  await expect(page).toHaveURL(/#\/conversations$/);

  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');
  await page.goto('/#/cases');
  await page.locator('aside').first().getByRole('link', { name: '2GOOD2BETRUE · Trang chủ' }).click();
  await expect(page).toHaveURL(/#\/home$/);
});

test('Investor workspace and service groups navigate to working destinations', async ({ page }) => {
  await page.goto('/');
  const sidebar = investorSidebar(page);
  const workspace = sidebar.getByRole('button', { name: 'Workspace (Investor)' });
  await expect(workspace).toHaveAttribute('aria-expanded', 'false');
  await workspace.click();
  await expect(workspace).toHaveAttribute('aria-expanded', 'true');
  for (const label of ['Dự án đang theo dõi', 'Thẩm định (Due Diligence)', 'Quản lý danh mục', 'Hợp tác & Giao dịch', 'Tài liệu & Báo cáo']) {
    await expect(sidebar.getByRole('link', { name: label })).toBeVisible();
  }
  await sidebar.getByRole('link', { name: 'Thẩm định (Due Diligence)' }).click();
  await expect(page.getByRole('heading', { name: 'Thẩm định (Due Diligence)' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Thẩm định (Due Diligence)' })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Quản lý danh mục' }).click();
  await expect(page).toHaveURL(/#\/portfolio$/);
  const plans = sidebar.getByRole('button', { name: 'Gói dịch vụ' });
  await plans.click();
  for (const [label, route] of [['So sánh gói', 'compare'], ['Nâng cấp tài khoản', 'upgrade'], ['Quyền lợi & giới hạn', 'limits']]) {
    await sidebar.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#\\/pricing\\/${route}$`));
    await expect(sidebar.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
  await sidebar.getByRole('link', { name: 'Trợ giúp & Hỗ trợ' }).click();
  await expect(page.getByRole('heading', { name: 'Trợ giúp & Hỗ trợ' })).toBeVisible();
});

test('desktop collapse persists independently for Investor and Startup', async ({ page }) => {
  await page.goto('/');
  const sidebar = investorSidebar(page);
  await sidebar.getByRole('button', { name: 'Thu gọn sidebar' }).click();
  await expect.poll(() => sidebar.evaluate(node => node.getBoundingClientRect().width)).toBe(76);
  await expect(sidebar.getByRole('link', { name: 'Dashboard đầu tư' })).toHaveAttribute('title', 'Dashboard đầu tư');
  await page.reload();
  await expect.poll(() => sidebar.evaluate(node => node.getBoundingClientRect().width)).toBe(76);
  await sidebar.getByRole('button', { name: 'Mở rộng sidebar' }).click();
  await expect.poll(() => sidebar.evaluate(node => node.getBoundingClientRect().width)).toBe(260);
  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(investorSidebar(page)).toHaveCount(0);
  const startup = startupSidebar(page);
  await expect(startup.getByRole('button', { name: 'AI Agent' })).toBeVisible();
  await expect(startup).not.toContainText('Workspace cá nhân');
  await expect(startup).not.toContainText('Thêm dữ liệu. Thêm góc nhìn.');
  await startup.getByRole('button', { name: 'Thu gọn sidebar' }).click();
  await expect.poll(() => startup.evaluate(node => node.getBoundingClientRect().width)).toBe(76);
  await page.reload();
  await expect.poll(() => startup.evaluate(node => node.getBoundingClientRect().width)).toBe(76);
  await startup.getByRole('button', { name: 'Mở rộng sidebar' }).click();
  await expect.poll(() => startup.evaluate(node => node.getBoundingClientRect().width)).toBe(260);
});

test('mobile Startup menu opens with full labels and closes after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');
  await page.getByRole('button', { name: 'Mở menu' }).click();
  const sidebar = startupSidebar(page);
  await expect(sidebar.getByRole('link', { name: 'Quản lý startup' })).toBeVisible();
  await sidebar.getByRole('link', { name: 'Quản lý startup' }).click();
  await expect(page).toHaveURL(/#\/marketplace$/);
  await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [390, 320]) {
  test(`mobile Investor menu works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await openInvestorMenu(page);
    const sidebar = investorSidebar(page);
    await sidebar.getByRole('button', { name: 'Workspace (Investor)' }).click();
    await expect(sidebar.getByRole('link', { name: 'Dự án đang theo dõi' })).toBeVisible();
    await sidebar.getByRole('link', { name: 'Dự án đang theo dõi' }).click();
    await expect(page).toHaveURL(/#\/workspace$/);
    await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await openInvestorMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveCount(0);
    await openInvestorMenu(page);
    await sidebar.getByRole('button', { name: 'Đóng thanh điều hướng' }).click();
    await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveCount(0);
  });
}
