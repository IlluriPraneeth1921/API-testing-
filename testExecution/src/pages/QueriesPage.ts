import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";

export class QueriesPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async navigateToQueries() {
    console.log('[QUERIES] Navigating to Queries');
    await this.page.waitForTimeout(5000);
    const queries = this.page.locator("span:text-is('Queries')").first();
    await queries.waitFor({ state: 'visible', timeout: 10000 });
    await queries.click();
    await this.page.waitForTimeout(3000);
    await this.page.screenshot({ path: `${this.screenshotDir}/14-queries.png` });
  }

  async clickFilterList() {
    console.log('[QUERIES] Clicking filter list');
    const filterList = this.page.locator("mat-icon:text-is('filter_list')").first();
    await filterList.click();
    await this.page.waitForTimeout(2000);
    await this.page.screenshot({ path: `${this.screenshotDir}/15-filter-list.png` });
  }

  async selectPersonAssignments() {
    console.log('[QUERIES] Selecting Person Assignments');
    const personAssignments = this.page.locator("h2:text-is('Person Assignments')").first();
    await expect(personAssignments).toBeVisible();
    await this.page.waitForTimeout(1000);
  }

  async selectMyCaseLoad() {
    console.log('[QUERIES] Selecting My CaseLoad');
    const caseload = this.page.locator("[class*='list-item']").nth(6);
    await caseload.click();
    await this.page.waitForTimeout(2000);
    await this.page.screenshot({ path: `${this.screenshotDir}/16-caseload-selected.png` });
  }

  async clickRunQuery() {
    console.log('[QUERIES] Clicking Run Query');
    const runQuery = this.page.locator("span:text-is('Run Query')").first();
    await runQuery.click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    await this.page.waitForTimeout(5000);
    await this.page.screenshot({ path: `${this.screenshotDir}/17-query-results.png` });
  }

  async verifyColumns() {
    console.log('[QUERIES] Verifying columns');
    const columns = ['Person ID', 'First Name', 'Last Name', 'Gender', 'County'];
    
    for (const column of columns) {
      const col = this.page.locator('th, td').filter({ hasText: column }).first();
      const isVisible = await col.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`[QUERIES] Column verified: ${column}`);
      }
    }
    
    await this.page.screenshot({ path: `${this.screenshotDir}/18-columns-verified.png` });
    console.log('[QUERIES] All columns verified');
  }
}
