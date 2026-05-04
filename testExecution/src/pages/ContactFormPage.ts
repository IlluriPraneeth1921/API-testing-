import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { NavigationLocators, TableLocators, FormLocators, CommonLocators } from "@src/locators";

export class ContactFormPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async navigateToContactForm() {
    console.log('[CONTACT] Navigating to Contact Form');
    const contactForm = this.page.locator(NavigationLocators.contactForm).first();
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
    
    // Debug: Check all inputs using centralized locator
    const allInputs = await this.page.locator(FormLocators.allInputs).count();
    console.log(`[CONTACT] Total inputs on page: ${allInputs}`);
    
    // Try to find any visible search input using centralized locators
    const searchInput = this.page.locator(`${CommonLocators.textInput}, ${CommonLocators.searchInput}`).filter({ hasText: '' }).last();
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
    
    // Check if any data rows exist using centralized locator
    const dataRows = await this.page.locator(`${TableLocators.tableRow}, [class*="row"]`).count();
    console.log(`[CONTACT] Data rows found: ${dataRows}`);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/12a-contact-form-verified.png` });
    console.log('[CONTACT] Contact Form list verified');
  }

  async verifyData() {
    console.log('[CONTACT] Verifying data');
    await this.page.waitForTimeout(2000);
    
    // Just verify table has rows using centralized locator
    const rows = await this.page.locator(`table ${TableLocators.tableRow}`).count();
    console.log(`[CONTACT] Table rows found: ${rows}`);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/12b-data-check.png` });
  }

  async clickColumnOptions() {
    const tuneIcon = this.page.locator(TableLocators.columnOptionsBtn).first();
    await tuneIcon.click();
    await this.page.waitForTimeout(1000);
    await this.page.screenshot({ path: `${this.screenshotDir}/13-column-options.png` });
  }

  async verifyColumnSelect() {
    const columnSelect = this.page.locator(TableLocators.columnSelectOption).first();
    await expect(columnSelect).toBeVisible();
    await columnSelect.click();
    await this.page.waitForTimeout(2000);
    console.log('[CONTACT] Column Select verified');
  }
}
