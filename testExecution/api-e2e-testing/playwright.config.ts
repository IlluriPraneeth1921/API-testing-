import { defineConfig } from '@playwright/test';

const isCI = !!process.env.TF_BUILD || !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 5 * 60 * 1000,
  retries: 0,
  workers: parseInt(process.env.WORKERS || '1'),
  fullyParallel: false, // serial within each file (CreateHappy must run first)
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ...(isCI ? [['junit', { outputFile: 'test-results/junit-results.xml' }] as any] : []),
  ],
  use: {
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
});
