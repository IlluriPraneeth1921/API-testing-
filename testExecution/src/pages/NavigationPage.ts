import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { env, Waits } from "@src/config/env";
import { SearchLocators, NavigationLocators } from "@src/locators";

export class NavigationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async searchOrganization(searchTerm: string = 'Test') {
    console.log(`[NAV-PAGE] Searching for organization: ${searchTerm}`);
    
    await this.page.waitForTimeout(Waits.MAX);
    
    const searchType = this.page.locator(SearchLocators.searchTypeCombobox).first();
    await searchType.click({ force: true });
    await this.page.waitForTimeout(Waits.AVG);
    
    // Select Organizations
    const orgOption = this.page.locator(SearchLocators.organizationsOption);
    await orgOption.waitFor({ state: 'visible', timeout: 10000 });
    await orgOption.click();
    await this.page.waitForTimeout(Waits.AVG);
    
    const searchTextBox = this.page.locator(SearchLocators.searchTextBox).first();
    await searchTextBox.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(Waits.MAX);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/nav-01-search.png` });
    
    // Click the first organization result to navigate to org profile
    try {
      const firstRow = this.page.locator('mat-row').first();
      if (await firstRow.isVisible({ timeout: 8000 })) {
        await firstRow.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(Waits.AVG);
        // Wait for side nav to appear
        await this.page.waitForSelector('button.side-navigation-item-button, span:text-is("Profile")', {
          state: 'visible',
          timeout: 15000
        }).catch(() => {});
        const sideNavCount = await this.page.locator('button.side-navigation-item-button').count();
        const spanCount = await this.page.locator('span:text-is("Profile")').count();
        console.log(`[NAV-PAGE] Org profile loaded — side-nav buttons: ${sideNavCount}, Profile span: ${spanCount}`);
        await this.page.screenshot({ path: `${this.screenshotDir}/nav-02-org-profile.png` });
      }
    } catch {
      console.log('[NAV-PAGE] Could not click org result');
    }
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
    
    await this.page.waitForTimeout(Waits.MIN);
    
    const navElement = this.page.locator(locatorSelector).first();
    await expect(navElement).toBeVisible({ timeout: 15000 });
    
    await this.page.screenshot({ 
      path: `${this.screenshotDir}/nav-${elementText.toLowerCase().replace(/\s+/g, '-')}.png` 
    });
    console.log(`[NAV-PAGE] ✓ ${elementText} verified`);
  }
}