import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "playwright";
import type { OrganizationPage } from "@src/pages/OrganizationPage";
import type { ContactFormPage } from "@src/pages/ContactFormPage";
import type { QueriesPage } from "@src/pages/QueriesPage";
import type { AdministrationPage } from "@src/pages/AdministrationPage";
import type { LoginPage } from "@src/pages/LoginPages";

export class PWWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  loginPage!: LoginPage;
  organizationPage!: OrganizationPage;
  contactFormPage!: ContactFormPage;
  queriesPage!: QueriesPage;
  administrationPage!: AdministrationPage;
}

setWorldConstructor(PWWorld);