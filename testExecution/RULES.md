# Test Automation Framework - Rules & Standards

This document defines all rules and standards for the Blue Compass Playwright/Cucumber test automation framework. Use this as a reference when creating new test cases.

---

## Table of Contents

1. [Locator Rules](#1-locator-rules)
2. [Page Object Rules](#2-page-object-rules)
3. [Step Definition Rules](#3-step-definition-rules)
4. [Feature File Rules](#4-feature-file-rules)
5. [Environment & Configuration Rules](#5-environment--configuration-rules)
6. [Verification & Quality Rules](#6-verification--quality-rules)

---

## 1. Locator Rules

### 1.1 Centralized Locator Registry

**RULE: All locators MUST be defined in `src/locators/` files. NO hardcoded selectors in Page Objects.**

```
src/locators/
├── index.ts              # Re-exports all locators
├── common.locators.ts    # ⭐ Shared Angular Material components (UPDATE FIRST on upgrades)
├── header.locators.ts    # Header/navigation bar
├── navigation.locators.ts # Left sidebar & menus
├── table.locators.ts     # Data tables & pagination
├── forms.locators.ts     # Form inputs & validation
├── search.locators.ts    # Search functionality
└── login.locators.ts     # Login page specific
```

### 1.2 Locator Priority (Stability Ranking)

**RULE: Use locators in this priority order (most stable first):**

| Priority | Selector Type | Stability | Example | When to Use |
|----------|--------------|-----------|---------|-------------|
| 1 | `aria-label` | ⭐ HIGHEST | `[aria-label='Search']` | Always prefer if available |
| 2 | `id` | HIGH | `#search-input` | If not dynamically generated |
| 3 | `role` | HIGH | `[role="button"]` | For semantic elements |
| 4 | `data-testid` | HIGH | `[data-testid="submit"]` | If dev team adds them |
| 5 | `mat-column-*` | HIGH | `.mat-column-firstName` | Angular Material tables |
| 6 | text-based | MEDIUM | `button:has-text('Save')` | If text is stable |
| 7 | CSS classes | MEDIUM | `.primary-button` | Use with caution |
| 8 | positional | ⚠️ LOW | `.nth(0)` | AVOID - last resort only |

### 1.3 Locator File Structure

**RULE: Each locator file must follow this structure:**

```typescript
/**
 * [Component Name] Locators
 * [Description of what this file contains]
 * 
 * NOTE: For common Angular Material components, see CommonLocators.
 */
export const [ComponentName]Locators = {
  // Group 1: [Category Name]
  elementName: 'selector-value',
  
  // Group 2: [Category Name]
  anotherElement: 'selector-value',
} as const;

export type [ComponentName]LocatorKeys = keyof typeof [ComponentName]Locators;
```

### 1.4 Locator Naming Conventions

**RULE: Use camelCase with descriptive suffixes:**

| Element Type | Suffix | Example |
|-------------|--------|---------|
| Button | `Btn` | `submitBtn`, `cancelBtn` |
| Input | `Input` | `searchInput`, `nameInput` |
| Dropdown | `Dropdown` or `Select` | `orgDropdown`, `typeSelect` |
| Table | `Table` | `dataTable`, `resultsTable` |
| Row | `Row` | `headerRow`, `dataRow` |
| Column | `Column` | `nameColumn`, `idColumn` |
| Tab | `Tab` | `adminTab`, `searchTab` |
| Header | `Header` | `pageHeader`, `sectionHeader` |
| Container | `Container` | `mainContainer` |
| Icon | `Icon` | `filterIcon`, `searchIcon` |

### 1.5 Common vs Component-Specific Locators

**RULE: Place locators in the correct file:**

| Locator Type | File | Example |
|-------------|------|---------|
| Angular Material base components | `common.locators.ts` | `matTable`, `matOption`, `matButton` |
| Pagination controls | `common.locators.ts` | `paginatorFirst`, `paginatorNext` |
| Generic buttons | `common.locators.ts` | `continueBtn`, `saveBtn`, `cancelBtn` |
| Screen-specific elements | Component file | `organizationHeader`, `queryResults` |
| Blue Compass specific | Component file | `potentialDuplicates`, `mmisMatches` |

### 1.5.1 CommonLocator Reuse Rule

**RULE: When extracting locators from HTML captures, ALWAYS check CommonLocators first. If a common locator exists for the element type, use it in the Page Object instead of creating a duplicate in the module-specific locator file.**

Examples of what to reuse from CommonLocators:
- Dropdowns: Use `CommonLocators.matOption` for option selection, `CommonLocators.combobox` as base
- Buttons: Use `CommonLocators.continueBtn`, `cancelBtn`, `closeBtn`, `searchBtn`, `clearBtn`
- Dialogs: Use `CommonLocators.matDialog`, `matDialogContent`, `matDialogActions`
- Tables: Use `CommonLocators.matTable`, `matRow`, `matCell`
- Progress: Use `CommonLocators.matSpinner`, `matProgressBar`

**Only add to module-specific locator file when:**
- The element has a unique `aria-label` specific to that screen (e.g., `[aria-label="Query Type"]`)
- The element has a screen-specific `id` pattern (e.g., `input[id^="assignmentType"]`)
- The element has a unique `title` attribute (e.g., `button[title="Assign Location"]`)
- No matching CommonLocator exists

### 1.5.2 HTML Capture to Locator Extraction Rule

**RULE: When creating locators from HTML captures (`reports/html-captures/`), follow this process:**

1. Read the interactive elements HTML capture file
2. For each element needed, check `aria-label` first, then `id`, then `role`
3. Cross-reference with `common.locators.ts` - if a common locator covers it, DO NOT duplicate
4. Only add screen-specific locators to the module file (e.g., `bulk-assignment.locators.ts`)
5. In Page Objects, pass data values as parameters - don't hardcode dropdown values

**Page Object data-driven pattern:**
```typescript
// GOOD - Page accepts data, uses CommonLocators for shared elements
async fillForm(data: { assignmentType: string; location: string; date: string }) {
  await this.dropdownHelper.selectAutocompleteValue(
    BulkAssignmentLocators.assignmentTypeDropdown, // screen-specific locator
    data.assignmentType
  );
  await this.page.locator(CommonLocators.continueBtn).click(); // common locator
}

// BAD - Hardcoded values, duplicated locators
async fillForm() {
  await this.page.locator('input[id^="assignmentType"]').click(); // hardcoded
  await this.page.locator("button:has-text('Continue')").click(); // duplicated
}
```

### 1.5.3 Test Data & Self-Healing Dropdown Rule

**RULE: All dropdown selections must use explicit values from `TestData` config, with automatic fallback to first option if the value is not found.**

**Pattern: `selectWithFallback(locator, preferredValue, fieldName)`**

1. Try to select the exact value from `TestData` (type text, match option)
2. If not found → fall back to first available option
3. Always log the actual value selected (whether preferred or fallback)
4. Return the selected value so it can be used for downstream verification

**Where to define values:**

| Scope | Location | Example |
|-------|----------|---------|
| Global/reusable | `src/config/env.ts → TestData` | Organization, common dropdown values |
| Environment-specific | `.env` files via `process.env` | `BA_QUERY_TYPE`, `BA_ASSIGNMENT_TYPE` |
| TC-specific override | Step file top-level constants | Values unique to one test case |

**Log output format:**
```
[DROPDOWN] Query Type: trying preferred value "Has No Staff"
[DROPDOWN] Query Type: ✓ selected preferred value "Has No Staff Assignment"
-- or if fallback --
[DROPDOWN] Assignment Type: ⚠ preferred value "Primary" not found, falling back to first option
[DROPDOWN] Assignment Type: ✓ fell back to "APS Intake"
```

**Summary block after all dropdowns filled:**
```
[BA_SEARCH] ═══ Search Criteria Summary ═══
[BA_SEARCH]   Query Type:           "Has No Staff Assignment"
[BA_SEARCH]   Staff Assignment Type: "APS Intake"
[BA_SEARCH]   Location:             "All Locations"
[BA_SEARCH] ════════════════════════════════
```

### 1.5.4 Test Data Organization - Per TC, Per Page/Module

**RULE: Test data is organized per Test Case (TC) and per page/module. Each TC gets its own explicit data entry, even if values are identical to another TC.**

**Why:**
- You can see at a glance what data each TC uses
- Changing one TC's data never accidentally breaks another
- When a TC needs different values later, you just edit that one entry

**File structure - one data file per page/module:**

```
src/data/
├── test-data.ts                    → Bulk Assignment TCs
├── organization-test-data.ts       → Organization TCs
├── contact-form-test-data.ts       → Contact Form TCs
└── queries-test-data.ts            → Queries TCs
```

**Each data file follows the same pattern:**

```typescript
// 1. Types for the data shape
export interface SearchData { queryType: string; ... }
export interface ModalData { assignmentType: string; ... }
export interface MyTestData { search: SearchData; modal: ModalData; }

// 2. Defaults (shared baseline)
const defaults: MyTestData = { search: { queryType: 'Has No Staff' }, ... };

// 3. Per-TC overrides (only specify what differs)
const testCaseData: Record<string, Partial<MyTestData>> = {
  TC556255: { },                                          // uses all defaults
  TC556256: { search: { ...defaults.search, queryType: 'Has Staff Assignment' } },
  TC556257: { modal: { ...defaults.modal, assignmentType: 'Secondary' } },
};

// 4. Accessor
export function getTestData(tcId: string): MyTestData { ... }
```

**Usage in step files:**

```typescript
import { getTestData } from '@src/data/test-data';
let td = getTestData('TC556255');

await searchPage.searchWithMandatoryFields(td.search);
await modalPage.fillLocationAssignmentForm(td.modal);
```

**Key rules:**
- Even if TC556256 uses the same `queryType` as TC556255, it still gets its own entry
- Never share mutable state between TCs
- `env.ts` holds only environment config (URL, credentials, timeouts)
- `src/data/*.ts` holds all test-specific values per TC

### 1.6 Upgrade Strategy

**RULE: When Angular/Pillar upgrades happen:**

1. **First**: Update `common.locators.ts` (affects all screens)
2. **Then**: Update component-specific files as needed
3. **Verify**: Run `npm run verify:locators`
4. **Test**: Run `npm run test:smoke`

---

## 2. Page Object Rules

### 2.1 File Structure

**RULE: Each Page Object must follow this structure:**

### 2.0.1 Page Splitting Rule

**RULE: For complex screens with distinct sections (e.g., Bulk Assignments), split into focused Page Objects:**

| Page | Responsibility | Example |
|------|---------------|---------|
| Main Page | Grid, action buttons, navigation, row selection | `BulkAssignmentPage.ts` |
| Search Page | Advanced Search panel, cascading dropdowns, Run Query | `BulkAssignmentSearchPage.ts` |
| Modal Page | Assign/Unassign modals, form fields, confirmation | `BulkAssignmentModalPage.ts` |

**When to split:**
- The screen has a distinct overlay/panel (e.g., Advanced Search)
- The screen has modal dialogs with their own form fields
- A single Page Object exceeds ~200 lines
- Different sections have independent locator sets

**All sub-pages share the same module locator file** (e.g., `bulk-assignment.locators.ts`) plus `CommonLocators`.

```typescript
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { [Component]Locators } from "@src/locators";

export class [PageName]Page {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  // Methods follow...
}
```

### 2.2 No Hardcoded Locators

**RULE: NEVER use hardcoded selectors in Page Objects.**

❌ **WRONG:**
```typescript
const button = this.page.locator("button:has-text('Submit')");
const input = this.page.locator('#search-field');
```

✅ **CORRECT:**
```typescript
const button = this.page.locator(FormLocators.submitBtn);
const input = this.page.locator(SearchLocators.searchInput);
```

### 2.3 Method Naming Conventions

**RULE: Use action-based method names:**

| Action | Prefix | Example |
|--------|--------|---------|
| Click | `click` | `clickSubmitButton()` |
| Navigate | `navigateTo` | `navigateToQueries()` |
| Fill/Enter | `fill` or `enter` | `fillOrganizationDetails()` |
| Select | `select` | `selectOrganization()` |
| Verify/Assert | `verify` | `verifyAllSections()` |
| Search | `search` or `searchFor` | `searchOrganization()` |
| Wait | `waitFor` | `waitForDashboard()` |

### 2.4 Console Logging

**RULE: Add console logs for debugging with consistent format:**

```typescript
async clickAdministrationTab() {
  console.log('[ADMIN] Clicking Administration tab');
  // ... action code ...
  console.log('[ADMIN] Administration tab clicked');
}
```

**Log Format:** `[PAGE_PREFIX] Action description`

| Page | Prefix |
|------|--------|
| Login | `[LOGIN]` |
| Administration | `[ADMIN]` |
| Contact Form | `[CONTACT]` |
| Queries | `[QUERIES]` |
| Organization | `[ORG]` |
| Navigation | `[NAV-PAGE]` |

### 2.5 Screenshot Conventions

**RULE: Take screenshots at key steps with numbered naming:**

```typescript
await this.page.screenshot({ 
  path: `${this.screenshotDir}/01-login-page.png` 
});
```

**Naming Pattern:** `{number}-{description}.png`

Examples:
- `01-login-page.png`
- `02-credentials-entered.png`
- `03-after-signin.png`
- `09-administration-tab.png`

### 2.6 Wait Strategies

**RULE: Use appropriate wait strategies:**

| Scenario | Wait Method | Example |
|----------|-------------|---------|
| Element visibility | `waitFor` | `await element.waitFor({ state: 'visible', timeout: 10000 })` |
| Page load | `waitForLoadState` | `await this.page.waitForLoadState('networkidle', { timeout: 30000 })` |
| Fixed delay (avoid) | `waitForTimeout` | `await this.page.waitForTimeout(2000)` |

**RULE: Always specify timeouts explicitly:**

```typescript
// Good - explicit timeout
await element.waitFor({ state: 'visible', timeout: 10000 });

// Avoid - default timeout
await element.waitFor({ state: 'visible' });
```

### 2.7 Error Handling

**RULE: Use try-catch with fallback strategies for flaky elements:**

```typescript
async clickContinue() {
  const selectors = [
    FormLocators.continueButton,
    "//button[contains(.,'Continue')]",
  ];
  
  for (const selector of selectors) {
    try {
      const btn = this.page.locator(selector);
      if (await btn.isVisible()) {
        await btn.click();
        return;
      }
    } catch (e) {
      console.log(`Failed with selector: ${selector}`);
    }
  }
}
```

### 2.8 Assertions

**RULE: Use Playwright's expect for assertions:**

```typescript
import { expect } from "@playwright/test";

// Visibility assertion
await expect(element).toBeVisible({ timeout: 10000 });

// Text assertion
await expect(element).toHaveText('Expected Text');

// Count assertion
await expect(rows).toHaveCount(5);
```

---

## 3. Step Definition Rules

### 3.1 File Organization

**RULE: Organize step definitions by feature:**

```
src/steps/
├── login.steps.ts        # Login-related steps
├── organization.steps.ts # Organization-related steps
├── navigation.steps.ts   # Navigation steps
└── common.steps.ts       # Shared/common steps
```

### 3.2 Step Definition Structure

**RULE: Follow this structure:**

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import { [Page]Page } from "@src/pages/[Page]Page";

Given('I login with username {string} and password {string}', async function(username, password) {
  const loginPage = new LoginPage(this.page);
  await loginPage.login(username, password);
});
```

### 3.3 World Context

**RULE: Use Cucumber World for shared state:**

```typescript
// Access page from World
this.page  // Playwright page instance

// Store data for later steps
this.organizationName = 'Test Org';
```

### 3.4 Step Reusability

**RULE: Write reusable steps with parameters:**

```typescript
// Good - reusable
When('I click the {string} button', async function(buttonName) { ... });

// Avoid - too specific
When('I click the Submit button', async function() { ... });
```

---

## 4. Feature File Rules

### 4.1 File Structure

**RULE: Feature files must include:**

```gherkin
@tag1 @tag2
Feature: Feature Name
  As a [role]
  I want to [action]
  So that [benefit]

  Background:
    Given [common preconditions]

  @smoke
  Scenario: Scenario Name
    Given [precondition]
    When [action]
    Then [expected result]
```

### 4.2 Tagging Conventions

**RULE: Use consistent tags:**

| Tag | Purpose | Example |
|-----|---------|---------|
| `@smoke` | Smoke tests | Critical path tests |
| `@regression` | Regression suite | Full test suite |
| `@sanity` | Sanity checks | Quick validation |
| `@critical` | Critical priority | Must-pass tests |
| `@high` | High priority | Important tests |
| `@medium` | Medium priority | Standard tests |
| `@low` | Low priority | Nice-to-have tests |
| `@wip` | Work in progress | Incomplete tests |
| `@skip` | Skip execution | Temporarily disabled |
| `@[feature]` | Feature-specific | `@login`, `@organization` |

### 4.3 Scenario Naming

**RULE: Use descriptive scenario names:**

```gherkin
# Good
Scenario: Validate user can create new organization with required fields

# Avoid
Scenario: Test organization
```

### 4.4 Step Writing

**RULE: Write steps in business language:**

```gherkin
# Good - business language
Given I am logged in as an administrator
When I create a new organization with name "Test Org"
Then I should see the organization in the list

# Avoid - technical language
Given I call login API with admin credentials
When I POST to /api/organizations
Then response status is 200
```

---

## 5. Environment & Configuration Rules

### 5.1 Environment Files

**RULE: Use `.env` files for environment-specific configuration:**

```
.env              # Default/local environment
.env.qa           # QA environment
.env.std-f1       # STD-F1 environment
.env.example      # Template (commit this)
```

### 5.2 Environment Variables

**RULE: Required environment variables:**

```env
BASE_URL=https://your-environment.com
USERNAME=test-user
PASSWORD=secure-password
ORGANIZATION=Test Organization
LOCATION=Test Location
STAFF=Self
```

### 5.3 Sensitive Data

**RULE: NEVER commit sensitive data:**

- Add `.env` to `.gitignore`
- Use `.env.example` as template
- Store secrets in secure vault for CI/CD

### 5.4 Running with Different Environments

**RULE: Use npm scripts for environment switching:**

```bash
npm run test:qa        # QA environment
npm run test:std-f1    # STD-F1 environment
npm run test           # Default environment
```

---

## 6. Verification & Quality Rules

### 6.1 Pre-Commit Checks

**RULE: Run these before committing:**

```bash
# 1. Verify locators
npm run verify:locators

# 2. Run smoke test
npm run test:smoke

# 3. Check TypeScript compilation
npx tsc --noEmit
```

### 6.2 Code Review Checklist

**RULE: Verify these in code reviews:**

- [ ] No hardcoded locators in Page Objects
- [ ] All new locators added to appropriate locator file
- [ ] Console logs follow naming convention
- [ ] Screenshots have numbered naming
- [ ] Explicit timeouts on all waits
- [ ] Feature file has appropriate tags
- [ ] Step definitions are reusable

### 6.3 Test Reports

**RULE: Reports are generated in:**

```
reports/{timestamp}/
├── test-report.html    # HTML report
└── screenshots/        # Step screenshots
```

### 6.4 Verification Script

**RULE: Run locator verification regularly:**

```bash
npm run verify:locators
```

This checks:
1. No duplicate locators between common and component files
2. All Page Objects use centralized locators
3. Locator usage coverage

---

## Quick Reference Card

### Creating a New Test Case

1. **Identify locators needed** → Add to appropriate `src/locators/*.locators.ts`
2. **Create/update Page Object** → Use centralized locators only
3. **Write step definitions** → Reusable, parameterized
4. **Create feature file** → With proper tags
5. **Verify** → Run `npm run verify:locators`
6. **Test** → Run `npm run test:smoke`

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Locator file | `{component}.locators.ts` | `forms.locators.ts` |
| Page Object | `{PageName}Page.ts` | `OrganizationPage.ts` |
| Step file | `{feature}.steps.ts` | `login.steps.ts` |
| Feature file | `{feature}.feature` | `smoke.feature` |

### Commands

```bash
npm run test:smoke       # Run smoke tests
npm run test             # Run all tests
npm run verify:locators  # Verify locator usage
npm run test:organization # Run organization tests
```

---

**Last Updated:** April 3, 2026
**Version:** 1.0
