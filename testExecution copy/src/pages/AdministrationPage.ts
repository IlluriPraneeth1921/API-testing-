import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { HeaderLocators, NavigationLocators } from "@src/locators";

export class AdministrationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async clickAdministrationTab() {
    console.log('[ADMIN] Clicking Administration tab');
    await this.page.waitForTimeout(8000);
    const adminTab = this.page.locator(HeaderLocators.administrationTab).first();
    await adminTab.waitFor({ state: 'visible', timeout: 10000 });
    await adminTab.click();
    await this.page.waitForTimeout(8000);
    await this.page.screenshot({ path: `${this.screenshotDir}/09-administration-tab.png` });
    console.log('[ADMIN] Administration tab clicked');
  }

  async verifySection(sectionName: string, locatorSelector: string) {
    console.log(`[ADMIN] Verifying section: ${sectionName}`);
    const section = this.page.locator(locatorSelector).first();
    await section.waitFor({ state: 'visible', timeout: 10000 });
    await expect(section).toBeVisible();
    console.log(`[ADMIN] Section verified: ${sectionName}`);
  }

  async verifyAllSections() {
    // Map section names to centralized locators
    const sections: { name: string; locator: string }[] = [
      { name: 'System Attachments', locator: NavigationLocators.systemAttachments },
      { name: 'Notification Definitions & Triggers', locator: NavigationLocators.notificationDefinitions },
      { name: 'Organization Roles', locator: NavigationLocators.organizationRoles },
      { name: 'Person Assignment Definitions', locator: NavigationLocators.personAssignmentDefinitions },
      { name: 'Programs', locator: NavigationLocators.programs },
      { name: 'Announcements', locator: NavigationLocators.announcements },
      { name: 'System Account', locator: NavigationLocators.systemAccount },
      { name: 'Roles & Permissions', locator: NavigationLocators.rolesPermissions },
      { name: 'Region/County Mapping', locator: NavigationLocators.regionCountyMapping },
      { name: 'Form Definitions', locator: NavigationLocators.formDefinitions },
      { name: 'Service Definitions', locator: NavigationLocators.serviceDefinitions },
      { name: 'Report Configuration', locator: NavigationLocators.reportConfiguration },
    ];

    for (const section of sections) {
      await this.verifySection(section.name, section.locator);
    }

    await this.page.screenshot({ path: `${this.screenshotDir}/10-all-sections-verified.png` });
    console.log('[ADMIN] All sections verified successfully');
  }
}
