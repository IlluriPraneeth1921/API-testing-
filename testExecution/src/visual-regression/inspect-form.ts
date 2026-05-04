/**
 * Quick script to inspect the Add Announcement form fields.
 * Logs all input, mat-select, textarea elements with their aria-labels.
 */
import { launchBrowser } from '@src/core/browser';
import { LoginKeywords } from '@src/keywords/LoginKeywords';
import { env } from '@src/config/env';

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    const loginKeywords = new LoginKeywords(page);
    await loginKeywords.login(env.username, env.password);
    console.log('[INSPECT] Login successful');

    // Navigate to Announcements
    await page.goto(env.baseUrl.replace(/\/$/, '') + '#/announcements/announcement-list', { waitUntil: 'networkidle' });
    await page.waitForSelector('mat-row', { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('[INSPECT] On Announcements list page');

    // Click Add Announcement
    const addBtn = page.locator("button:has-text('Add Announcement')").first();
    await addBtn.click();
    await page.waitForTimeout(2000);
    console.log('[INSPECT] Add Announcement dialog opened');

    // Inspect all form fields
    const fields = await page.evaluate(() => {
      const results: any[] = [];

      // All inputs
      document.querySelectorAll('input, textarea, mat-select, select').forEach(el => {
        results.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          placeholder: el.getAttribute('placeholder') || '',
          id: el.id || '',
          name: el.getAttribute('name') || '',
          formControlName: el.getAttribute('formcontrolname') || '',
          className: el.className.substring(0, 80),
          visible: (el as HTMLElement).offsetParent !== null,
          parentLabel: el.closest('mat-form-field')?.querySelector('mat-label')?.textContent?.trim() || '',
        });
      });

      return results;
    });

    console.log('\n[INSPECT] ═══ Form Fields Found ═══');
    fields.forEach((f, i) => {
      console.log(`\n[INSPECT] Field ${i + 1}:`);
      console.log(`  tag: ${f.tag}`);
      console.log(`  type: ${f.type}`);
      console.log(`  aria-label: "${f.ariaLabel}"`);
      console.log(`  placeholder: "${f.placeholder}"`);
      console.log(`  id: "${f.id}"`);
      console.log(`  formControlName: "${f.formControlName}"`);
      console.log(`  parentLabel: "${f.parentLabel}"`);
      console.log(`  visible: ${f.visible}`);
    });
    console.log('\n[INSPECT] ═══════════════════════════');

  } catch (error) {
    console.error('[INSPECT] Error:', (error as Error).message);
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
