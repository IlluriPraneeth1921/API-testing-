import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { PWWorld } from "@src/core/world";
import { NavigationKeywords } from "@src/keywords/NavigationKeywords";

When("I search for organization and verify navigation {string}", async function (this: PWWorld, searchTerm: string) {
  const navKeywords = new NavigationKeywords(this.page);
  await navKeywords.searchAndVerifyNavigation(searchTerm);
});

Then("I should see all left navigation elements:", async function (this: PWWorld, dataTable) {
  const expectedElements = dataTable.raw().flat();
  
  console.log('[STEPS] Verifying all left navigation elements are visible');
  
  for (const elementText of expectedElements) {
    const navElement = this.page.locator(`span:text-is("${elementText}")`).first();
    await expect(navElement).toBeVisible({ timeout: 10000 });
    console.log(`✓ Verified navigation element: ${elementText}`);
  }
  
  console.log('[STEPS] All left navigation elements verified successfully');
});