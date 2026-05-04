import { launchBrowser } from '@src/core/browser';
import { LoginKeywords } from '@src/keywords/LoginKeywords';
import { env } from '@src/config/env';
import { VisualScanner } from './visual-scanner';
import { ConfigParser } from './config-parser';
import { parseScanArgs } from './cli-parser';

async function main() {
  const args = parseScanArgs();
  console.log(`[SCAN] Starting visual scan for environment: ${args.env}`);
  if (args.module) {
    console.log(`[SCAN] Scanning single module: ${args.module}`);
  }

  // Read and validate module config
  const configParser = new ConfigParser();
  const configJson = require('fs').readFileSync(
    require('path').resolve(process.cwd(), ConfigParser.CONFIG_PATH),
    'utf-8'
  );
  const validationErrors = configParser.validate(configJson);
  if (validationErrors.length > 0) {
    console.error('[SCAN] Module config validation errors:');
    validationErrors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  const config = configParser.read();

  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: null });
  await page.setViewportSize({ width: 1366, height: 768 });

  try {
    // Login using existing LoginKeywords
    const loginKeywords = new LoginKeywords(page);
    await loginKeywords.login(env.username, env.password);
    console.log('[SCAN] Login successful');

    // Run scan
    const scanner = new VisualScanner(page, config, args.env);
    const summary = await scanner.scan(args.module);

    console.log(`[SCAN] Scan complete.`);
    console.log(`[SCAN]   Modules scanned: ${summary.modulesScanned}`);
    console.log(`[SCAN]   Screenshots: ${summary.screenshotsCaptured}`);
    console.log(`[SCAN]   Skipped: ${summary.modulesSkipped}`);
    console.log(`[SCAN]   Time: ${summary.totalExecutionTimeMs}ms`);
  } catch (error) {
    console.error('[SCAN] Scan failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[SCAN] Unexpected error:', err);
  process.exit(1);
});
