import { test, expect } from './demo-fixture.js';
import { STORAGE_KEY, freshState, validateState } from '../domain.js';
import { CHAT_STORAGE_KEY } from '../src/conversations.js';
import { getAccountStorageKey } from '../src/demoAccounts.js';

const composer = page => page.getByRole('textbox', { name: 'Soạn tin nhắn', exact: true });
const messageLog = page => page.getByRole('log', { name: 'Tin nhắn', exact: true });
const scopePicker = page => page.getByRole('combobox', { name: 'Workspace trò chuyện', exact: true });
const createDialog = page => page.getByRole('dialog', { name: 'Tạo cuộc trò chuyện', exact: true });
const readChat = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CHAT_STORAGE_KEY);
const readExisting = page => page.evaluate(key => {
  const state = JSON.parse(localStorage.getItem(key));
  return Object.fromEntries(['workspaces', 'reports', 'portfolio', 'watchlist', 'subscriptions', 'usageByRole'].map(field => [field, state[field]]));
}, getAccountStorageKey('investor-demo'));

test('two account tabs keep both message histories when they save stale snapshots', async ({ page }) => {
  await page.goto('/#/conversations/personal');
  const startupTab = await page.context().newPage();
  try {
    await startupTab.goto('/?mode=demo#/conversations');
    await startupTab.getByLabel('Chọn vai trò').selectOption('startup-demo');
    await expect(startupTab.getByLabel('Chọn vai trò')).toHaveValue('startup-demo');
    await composer(page).fill('Tin nhà đầu tư thứ nhất.');
    await composer(page).press('Enter');
    await expect(messageLog(page)).toContainText('Tin nhà đầu tư thứ nhất.');
    await composer(startupTab).fill('Tin của tài khoản Startup.');
    await composer(startupTab).press('Enter');
    await expect(messageLog(startupTab)).toContainText('Tin của tài khoản Startup.');
    await composer(page).fill('Tin nhà đầu tư thứ hai.');
    await composer(page).press('Enter');
    await expect(messageLog(page)).toContainText('Tin nhà đầu tư thứ hai.');
    await expect.poll(async () => {
      const saved = await readChat(page);
      return {
        investor: saved.scopes['investor:personal'].conversations.find(item => item.name === 'chung').messages.map(item => item.text),
        startup: saved.scopes['founder:personal'].conversations.find(item => item.name === 'chung').messages.map(item => item.text),
      };
    }).toEqual({
      investor: ['Tin nhà đầu tư thứ nhất.', 'Tin nhà đầu tư thứ hai.'],
      startup: ['Tin của tài khoản Startup.'],
    });
  } finally {
    await startupTab.close();
  }
});

async function createConversation(page, name, kind = 'channel') {
  await page.getByRole('button', { name: 'Tạo cuộc trò chuyện', exact: true }).click();
  const dialog = createDialog(page);
  await dialog.getByRole('textbox', { name: 'Tên cuộc trò chuyện', exact: true }).fill(name);
  await dialog.getByRole('combobox', { name: 'Loại cuộc trò chuyện', exact: true }).selectOption(kind);
  await dialog.getByRole('button', { name: 'Tạo', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

test('investor AI Chat is the landing page while workspace conversation history remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mình có thể giúp gì cho bạn?' })).toBeVisible();
  await expect(composer(page)).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Điều hướng Nhà đầu tư' }).getByRole('link', { name: 'AI Chat', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goto('/#/conversations/personal');
  await createConversation(page, 'Trao đổi được giữ lại');
  const conversationUrl = page.url();
  await composer(page).fill('Nội dung vẫn còn sau khi trở về trang chủ.');
  await composer(page).press('Enter');
  await expect(messageLog(page)).toContainText('Nội dung vẫn còn sau khi trở về trang chủ.');

  await page.getByRole('complementary', { name: 'Điều hướng Nhà đầu tư' }).getByRole('link', { name: 'Dashboard đầu tư' }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Danh mục của bạn, trong một góc nhìn.' })).toBeVisible();
  await expect(composer(page)).toHaveCount(0);
  await page.goto(conversationUrl);
  await expect(messageLog(page)).toContainText('Nội dung vẫn còn sau khi trở về trang chủ.');
  await page.reload();
  await expect(messageLog(page)).toContainText('Nội dung vẫn còn sau khi trở về trang chủ.');
});

test('legacy home conversation links open the same persisted history at the new route', async ({ page }) => {
  await page.goto('/#/conversations/w-lotus');
  await createConversation(page, 'Kênh từ đường dẫn cũ');
  await composer(page).fill('Lịch sử của workspace đã có từ trước.');
  await composer(page).press('Enter');
  await expect(messageLog(page)).toContainText('Lịch sử của workspace đã có từ trước.');
  const canonicalUrl = page.url();
  const legacyHash = new URL(canonicalUrl).hash.replace('#/conversations/', '#/home/');
  const saved = await readChat(page);
  await page.goto(`/${legacyHash}`);
  await expect(page).toHaveURL(canonicalUrl);
  await expect(scopePicker(page)).toHaveValue('w-lotus');
  await expect(page.getByRole('heading', { name: 'Kênh từ đường dẫn cũ', exact: true })).toBeVisible();
  await expect(messageLog(page)).toContainText('Lịch sử của workspace đã có từ trước.');
  expect(await readChat(page)).toEqual(saved);
  await page.reload();
  await expect(page).toHaveURL(canonicalUrl);
  await expect(messageLog(page)).toContainText('Lịch sử của workspace đã có từ trước.');
});

test('workspace conversations retain messages and leave all existing project data intact', async ({ page }) => {
  const state = validateState(freshState());
  state.workspaces[0].notes = 'Ghi chú quan trọng phải được giữ lại.';
  state.workspaces[0].documents.push({ id: 'document-kept', name: 'Ho-so-da-co.pdf', size: 1024, type: 'application/pdf' });
  state.reports.push({ id: 'report-kept', role: 'investor', workspaceId: 'w-lotus', name: 'Báo cáo đã có' });
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('chat-fixture')) {
      localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('chat-fixture', '1');
    }
  }, { key: STORAGE_KEY, state });
  await page.goto('/#/workspace/w-lotus');
  const before = await readExisting(page);
  for (const name of ['Công việc', 'Hồ sơ & báo cáo', 'Ghi chú']) {
    await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Mở cuộc trò chuyện', exact: true }).click();
  await expect(scopePicker(page)).toHaveValue('w-lotus');
  await createConversation(page, 'Thẩm định tháng 11');
  await composer(page).fill('Kiểm tra lại khoản công nợ tháng 10.');
  await composer(page).press('Enter');
  await expect(messageLog(page)).toContainText('Kiểm tra lại khoản công nợ tháng 10.');
  await expect(composer(page)).toBeEmpty();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Thẩm định tháng 11', exact: true })).toBeVisible();
  await expect(messageLog(page)).toContainText('Kiểm tra lại khoản công nợ tháng 10.');
  expect(await readExisting(page)).toEqual(before);
  const chat = await readChat(page);
  const created = chat.scopes['investor:w-lotus'].conversations.find(conversation => conversation.name === 'Thẩm định tháng 11');
  expect(created.messages).toHaveLength(1);
  expect(created.messages[0].text).toBe('Kiểm tra lại khoản công nợ tháng 10.');

  await page.goto('/#/workspace/w-lotus');
  await page.getByRole('tab', { name: 'Ghi chú', exact: true }).click();
  await expect(page.getByLabel('Ghi chú dự án', { exact: true })).toHaveValue(state.workspaces[0].notes);
  await page.getByRole('tab', { name: 'Hồ sơ & báo cáo', exact: true }).click();
  await expect(page.getByText('Ho-so-da-co.pdf', { exact: true })).toBeVisible();
  await expect(page.getByText('Báo cáo đã có', { exact: true })).toBeVisible();
});

test('new channels and direct conversations stay isolated by workspace and role', async ({ page }) => {
  await page.goto('/#/conversations/personal');
  await createConversation(page, 'Trao đổi riêng', 'direct');
  await composer(page).fill('Nội dung trong không gian cá nhân.');
  await composer(page).press('Enter');
  await scopePicker(page).selectOption('w-lotus');
  await expect(messageLog(page)).not.toContainText('Nội dung trong không gian cá nhân.');
  await expect(page.getByRole('link', { name: 'Trao đổi riêng', exact: true })).toHaveCount(0);
  await createConversation(page, 'Công việc Lotus');
  await scopePicker(page).selectOption('personal');
  await expect(page.getByRole('link', { name: 'Trao đổi riêng', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Công việc Lotus', exact: true })).toHaveCount(0);
  await page.getByLabel('Chọn vai trò').selectOption('startup-demo');
  await expect(page.getByRole('link', { name: 'Trao đổi riêng', exact: true })).toHaveCount(0);
  await page.getByLabel('Chọn vai trò').selectOption('investor-demo');
  await page.getByRole('link', { name: 'Trao đổi riêng', exact: true }).click();
  await expect(messageLog(page)).toContainText('Nội dung trong không gian cá nhân.');
  await page.reload();
  await expect(messageLog(page)).toContainText('Nội dung trong không gian cá nhân.');
});

test('composer supports multiline messages, replies and search without accepting blank messages', async ({ page }) => {
  await page.goto('/#/conversations/personal');
  const input = composer(page);
  const send = page.locator('main').getByRole('button', { name: 'Gửi tin nhắn', exact: true });
  await expect(send).toBeDisabled();
  await input.fill('   ');
  await expect(send).toBeDisabled();
  await input.fill('Dòng thứ nhất');
  await input.press('Shift+Enter');
  await input.pressSequentially('Dòng thứ hai');
  await input.press('Enter');
  await expect(messageLog(page)).toContainText('Dòng thứ nhất');
  await expect(messageLog(page)).toContainText('Dòng thứ hai');
  await expect(input).toBeEmpty();
  await messageLog(page).getByRole('button', { name: 'Trả lời tin nhắn', exact: true }).first().click();
  await input.fill('Đã kiểm tra tài liệu.');
  await send.click();
  await expect(messageLog(page)).toContainText('Đã kiểm tra tài liệu.');
  const chat = await readChat(page);
  const messages = chat.scopes['investor:personal'].conversations.find(conversation => conversation.name === 'chung').messages;
  expect(messages).toHaveLength(2);
  expect(messages[0].text).toBe('Dòng thứ nhất\nDòng thứ hai');
  expect(messages[1].replyTo).toBe(messages[0].id);
  const search = page.getByRole('searchbox', { name: 'Tìm trong cuộc trò chuyện', exact: true });
  await search.fill('không có kết quả này');
  await expect(messageLog(page)).not.toContainText('Đã kiểm tra tài liệu.');
  await search.fill('');
  await expect(messageLog(page)).toContainText('Đã kiểm tra tài liệu.');
});

for (const width of [390, 320]) {
  test(`conversation creation and composer fit a ${width}px mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/conversations/personal');
    await expect(composer(page)).toBeInViewport();
    await page.getByRole('button', { name: 'Danh sách cuộc trò chuyện', exact: true }).click();
    await createConversation(page, `Kênh di động ${width}`);
    await expect(composer(page)).toBeInViewport();
    await composer(page).fill('Tin nhắn từ màn hình nhỏ.');
    await page.locator('main').getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(messageLog(page)).toContainText('Tin nhắn từ màn hình nhỏ.');
    const bounds = await composer(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
