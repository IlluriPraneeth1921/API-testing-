import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { env } from "@src/config/env";

export class NavigationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async searchOrganization(searchTerm: string = 'Test') {
    console.log(`[NAV-PAGE] Searching for organization: ${searchTerm}`);
    
    await this.page.waitForTimeout(5000);
    
    // Select "Organizations" from search type dropdown
    const searchType = this.page.locator('[role="combobox"]').first();
    await searchType.click({ force: true });
    await this.page.waitForTimeout(2000);
    
    const orgOption = this.page.locator('mat-option:has-text("Organizations")');
    await orgOption.waitFor({ state: 'visible', timeout: 10000 });
    await orgOption.click();
    await this.page.waitForTimeout(2000);
    
    // Type search term
    const searchTextBox = this.page.locator('input[type="text"]').first();
    await searchTextBox.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(5000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/nav-01-search-results.png` });
    
    // DEBUG: Dump all clickable/interactive elements on the page to find the right selector
    console.log('[NAV-PAGE] === DEBUG: Scanning page for result elements ===');
    
    // Check for elements with aria-label containing common patterns
    const ariaElements = await this.page.locator('[aria-label]').all();
    console.log(`[NAV-PAGE] Found ${ariaElements.length} elements with aria-label`);
    for (let i = 0; i < ariaElements.length; i++) {
      const ariaLabel = await ariaElements[i].getAttribute('aria-label').catch(() => '');
      if (ariaLabel && (ariaLabel.toLowerCase().includes('row') || ariaLabel.toLowerCase().includes('table') || ariaLabel.toLowerCase().includes('detail') || ariaLabel.toLowerCase().includes('test'))) {
        const tag = await ariaElements[i].evaluate(el => el.tagName).catch(() => '');
        const cls = await ariaElements[i].evaluate(el => el.className).catch(() => '');
        console.log(`[NAV-PAGE] aria-label[${i}]: tag=${tag}, class="${String(cls).substring(0, 60)}", aria-label="${ariaLabel}"`);
      }
    }
    
    // Check for elements with role attribute
    const roleElements = await this.page.locator('[role]').all();
    for (let i = 0; i < roleElements.length; i++) {
      const role = await roleElements[i].getAttribute('role').catch(() => '');
      if (role && ['row', 'gridcell', 'cell', 'grid', 'table', 'rowgroup', 'link', 'button'].includes(role!)) {
        const text = await roleElements[i].textContent().catch(() => '');
        if (text && text.length < 200) {
          const tag = await roleElements[i].evaluate(el => el.tagName).catch(() => '');
          console.log(`[NAV-PAGE] role[${i}]: tag=${tag}, role="${role}", text="${text.substring(0, 80)}"`);
        }
      }
    }
    
    // Check for any links or buttons containing the search term
    const textElements = await this.page.locator(`a, button, [role="link"], [role="button"], span, div`).filter({ hasText: searchTerm }).all();
    console.log(`[NAV-PAGE] Found ${textElements.length} elements containing "${searchTerm}"`);
    for (let i = 0; i < Math.min(textElements.length, 15); i++) {
      const tag = await textElements[i].evaluate(el => el.tagName).catch(() => '');
      const cls = await textElements[i].evaluate(el => el.className).catch(() => '');
      const ariaLabel = await textElements[i].getAttribute('aria-label').catch(() => '');
      const role = await textElements[i].getAttribute('role').catch(() => '');
      const text = await textElements[i].textContent().catch(() => '');
      console.log(`[NAV-PAGE] text[${i}]: tag=${tag}, class="${String(cls).substring(0, 60)}", role="${role}", aria="${ariaLabel}", text="${text?.substring(0, 60)}"`);
    }
    
    console.log('[NAV-PAGE] === END DEBUG ===');
    
    // Now try clicking - use broad set of selectors
    const rowSelectors = [
      '[aria-label*="Table row 1"]',
      '[aria-label*="row 1"]',
      '[aria-label*="details drawer"]',
      '[role="row"]:nth-child(2)',
      'mat-row:first-child',
      `a:has-text("${searchTerm}")`,
      `[role="link"]:has-text("${searchTerm}")`,
      `[role="gridcell"]:has-text("${searchTerm}")`,
      `[role="cell"]:has-text("${searchTerm}")`,
      `td:has-text("${searchTerm}")`,
      'tr:nth-child(2)'
    ];
    
    let clicked = false;
    for (const selector of rowSelectors) {
      const element = this.page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      console.log(`[NAV-PAGE] Try selector "${selector}" visible: ${isVisible}`);
      if (isVisible) {
        await element.click();
        console.log(`[NAV-PAGE] Clicked using: ${selector}`);
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      await this.page.screenshot({ path: `${this.screenshotDir}/nav-01b-no-results.png` });
      throw new Error('Could not find organization in search results');
    }
    
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(5000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/nav-02-org-opened.png` });
    console.log(`[NAV-PAGE] Organization opened successfully`);
  }

  async verifyLeftNavigationElements() {
    console.log('[NAV-PAGE] Verifying left navigation elements');
    
    const navigationElements = [
      'Profile',
      'Locations', 
      'Staff Members',
      'Supported Programs',
      'Attachments',
      'Assignments',
      'Roles',
      'Forms',
      'Notes',
      'Letters',
      'Service Events',
      'Contracts'
    ];

    for (const element of navigationElements) {
      await this.verifyNavigationElement(element);
    }
    
    console.log('[NAV-PAGE] All left navigation elements verified');
  }

  private async verifyNavigationElement(elementText: string) {
    console.log(`[NAV-PAGE] Verifying ${elementText} element`);
    
    await this.page.waitForTimeout(2000);
    
    const navElement = this.page.locator(`span:text-is("${elementText}")`).first();
    
    // Scroll into view and highlight
    await navElement.scrollIntoViewIfNeeded();
    await navElement.highlight();
    
    // Verify element is visible
    await expect(navElement).toBeVisible({ timeout: 10000 });
    
    // Take screenshot
    await this.page.screenshot({ 
      path: `${this.screenshotDir}/nav-${elementText.toLowerCase().replace(/\s+/g, '-')}.png` 
    });
    
    console.log(`[NAV-PAGE] ✓ ${elementText} verified`);
  }
}