import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { env } from "@src/config/env";

export class NavigationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async searchOrganization(searchTerm: string = 'Test') {
    console.log(`[NAV-PAGE] Searching for organization: ${searchTerm}`);
    
    await this.page.waitForTimeout(5000);
    
    const searchType = this.page.locator('[role="combobox"]').first();
    await searchType.click({ force: true });
    await this.page.waitForTimeout(2000);
    
    const orgOption = this.page.locator('mat-option:has-text("Organizations")');
    await orgOption.waitFor({ state: 'visible', timeout: 10000 });
    await orgOption.click();
    await this.page.waitForTimeout(2000);
    
    const searchTextBox = this.page.locator('input[type="text"]').first();
    await searchTextBox.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(5000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/nav-01-search.png` });
  }

  async verifyLeftNavigationElements() {
    console.log('[NAV-PAGE] Verifying left navigation elements');
    
    const navigationElements = [
      'Profile',
      'Locations', 
      'Staff Members',
      'Supported Programs',
      'Attachments',
      'Assignments',
      'Roles',
      'Forms',
      'Notes',
      'Letters',
      'Service Events',
      'Contracts'
    ];

    for (const element of navigationElements) {
      await this.verifyNavigationElement(element);
    }
    
    console.log('[NAV-PAGE] All left navigation elements verified');
  }

  private async verifyNavigationElement(elementText: string) {
    console.log(`[NAV-PAGE] Verifying ${elementText} element`);
    
    await this.page.waitForTimeout(2000);
    
    const navElement = this.page.locator(`span:text-is("${elementText}")`).first();
    
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