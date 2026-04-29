import type { Page } from "playwright";
import { env } from "@src/config/env";
import { getRunTimestamp } from "@src/utils/timestamp";

export class LoginPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async open() {
    console.log(`[LOGIN] Opening URL: ${env.baseUrl}`);
    await this.page.goto(env.baseUrl, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(2000);
    await this.page.screenshot({ path: `${this.screenshotDir}/01-login-page.png` });
    console.log('[LOGIN] Login page loaded');
  }

  async enterCredentials(username: string, password: string) {
    console.log(`[LOGIN] Entering credentials for user: ${username}`);
    const usernameField = this.page.locator("input#signInFormUsername").nth(1);
    const passwordField = this.page.locator("input#signInFormPassword").nth(1);
    await usernameField.waitFor({ state: 'visible' });
    await usernameField.fill(username);
    await passwordField.fill(password);
    await this.page.screenshot({ path: `${this.screenshotDir}/02-credentials-entered.png` });
    console.log('[LOGIN] Credentials entered');
  }

  async clickSignIn() {
    console.log('[LOGIN] Clicking Sign In button');
    await this.page.locator("input[aria-label='submit']").nth(1).click();
    await this.page.waitForTimeout(5000);
    await this.page.screenshot({ path: `${this.screenshotDir}/03-after-signin.png` });
    console.log('[LOGIN] Sign In clicked');
  }

  async handleAlert() {
    this.page.once("dialog", async (dialog) => {
      console.log(`[LOGIN] Alert detected: ${dialog.message()}`);
      await dialog.accept();
    });
  }

  async handleAcknowledgeButton(maxRetries = 3) {
    console.log('[LOGIN] Handling Acknowledge button');
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await this.page.waitForTimeout(2000);
      
      const ackBtn = this.page.locator("button, input[type='button'], input[type='submit']").filter({ hasText: /acknowledge/i });
      
      if (await ackBtn.count() > 0) {
        console.log(`[LOGIN] Acknowledge button found, clicking (attempt ${attempt + 1})`);
        await ackBtn.first().click();
        await this.page.waitForTimeout(5000);
        await this.page.screenshot({ path: `${this.screenshotDir}/04-after-acknowledge.png` });
      }

      if (await this.page.locator("span:text-is('Organization')").isVisible().catch(() => false)) {
        console.log('[LOGIN] Organization page visible');
        return;
      }
    }
    await this.page.waitForTimeout(2000);
  }

  async selectDropdownValue(value: string, position: number) {
    console.log(`[LOGIN] Selecting "${value}" at position ${position}`);
    const combobox = this.page.locator(`input[role='combobox']`).nth(position - 1);
    await combobox.click({ force: true });
    await this.page.waitForTimeout(500);
    await combobox.type(value, { delay: 100 });
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1500);
    console.log(`[LOGIN] Selected "${value}"`);
  }

  async selectOrganization(org: string) {
    await this.page.locator("span:text-is('Organization')").waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);
    await this.selectDropdownValue(org, 1);
    await this.page.screenshot({ path: `${this.screenshotDir}/05-organization-selected.png` });
  }

  async selectLocation(location: string) {
    await this.selectDropdownValue(location, 2);
    await this.page.screenshot({ path: `${this.screenshotDir}/06-location-selected.png` });
  }

  async selectStaffMember(staff: string) {
    await this.selectDropdownValue(staff, 3);
    await this.page.screenshot({ path: `${this.screenshotDir}/07-staff-selected.png` });
  }

  async clickLogin() {
    console.log('[LOGIN] Clicking Log In button');
    await this.page.waitForTimeout(2000);
    const loginBtn = this.page.locator("button").filter({ hasText: /log in/i });
    await loginBtn.first().click({ force: true, timeout: 10000 });
    console.log('[LOGIN] Waiting for dashboard to load');
    
    // Wait for header container
    await this.page.locator("[aria-label='primary-layout-header-container']").waitFor({ state: 'visible', timeout: 60000 });
    console.log('[LOGIN] Dashboard header loaded');
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    await this.page.waitForTimeout(3000);
    
    await this.page.screenshot({ path: `${this.screenshotDir}/08-dashboard-loaded.png` });
    console.log(`[LOGIN] Dashboard loaded successfully. Screenshots saved in: ${this.screenshotDir}`);
  }

  async zoomOut(times = 3) {
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press("Control+Minus");
    }
  }
}