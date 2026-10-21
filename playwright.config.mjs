import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: './test-results/spellbook-browser',
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8765', channel: process.env.RUGATHA_TEST_BROWSER_CHANNEL || undefined, viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'python3 scripts/spellbook-browser-server.py',
    url: 'http://127.0.0.1:8765/__test__/health', reuseExistingServer: false,
    timeout: 30000, stdout: 'ignore', stderr: 'ignore' }
});
