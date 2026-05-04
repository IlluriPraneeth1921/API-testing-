/**
 * Standalone script to capture more_options menu item screenshots.
 * Navigates directly to the list page URL and runs PageExplorer.
 *
 * Usage:
 *   npm run visual:scan-menu-items:std-f1
 *   npm run visual:scan-menu-items:dev-f5
 */
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from '@src/core/browser';
import { LoginKeywords } from '@src/keywords/LoginKeywords';
import { env } from '@src/config/env';
import { PageExplorer } from './page-explorer';

const ENV_NAME = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--env') + 1]
  || 'std-f1';

// URL from navigation log — confirmed working
const LIST_PAGE_URLS: Record<string, string> = {
  'std-f1': 'https://standard-f1-carity.feisystemsh2env.com/#/announcements/announcement-list',
  'dev-f5': 'https://standard-devf5-carity.lower-bluecompass-01.aws.feisystems.com/#/announcements/announcement-list',
};

async function main() {
  console.log(`[MENU-SCAN] Starting menu item scan for env: ${ENV_NAME}`);

  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: null });
  await page.setViewportSize({ width: 1366, height: 768 });

  try {
    // Login
    const loginKeywords = new LoginKeywords(page);
    await loginKeywords.login(env.username, env.password);
    console.log('[MENU-SCAN] Login successful');

    // Navigate directly to list page URL (same as what sidebar navigation produces)
    const url = LIST_PAGE_URLS[ENV_NAME] || LIST_PAGE_URLS['std-f1'];
    console.log(`[MENU-SCAN] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('mat-row', { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('[MENU-SCAN] On list page, rows loaded');

    // Screenshot directory
    const screenshotDir = path.resolve(
      process.cwd(),
      `visual-regression/screenshots/${ENV_NAME}`
    );
    fs.mkdirSync(screenshotDir, { recursive: true });

    // Run PageExplorer
    const explorer = new PageExplorer(page, ENV_NAME, screenshotDir);
    const result = await explorer.exerciseAll('Announcements');

    console.log(`[MENU-SCAN] Done. Exercised: ${result.exercised.length}, Skipped: ${result.skipped.length}`);
    console.log(`[MENU-SCAN] Screenshots captured: ${result.screenshotsCaptured}`);
    result.exercised.forEach(e => console.log(`  ✓ ${e.label} (${e.type})`));
    result.skipped.forEach(e => console.log(`  ✗ ${e.label} (${e.type})`));

  } catch (error) {
    console.error('[MENU-SCAN] Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[MENU-SCAN] Unexpected error:', err);
  process.exit(1);
});
