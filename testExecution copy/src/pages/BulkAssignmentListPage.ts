/**
 * Bulk Assignment List Page
 * 
 * Handles: Main grid, action buttons, row selection, navigation.
 * Does NOT handle: Advanced Search panel or Modal dialogs.
 */
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { BulkAssignmentLocators } from "@src/locators/bulk-assignment.locators";
import { CommonLocators } from "@src/locators/common.locators";
import { Waits } from "@src/config/env";

export class BulkAssignmentListPage {
  constructor(private page: Page) {}

  // ═══ NAVIGATION ═══

  async verifyPageLoaded() {
    console.log('[BA_LIST] Verifying page loaded');
    await this.page.locator(BulkAssignmentLocators.pageTitle).waitFor({
      state: 'visible',
      timeout: Waits.ELEMENT_TIMEOUT,
    });
  }

  async navigateViaUrl() {
    console.log('[BA_LIST] Navigating via direct URL');
    const currentUrl = this.page.url();
    const baseUrl = currentUrl.split('#')[0];
    await this.page.goto(`${baseUrl}#/bulk-assignments`);
    await this.page.waitForTimeout(Waits.MAX);
    await this.verifyPageLoaded();
  }

  // ═══ ACTION BUTTONS ═══

  async clickAssignLocation(force = false) {
    console.log('[BA_LIST] Clicking Assign Location');
    await this.page.locator(BulkAssignmentLocators.assignLocationBtn).click({ force });
    await this.page.waitForTimeout(Waits.MIN);
  }

  async clickAssignStaff() {
    console.log('[BA_LIST] Clicking Assign Staff');
    await this.page.locator(BulkAssignmentLocators.assignStaffBtn).click();
    await this.page.waitForTimeout(Waits.MIN);
  }

  async clickUnassignLocation() {
    console.log('[BA_LIST] Clicking Unassign Location');
    await this.page.locator(BulkAssignmentLocators.unassignLocationBtn).click();
    await this.page.waitForTimeout(Waits.MIN);
  }

  async clickUnassignStaff() {
    console.log('[BA_LIST] Clicking Unassign Staff');
    await this.page.locator(BulkAssignmentLocators.unassignStaffBtn).click();
    await this.page.waitForTimeout(Waits.MIN);
  }

  // ═══ TABLE ═══

  async waitForTableLoad() {
    console.log('[BA_LIST] Waiting for table');
    // Wait for either the table (results found) or a no-results indicator
    await Promise.race([
      this.page.locator(CommonLocators.matTable).waitFor({ state: 'visible', timeout: Waits.ELEMENT_TIMEOUT }),
      this.page.locator('text=/no results|no records|0 records/i').waitFor({ state: 'visible', timeout: Waits.ELEMENT_TIMEOUT }),
    ]).catch(() => {
      // Neither appeared — table may still be loading, continue
      console.log('[BA_LIST] ⚠ Table or no-results indicator not found within timeout');
    });
  }

  async getRowCount(): Promise<number> {
    return await this.page.locator(CommonLocators.matRow).count();
  }

  async hasResults(): Promise<boolean> {
    const rows = await this.getRowCount();
    return rows > 0;
  }

  // ═══ ROW SELECTION ═══

  async selectRowByIndex(index: number) {
    console.log(`[BA_LIST] Selecting row ${index}`);
    const row = this.page.locator(CommonLocators.matRow).nth(index);
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(Waits.MIN);
    const checkbox = row.locator(BulkAssignmentLocators.rowCheckbox);
    // Use force:true to bypass any overlay/sticky header interception
    await checkbox.click({ force: true });
    await this.page.waitForTimeout(Waits.MIN);
  }

  async deselectRowByIndex(index: number) {
    console.log(`[BA_LIST] Deselecting row ${index}`);
    const row = this.page.locator(CommonLocators.matRow).nth(index);
    const isChecked = await row.locator('mat-checkbox.mat-mdc-checkbox-checked').count() > 0;
    if (isChecked) {
      await row.locator(BulkAssignmentLocators.rowCheckbox).click();
      await this.page.waitForTimeout(Waits.MIN);
    }
  }

  /**
   * Get person name from a specific row.
   * Returns the text from the personName column in that data row.
   */
  async getPersonNameAtIndex(index: number): Promise<string> {
    const cell = this.page.locator(CommonLocators.matRow).nth(index)
      .locator(BulkAssignmentLocators.personNameCell);
    const text = (await cell.textContent().catch(() => '')) || '';
    return text.trim();
  }

  /**
   * Get person info (name + row index) for logging and later search.
   * Extracts a clean search term from the name (letters/spaces only, min 3 chars).
   * Since no Person ID column exists in the grid, we use the cleaned last name for search.
   */
  async getPersonInfoAtIndex(index: number): Promise<{ name: string; searchTerm: string }> {
    const name = await this.getPersonNameAtIndex(index);
    // Clean: keep only letters, digits and spaces
    const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    // Split into parts, pick the longest word >= 3 chars (usually last name)
    const parts = cleaned.split(/\s+/).filter(p => p.length >= 3);
    let searchTerm = parts.sort((a, b) => b.length - a.length)[0] || cleaned.slice(0, 10);
    // Pad to minimum 3 chars if needed
    while (searchTerm.length < 3) searchTerm = '0' + searchTerm;
    console.log(`[BA_LIST] Row ${index}: name="${name}", searchTerm="${searchTerm}"`);
    return { name, searchTerm };
  }

  async getSelectedRowCount(): Promise<number> {
    const count = await this.page.evaluate(() => {
      const checked = document.querySelectorAll('mat-row mat-checkbox.mat-mdc-checkbox-checked');
      if (checked.length > 0) return checked.length;
      const inputs = document.querySelectorAll('mat-row input[type="checkbox"]:checked');
      if (inputs.length > 0) return inputs.length;
      const hidden = document.querySelectorAll('.cdk-visually-hidden');
      for (const el of hidden) {
        const m = (el.textContent || '').match(/(\d+)\s*total rows are currently selected/);
        if (m) return parseInt(m[1]);
      }
      return 0;
    });
    console.log(`[BA_LIST] Selected row count: ${count}`);
    return count;
  }

  // ═══ VERIFICATION ═══

  async verifyListNotRefreshed() {
    console.log('[BA_LIST] Verifying list not refreshed');
    await expect(this.page.locator(CommonLocators.matProgressBar)).not.toBeVisible();
    await expect(this.page.locator(CommonLocators.matSpinner)).not.toBeVisible();
  }
}
