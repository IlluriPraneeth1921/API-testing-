import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { BulkAssignmentLocators } from "@src/locators/bulk-assignment.locators";
import { CommonLocators } from "@src/locators";

/**
 * Bulk Assignment Page Object
 * 
 * Screen: Bulk Assignments List View
 * Path: Accessed via 3-dot ellipsis menu → Bulk Assignments
 * 
 * Key Features:
 * - Assign/Unassign Location and Staff in bulk
 * - Advanced search for filtering persons
 * - Table with row selection
 * - PBI 915981: List NOT refreshed after operations, selections retained
 */
export class BulkAssignmentPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  // ═══ NAVIGATION ═══
  
  async verifyPageLoaded() {
    console.log('[BULK_ASSIGNMENT] Verifying page loaded');
    await this.page.locator(BulkAssignmentLocators.pageTitle).waitFor({ state: 'visible' });
    await expect(this.page.locator(BulkAssignmentLocators.pageTitle)).toBeVisible();
  }

  async clickBack() {
    console.log('[BULK_ASSIGNMENT] Clicking Back button');
    await this.page.locator(BulkAssignmentLocators.backButton).click();
    await this.page.waitForTimeout(500);
  }

  // ═══ ACTION BUTTONS ═══
  
  async clickAssignLocation() {
    console.log('[BULK_ASSIGNMENT] Clicking Assign Location');
    await this.page.locator(BulkAssignmentLocators.assignLocationBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickAssignStaff() {
    console.log('[BULK_ASSIGNMENT] Clicking Assign Staff');
    await this.page.locator(BulkAssignmentLocators.assignStaffBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickUnassignLocation() {
    console.log('[BULK_ASSIGNMENT] Clicking Unassign Location');
    await this.page.locator(BulkAssignmentLocators.unassignLocationBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickUnassignStaff() {
    console.log('[BULK_ASSIGNMENT] Clicking Unassign Staff');
    await this.page.locator(BulkAssignmentLocators.unassignStaffBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickExport() {
    console.log('[BULK_ASSIGNMENT] Clicking Export');
    await this.page.locator(BulkAssignmentLocators.exportBtn).click();
    await this.page.waitForTimeout(500);
  }

  // ═══ SEARCH/FILTER ═══
  
  async openAdvancedSearch() {
    console.log('[BULK_ASSIGNMENT] Opening Advanced Search');
    await this.page.locator(BulkAssignmentLocators.advancedSearchBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickSearch() {
    console.log('[BULK_ASSIGNMENT] Clicking Search button');
    await this.page.locator(BulkAssignmentLocators.searchButton).click();
    await this.page.waitForTimeout(1000);
  }

  async clickRunQuery() {
    console.log('[BULK_ASSIGNMENT] Clicking Run Query');
    await this.page.locator(BulkAssignmentLocators.runQueryBtn).click();
    await this.page.waitForTimeout(1000);
  }

  // ═══ TABLE OPERATIONS ═══
  
  async waitForTableLoad() {
    console.log('[BULK_ASSIGNMENT] Waiting for table to load');
    await this.page.locator(BulkAssignmentLocators.bulkAssignmentTable).waitFor({ state: 'visible' });
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(CommonLocators.matRow).count();
  }

  async openTableOptions() {
    console.log('[BULK_ASSIGNMENT] Opening table options');
    await this.page.locator(BulkAssignmentLocators.tableOptionsBtn).click();
    await this.page.waitForTimeout(300);
  }

  // ═══ ROW SELECTION ═══
  
  async selectAllRows() {
    console.log('[BULK_ASSIGNMENT] Selecting all rows');
    await this.page.locator(BulkAssignmentLocators.selectAllCheckbox).click();
    await this.page.waitForTimeout(300);
  }

  async selectRowByIndex(index: number) {
    console.log(`[BULK_ASSIGNMENT] Selecting row ${index}`);
    const rows = this.page.locator(CommonLocators.matRow);
    const checkbox = rows.nth(index).locator('mat-checkbox input[type="checkbox"]');
    await checkbox.click();
    await this.page.waitForTimeout(200);
  }

  async selectMultipleRows(indices: number[]) {
    console.log(`[BULK_ASSIGNMENT] Selecting rows: ${indices.join(', ')}`);
    for (const index of indices) {
      await this.selectRowByIndex(index);
    }
  }

  async getSelectedRowCount(): Promise<number> {
    // Check if the selected row count element exists (may not exist if no rows selected)
    const countLocator = this.page.locator(BulkAssignmentLocators.selectedRowCount);
    const count = await countLocator.count();
    if (count === 0) {
      // No selection indicator visible - count checked checkboxes instead
      const checkedBoxes = await this.page.locator(BulkAssignmentLocators.checkedCheckbox).count();
      return checkedBoxes;
    }
    const text = await countLocator.textContent({ timeout: 5000 }).catch(() => '');
    const match = text?.match(/(\d+)\s*total rows/);
    return match ? parseInt(match[1]) : 0;
  }

  async verifySelectionsRetained(expectedCount: number) {
    console.log(`[BULK_ASSIGNMENT] Verifying ${expectedCount} selections retained`);
    const actualCount = await this.getSelectedRowCount();
    expect(actualCount).toBe(expectedCount);
  }

  // ═══ MODAL OPERATIONS ═══
  
  async verifyModalOpened() {
    console.log('[BULK_ASSIGNMENT] Verifying modal opened');
    await this.page.locator(BulkAssignmentLocators.modalContainer).waitFor({ state: 'visible' });
  }

  async selectAssignmentType(type: string) {
    console.log(`[BULK_ASSIGNMENT] Selecting assignment type: ${type}`);
    await this.page.locator(BulkAssignmentLocators.assignmentTypeDropdown).click();
    await this.page.locator(CommonLocators.matOption).filter({ hasText: type }).click();
    await this.page.waitForTimeout(300);
  }

  async selectLocation(location: string) {
    console.log(`[BULK_ASSIGNMENT] Selecting location: ${location}`);
    await this.page.locator(BulkAssignmentLocators.locationDropdown).click();
    await this.page.locator(CommonLocators.matOption).filter({ hasText: location }).click();
    await this.page.waitForTimeout(300);
  }

  async selectStaffMember(staffMember: string) {
    console.log(`[BULK_ASSIGNMENT] Selecting staff member: ${staffMember}`);
    await this.page.locator(BulkAssignmentLocators.staffMemberDropdown).click();
    await this.page.locator(CommonLocators.matOption).filter({ hasText: staffMember }).click();
    await this.page.waitForTimeout(300);
  }

  async fillEffectiveStartDate(date: string) {
    console.log(`[BULK_ASSIGNMENT] Filling effective start date: ${date}`);
    await this.page.locator(BulkAssignmentLocators.effectiveStartDate).fill(date);
  }

  async fillNote(note: string) {
    console.log(`[BULK_ASSIGNMENT] Filling note`);
    await this.page.locator(BulkAssignmentLocators.noteField).fill(note);
  }

  async checkIsPrimary() {
    console.log('[BULK_ASSIGNMENT] Checking Is Primary checkbox');
    await this.page.locator(BulkAssignmentLocators.isPrimaryCheckbox).click();
  }

  async selectDischargeReason(reason: string) {
    console.log(`[BULK_ASSIGNMENT] Selecting discharge reason: ${reason}`);
    await this.page.locator(BulkAssignmentLocators.dischargeReasonDropdown).click();
    await this.page.locator(CommonLocators.matOption).filter({ hasText: reason }).click();
    await this.page.waitForTimeout(300);
  }

  async selectUnassignReason(reason: string) {
    console.log(`[BULK_ASSIGNMENT] Selecting unassign reason: ${reason}`);
    await this.page.locator(BulkAssignmentLocators.unassignReasonDropdown).click();
    await this.page.locator(CommonLocators.matOption).filter({ hasText: reason }).click();
    await this.page.waitForTimeout(300);
  }

  // ═══ COMMON MODAL ACTIONS (using CommonLocators) ═══
  
  async clickContinue() {
    console.log('[BULK_ASSIGNMENT] Clicking Continue');
    await this.page.locator(CommonLocators.continueBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickCancel() {
    console.log('[BULK_ASSIGNMENT] Clicking Cancel');
    await this.page.locator(CommonLocators.cancelBtn).click();
    await this.page.waitForTimeout(300);
  }

  async clickClose() {
    console.log('[BULK_ASSIGNMENT] Clicking Close');
    await this.page.locator(CommonLocators.closeBtn).click();
    await this.page.waitForTimeout(300);
  }

  // ═══ VERIFICATION METHODS ═══
  
  async verifyConfirmationDialogDisplayed() {
    console.log('[BULK_ASSIGNMENT] Verifying confirmation dialog');
    await expect(this.page.locator(BulkAssignmentLocators.confirmationText)).toBeVisible();
  }

  async verifyListNotRefreshed() {
    // PBI 915981: List should NOT refresh after bulk operations
    console.log('[BULK_ASSIGNMENT] Verifying list not refreshed (no loading indicator)');
    await expect(this.page.locator(BulkAssignmentLocators.progressIndicator)).not.toBeVisible();
  }

  async verifySelectAllButtonNotDisplayed() {
    // PBI 915981: Select All Records button should never display
    console.log('[BULK_ASSIGNMENT] Verifying Select All Records button not displayed');
    await expect(this.page.locator(BulkAssignmentLocators.selectAllRecordsBtn)).not.toBeVisible();
  }

  // ═══ COMPLETE WORKFLOWS ═══
  
  async completeLocationAssignment(assignmentType: string, location: string, effectiveDate: string, note?: string) {
    console.log('[BULK_ASSIGNMENT] Completing location assignment workflow');
    await this.clickAssignLocation();
    await this.verifyModalOpened();
    await this.selectAssignmentType(assignmentType);
    await this.selectLocation(location);
    await this.fillEffectiveStartDate(effectiveDate);
    if (note) await this.fillNote(note);
    await this.clickContinue();
    await this.verifyConfirmationDialogDisplayed();
    await this.clickContinue();
    await this.page.waitForTimeout(1000);
    await this.clickClose();
  }

  async completeStaffAssignment(assignmentType: string, staffMember: string, location: string, effectiveDate: string, isPrimary?: boolean, note?: string) {
    console.log('[BULK_ASSIGNMENT] Completing staff assignment workflow');
    await this.clickAssignStaff();
    await this.verifyModalOpened();
    await this.selectAssignmentType(assignmentType);
    await this.selectStaffMember(staffMember);
    await this.selectLocation(location);
    await this.fillEffectiveStartDate(effectiveDate);
    if (isPrimary) await this.checkIsPrimary();
    if (note) await this.fillNote(note);
    await this.clickContinue();
    await this.verifyConfirmationDialogDisplayed();
    await this.clickContinue();
    await this.page.waitForTimeout(1000);
    await this.clickClose();
  }

  async completeLocationUnassignment(dischargeReason: string, note?: string) {
    console.log('[BULK_ASSIGNMENT] Completing location unassignment workflow');
    await this.clickUnassignLocation();
    await this.verifyModalOpened();
    await this.selectDischargeReason(dischargeReason);
    if (note) await this.fillNote(note);
    await this.clickContinue();
    await this.verifyConfirmationDialogDisplayed();
    await this.clickContinue();
    await this.page.waitForTimeout(1000);
    await this.clickClose();
  }

  async completeStaffUnassignment(unassignReason: string, note?: string) {
    console.log('[BULK_ASSIGNMENT] Completing staff unassignment workflow');
    await this.clickUnassignStaff();
    await this.verifyModalOpened();
    await this.selectUnassignReason(unassignReason);
    if (note) await this.fillNote(note);
    await this.clickContinue();
    await this.verifyConfirmationDialogDisplayed();
    await this.clickContinue();
    await this.page.waitForTimeout(1000);
    await this.clickClose();
  }

  // ═══ SCREENSHOTS ═══
  
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `${this.screenshotDir}/bulk-assignment-${name}.png` });
  }
}
