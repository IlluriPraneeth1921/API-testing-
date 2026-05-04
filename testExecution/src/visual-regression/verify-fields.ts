/**
 * Quick script to verify form field selectors.
 * Navigates to Announcements, opens Add form, dumps all form elements.
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
    console.log('[VERIFY] Login successful');

    // Navigate to Announcements list
    const url = `${env.baseUrl.replace(/\/$/, '')}/#/announcements/announcement-list`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('mat-row', { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('[VERIFY] On Announcements list page');

    // Click Add Announcement
    const addBtn = page.locator("button:has-text('Add Announcement')").first();
    await addBtn.click();
    await page.waitForTimeout(2000);
    console.log('[VERIFY] Add Announcement form opened');

    // Dump all form elements
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
          maxlength: el.getAttribute('maxlength') || '',
          required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
          visible: (el as HTMLElement).offsetParent !== null,
          classes: el.className.substring(0, 80),
        });
      });
      // Also check mat-label elements to see field labels
      document.querySelectorAll('mat-label').forEach(el => {
        results.push({
          tag: 'mat-label',
          text: el.textContent?.trim() || '',
        });
      });
      return results;
    });

    console.log('\n[VERIFY] === Form Elements Found ===');
    fields.forEach((f, i) => {
      console.log(`[${i}] ${JSON.stringify(f)}`);
    });
    console.log(`[VERIFY] Total: ${fields.length} elements`);

  } catch (error) {
    console.error('[VERIFY] Error:', (error as Error).message);
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
