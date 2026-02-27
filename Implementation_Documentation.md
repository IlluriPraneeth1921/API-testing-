# Katalon to Playwright Migration - Implementation Documentation

## Executive Summary

This document outlines the complete implementation of migrating test automation from Katalon Studio to Playwright with TypeScript, utilizing a Behavior-Driven Development (BDD) approach with Cucumber. The implementation follows a three-layer architecture pattern ensuring maintainability, scalability, and business-readable test scenarios.

## Project Overview

### Objective
Migrate existing Katalon Studio test automation framework to a modern, maintainable Playwright-based solution with BDD capabilities.

### Technology Stack
- **Test Framework**: Playwright v1.58.2
- **BDD Framework**: Cucumber v12.7.0
- **Language**: TypeScript v5.9.3
- **Runtime**: Node.js with ts-node
- **Reporting**: Multiple Cucumber HTML Reporter
- **CI/CD**: Azure DevOps Pipelines

## Architecture Design

### Three-Layer Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Files (Gherkin)                  │
│                  Business-readable scenarios                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Step Definitions                           │
│              Glue code between layers                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Keywords Layer                            │
│              Business logic orchestration                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Page Objects                               │
│               UI interaction layer                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Playwright                                │
│              Browser automation engine                      │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Project Structure

```
testExecution/
├── features/                    # Gherkin feature files
│   ├── smoke.feature           # Smoke test scenarios
│   └── organization.feature    # Organization management tests
├── src/
│   ├── config/                 # Configuration files
│   │   ├── env.ts             # Environment variables
│   │   └── cucumber-timeout.ts # Test timeouts
│   ├── core/                   # Core framework components
│   │   ├── world.ts           # Cucumber World context
│   │   └── browser.ts         # Browser management
│   ├── hooks/                  # Test lifecycle hooks
│   │   └── hooks.ts           # Before/After hooks
│   ├── keywords/               # Business logic layer
│   │   ├── LoginKeywords.ts   # Login workflows
│   │   └── AdministrationKeywords.ts
│   ├── pages/                  # Page Object Model
│   │   ├── LoginPages.ts      # Login page interactions
│   │   ├── OrganizationPage.ts
│   │   ├── ContactFormPage.ts
│   │   └── QueriesPage.ts
│   ├── steps/                  # Step definitions
│   │   ├── login.steps.ts     # Login step mappings
│   │   └── organization.steps.ts
│   └── utils/                  # Utility functions
│       ├── timestamp.ts       # Time utilities
│       └── report-generator.ts # Report generation
├── reports/                    # Test execution reports
├── package.json               # Dependencies and scripts
├── cucumber.js               # Cucumber configuration
└── tsconfig.json            # TypeScript configuration
```

### 2. Core Components Implementation

#### 2.1 World Context (PWWorld)
```typescript
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
```

**Purpose**: Provides shared context across all step definitions, maintaining browser instances and page objects.

#### 2.2 Environment Configuration
```typescript
export const env = {
  baseUrl: process.env.BASE_URL || "https://standard-f1-carity.feisystemsh2env.com/",
  headless: (process.env.HEADLESS || "true") === "true",
  browser: process.env.BROWSER || "chromium",
  username: process.env.USERNAME || "george.parker",
  password: process.env.PASSWORD || "Password123#",
  organization: process.env.ORGANIZATION || "Quantum",
  location: process.env.LOCATION || "Quantum Services Medical Equipment",
  staffMember: process.env.STAFF_MEMBER || "Self"
};
```

**Features**:
- Environment-specific configurations (.env, .env.qa, .env.std-f1)
- Default fallback values
- Support for multiple environments

### 3. Layer Implementation Details

#### 3.1 Feature Files Layer
**Location**: `/features/*.feature`

**Example - Smoke Test**:
```gherkin
Feature: Smoke Test

  @smoke
  Scenario: Validate the smoke Test 
    Given I login with username "george.parker" and password "Password123#"
    Then I should see the dashboard
    When I navigate to Administration tab
    Then I should see all administration sections
    When I navigate to Contact Form
    Then I should see contact form columns
```

**Benefits**:
- Business-readable test scenarios
- Collaboration between technical and non-technical stakeholders
- Living documentation of application behavior
- Reusable step definitions across scenarios

#### 3.2 Step Definitions Layer
**Location**: `/src/steps/*.steps.ts`

**Implementation Pattern**:
```typescript
Given("I login with username {string} and password {string}", 
  async function (this: PWWorld, username: string, password: string) {
    const kw = new LoginKeywords(this.page);
    await kw.login(username, password);
  }
);
```

**Key Features**:
- Type-safe parameter extraction from Gherkin steps
- Minimal logic - delegates to Keywords layer
- Access to shared PWWorld context
- Dynamic imports for performance optimization

#### 3.3 Keywords Layer
**Location**: `/src/keywords/*.ts`

**Example - Login Keywords**:
```typescript
export class LoginKeywords {
  private loginPage: LoginPage;

  constructor(private page: Page) {
    this.loginPage = new LoginPage(page);
  }

  async login(username: string, password: string) {
    await this.loginPage.open();
    await this.loginPage.handleAlert();
    await this.loginPage.enterCredentials(username, password);
    await this.loginPage.clickSignIn();
    await this.loginPage.handleAcknowledgeButton();
    await this.loginPage.selectOrganization(env.organization);
    await this.loginPage.selectLocation(env.location);
    await this.loginPage.selectStaffMember(env.staffMember);
    await this.loginPage.clickLogin();
  }
}
```

**Responsibilities**:
- Orchestrate complex business workflows
- Combine multiple page object calls
- Implement business logic and validation rules
- Provide high-level test actions

#### 3.4 Page Objects Layer
**Location**: `/src/pages/*.ts`

**Example - Login Page**:
```typescript
export class LoginPage {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = `reports/${timestamp}/screenshots`;
  }

  async enterCredentials(username: string, password: string) {
    console.log(`[LOGIN] Entering credentials for user: ${username}`);
    const usernameField = this.page.locator("input#signInFormUsername").nth(1);
    const passwordField = this.page.locator("input#signInFormPassword").nth(1);
    await usernameField.waitFor({ state: 'visible' });
    await usernameField.fill(username);
    await passwordField.fill(password);
    await this.page.screenshot({ path: `${this.screenshotDir}/02-credentials-entered.png` });
    console.log('[LOGIN] Credentials entered');
  }
}
```

**Key Features**:
- Encapsulate UI elements and interactions
- Atomic, reusable actions
- Built-in screenshot capture
- Robust wait strategies
- Detailed logging for debugging

### 4. Advanced Features

#### 4.1 Screenshot Management
- Automatic screenshot capture at key test points
- Timestamped directory structure for test runs
- Visual evidence for test failures and debugging

#### 4.2 Error Handling and Resilience
```typescript
async handleAcknowledgeButton(maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await this.page.waitForTimeout(2000);
    
    const ackBtn = this.page.locator("button, input[type='button']")
                           .filter({ hasText: /acknowledge/i });
    
    if (await ackBtn.count() > 0) {
      await ackBtn.first().click();
      await this.page.waitForTimeout(5000);
    }

    if (await this.page.locator("span:text-is('Organization')")
                      .isVisible().catch(() => false)) {
      return;
    }
  }
}
```

#### 4.3 Dynamic Element Handling
```typescript
async selectDropdownValue(value: string, position: number) {
  const combobox = this.page.locator(`input[role='combobox']`).nth(position - 1);
  await combobox.click({ force: true });
  await combobox.type(value, { delay: 100 });
  await this.page.keyboard.press('ArrowDown');
  await this.page.keyboard.press('Enter');
}
```

### 5. Configuration and Setup

#### 5.1 Cucumber Configuration
```javascript
module.exports = {
  default: {
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/**/*.feature"],
    format: [
      "progress-bar",
      "json:reports/cucumber-report.json"
    ]
  }
};
```

#### 5.2 Package.json Scripts
```json
{
  "scripts": {
    "test": "npm run clean && cucumber-js",
    "test:qa": "npm run clean && dotenv --quiet -e .env.qa -- cucumber-js",
    "test:std-f1": "npm run clean && dotenv --quiet -e .env.std-f1 -- cucumber-js",
    "test:smoke": "cucumber-js --tags @smoke",
    "test:org": "cucumber-js --tags @organization"
  }
}
```

### 6. Test Execution and Reporting

#### 6.1 Test Execution Flow
1. **Environment Setup**: Load environment-specific configuration
2. **Browser Initialization**: Launch browser with specified settings
3. **Feature Execution**: Run Gherkin scenarios through step definitions
4. **Screenshot Capture**: Automatic visual evidence collection
5. **Report Generation**: HTML reports with screenshots and test results

#### 6.2 Report Structure
```
reports/
├── 2026-02-26T16-30-43/           # Timestamped test run
│   ├── screenshots/               # Visual evidence
│   │   ├── 01-login-page.png
│   │   ├── 02-credentials-entered.png
│   │   └── ...
│   └── test-report.html          # Detailed test report
├── html/                         # Consolidated HTML reports
│   ├── assets/                   # CSS, JS, fonts
│   ├── features/                 # Feature-specific reports
│   └── index.html               # Main report dashboard
└── cucumber-report.json         # Raw test data
```

### 7. CI/CD Integration

#### 7.1 Azure DevOps Pipeline
```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm ci
    npm run test:qa
  displayName: 'Run Tests'

- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'reports/cucumber-report.json'
```

### 8. Migration Benefits

#### 8.1 Technical Improvements
- **Modern Technology Stack**: Latest Playwright and TypeScript
- **Better Performance**: Faster test execution and more reliable element handling
- **Enhanced Debugging**: Detailed logging and screenshot capture
- **Type Safety**: TypeScript prevents runtime errors
- **Cross-browser Support**: Chromium, Firefox, and WebKit

#### 8.2 Maintainability Enhancements
- **Clear Separation of Concerns**: Three-layer architecture
- **Reusable Components**: Keywords and Page Objects
- **Business-readable Tests**: Gherkin scenarios
- **Environment Flexibility**: Multiple environment support

#### 8.3 Scalability Features
- **Modular Design**: Easy to add new features and pages
- **Parallel Execution**: Support for concurrent test runs
- **Tag-based Execution**: Run specific test suites (@smoke, @organization)
- **Dynamic Imports**: Performance optimization for large test suites

## Test Scenarios Coverage

### Current Implementation
1. **Smoke Test Suite**:
   - User authentication and login flow
   - Dashboard navigation and verification
   - Administration section access
   - Contact form functionality
   - Query execution and results validation

2. **Organization Management**:
   - Organization creation workflow
   - Form validation testing
   - Duplicate detection process
   - MMIS matching verification

### Execution Commands
```bash
# Run all tests
npm run test

# Run environment-specific tests
npm run test:qa
npm run test:std-f1

# Run specific test suites
npm run test:smoke
npm run test:org
```

## Conclusion

The Katalon to Playwright migration successfully delivers:

1. **Modern Architecture**: Three-layer BDD framework with clear separation of concerns
2. **Enhanced Reliability**: Robust error handling and wait strategies
3. **Better Maintainability**: Type-safe, modular, and well-documented code
4. **Comprehensive Reporting**: Visual evidence with detailed HTML reports
5. **CI/CD Ready**: Azure DevOps integration with automated test execution
6. **Business Alignment**: Gherkin scenarios enable stakeholder collaboration

This implementation provides a solid foundation for scalable test automation that bridges technical excellence with business requirements, ensuring long-term maintainability and effectiveness of the testing strategy.