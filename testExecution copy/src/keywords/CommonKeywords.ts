import type { Page } from "playwright";
import { SearchLocators, CommonLocators } from "@src/locators";

export class CommonKeywords {
  constructor(private page: Page) {}

  async searchInputInHomePage(searchType: string, searchText: string) {
    const combobox = this.page.locator(SearchLocators.searchTypeCombobox).first();
    await combobox.click({ force: true });
    await this.page.waitForTimeout(1000);
    
    await this.page.locator(CommonLocators.matOption).filter({ hasText: searchType }).click();
    await this.page.waitForTimeout(1000);
    
    const searchTextBox = this.page.locator(SearchLocators.searchTextBox).first();
    await searchTextBox.fill(searchText);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(5000);
  }
}
