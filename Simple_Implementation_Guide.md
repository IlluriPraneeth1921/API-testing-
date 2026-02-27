# Test Automation Project - Simple Guide

## What This Project Does

This project automatically tests our web application - like having a robot that clicks buttons, fills forms, and checks if everything works correctly. We moved from an old testing tool (Katalon) to a new, better one (Playwright).

## Why We Built This

We want to:
- Test our website automatically (no manual clicking)
- Catch bugs before users see them
- Make sure new changes don't break existing features
- Save time by running tests overnight

### Tools We Use
- **Playwright**: The robot that controls the web browser
- **Cucumber**: Lets us write tests in plain English
- **TypeScript**: Programming language (like JavaScript but safer)
- **Azure DevOps**: Runs our tests automatically when code changes

## How Our Testing System Works

Think of it like a restaurant with different roles:

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Scenarios                           │
│              "What we want to test" (in plain English)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Translators                                │
│              "Convert English to computer code"             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Workflows                                 │
│              "Complete business processes"                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Page Actions                               │
│               "Click buttons, fill forms"                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Browser Robot                             │
│              "Actually controls the website"                │
└─────────────────────────────────────────────────────────────┘
```

## How Our Files Are Organized

Like organizing a filing cabinet:

```
testExecution/
├── features/                    # Test scenarios in plain English
│   ├── smoke.feature           # Quick "is it working?" tests
│   └── organization.feature    # Tests for creating organizations
├── src/
│   ├── config/                 # Settings and configuration
│   │   ├── env.ts             # Website URLs, usernames, etc.
│   │   └── cucumber-timeout.ts # How long to wait for things
│   ├── core/                   # Main system files
│   │   ├── world.ts           # Shared information between tests
│   │   └── browser.ts         # Browser setup
│   ├── hooks/                  # What to do before/after tests
│   │   └── hooks.ts           # Setup and cleanup
│   ├── keywords/               # Complete business processes
│   │   ├── LoginKeywords.ts   # How to log into the system
│   │   └── AdministrationKeywords.ts # Admin tasks
│   ├── pages/                  # Individual page interactions
│   │   ├── LoginPages.ts      # Login page buttons and forms
│   │   ├── OrganizationPage.ts # Organization page elements
│   │   ├── ContactFormPage.ts # Contact form elements
│   │   └── QueriesPage.ts     # Query page elements
│   ├── steps/                  # Translators (English to code)
│   │   ├── login.steps.ts     # Login translations
│   │   └── organization.steps.ts # Organization translations
│   └── utils/                  # Helper tools
│       ├── timestamp.ts       # Date/time functions
│       └── report-generator.ts # Create test reports
├── reports/                    # Test results and screenshots
├── package.json               # List of tools we need
├── cucumber.js               # Test runner settings
└── tsconfig.json            # Programming language settings
```

## Main Components Explained Simply

### The "Memory Bank" (PWWorld)
This is like the robot's memory - it remembers:
- Which browser window is open
- What page we're currently on
- All the different pages it knows how to use

```typescript
// Think of this as the robot's notebook
export class PWWorld extends World {
  browser!: Browser;           // Which browser (Chrome, Firefox, etc.)
  page!: Page;                // Current webpage
  loginPage!: LoginPage;      // Knows how to use login page
  organizationPage!: OrganizationPage; // Knows how to use org page
  // ... and so on for each page
}
```

### Settings File (Environment Configuration)
This is like a settings menu - we can change:
- Which website to test (QA, Production, etc.)
- Login credentials
- Whether to show the browser window or run hidden

```typescript
// Our settings - easy to change without touching code
export const env = {
  baseUrl: "https://our-website.com/",     // Which website
  username: "george.parker",              // Test user
  password: "Password123#",               // Test password
  organization: "Quantum",                // Default organization
  location: "Quantum Services",           // Default location
};
```

**Why This Helps**:
- Test different environments (QA, Production) easily
- Change settings without changing code
- Use different login details for different tests

## The Four Layers Explained Simply

### Layer 1: Test Scenarios (What We Want to Test)
**Location**: `/features/*.feature`

These are written in plain English that anyone can read. **Each feature can map directly to a Keyword**:

```gherkin
# organization.feature - Maps to OrganizationKeywords
Feature: Organization Management

  @organization
  Scenario: Create a complete organization
    Given I am logged into the system
    When I create a complete organization with the following details:
      | name     | Acme Corporation        |
      | type     | Healthcare Provider     |
      | contact  | john.doe@acme.com      |
      | phone    | 555-0123               |
    Then the organization should be created successfully
    And I should see the organization in the system

  @organization  
  Scenario: Search and verify organization
    Given I am logged into the system
    When I search and verify organization "Acme Corporation"
    Then I should see complete organization details
    And all contact information should be verified

  @organization
  Scenario: Create organization and verify navigation
    Given I am logged into the system
    When I create organization with navigation verification:
      | name     | Test Organization       |
      | type     | Medical Equipment       |
      | contact  | test@example.com       |
    Then the organization should be created successfully
    And I should see all left navigation elements:
      | Profile            |
      | Locations          |
      | Staff Members      |
      | Supported Programs |
      | Attachments        |
      | Assignments        |
      | Roles              |
      | Forms              |
      | Notes              |
      | Letters            |
      | Service Events     |
      | Contracts          |
```

```gherkin
# smoke-test.feature - Maps to SmokeTestKeywords
Feature: Complete System Smoke Test

  @smoke
  Scenario: Run complete application smoke test
    Given I have valid login credentials
    When I run the complete smoke test
    Then all major system functions should work
    And I should see no critical errors
```

```gherkin
# user-management.feature - Maps to UserManagementKeywords
Feature: User Management Workflow

  @user-management
  Scenario: Complete user onboarding process
    Given I am an administrator
    When I complete the user onboarding for "Jane Smith"
    Then the user should have access to all required systems
    And all permissions should be properly configured
```

**Feature-to-Keyword Mapping**:
- **organization.feature** → **OrganizationKeywords** (handles org creation, search, verification)
- **smoke-test.feature** → **SmokeTestKeywords** (runs complete system test)
- **user-management.feature** → **UserManagementKeywords** (handles user workflows)
- **reporting.feature** → **ReportingKeywords** (handles report generation and validation)

**Why This is Great**:
- **One feature = One business area**: Each feature file focuses on one business domain
- **Direct mapping**: Feature scenarios directly call Keyword methods
- **Business-focused**: Features describe complete business processes
- **Easy to maintain**: Change business logic in Keywords, scenarios stay the same
- **Reusable workflows**: Same Keywords used across multiple scenarios

### Layer 2: Translators (Convert English to Code)
**Location**: `/src/steps/*.steps.ts`

These take the plain English and tell the computer what to do:

```typescript
// When someone writes "I login with username X and password Y"
// This code runs:
Given("I login with username {string} and password {string}", 
  async function (username, password) {
    const loginProcess = new LoginKeywords(this.page);
    await loginProcess.login(username, password);
  }
);
```

**What This Does**:
- **Translates**: Converts "I login" into actual code
- **Extracts info**: Gets the username and password from the sentence
- **Stays simple**: Just passes the work to the next layer
- **Reusable**: Same translation works for all login tests

### Layer 3: Workflows (Complete Business Processes)
**Location**: `/src/keywords/*.ts`

These know how to do complete business tasks that span multiple pages:

```typescript
// Keywords can use MULTIPLE pages to complete a business process
export class OrganizationKeywords {
  private loginPage: LoginPage;
  private organizationPage: OrganizationPage;
  private contactFormPage: ContactFormPage;
  private queriesPage: QueriesPage;
  
  constructor(private page: Page) {
    // One keyword can control many different pages
    this.loginPage = new LoginPage(page);
    this.organizationPage = new OrganizationPage(page);
    this.contactFormPage = new ContactFormPage(page);
    this.queriesPage = new QueriesPage(page);
  }
  
  // Complete workflow: Create organization from start to finish
  async createCompleteOrganization(orgData) {
    // Step 1: Navigate to organizations (using OrganizationPage)
    await this.organizationPage.navigateToOrganizations();
    
    // Step 2: Start new organization (using OrganizationPage)
    await this.organizationPage.clickAddNew();
    
    // Step 3: Fill organization form (using OrganizationPage)
    await this.organizationPage.fillOrganizationDetails(orgData);
    
    // Step 4: Handle validation (using OrganizationPage)
    await this.organizationPage.handleValidationErrors();
    
    // Step 5: Check for duplicates (using OrganizationPage)
    await this.organizationPage.reviewDuplicates();
    
    // Step 6: Verify contact info (using ContactFormPage)
    await this.contactFormPage.verifyContactDetails(orgData.contact);
    
    // Step 7: Run verification query (using QueriesPage)
    await this.queriesPage.runOrganizationVerificationQuery(orgData.name);
    
    // Step 8: Final creation (using OrganizationPage)
    await this.organizationPage.finalizeCreation();
    
    // Step 9: Verify left navigation after creation
    await this.organizationPage.verifyLeftNavigation();
  }
  
  // Workflow: Create organization and verify all navigation
  async createOrganizationWithNavVerification(orgData) {
    console.log('[ORG-KEYWORDS] Creating organization with navigation verification');
    
    // Create the organization
    await this.createCompleteOrganization(orgData);
    
    // Additional navigation verification
    await this.verifyAllNavigationElements();
    
    console.log('[ORG-KEYWORDS] Organization created and navigation verified');
  }
  
  private async verifyAllNavigationElements() {
    console.log('[ORG-KEYWORDS] Performing comprehensive navigation verification');
    
    const criticalNavElements = ['Profile', 'Locations', 'Staff Members', 'Forms'];
    
    // Click and verify critical navigation elements
    for (const element of criticalNavElements) {
      await this.organizationPage.clickNavigationElement(element);
      await this.page.waitForTimeout(1000);
    }
  }
  
  // Another workflow: Complete organization search and verification
  async searchAndVerifyOrganization(searchTerm) {
    // Uses OrganizationPage for search
    await this.organizationPage.searchOrganization(searchTerm);
    
    // Uses ContactFormPage to verify contact details
    await this.contactFormPage.verifySearchResults();
    
    // Uses QueriesPage to run detailed queries
    await this.queriesPage.runDetailedOrganizationQuery(searchTerm);
  }
}
```

**What Keywords Can Do**:
- **Cross-page workflows**: Navigate between multiple pages in one process
- **Business logic**: Handle complex decision-making and validation
- **Complete features**: Implement entire business features from start to finish
- **Reusable processes**: Same workflow used across different test scenarios
- **Error handling**: Manage errors that span multiple pages

**Real Example - Complete Smoke Test Workflow**:
```typescript
export class SmokeTestKeywords {
  private loginPage: LoginPage;
  private administrationPage: AdministrationPage;
  private contactFormPage: ContactFormPage;
  private queriesPage: QueriesPage;
  
  // One keyword method that tests the entire application flow
  async runCompleteSmokeTest(credentials) {
    // Login process (LoginPage)
    await this.loginPage.completeLogin(credentials);
    
    // Verify dashboard (AdministrationPage)
    await this.administrationPage.verifyDashboardLoaded();
    
    // Check admin sections (AdministrationPage)
    await this.administrationPage.verifyAllSections();
    
    // Test contact forms (ContactFormPage)
    await this.contactFormPage.verifyContactFormFunctionality();
    
    // Test queries (QueriesPage)
    await this.queriesPage.runBasicQueries();
    
    // Return to dashboard (AdministrationPage)
    await this.administrationPage.returnToDashboard();
  }
}
```

### Layer 4: Page Actions (Individual Button Clicks)
**Location**: `/src/pages/*.ts`

These know how to interact with specific parts of web pages:

```typescript
// This knows how to interact with the Login Page specifically
export class LoginPage {
  
  async enterCredentials(username, password) {
    console.log(`Typing username: ${username}`);
    
    // Find the username box and type in it
    const usernameBox = this.page.locator("input#signInFormUsername");
    await usernameBox.waitFor({ state: 'visible' }); // Wait for it to appear
    await usernameBox.fill(username);                // Type the username
    
    // Find the password box and type in it
    const passwordBox = this.page.locator("input#signInFormPassword");
    await passwordBox.fill(password);                // Type the password
    
    // Take a screenshot for our records
    await this.page.screenshot({ path: 'screenshots/login-filled.png' });
    
    console.log('Username and password entered successfully');
  }
  
  async clickSignIn() {
    // Find the Sign In button and click it
    const signInButton = this.page.locator("input[aria-label='submit']");
    await signInButton.click();
    console.log('Sign In button clicked');
  }
}
```

**What This Does**:
- **Finds elements**: Locates buttons, text boxes, dropdowns on the page
- **Simple actions**: Click, type, select - one thing at a time
- **Takes screenshots**: Visual proof of what happened
- **Waits patiently**: Waits for things to load before clicking
- **Logs everything**: Tells us exactly what it's doing

## Smart Features That Make Testing Better

### Automatic Screenshots
Like taking photos of everything the robot does:
- **Before and after**: Pictures of each important step
- **When things go wrong**: Visual proof of what happened
- **Organized by date**: Each test run gets its own folder
- **Easy to review**: See exactly what the robot saw

### Smart Error Handling
The robot is patient and tries multiple times:

```typescript
// If a button doesn't appear right away, try 3 times
async handleAcknowledgeButton(maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    
    // Wait 2 seconds for things to load
    await this.page.waitForTimeout(2000);
    
    // Look for the "Acknowledge" button
    const ackButton = this.page.locator("button").filter({ hasText: /acknowledge/i });
    
    // If we found it, click it
    if (await ackButton.count() > 0) {
      await ackButton.first().click();
      console.log('Acknowledge button clicked successfully');
      return; // Success! We're done
    }
    
    console.log(`Attempt ${attempt + 1}: Acknowledge button not found, trying again...`);
  }
}
```

**Why This Helps**:
- **Handles slow websites**: Waits for things to load
- **Deals with popups**: Finds and clicks acknowledgment buttons
- **Doesn't give up easily**: Tries multiple times before failing
- **Tells us what happened**: Detailed logs of each attempt

## How to Run the Tests

### Simple Commands
```bash
# Test everything
npm run test

# Test just the important stuff (smoke test)
npm run test:smoke

# Test on QA environment
npm run test:qa

# Test organization features only
npm run test:org
```

### What Happens When Tests Run
1. **Setup**: Robot opens a browser
2. **Execute**: Robot follows the test steps
3. **Screenshots**: Takes pictures at each step
4. **Results**: Creates a report showing what passed/failed
5. **Cleanup**: Closes the browser

## Test Reports

After tests run, you get:
- **HTML Report**: Pretty webpage showing results
- **Screenshots**: Visual evidence of each step
- **Logs**: Detailed information about what happened
- **Pass/Fail Summary**: Quick overview of results

## Benefits of This Approach

### For Business People
- **Read tests in plain English**: No technical jargon
- **Understand what's being tested**: Clear scenarios
- **Request new tests easily**: Just describe what you want tested
- **See visual proof**: Screenshots show exactly what happened

### For Developers
- **Easy to maintain**: Change one place, fix everywhere
- **Fast to add new tests**: Reuse existing components
- **Clear structure**: Know exactly where to find things
- **Reliable results**: Smart error handling reduces false failures

### For Everyone
- **Catch bugs early**: Find problems before users do
- **Save time**: No manual testing needed
- **Build confidence**: Know that changes don't break things
- **Document behavior**: Tests show how the system should work

## Summary

This testing system is like having a very patient, thorough employee who:
- Never gets tired of clicking the same buttons
- Takes detailed notes and photos of everything
- Works nights and weekends
- Catches problems before customers see them
- Speaks both "business language" and "computer language"

The result: Better software, fewer bugs, and more confidence in our releases.