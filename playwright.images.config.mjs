import { defineConfig } from '@playwright/test';
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;
const browserName = process.env.RUGATHA_IMAGE_BROWSER_NAME || 'chromium';
const localHttps = !production && process.env.RUGATHA_IMAGE_TEST_HTTPS === '1';
export default defineConfig({
  outputDir: './test-results/image-browser',
  testDir: './tests/image-browser', workers: 1, timeout: 45000,
  reporter: 'list',
  use: { baseURL: production || (localHttps ? 'https://rugatha.test:8767' : 'http://127.0.0.1:8766'), browserName, channel: browserName === 'chromium' ? process.env.RUGATHA_IMAGE_BROWSER_CHANNEL || undefined : undefined, viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure', ignoreHTTPSErrors: localHttps, launchOptions: localHttps && browserName === 'chromium' ? { args: ['--ignore-certificate-errors', '--host-resolver-rules=MAP rugatha.test 127.0.0.1', '--no-proxy-server'] } : {} },
  webServer: production ? undefined : localHttps
    ? { command: 'node scripts/letter-browser-server.mjs', url: 'https://127.0.0.1:8767/__image-test__/', ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 30000 }
    : { command: 'node scripts/image-browser-server.mjs', url: 'http://127.0.0.1:8766/__image-test__/', reuseExistingServer: false, timeout: 15000 }
});
