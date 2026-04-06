import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { env } from "@src/config/env";
import { SearchLocators, NavigationLocators } from "@src/locators";

export class NavigationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async searchOrganization(searchTerm: string = 'Test') {
    console.log(`[NAV-PAGE] Searching for organization: ${searchTerm}`);
    
    await this.page.waitForTimeout(5000);
    
    const searchType = this.page.locator(SearchLocators.searchTypeCombobox).first();
    await searchType.click({ force: true });
    await this.page.waitForTimeout(2000);
    
    const orgOption = this.page.locator(SearchLocators.organizationsOption);
    await orgOption.waitFor({ state: 'visible', timeout: 10000 });
    await orgOption.click();
    await this.page.waitForTimeout(2000);
    
    const searchTextBox = this.page.locator(SearchLocators.searchTextBox).first();
    await searchTextBox.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(5000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/nav-01-search.png` });
  }

  async verifyLeftNavigationElements() {
    console.log('[NAV-PAGE] Verifying left navigation elements');
    
    // Map of display names to locator keys
    const navigationElements: { name: string; locator: string }[] = [
      { name: 'Profile', locator: NavigationLocators.profile },
      { name: 'Locations', locator: NavigationLocators.locations },
      { name: 'Staff Members', locator: NavigationLocators.staffMembers },
      { name: 'Supported Programs', locator: NavigationLocators.supportedPrograms },
      { name: 'Attachments', locator: NavigationLocators.attachments },
      { name: 'Assignments', locator: NavigationLocators.assignments },
      { name: 'Roles', locator: NavigationLocators.roles },
      { name: 'Forms', locator: NavigationLocators.forms },
      { name: 'Notes', locator: NavigationLocators.notes },
      { name: 'Letters', locator: NavigationLocators.letters },
      { name: 'Service Events', locator: NavigationLocators.serviceEvents },
      { name: 'Contracts', locator: NavigationLocators.contracts },
    ];

    for (const element of navigationElements) {
      await this.verifyNavigationElement(element.name, element.locator);
    }
    
    console.log('[NAV-PAGE] All left navigation elements verified');
  }

  private async verifyNavigationElement(elementText: string, locatorSelector: string) {
    console.log(`[NAV-PAGE] Verifying ${elementText} element`);
    
    await this.page.waitForTimeout(2000);
    
    const navElement = this.page.locator(locatorSelector).first();
    
    // Scroll into view and highlight
    await navElement.scrollIntoViewIfNeeded();
    await navElement.highlight();
    
    // Verify element is visible
    await expect(navElement).toBeVisible({ timeout: 10000 });
    
    // Take screenshot
    await this.page.screenshot({ 
      path: `${this.screenshotDir}/nav-${elementText.toLowerCase().replace(/\s+/g, '-')}.png` 
    });
    
    console.log(`[NAV-PAGE] ✓ ${elementText} verified`);
  }
}