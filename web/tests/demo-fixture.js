import { test as base, expect } from '@playwright/test';

// Exercise the local prototype while the server workflow remains independently available.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const url = new URL(window.location.href);
      if (url.origin === 'null') return;
      url.searchParams.set('mode', 'demo');
      window.history.replaceState(null, '', url.href);
    });
    await use(page);
  },
});

export { expect };
