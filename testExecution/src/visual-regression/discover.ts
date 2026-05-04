import { launchBrowser } from '@src/core/browser';
import { LoginKeywords } from '@src/keywords/LoginKeywords';
import { env } from '@src/config/env';
import { DiscoveryEngine } from './discovery-engine';
import { ConfigParser } from './config-parser';
import { parseDiscoverArgs } from './cli-parser';

async function main() {
  const args = parseDiscoverArgs();
  console.log(`[DISCOVER] Starting discovery for environment: ${args.env}`);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Login using existing LoginKeywords
    const loginKeywords = new LoginKeywords(page);
    await loginKeywords.login(env.username, env.password);
    console.log('[DISCOVER] Login successful');

    // Run discovery
    const engine = new DiscoveryEngine(page, new ConfigParser());
    const config = await engine.discover();

    console.log(`[DISCOVER] Discovery complete: ${config.modules.length} modules found.`);
  } catch (error) {
    console.error('[DISCOVER] Discovery failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[DISCOVER] Unexpected error:', err);
  process.exit(1);
});
