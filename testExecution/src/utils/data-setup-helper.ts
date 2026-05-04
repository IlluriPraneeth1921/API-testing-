/**
 * DataSetupHelper
 *
 * Ensures a TC's required data state exists before the TC runs its main assertions.
 * Called by unassign TCs when they find an empty grid — silently creates the
 * needed assignments so the TC can proceed regardless of run order.
 *
 * Pattern:
 *   1. Run the "setup search" (e.g. "Has No Location Assignment") to find candidates
 *   2. Select up to N persons
 *   3. Run the assign operation (location or staff)
 *   4. Navigate back and run the TC's own search
 *
 * This makes TC556258 and TC556263 fully self-sufficient — they pass whether run
 * alone, in batch, or in any sequence.
 */
import type { Page } from 'playwright';
import { BulkAssignmentListPage } from '@src/pages/BulkAssignmentListPage';
import { BulkAssignmentSearchPage } from '@src/pages/BulkAssignmentSearchPage';
import { BulkAssignmentModalPage } from '@src/pages/BulkAssignmentModalPage';
import { Waits } from '@src/config/env';
import type { BulkAssignmentSearchData, BulkAssignmentModalData } from '@src/data/test-data';

export interface SetupConfig {
  /** Search to find persons WITHOUT the assignment (to create it) */
  setupSearch: BulkAssignmentSearchData;
  /** Modal data for the assign operation */
  setupModal: Partial<BulkAssignmentModalData>;
  /** 'location' or 'staff' */
  assignType: 'location' | 'staff';
  /** Max persons to assign during setup (default: 3) */
  maxSetup?: number;
}

export class DataSetupHelper {
  private listPage: BulkAssignmentListPage;
  private searchPage: BulkAssignmentSearchPage;
  private modalPage: BulkAssignmentModalPage;

  constructor(private page: Page) {
    this.listPage = new BulkAssignmentListPage(page);
    this.searchPage = new BulkAssignmentSearchPage(page);
    this.modalPage = new BulkAssignmentModalPage(page);
  }

  /**
   * Ensure at least `minRows` persons with the required assignment exist.
   * If the current grid already has rows, does nothing.
   * If empty, runs a setup assign operation to create the data.
   *
   * @returns number of rows available after setup
   */
  async ensureAssignedDataExists(
    currentRowCount: number,
    config: SetupConfig,
    minRows = 1
  ): Promise<number> {
    if (currentRowCount >= minRows) {
      console.log(`[DATA_SETUP] ✓ Grid already has ${currentRowCount} rows — no setup needed`);
      return currentRowCount;
    }

    console.log(`[DATA_SETUP] ⚠ Grid empty — running setup to create ${config.assignType} assignments`);
    const max = config.maxSetup ?? 3;

    // 1. Search for persons WITHOUT the assignment (candidates to assign)
    await this.searchPage.openPanel();
    await this.searchPage.searchWithMandatoryFields(config.setupSearch);
    await this.listPage.waitForTableLoad();

    const candidateCount = await this.listPage.getRowCount();
    console.log(`[DATA_SETUP] Found ${candidateCount} candidate rows for setup`);

    if (candidateCount === 0) {
      console.log('[DATA_SETUP] ⚠ No candidates found — cannot create test data. TC will run with empty grid.');
      return 0;
    }

    // 2. Select up to `max` rows
    const toSelect = Math.min(candidateCount, max);
    for (let i = 0; i < toSelect; i++) {
      await this.listPage.selectRowByIndex(i);
    }
    console.log(`[DATA_SETUP] Selected ${toSelect} rows for setup assignment`);

    // 3. Open the assign modal and fill form
    if (config.assignType === 'location') {
      await this.listPage.clickAssignLocation();
    } else {
      await this.listPage.clickAssignStaff();
    }

    await this.modalPage.waitForModalOpen();

    if (config.assignType === 'location') {
      await this.modalPage.fillLocationAssignmentForm(config.setupModal);
    } else {
      await this.modalPage.fillStaffAssignmentForm(config.setupModal);
    }

    await this.modalPage.clickContinue();
    await this.page.waitForTimeout(Waits.AVG);

    // Handle confirmation dialog if it appears
    const dialogText = ((await this.page.getByRole('dialog').last().textContent().catch(() => '')) || '');
    if (
      dialogText.toLowerCase().includes('are you sure') ||
      dialogText.toLowerCase().includes('would you like to continue') ||
      dialogText.toLowerCase().includes('you are about to assign')
    ) {
      await this.modalPage.clickContinue();
      await this.page.waitForTimeout(Waits.AVG);
    }

    // 4. Capture result and close
    const result = await this.modalPage.captureAssignmentResult();
    await this.modalPage.clickClose();
    await this.page.waitForTimeout(Waits.AVG);

    if (result.success) {
      console.log(`[DATA_SETUP] ✓ Setup assignment succeeded for ${toSelect} persons`);
    } else {
      console.log(`[DATA_SETUP] ⚠ Setup assignment may have partially failed: ${result.message.slice(0, 120)}`);
    }

    return toSelect;
  }
}
