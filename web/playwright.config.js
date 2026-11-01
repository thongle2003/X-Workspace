import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/workflow.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5180', headless: true, channel: 'msedge', viewport: {width:1440,height:1000}, screenshot:'only-on-failure', trace:'retain-on-failure' },
  webServer: { command:'npm run start -- --host 127.0.0.1 --port 5180 --strictPort', url:'http://127.0.0.1:5180', reuseExistingServer:true, timeout:30000 },
});
