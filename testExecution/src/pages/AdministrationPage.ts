import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";

export class AdministrationPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async clickAdministrationTab() {
    console.log('[ADMIN] Clicking Administration tab');
    await this.page.waitForTimeout(8000);
    const adminTab = this.page.locator("span:text-is('Administration')").first();
    await adminTab.waitFor({ state: 'visible', timeout: 10000 });
    await adminTab.click();
    await this.page.waitForTimeout(8000);
    await this.page.screenshot({ path: `${this.screenshotDir}/09-administration-tab.png` });
    console.log('[ADMIN] Administration tab clicked');
  }

  async verifySection(sectionName: string) {
    console.log(`[ADMIN] Verifying section: ${sectionName}`);
    const section = this.page.locator(`h2:text-is("${sectionName}")`).first();
    await section.waitFor({ state: 'visible', timeout: 10000 });
    await expect(section).toBeVisible();
    console.log(`[ADMIN] Section verified: ${sectionName}`);
  }

  async verifyAllSections() {
    const sections = [
      'System Attachments',
      'Notification Definitions & Triggers',
      'Organization Roles',
      'Person Assignment Definitions',
      'Programs',
      'Announcements',
      'System Account',
      'Roles & Permissions',
      'Region/County Mapping',
      'Form Definitions',
      'Service Definitions',
      'Report Configuration'
    ];

    for (const section of sections) {
      await this.verifySection(section);
    }

    await this.page.screenshot({ path: `${this.screenshotDir}/10-all-sections-verified.png` });
    console.log('[ADMIN] All sections verified successfully');
  }
}
