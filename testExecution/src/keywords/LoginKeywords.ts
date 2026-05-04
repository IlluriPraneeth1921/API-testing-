import type { Page } from "playwright";
import { LoginPage } from "@src/pages/LoginPages";
import { env } from "@src/config/env";

export class LoginKeywords {
  private loginPage: LoginPage;

  constructor(private page: Page) {
    this.loginPage = new LoginPage(page);
  }

  async login(username: string, password: string) {
    await this.loginPage.open();
    await this.loginPage.handleAlert();
    await this.loginPage.enterCredentials(username, password);
    await this.loginPage.clickSignIn();
    await this.loginPage.handleAcknowledgeButton();
    await this.loginPage.selectOrganization(env.organization);
    await this.loginPage.selectLocation(env.location);
    await this.loginPage.selectStaffMember(env.staffMember);

    console.log(`[LOGIN] ═══ Login Context Summary ═══`);
    console.log(`[LOGIN]   User:         "${username}"`);
    console.log(`[LOGIN]   Organization: "${env.organization}"`);
    console.log(`[LOGIN]   Location:     "${env.location}"`);
    console.log(`[LOGIN]   Staff Member: "${env.staffMember}"`);
    console.log(`[LOGIN] ═══════════════════════════════`);

    await this.loginPage.clickLogin();
  }
}