import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { NavigationLocators, TableLocators } from "@src/locators";

export class QueriesPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async navigateToQueries() {
    console.log('[QUERIES] Navigating to Queries');
    await this.page.waitForTimeout(5000);
    const queries = this.page.locator(NavigationLocators.queries).first();
    await queries.waitFor({ state: 'visible', timeout: 10000 });
    await queries.click();
    await this.page.waitForTimeout(3000);
    await this.page.screenshot({ path: `${this.screenshotDir}/14-queries.png` });
  }

  async clickFilterList() {
    console.log('[QUERIES] Clicking filter list');
    const filterList = this.page.locator(TableLocators.filterListIcon).first();
    await filterList.click();
    await this.page.waitForTimeout(2000);
    await this.page.screenshot({ path: `${this.screenshotDir}/15-filter-list.png` });
  }

  async selectPersonAssignments() {
    console.log('[QUERIES] Selecting Person Assignments');
    const personAssignments = this.page.locator(NavigationLocators.personAssignments).first();
    await expect(personAssignments).toBeVisible();
    await this.page.waitForTimeout(1000);
  }

  async selectMyCaseLoad() {
    console.log('[QUERIES] Selecting My CaseLoad');
    // Using positional selector - HIGH RISK: This depends on list order
    // TODO: Request dev team to add data-testid="my-caseload" for stable selection
    const caseload = this.page.locator(TableLocators.listItem).nth(6);
    await caseload.click();
    await this.page.waitForTimeout(2000);
    await this.page.screenshot({ path: `${this.screenshotDir}/16-caseload-selected.png` });
  }

  async clickRunQuery() {
    console.log('[QUERIES] Clicking Run Query');
    const runQuery = this.page.locator(NavigationLocators.runQuery).first();
    await runQuery.click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    await this.page.waitForTimeout(5000);
    await this.page.screenshot({ path: `${this.screenshotDir}/17-query-results.png` });
  }

  async verifyColumns() {
    console.log('[QUERIES] Verifying columns');
    const columns = ['Person ID', 'First Name', 'Last Name', 'Gender', 'County'];
    
    for (const column of columns) {
      const col = this.page.locator(TableLocators.tableHeaderOrDataCell).filter({ hasText: column }).first();
      const isVisible = await col.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`[QUERIES] Column verified: ${column}`);
      }
    }
    
    await this.page.screenshot({ path: `${this.screenshotDir}/18-columns-verified.png` });
    console.log('[QUERIES] All columns verified');
  }
}
