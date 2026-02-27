import type { Page } from "playwright";
import { NavigationPage } from "@src/pages/NavigationPage";

export class NavigationKeywords {
  private navigationPage: NavigationPage;

  constructor(private page: Page) {
    this.navigationPage = new NavigationPage(page);
  }

  async searchAndVerifyNavigation(searchTerm: string = 'Test') {
    console.log('[NAV-KEYWORDS] Starting organization search and navigation verification');
    
    // Search for organization
    await this.navigationPage.searchOrganization(searchTerm);
    
    // Verify all navigation elements
    await this.navigationPage.verifyLeftNavigationElements();
    
    console.log('[NAV-KEYWORDS] Navigation verification completed successfully');
  }
}