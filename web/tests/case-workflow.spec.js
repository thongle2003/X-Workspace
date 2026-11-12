import { test, expect } from './demo-fixture.js';

const account = page => page.getByRole('combobox', { name: 'Chọn vai trò' });

test('Investor can open three sample startup cases and public briefs', async ({ page }) => {
  await page.goto('/#/cases');
  for (const name of ['LotusPay', 'Verda', 'MedFlow']) await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /LotusPay · Mở rộng thanh toán cho SME/ }).click();
  await expect(page.getByRole('heading', { name: 'Hồ sơ giới thiệu công khai' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/nhân vật mẫu|bản demo|dữ liệu minh họa/i);
  await expect(page.getByRole('link', { name: 'Xem hồ sơ LotusPay' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đội ngũ chủ chốt' })).toHaveCount(0);
  await expect(page.getByText('Mai An', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hồ sơ giới thiệu công khai' })).toBeVisible();
});

test('case handoff stays shared across demo accounts and gates chat behind both simulated shares', async ({ page }) => {
  await page.goto('/#/cases');
  await expect(page.getByRole('heading', { name: 'Case đang tìm nhà đầu tư' })).toBeVisible();
  await account(page).selectOption('startup-demo');
  await page.getByRole('button', { name: 'Tạo case', exact: true }).click();
  await page.getByLabel('Tên case').fill('LotusPay Seed 2026');
  await page.getByLabel('Lĩnh vực').fill('Fintech');
  await page.getByLabel('Mô tả case').fill('Mở rộng hệ thống thanh toán cho doanh nghiệp nhỏ tại Việt Nam.');
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await expect(page.getByRole('heading', { name: 'LotusPay Seed 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận bước phí và gửi rà soát' }).click();
  await page.getByRole('button', { name: 'Xem gợi ý và công bố' }).click();
  await expect(page.getByRole('heading', { name: 'Gợi ý rà soát hồ sơ' })).toBeVisible();
  await account(page).selectOption('investor-demo');
  await page.getByLabel('Lời nhắn cho Startup').fill('Tôi muốn tìm hiểu thêm về mô hình doanh thu và vòng Seed.');
  await page.getByRole('button', { name: 'Gửi yêu cầu kết nối' }).click();
  await expect(page.getByText('Chờ Startup đồng ý')).toBeVisible();
  await account(page).selectOption('startup-demo');
  await page.getByRole('button', { name: 'Đồng ý kết nối' }).click();
  await expect(page.getByText('Startup: chưa xác nhận · Investor: chưa xác nhận')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận phần phí 250.000đ' }).click();
  await expect(page.getByText('Trao đổi vẫn khóa đến khi cả hai bên xác nhận phí.')).toBeVisible();
  await account(page).selectOption('investor-demo');
  await page.getByRole('button', { name: 'Xác nhận phần phí 250.000đ' }).click();
  await expect(page.getByRole('heading', { name: 'Trao đổi giữa hai bên' })).toBeVisible();
  await page.getByLabel('Tin nhắn case').fill('Xin chào Startup.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await account(page).selectOption('startup-demo');
  await expect(page.getByRole('log', { name: 'Tin nhắn của case' })).toContainText('Xin chào Startup.');
  await page.reload();
  await expect(page.getByRole('log', { name: 'Tin nhắn của case' })).toContainText('Xin chào Startup.');
  await page.getByRole('button', { name: 'Thu hồi kết nối' }).click();
  await expect(page.getByRole('heading', { name: 'Trao đổi giữa hai bên' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['cases', 'pricing']) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
