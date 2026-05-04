# Blue Compass UI Test Automation — Implementation Documentation

## Executive Summary

This document outlines the implementation of UI test automation for the Blue Compass application, migrated from Katalon Studio to Playwright with TypeScript, utilizing a Behavior-Driven Development (BDD) approach with Cucumber. The implementation follows a four-layer architecture pattern with a centralized locator registry, ensuring maintainability, resilience against Angular/Pillar upgrades, and business-readable test scenarios.

## Project Overview

### Objective
Migrate existing Katalon Studio test automation to a modern, maintainable Playwright-based solution that is resilient to Angular Material and Pillar upgrades, with BDD capabilities for stakeholder collaboration.

### Technology Stack
- **Test Framework**: Playwright v1.58.2
- **BDD Framework**: Cucumber v12.7.0
- **Language**: TypeScript v5.9.3
- **Runtime**: Node.js with ts-node
- **Reporting**: Multiple Cucumber HTML Reporter
- **CI/CD**: Azure DevOps Pipelines
- **Application**: Blue Compass (Angular 17.3.11 + Angular Material)

### Environments Supported

| Environment | URL | Config File |
|-------------|-----|-------------|
| STD-F1 | https://standard-f1-carity.feisystemsh2env.com/ | `.env.std-f1` |
| DEV-F5 | https://standard-devf5-carity.lower-bluecompass-01.aws.feisystems.com/ | `.env.dev-f5` |
| QA | https://qa-carity.feisystemsh2env.com/ | `.env.qa` |

---

## Architecture Design

### Four-Layer Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Files (Gherkin)                  │
│              Business-readable BDD scenarios                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Step Definitions                           │
│           Thin glue code — delegates to Keywords            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Keywords Layer                            │
│         Business logic orchestration (high-level)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Page Objects                               │
│          UI interaction — imports from Locators             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│            ⭐ Centralized Locator Registry                  │
│     All element selectors in one place (src/locators/)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Playwright API                            │
│              Browser automation engine                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Principle**: Page Objects never contain raw CSS/XPath selectors. All selectors live exclusively in `src/locators/`. When Angular upgrades, only locator files need updating — Page Objects and Steps remain unchanged.

---

## Project Structure

```
testExecution copy/
├── features/                            # Cucumber BDD feature files
│   ├── smoke.feature                    # Core smoke test (25 steps)
│   ├── navigation.feature               # Left nav verification
│   ├── organization.feature             # Organization creation flow
│   └── bulk-assignment.feature          # Bulk Assignment TCs (PBI 915981)
│
├── src/
│   ├── config/
│   │   ├── env.ts                       # Credentials, URLs, wait timeouts
│   │   └── cucumber-timeout.ts          # Global step timeout
│   │
│   ├── core/
│   │   ├── world.ts                     # Cucumber World — shared state
│   │   └── browser.ts                   # Browser launch
│   │
│   ├── data/
│   │   └── test-data.ts                 # Per-TC test data registry
│   │
│   ├── hooks/
│   │   └── hooks.ts                     # Before/After hooks, report generation
│   │
│   ├── keywords/                        # High-level business actions
│   │   ├── LoginKeywords.ts
│   │   ├── NavigationKeywords.ts
│   │   ├── AdministrationKeywords.ts
│   │   └── CommonKeywords.ts
│   │
│   ├── locators/                        # ⭐ Centralized Locator Registry
│   │   ├── index.ts                     # Re-exports all + upgrade guide
│   │   ├── common.locators.ts           # Shared Angular Material (UPDATE FIRST)
│   │   ├── login.locators.ts
│   │   ├── header.locators.ts
│   │   ├── search.locators.ts
│   │   ├── table.locators.ts
│   │   ├── forms.locators.ts
│   │   ├── navigation.locators.ts
│   │   ├── bulk-assignment.locators.ts
│   │   └── person-profile.locators.ts
│   │
│   ├── pages/                           # Page Objects
│   │   ├── LoginPages.ts
│   │   ├── NavigationPage.ts
│   │   ├── AdministrationPage.ts
│   │   ├── ContactFormPage.ts
│   │   ├── OrganizationPage.ts
│   │   ├── QueriesPage.ts
│   │   ├── HeaderSearchPage.ts
│   │   ├── PersonProfilePage.ts
│   │   ├── BulkAssignmentPage.ts
│   │   ├── BulkAssignmentListPage.ts
│   │   ├── BulkAssignmentSearchPage.ts
│   │   └── BulkAssignmentModalPage.ts
│   │
│   ├── steps/                           # Cucumber step definitions
│   │   ├── login.steps.ts
│   │   ├── navigation.steps.ts
│   │   ├── organization.steps.ts
│   │   └── bulk-assignment.steps.ts
│   │
│   └── utils/
│       ├── dropdown-helper.ts           # Angular Material dropdown handler
│       ├── html-capture.ts              # Capture interactive elements
│       ├── report-generator.ts          # Custom HTML report
│       └── timestamp.ts                 # Run timestamp utility
│
├── reports/                             # Test execution reports (auto-generated)
├── .env.std-f1                          # STD-F1 credentials
├── .env.dev-f5                          # DEV-F5 credentials
├── cucumber.js                          # Cucumber profiles
├── package.json                         # npm scripts
└── tsconfig.json                        # TypeScript + path aliases
```

---

## Centralized Locator Registry

### Why Centralized Locators?

Blue Compass undergoes regular Angular Material and Pillar upgrades. Without centralized locators, every upgrade breaks selectors scattered across dozens of Page Objects. With this architecture:

- Update `common.locators.ts` once → all 12 Page Objects benefit automatically
- Locator changes are auditable in one place
- TypeScript autocomplete prevents typos in selector names

### Locator Files

| File | Purpose | Upgrade Impact |
|------|---------|----------------|
| `common.locators.ts` | ⭐ Shared Angular Material components | **UPDATE FIRST** — affects all screens |
| `login.locators.ts` | Login page selectors | Login page changes only |
| `header.locators.ts` | Header/nav bar (aria-label based) | Header redesign |
| `search.locators.ts` | Search functionality | Search component changes |
| `table.locators.ts` | Data tables, mat-column-* classes | Table component changes |
| `forms.locators.ts` | Form inputs, buttons, validation | Form component changes |
| `navigation.locators.ts` | Left sidebar navigation | Nav menu changes |
| `bulk-assignment.locators.ts` | Bulk Assignment page elements | BA page changes |
| `person-profile.locators.ts` | Person profile page elements | Profile page changes |

### Locator Priority (Stability Ranking)

```
1. aria-label          ← MOST STABLE — accessibility-friendly, survives upgrades
2. id                  ← Stable if not dynamically generated
3. role                ← Semantic, framework-agnostic
4. mat-column-*        ← Angular Material semantic classes (stable across versions)
5. text-based          ← OK if UI labels don't change
6. CSS class           ← Medium risk — may change on Angular Material upgrades
7. positional (.nth()) ← HIGH RISK — breaks when DOM order changes, avoid
```

### CommonLocators — The Most Critical File

```typescript
export const CommonLocators = {
  // Angular Material Tables
  matTable: 'mat-table[role="table"]',
  matRow: 'mat-row',
  matHeaderCell: 'mat-header-cell',

  // Form Controls
  matSelect: 'mat-select',
  matOption: 'mat-option',
  matInput: 'input.mat-mdc-input-element',
  matCheckbox: 'mat-checkbox',

  // Dialogs
  matDialog: 'mat-dialog-container',
  matDialogContent: 'mat-dialog-content',

  // Pagination — aria-label based (MOST STABLE)
  paginatorNext: '[aria-label="Next page"]',
  paginatorPrevious: '[aria-label="Previous page"]',

  // Common Buttons
  continueBtn: "button:has-text('Continue')",
  cancelBtn: "button:has-text('Cancel')",
  saveBtn: "button:has-text('Save')",
  closeBtn: "button:has-text('Close')",
};
```

### Usage in Page Objects

```typescript
// ✅ CORRECT — import from locators registry
import { CommonLocators, BulkAssignmentLocators } from '@src/locators';

await this.page.click(CommonLocators.continueBtn);
await this.page.locator(BulkAssignmentLocators.assignLocationBtn).click();

// ❌ WRONG — never hardcode selectors in page objects
await this.page.click("button:has-text('Continue')");
```

### Upgrade Workflow

```
Angular/Pillar Upgrade Happens
        ↓
Step 1: Update common.locators.ts FIRST
        ↓ (all 12 Page Objects benefit automatically)
Step 2: Update component-specific locator files as needed
        ↓
Step 3: npm run test:smoke:dev-f5
        ↓
Step 4: Fix any remaining issues in screen-specific locator files
```

---

## Core Components

### World Context (PWWorld)

```typescript
export class PWWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  // Page objects shared across steps
  loginPage!: LoginPage;
  bulkAssignmentListPage!: BulkAssignmentListPage;
  bulkAssignmentSearchPage!: BulkAssignmentSearchPage;
  bulkAssignmentModalPage!: BulkAssignmentModalPage;
  personProfilePage!: PersonProfilePage;
  // Shared test state
  assignedPersonName?: string;
  assignedEffectiveDate?: string;
}
```

### Environment Configuration

```typescript
export const env = {
  baseUrl: process.env.BASE_URL || "https://standard-f1-carity.feisystemsh2env.com/",
  headless: (process.env.HEADLESS || "true") === "true",
  browser: process.env.BROWSER || "chromium",
  username: process.env.APP_USERNAME || "George.Parker",
  password: process.env.PASSWORD || "Password123#",
  organization: process.env.ORGANIZATION || "Quantum",
  location: process.env.LOCATION || "Quantum Services Medical Equipment",
  staffMember: process.env.STAFF_MEMBER || "Self",
};

export const Waits = {
  MIN: 500,    // UI transitions, click settling
  AVG: 2000,   // Dropdown populate, panel open
  MAX: 5000,   // Page load, search results, API responses
};
```

**Rule**: No hardcoded values in Page Objects or Steps. Everything flows from `env.ts` and `test-data.ts`.

### Angular Material Dropdown Helper

Angular Material autocomplete dropdowns require a special interaction pattern. `DropdownHelper` handles this consistently:

```typescript
const helper = new DropdownHelper(page);
await helper.selectWithFallback(
  'Assignment Type',      // label for logging
  comboboxSelector,       // input[role="combobox"] selector
  'CMA',                  // preferred value to select
  matOptionSelector       // mat-option selector
);
// Logs: [DROPDOWN] Assignment Type: ✓ selected preferred value "CMA"
// Or:   [DROPDOWN] Assignment Type: ⚠ fell back to "Caseworker"
```

### Per-TC Test Data Registry

```typescript
// src/data/test-data.ts
const testCaseData = {
  TC556255: {
    modal: { ...defaults.modal, assignmentType: 'CMA' },
  },
  TC556256: {
    modal: { ...defaults.modal, assignmentType: 'CMA', staffMember: '' },
  },
};

// Usage in steps:
const td = getTestData('TC556255');
await modalPage.fillLocationAssignmentForm(td.modal);
```

---

## Test Scenarios Coverage

### Smoke Test (25 steps)

**Tag**: `@smoke` | **Feature**: `features/smoke.feature`

```gherkin
Scenario: Validate the smoke Test
  Given I login with username "george.parker" and password "Password123#"
  Then I should see the dashboard
  When I navigate to Administration tab
  Then I should see all administration sections
  When I navigate to Contact Form
  Then I should see contact form columns
  When I navigate to Queries
  And I click filter list
  And I select Person Assignments
  And I select My CaseLoad
  And I click Run Query
  Then I should see query results columns
  When I click Add New Organization
  And I click Continue without filling required fields
  Then I should see validation errors for required fields
  When I fill organization details with random data
  And I click Continue
  Then I should see Potential Duplicates page
  ...
  Then I should see the created organization
```

**Covers**: Login → Dashboard → Administration (12 sections) → Contact Form → Queries → Organization creation flow

---

### Bulk Assignment Test Cases (PBI 915981)

**Tag**: `@bulk-assignment` | **Feature**: `features/bulk-assignment.feature`

All scenarios share a common background:
```gherkin
Background:
  Given I login with username "george.parker" and password "Password123#"
  Then I should see the dashboard
  When I navigate to Bulk Assignments via the ellipsis menu
```

#### TC556255 — Assign Location

```gherkin
@TC556255
Scenario: TC556255 - Validate Location Bulk Assignment fields and assign location
  Given I am on the Bulk Assignments page
  When I fill in search criteria and click Run Query
  Then the Bulk Assignments list displays filtered records
  When I select 1 or more records
  And I click the Assign Location button
  Then the Location Bulk Assignments modal displays
  And I verify Assignment Type is a required single select dropdown
  And I verify Location is a required single select dropdown
  And I verify Effective Start Date is a required date field
  And I verify Note field allows maximum 10000 characters
  When I fill in all required fields and click Continue
  Then the Bulk Assignments list is NOT refreshed
  And previously selected records remain selected
  When I open the person profile for a selected person
  And I navigate to Location Assignment section
  Then the assigned location appears in the persons location assignments
  And I cleanup the location assignment for the assigned person
```

**What it validates**:
- Modal field presence and required validation
- Assignment form fill and submission
- List does not refresh after assignment (selection preserved)
- Person profile reflects the new location assignment
- Cleanup: unassigns after test to leave data clean

**Retry Pattern**: If the first person already has an assignment, the test automatically tries the next available person (up to 5 attempts).

---

#### TC556256 — Assign Staff

```gherkin
@TC556256
Scenario: TC556256 - Validate Staff Bulk Assignment fields and assign staff
  Given I am on the Bulk Assignments page
  When I fill in search criteria and click Run Query
  Then the Bulk Assignments list displays filtered records
  When I select 1 or more records
  And I click the Assign Staff button
  Then the staff assignment modal is visible
  And I verify Assignment Type is a required single select dropdown
  And I verify Staff Member dropdown is visible
  And I verify Location is a required single select dropdown
  And I verify Effective Start Date is a required date field
  And I verify Note field allows maximum 10000 characters
  And I verify Is Primary checkbox is visible
  When I fill in staff assignment form and submit
  Then the Bulk Assignments list is NOT refreshed
  And previously selected records remain selected
  When I open the person profile for a selected person
  And I navigate to Staff Assignment section
  Then the assigned staff appears in the persons staff assignments
  And I cleanup the staff assignment for the assigned person
```

**What it validates**:
- Staff assignment modal fields (Assignment Type, Staff Member, Location, Effective Date, Is Primary)
- Staff assignment submission
- Person profile reflects the new staff assignment
- Cleanup after test

---

#### TC556258 — Unassign Location

```gherkin
@TC556258
Scenario: TC556258 - Validate Location Bulk Unassignment fields and unassign location
  Given I am on the Bulk Assignments page
  When I fill in search criteria and click Run Query
  Then the Bulk Assignments list displays filtered records
  When I select all persons with existing location assignments
  And I click the Unassign Location button
  Then the Location Bulk Unassignments modal displays
  When I fill in the unassign location form and click Continue
  Then a confirmation modal displays with unassignment message
  When I click Continue on confirmation
  Then the unassignment status is displayed
  When I click the Close button
  Then the Bulk Assignments list is NOT refreshed
```

**What it validates**:
- Auto-detection of persons with existing location assignments (via fast DOM scan)
- Unassignment modal and form
- Two-step confirmation flow
- Success status display
- List not refreshed after operation

---

#### TC556263 — Unassign Staff

```gherkin
@TC556263
Scenario: TC556263 - Validate Staff Bulk Unassignment fields and unassign staff
  Given I am on the Bulk Assignments page
  When I fill in search criteria and click Run Query
  Then the Bulk Assignments list displays filtered records
  When I select all persons with existing staff assignments
  And I click the Unassign Staff button
  Then the staff unassignment modal is visible
  When I fill in the unassign staff form and click Continue
  Then a confirmation modal displays with unassignment message
  When I click Continue on confirmation
```

**What it validates**:
- Auto-detection of persons with existing staff assignments
- Staff unassignment modal and form
- Two-step confirmation flow

---

### Bulk Assignment Page Objects (Split by Responsibility)

| Page Object | Responsibility |
|-------------|---------------|
| `BulkAssignmentPage.ts` | Navigation to the Bulk Assignments page |
| `BulkAssignmentListPage.ts` | Grid interactions — select rows, click Assign/Unassign buttons |
| `BulkAssignmentSearchPage.ts` | Advanced search form — Query Type, Staff Type, Location dropdowns |
| `BulkAssignmentModalPage.ts` | Assignment/unassignment modal forms — fill, submit, verify |
| `PersonProfilePage.ts` | Verify assignment appears in person's profile |
| `HeaderSearchPage.ts` | Search for person by name to open their profile |

---

## Configuration and Execution

### Cucumber Profiles (cucumber.js)

```javascript
module.exports = {
  smoke: {
    paths: ["features/smoke.feature"],
    // ... require, format
  },
  regression: {
    paths: ["features/smoke.feature", "features/navigation.feature", "features/organization.feature"],
  },
  "bulk-assignment": {
    paths: ["features/bulk-assignment.feature"],
  }
};
```

### npm Scripts

```bash
# Smoke test
npm run test:smoke:dev-f5          # Run smoke on DEV-F5
npm run test:smoke                 # Run smoke on default env

# Regression
npm run test:regression:dev-f5     # Run regression on DEV-F5

# Individual Bulk Assignment TCs
npm run test:tc556255              # Assign Location
npm run test:tc556256              # Assign Staff
npm run test:tc556258              # Unassign Location
npm run test:tc556263              # Unassign Staff

# All Bulk Assignment TCs
npm run test:bulk-assignment:dev-f5
```

### Test Execution Flow

```
1. Load .env.{environment}         → credentials, base URL, org/location/staff
2. Launch Chromium browser         → headless: false (visible for demo)
3. Login flow                      → open → credentials → sign in → acknowledge
                                     → select org/location/staff → log in
4. Execute BDD scenarios           → step by step with screenshots
5. Generate HTML report            → reports/{timestamp}/test-report.html
```

### Report Structure

```
reports/
├── 2026-04-20T14-09-21/
│   ├── screenshots/               # Screenshot at every key step
│   │   ├── 01-login-page.png
│   │   ├── 02-credentials-entered.png
│   │   └── ...
│   └── test-report.html          # Full HTML report with pass/fail
├── html/
│   └── index.html                # Consolidated report dashboard
└── cucumber-report.json          # Raw test data
```

---

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: |
    npm ci
    npm run test:smoke:dev-f5
  displayName: 'Run Smoke Tests'

- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'reports/cucumber-report.json'
```

---

## Migration Benefits

### Technical Improvements
- **Modern Stack**: Playwright v1.58.2 with TypeScript — faster, more reliable than Katalon
- **Upgrade Resilience**: Centralized locators mean Angular upgrades only touch locator files
- **Type Safety**: TypeScript prevents runtime selector errors
- **Better Debugging**: Detailed `[PREFIX]` logging + screenshots at every step
- **Cross-browser**: Chromium, Firefox, WebKit support

### Maintainability
- **Single Source of Truth**: All selectors in `src/locators/` — one place to audit
- **Clear Separation**: Feature → Steps → Keywords → Pages → Locators
- **Business-readable**: Gherkin scenarios readable by QA, BA, and developers
- **Per-TC Data**: `test-data.ts` keeps test data organized and isolated per TC

### Scalability
- **Add New TC**: Add data to `test-data.ts`, locators to locator file, steps to steps file
- **Add New Screen**: Create locator file + page object — no changes to existing files
- **Tag-based Execution**: `@smoke`, `@TC556255`, `@PBI915981` — run exactly what you need
- **Environment Flexibility**: Switch environments with a single `.env.*` file

---

## Conclusion

This implementation delivers a production-ready UI test automation framework for Blue Compass that:

1. **Survives Upgrades**: Centralized locator registry isolates Angular/Pillar upgrade impact
2. **Business-readable**: Gherkin BDD scenarios enable QA, BA, and developer collaboration
3. **Fully Automated**: Login, navigation, form fill, verification, and cleanup — end to end
4. **Demo-ready**: Runs on DEV-F5 with `npm run test:smoke:dev-f5` and `npm run test:regression:dev-f5`
5. **Extensible**: Adding new TCs follows a clear, documented pattern
6. **CI/CD Ready**: Azure DevOps pipeline integration with HTML reports and screenshots
