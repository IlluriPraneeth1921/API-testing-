import type { Page } from "playwright";
import { AdministrationPage } from "@src/pages/AdministrationPage";

export class AdministrationKeywords {
  private adminPage: AdministrationPage;

  constructor(private page: Page) {
    this.adminPage = new AdministrationPage(page);
  }

  async verifyAdministrationSections() {
    await this.adminPage.clickAdministrationTab();
    await this.adminPage.verifyAllSections();
  }
}
