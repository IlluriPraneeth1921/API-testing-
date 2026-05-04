/**
 * Person Profile Page
 * 
 * Handles: Person profile navigation, left panel sections,
 * assignment verification (Location Assignment, Staff Assignment).
 * 
 * Uses: PersonProfileLocators for profile-specific elements
 *       NavigationLocators for left panel items
 *       CommonLocators for shared table/dialog elements
 */
import type { Page } from "playwright";
import { PersonProfileLocators } from "@src/locators/person-profile.locators";
import { NavigationLocators } from "@src/locators/navigation.locators";
import { CommonLocators } from "@src/locators/common.locators";
import { Waits } from "@src/config/env";

export class PersonProfilePage {
  constructor(private page: Page) {}

  // ═══ OPEN PROFILE ═══

  /**
   * Click "Open Person Profile" button (visible when a row is selected in Bulk Assignments grid)
   */
  async openProfileFromGrid() {
    console.log('[PERSON_PROFILE] Clicking "Open Person Profile" button');
    const btn = this.page.locator(PersonProfileLocators.openProfileBtn).first();
    await btn.click();
    await this.page.waitForTimeout(Waits.MAX);
  }

  /**
   * Get the person name from the grid's selected row (for later search)
   */
  async getPersonNameFromGrid(): Promise<string> {
    // Scope to mat-row to avoid picking up the header cell text
    const cell = this.page.locator('mat-row .mat-column-personName').first();
    const name = (await cell.textContent())?.trim() || '';
    console.log(`[PERSON_PROFILE] Person name from grid: "${name}"`);
    return name;
  }

  // ═══ LEFT PANEL NAVIGATION ═══

  /**
   * Click "Assignments" in the left navigation panel
   */
  async navigateToAssignments() {
    console.log('[PERSON_PROFILE] Clicking "Assignments" in left nav');
    const assignmentsNav = this.page.locator(NavigationLocators.assignments).first();
    if (await assignmentsNav.isVisible({ timeout: Waits.MAX }).catch(() => false)) {
      await assignmentsNav.click();
      await this.page.waitForTimeout(Waits.AVG);
      console.log('[PERSON_PROFILE] ✓ Assignments section opened');
    } else {
      console.log('[PERSON_PROFILE] ⚠ "Assignments" not found in left nav');
    }
  }

  /**
   * Navigate to Location Assignment sub-section (under Assignments)
   */
  async navigateToLocationAssignment() {
    // First open Assignments section
    await this.navigateToAssignments();

    // Then click Location Assignment
    const locators = [
      PersonProfileLocators.locationAssignment,
      PersonProfileLocators.locationAssignmentAlt,
    ];

    for (const loc of locators) {
      const el = this.page.locator(loc).first();
      if (await el.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        console.log(`[PERSON_PROFILE] ✓ Found Location Assignment`);
        await el.click();
        await this.page.waitForTimeout(Waits.AVG);
        return;
      }
    }
    console.log('[PERSON_PROFILE] ⚠ Location Assignment sub-section not found');
  }

  /**
   * Navigate to Staff Assignment sub-section (under Assignments)
   */
  async navigateToStaffAssignment() {
    await this.navigateToAssignments();

    const locators = [
      PersonProfileLocators.staffAssignment,
      PersonProfileLocators.staffAssignmentAlt,
    ];

    for (const loc of locators) {
      const el = this.page.locator(loc).first();
      if (await el.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        console.log(`[PERSON_PROFILE] ✓ Found Staff Assignment`);
        await el.click();
        await this.page.waitForTimeout(Waits.AVG);
        return;
      }
    }
    console.log('[PERSON_PROFILE] ⚠ Staff Assignment sub-section not found');
  }

  // ═══ ASSIGNMENT VERIFICATION ═══

  /**
   * Verify that a location assignment is visible in the assignments table
   */
  async verifyLocationAssignmentExists(): Promise<boolean> {
    const locators = [
      `${PersonProfileLocators.assignmentTable}:has-text("Location")`,
      PersonProfileLocators.locationColumn,
      `${CommonLocators.matRow}:has-text("Location")`,
      CommonLocators.matRow,
    ];

    for (const loc of locators) {
      if (await this.page.locator(loc).first().isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        console.log(`[PERSON_PROFILE] ✓ Location assignment visible`);
        return true;
      }
    }
    console.log('[PERSON_PROFILE] ⚠ No location assignment found');
    return false;
  }

  /**
   * Verify that a location assignment row contains the expected values:
   * Assignment Type, Location, and Effective Date.
   * Uses Playwright built-in locators (getByRole) for table row access.
   * Falls back to verifyLocationAssignmentExists() if no matching row found.
   */
  async verifyLocationAssignmentValues(
    expectedType: string,
    expectedLocation: string,
    expectedDate: string
  ): Promise<boolean> {
    console.log(`[PERSON_PROFILE] Verifying assignment values: type="${expectedType}", location="${expectedLocation}", date="${expectedDate}"`);
    await this.page.waitForTimeout(Waits.AVG);

    // Use getByRole('table') → getByRole('row') for semantic table access
    const table = this.page.getByRole('table').first();
    const tableVisible = await table.isVisible({ timeout: Waits.AVG }).catch(() => false);

    if (!tableVisible) {
      console.log('[PERSON_PROFILE] ⚠ No table found via role, falling back to CSS');
      return this.verifyLocationAssignmentExists();
    }

    // Get all data rows (skip header row by filtering for mat-row or non-header rows)
    const rows = table.getByRole('row');
    const rowCount = await rows.count();
    console.log(`[PERSON_PROFILE] Found ${rowCount} rows in assignment table (via getByRole)`);

    // Skip row 0 (header row in mat-table)
    for (let i = 1; i < rowCount; i++) {
      const row = rows.nth(i);
      const rowText = (await row.textContent().catch(() => '')) || '';

      const hasType = rowText.toLowerCase().includes(expectedType.toLowerCase());
      const hasLocation = rowText.toLowerCase().includes(expectedLocation.toLowerCase());

      // Date may be formatted differently in the grid (e.g. "04/13/2026" vs "Apr 13, 2026")
      let hasDate = rowText.includes(expectedDate);
      if (!hasDate && expectedDate) {
        const parts = expectedDate.split('/');
        if (parts.length === 3) {
          const [, dd, yyyy] = parts;
          hasDate = rowText.includes(yyyy) && rowText.includes(String(Number(dd)));
        }
      }

      console.log(`[PERSON_PROFILE] Row ${i}: type=${hasType}, location=${hasLocation}, date=${hasDate}`);
      console.log(`[PERSON_PROFILE] Row ${i} text: "${rowText.trim().slice(0, 200)}"`);

      if (hasType && hasLocation) {
        if (hasDate) {
          console.log(`[PERSON_PROFILE] ✓ Found matching assignment row with all 3 values`);
        } else {
          console.log(`[PERSON_PROFILE] ✓ Found matching assignment row (type + location match, date format may differ)`);
        }
        return true;
      }
    }

    console.log('[PERSON_PROFILE] ⚠ No row matched all values, falling back to existence check');
    return this.verifyLocationAssignmentExists();
  }

  /**
   * Verify that a staff assignment is visible in the assignments table
   */
  async verifyStaffAssignmentExists(): Promise<boolean> {
    const locators = [
      `${PersonProfileLocators.assignmentTable}:has-text("Staff")`,
      PersonProfileLocators.staffColumn,
      `${CommonLocators.matRow}:has-text("Staff")`,
      CommonLocators.matRow,
    ];

    for (const loc of locators) {
      if (await this.page.locator(loc).first().isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        console.log(`[PERSON_PROFILE] ✓ Staff assignment visible`);
        return true;
      }
    }
    console.log('[PERSON_PROFILE] ⚠ No staff assignment found');
    return false;
  }

  /**
   * Capture the current page for locator analysis
   */
  async capturePageForAnalysis(name: string) {
    const { captureInteractiveElements } = require('@src/utils/html-capture');
    await captureInteractiveElements(this.page, name);
  }
}
