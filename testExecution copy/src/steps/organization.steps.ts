import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { PWWorld } from "@src/core/world";
import { OrganizationPage } from "@src/pages/OrganizationPage";
import { NavigationLocators } from "@src/locators";

When("I click Add New Organization", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.clickAddNewOrganization();
});

When("I click Continue without filling required fields", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.clickContinue();
});

Then("I should see validation errors for required fields", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.verifyValidationErrors();
});

When("I fill organization details with random data", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.fillOrganizationDetails();
});

When("I click Continue", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.clickContinue();
});

Then("I should see Potential Duplicates page", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.verifyPotentialDuplicates();
});

Then("I should see Potential MMIS Matches page", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.verifyPotentialMMISMatches();
});

Then("I should see Create Organization page", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.verifyCreateOrganizationPage();
});

When("I click Create", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.clickCreate();
});

Then("I should see the created organization", async function (this: PWWorld) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.verifyCreatedOrganization();
});

When("I search for organization {string}", async function (this: PWWorld, searchTerm: string) {
  const orgPage = new OrganizationPage(this.page);
  await orgPage.navigateToOrganizations();
});

Then("I should see all navigation elements:", async function (this: PWWorld, dataTable) {
  const expectedElements = dataTable.raw().flat();
  const locatorMap: Record<string, string> = {
    'Profile': NavigationLocators.profile,
    'Locations': NavigationLocators.locations,
    'Staff Members': NavigationLocators.staffMembers,
    'Supported Programs': NavigationLocators.supportedPrograms,
    'Attachments': NavigationLocators.attachments,
    'Assignments': NavigationLocators.assignments,
    'Roles': NavigationLocators.roles,
    'Forms': NavigationLocators.forms,
    'Notes': NavigationLocators.notes,
    'Letters': NavigationLocators.letters,
    'Service Events': NavigationLocators.serviceEvents,
    'Contracts': NavigationLocators.contracts,
  };
  
  for (const elementText of expectedElements) {
    const selector = locatorMap[elementText] || `span:text-is("${elementText}")`;
    const navElement = this.page.locator(selector).first();
    await expect(navElement).toBeVisible({ timeout: 10000 });
    console.log(`✓ Verified navigation element: ${elementText}`);
  }
});