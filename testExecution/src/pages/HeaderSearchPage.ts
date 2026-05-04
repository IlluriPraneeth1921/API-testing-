/**
 * Header Search Page
 * 
 * Handles: Global search bar in the header, searching for persons/organizations,
 * clicking on search results.
 * 
 * Uses: HeaderLocators for search bar, PersonProfileLocators for search results
 */
import type { Page } from "playwright";
import { HeaderLocators } from "@src/locators/header.locators";
import { PersonProfileLocators } from "@src/locators/person-profile.locators";
import { Waits } from "@src/config/env";

export class HeaderSearchPage {
  constructor(private page: Page) {}

  /**
   * Search for a person by name using the global header search bar.
   * @param personName - The person's name to search for
   */
  async searchPerson(searchTerm: string) {
    // Ensure minimum 3 characters for search (pad with leading zeros if needed)
    let term = searchTerm.trim();
    while (term.length < 3) term = '0' + term;
    console.log(`[HEADER_SEARCH] Searching with term: "${term}"`);
    const searchInput = this.page.locator(HeaderLocators.searchInput);
    await searchInput.click();
    await this.page.waitForTimeout(Waits.MIN);
    await searchInput.fill(term);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(Waits.MAX);
  }

  /**
   * Click on a person from search results.
   * @param personName - The person's name to click on
   */
  async clickPersonResult(personName: string) {
    console.log(`[HEADER_SEARCH] Clicking person result: "${personName}"`);
    // The search results page shows a Person table with mat-rows
    // Person name may be split across First Name / Last Name columns
    // Try clicking the row that contains any part of the name
    const nameParts = personName.split(/\s+/).filter(p => p.length > 2);
    
    for (const part of nameParts) {
      const row = this.page.locator(`mat-row:has-text("${part}")`).first();
      if (await row.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        await row.click();
        await this.page.waitForTimeout(Waits.MAX);
        console.log(`[HEADER_SEARCH] ✓ Clicked row containing: "${part}"`);
        return true;
      }
    }

    // Fallback: click first mat-row if any exist
    const firstRow = this.page.locator('mat-row').first();
    if (await firstRow.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
      await firstRow.click();
      await this.page.waitForTimeout(Waits.MAX);
      console.log(`[HEADER_SEARCH] ✓ Clicked first result row (fallback)`);
      return true;
    }

    console.log(`[HEADER_SEARCH] ⚠ No person results found`);
    return false;
  }

  /**
   * Search for a person and open their profile.
   * @param personName - The person's name
   */
  async searchAndOpenPerson(searchTerm: string, displayName?: string): Promise<boolean> {
    const label = displayName || searchTerm;
    console.log(`[HEADER_SEARCH] Opening profile for: "${label}" (search: "${searchTerm}")`);
    await this.searchPerson(searchTerm);
    return await this.clickPersonResult(label);
  }
}
