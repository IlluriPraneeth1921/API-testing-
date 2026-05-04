import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "playwright";
import type { OrganizationPage } from "@src/pages/OrganizationPage";
import type { ContactFormPage } from "@src/pages/ContactFormPage";
import type { QueriesPage } from "@src/pages/QueriesPage";
import type { AdministrationPage } from "@src/pages/AdministrationPage";
import type { LoginPage } from "@src/pages/LoginPages";
import type { BulkAssignmentTestData } from "@src/data/test-data";

export class PWWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  loginPage!: LoginPage;
  organizationPage!: OrganizationPage;
  contactFormPage!: ContactFormPage;
  queriesPage!: QueriesPage;
  administrationPage!: AdministrationPage;

  /** Test data loaded per-scenario based on @TC tag */
  testData!: BulkAssignmentTestData;
  /** The TC ID extracted from scenario tags (e.g. 'TC556255') */
  tcId!: string;
  /** Whether the last assignment operation succeeded */
  assignmentSucceeded: boolean = false;
  /** The result message from the last assignment operation */
  assignmentResultMessage: string = '';
  /** The person name that was successfully assigned (for profile verification) */
  assignedPersonName: string = '';
  /** Clean search term for the assigned person (for header search) */
  assignedPersonSearchTerm: string = '';
  /** The effective date used during assignment (for profile verification) */
  assignedEffectiveDate: string = '';
}

setWorldConstructor(PWWorld);