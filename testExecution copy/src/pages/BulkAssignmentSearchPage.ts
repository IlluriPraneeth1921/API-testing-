/**
 * Bulk Assignment Advanced Search Page
 * 
 * Handles: Opening search panel, filling cascading dropdowns, running query.
 * Cascading flow: Query Type → Staff Assignment Type → Location
 */
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { BulkAssignmentLocators } from "@src/locators/bulk-assignment.locators";
import { CommonLocators } from "@src/locators/common.locators";
import { DropdownHelper } from "@src/utils/dropdown-helper";
import { Waits } from "@src/config/env";
import type { BulkAssignmentSearchData } from "@src/data/test-data";

export class BulkAssignmentSearchPage {
  private dropdown: DropdownHelper;

  constructor(private page: Page) {
    this.dropdown = new DropdownHelper(page);
  }

  // ═══ PANEL ═══

  async openPanel() {
    console.log('[BA_SEARCH] Opening Advanced Search');
    // If panel is already open (Run Query button visible), close and reopen to reset state
    const runQueryBtn = this.page.locator(BulkAssignmentLocators.runQueryBtn).first();
    const alreadyOpen = await runQueryBtn.isVisible({ timeout: Waits.MIN }).catch(() => false);
    if (alreadyOpen) {
      console.log('[BA_SEARCH] Panel already open — closing to reset state');
      const closeBtn = this.page.locator(BulkAssignmentLocators.closeAdvancedSearchBtn);
      if (await closeBtn.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
        await closeBtn.click();
        await this.page.waitForTimeout(Waits.AVG);
      }
    }
    await this.page.locator(BulkAssignmentLocators.advancedSearchBtn).click({ force: true });
    await this.page.waitForTimeout(Waits.AVG);
    // Verify panel opened
    await expect(
      this.page.locator(BulkAssignmentLocators.runQueryBtn).first()
    ).toBeVisible({ timeout: Waits.MAX });
  }

  // ═══ CASCADING DROPDOWNS ═══

  /**
   * Fill all 3 mandatory cascading dropdowns and run query.
   * Accepts either a full search data object or just the queryType string (backward compat).
   * Uses exact values with fallback to first option.
   * Logs all actually-selected values for verification.
   */
  async searchWithMandatoryFields(searchDataOrQueryType: BulkAssignmentSearchData | string) {
    // Support both: full object or just queryType string
    const data: BulkAssignmentSearchData = typeof searchDataOrQueryType === 'string'
      ? { queryType: searchDataOrQueryType, staffAssignmentType: 'APS Intake', searchLocation: 'All Locations' }
      : searchDataOrQueryType;

    // 1. Query Type — clear first to reset cascading dropdowns, then select
    const selectedQueryType = await this.dropdown.selectWithFallback(
      BulkAssignmentLocators.queryTypeDropdown,
      data.queryType,
      'Query Type'
    );
    await this.page.waitForTimeout(Waits.AVG);

    // 2. Staff Assignment Type — wait longer as it cascades from Query Type
    // NOTE: Some query types (e.g. "Has Location Assignment") may show a different
    // second field (e.g. "Location Assignment Type") or none at all.
    // Use isVisible check instead of hard waitFor to avoid timeout.
    const staffInput = this.page.locator(BulkAssignmentLocators.staffAssignmentTypeDropdown);
    const staffVisible = await staffInput.isVisible({ timeout: Waits.AVG }).catch(() => false);
    let selectedStaffType = data.staffAssignmentType;
    if (staffVisible) {
      selectedStaffType = await this.dropdown.selectWithFallback(
        staffInput,
        data.staffAssignmentType,
        'Staff Assignment Type'
      );
      await this.page.waitForTimeout(Waits.AVG);
    } else {
      // Try a broader fallback — any visible combobox after query type
      const anyCombobox = this.page.locator('[role="combobox"]').nth(1);
      if (await anyCombobox.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        selectedStaffType = await this.dropdown.selectWithFallback(
          anyCombobox,
          data.staffAssignmentType,
          'Staff Assignment Type (fallback)'
        );
        await this.page.waitForTimeout(Waits.AVG);
      } else {
        console.log('[BA_SEARCH] Staff Assignment Type field not visible for this query type — skipping');
      }
    }

    // 3. Location — same graceful check as Staff Assignment Type
    const locationInput = this.page.locator(BulkAssignmentLocators.searchLocationDropdown);
    const locationVisible = await locationInput.isVisible({ timeout: Waits.MAX }).catch(() => false);
    let selectedLocation = data.searchLocation;
    if (locationVisible) {
      selectedLocation = await this.dropdown.selectWithFallback(
        locationInput,
        data.searchLocation,
        'Search Location'
      );
    } else {
      console.log('[BA_SEARCH] Location field not visible for this query type — skipping');
    }

    // Log summary
    console.log(`[BA_SEARCH] ═══ Search Criteria Summary ═══`);
    console.log(`[BA_SEARCH]   Query Type:           "${selectedQueryType}"`);
    console.log(`[BA_SEARCH]   Staff Assignment Type: "${selectedStaffType}"`);
    console.log(`[BA_SEARCH]   Location:             "${selectedLocation}"`);
    console.log(`[BA_SEARCH] ════════════════════════════════`);

    // 4. Run Query
    await this.clickRunQuery();
  }

  async clickRunQuery() {
    console.log('[BA_SEARCH] Clicking Run Query');
    await this.page.locator(BulkAssignmentLocators.runQueryBtn).first().click();
    await this.page.waitForTimeout(Waits.MAX);
  }

  /**
   * Enumerate all available options in a dropdown without selecting one.
   * Opens the dropdown, reads all mat-option texts, then closes.
   */
  private async getDropdownOptions(locatorStr: string): Promise<string[]> {
    const input = this.page.locator(locatorStr);
    await input.click({ force: true });
    await input.fill('');
    await this.page.waitForTimeout(Waits.AVG);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(Waits.AVG);

    const options = this.page.locator('mat-option');
    const count = await options.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = ((await options.nth(i).textContent()) || '').trim();
      if (t) texts.push(t);
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(Waits.MIN);
    return texts;
  }

  /**
   * Search with retry across all available Query Type options until the grid returns rows.
   *
   * Why this exists:
   *   selectWithFallback silently picks the first dropdown option when the configured
   *   value isn't found on the current env. That can return 0 rows with no obvious error.
   *   This method instead tries every available Query Type in sequence, using the
   *   configured staffAssignmentType and location, stopping as soon as rows appear.
   *
   * When it finds a working combination it logs:
   *   [BA_SEARCH] ✓ WORKING COMBO — update test-data.ts for this env:
   *   [BA_SEARCH]   queryType: "Has Location Assignment"
   *   [BA_SEARCH]   staffAssignmentType: "APS Intake"
   *   [BA_SEARCH]   searchLocation: "All Locations"
   *
   * @returns number of rows found (0 if nothing worked)
   */
  async searchUntilResults(data: BulkAssignmentSearchData): Promise<number> {
    console.log(`[BA_SEARCH] searchUntilResults — preferred queryType: "${data.queryType}"`);

    // First try the configured value as-is
    await this.searchWithMandatoryFields(data);
    let rowCount = await this.page.locator('mat-row').count();
    if (rowCount > 0) {
      console.log(`[BA_SEARCH] ✓ Configured values returned ${rowCount} rows — no retry needed`);
      return rowCount;
    }

    console.log(`[BA_SEARCH] 0 rows with configured values — scanning all Query Type options`);

    // Reopen panel and enumerate all Query Type options
    await this.openPanel();
    const queryTypeOptions = await this.getDropdownOptions(BulkAssignmentLocators.queryTypeDropdown);
    console.log(`[BA_SEARCH] Available Query Types: [${queryTypeOptions.join(', ')}]`);

    for (const queryType of queryTypeOptions) {
      if (queryType === data.queryType) continue; // already tried

      console.log(`[BA_SEARCH] Trying queryType: "${queryType}"`);

      // Select this query type
      await this.dropdown.selectWithFallback(BulkAssignmentLocators.queryTypeDropdown, queryType, 'Query Type');
      await this.page.waitForTimeout(Waits.AVG);

      // Staff Assignment Type — try configured value, fallback to first
      const staffInput = this.page.locator(BulkAssignmentLocators.staffAssignmentTypeDropdown);
      const staffVisible = await staffInput.isVisible({ timeout: Waits.AVG }).catch(() => false);
      let selectedStaff = data.staffAssignmentType;
      if (staffVisible) {
        selectedStaff = await this.dropdown.selectWithFallback(staffInput, data.staffAssignmentType, 'Staff Assignment Type');
        await this.page.waitForTimeout(Waits.AVG);
      }

      // Location — try configured value, fallback to first
      const locationInput = this.page.locator(BulkAssignmentLocators.searchLocationDropdown);
      const locationVisible = await locationInput.isVisible({ timeout: Waits.AVG }).catch(() => false);
      let selectedLocation = data.searchLocation;
      if (locationVisible) {
        selectedLocation = await this.dropdown.selectWithFallback(locationInput, data.searchLocation, 'Search Location');
      }

      await this.clickRunQuery();
      rowCount = await this.page.locator('mat-row').count();
      console.log(`[BA_SEARCH] queryType="${queryType}" → ${rowCount} rows`);

      if (rowCount > 0) {
        // Log the winning combo so the developer can update test-data.ts
        console.log(`[BA_SEARCH] ╔══════════════════════════════════════════════╗`);
        console.log(`[BA_SEARCH] ║  ✓ WORKING COMBO — update test-data.ts:     ║`);
        console.log(`[BA_SEARCH] ║    queryType:          "${queryType}"`);
        console.log(`[BA_SEARCH] ║    staffAssignmentType: "${selectedStaff}"`);
        console.log(`[BA_SEARCH] ║    searchLocation:      "${selectedLocation}"`);
        console.log(`[BA_SEARCH] ╚══════════════════════════════════════════════╝`);
        return rowCount;
      }

      // No rows — reopen panel and try next
      await this.openPanel();
    }

    console.log(`[BA_SEARCH] ⚠ No Query Type returned rows — grid is genuinely empty on this env`);
    return 0;
  }
}
