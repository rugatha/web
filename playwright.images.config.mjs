import { defineConfig } from '@playwright/test';
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;
export default defineConfig({
  testDir: './tests/image-browser', workers: 1, timeout: 45000,
  reporter: 'list',
  use: { baseURL: production || 'http://127.0.0.1:8766', channel: process.env.RUGATHA_IMAGE_BROWSER_CHANNEL || undefined, viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure' },
  webServer: production ? undefined : { command: 'node scripts/image-browser-server.mjs', url: 'http://127.0.0.1:8766/__image-test__/', reuseExistingServer: false, timeout: 15000 }
});
