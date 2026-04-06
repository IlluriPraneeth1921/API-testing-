import type { Page } from "playwright";

export class CommonKeywords {
  constructor(private page: Page) {}

  async searchInputInHomePage(searchType: string, searchText: string) {
    const combobox = this.page.locator('[role="combobox"]').first();
    await combobox.click({ force: true });
    await this.page.waitForTimeout(1000);
    
    await this.page.locator(`mat-option:has-text("${searchType}")`).click();
    await this.page.waitForTimeout(1000);
    
    const searchTextBox = this.page.locator('input[type="text"]').first();
    await searchTextBox.fill(searchText);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(5000);
  }
}
