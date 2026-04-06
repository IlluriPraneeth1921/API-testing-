import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { PWWorld } from "@src/core/world";
import { LoginKeywords } from "@src/keywords/LoginKeywords";
import { env } from "@src/config/env";

Given("I login with username {string} and password {string}", async function (this: PWWorld, u: string, p: string) {
  const kw = new LoginKeywords(this.page);
  await kw.login(u, p);
});

Then("I should see the dashboard", async function (this: PWWorld) {
  const headerContainer = this.page.locator("[aria-label='primary-layout-header-container']");
  await headerContainer.waitFor({ state: 'visible', timeout: 30000 });
  await expect(headerContainer).toBeVisible();
  await expect(this.page).toHaveURL(/choose-context/, { timeout: 10000 });
});

When("I navigate to Administration tab", async function (this: PWWorld) {
  const { AdministrationKeywords } = await import("@src/keywords/AdministrationKeywords");
  const kw = new AdministrationKeywords(this.page);
  await kw.verifyAdministrationSections();
});

Then("I should see all administration sections", async function (this: PWWorld) {
  const adminTab = this.page.locator("span:text-is('Administration')").first();
  await expect(adminTab).toBeVisible();
});

When("I navigate to Contact Form", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.navigateToContactForm();
});

When("I search for {string}", async function (this: PWWorld, searchText: string) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.searchFor(searchText);
});

Then("I should see contact form columns", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.verifyColumns();
});

Then("I should see contact form data", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.verifyData();
});

When("I click column options", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.clickColumnOptions();
});

Then("I should see column select option", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.verifyColumnSelect();
});

When("I navigate to Queries", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.navigateToQueries();
});

When("I click filter list", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.clickFilterList();
});

When("I select Person Assignments", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.selectPersonAssignments();
});

When("I select My CaseLoad", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.selectMyCaseLoad();
});

When("I click Run Query", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.clickRunQuery();
});

Then("I should see query results columns", async function (this: PWWorld) {
  const { QueriesPage } = await import("@src/pages/QueriesPage");
  const page = new QueriesPage(this.page);
  await page.verifyColumns();
});
