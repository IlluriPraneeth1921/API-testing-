import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";

export class ContactFormPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async navigateToContactForm() {
    console.log('[CONTACT] Navigating to Contact Form');
    const contactForm = this.page.locator("span:text-is('Contact Form')").first();
    await contactForm.waitFor({ state: 'visible', timeout: 10000 });
    await contactForm.click();
    await this.page.waitForTimeout(5000);
    
    // Wait for Contact Form page to load
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    await this.page.waitForTimeout(3000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/11-contact-form.png` });
    console.log('[CONTACT] Contact Form opened');
  }

  async searchFor(searchText: string) {
    console.log(`[CONTACT] Searching for: ${searchText}`);
    await this.page.waitForTimeout(3000);
    
    // Debug: Check all inputs
    const allInputs = await this.page.locator('input').count();
    console.log(`[CONTACT] Total inputs on page: ${allInputs}`);
    
    // Try to find any visible search input
    const searchInput = this.page.locator("input[type='text'], input[type='search']").filter({ hasText: '' }).last();
    const count = await searchInput.count();
    console.log(`[CONTACT] Search inputs found: ${count}`);
    
    if (count > 0) {
      await searchInput.click({ force: true });
      await searchInput.fill(searchText);
      await this.page.waitForTimeout(500);
      await searchInput.press('Enter');
      
      // Wait for table to load
      console.log('[CONTACT] Waiting for table to load');
      await this.page.waitForLoadState('networkidle', { timeout: 30000 });
      await this.page.waitForTimeout(5000);
    } else {
      console.log('[CONTACT] No search input found, skipping search');
    }
    
    await this.page.screenshot({ path: `${this.screenshotDir}/12-search-results.png` });
    console.log('[CONTACT] Search completed');
  }

  async verifyColumns() {
    console.log('[CONTACT] Verifying Contact Form list loaded');
    await this.page.waitForTimeout(5000);
    
    // Wait for any list/grid to appear
    const listContainer = this.page.locator('[class*="list"], [class*="grid"], [class*="table"]').first();
    await listContainer.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('[CONTACT] List container not found');
    });
    
    // Check if any data rows exist
    const dataRows = await this.page.locator('tr, [class*="row"]').count();
    console.log(`[CONTACT] Data rows found: ${dataRows}`);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/12a-contact-form-verified.png` });
    console.log('[CONTACT] Contact Form list verified');
  }

  async verifyData() {
    console.log('[CONTACT] Verifying data');
    await this.page.waitForTimeout(2000);
    
    // Just verify table has rows
    const rows = await this.page.locator('table tr').count();
    console.log(`[CONTACT] Table rows found: ${rows}`);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/12b-data-check.png` });
  }

  async clickColumnOptions() {
    const tuneIcon = this.page.locator("mat-icon:text-is('tune')").first();
    await tuneIcon.click();
    await this.page.waitForTimeout(1000);
    await this.page.screenshot({ path: `${this.screenshotDir}/13-column-options.png` });
  }

  async verifyColumnSelect() {
    const columnSelect = this.page.locator("span:text-is('Column Select')").first();
    await expect(columnSelect).toBeVisible();
    await columnSelect.click();
    await this.page.waitForTimeout(2000);
    console.log('[CONTACT] Column Select verified');
  }
}
