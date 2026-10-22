import { defineConfig } from '@playwright/test';
const production = process.env.RUGATHA_LETTER_TEST_BASE_URL;
export default defineConfig({
  testDir: './tests/letter-browser', outputDir: './test-results/letter-browser',
  workers: 1, timeout: 90000, expect: { timeout: 15000 }, reporter: 'list',
  use: {
    baseURL: production || 'https://rugatha.test:8767',
    channel: process.env.RUGATHA_IMAGE_BROWSER_CHANNEL || undefined,
    viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure',
    launchOptions: production ? {} : { args: ['--ignore-certificate-errors', '--host-resolver-rules=MAP rugatha.test 127.0.0.1', '--no-proxy-server'] }
  },
  webServer: production ? undefined : {
    command: 'node scripts/letter-browser-server.mjs', url: 'https://127.0.0.1:8767/__image-test__/',
    ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 30000
  }
});
