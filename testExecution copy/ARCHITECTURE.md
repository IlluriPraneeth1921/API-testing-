# BDD Framework Architecture - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Feature Files](#feature-files)
3. [Step Definitions](#step-definitions)
4. [Keywords Layer](#keywords-layer)
5. [Page Objects](#page-objects)
6. [Architecture Flow](#architecture-flow)
7. [Benefits](#benefits)

---

## Overview

This framework follows a **Three-Layer Architecture** pattern for BDD test automation:

```
Feature Files (Gherkin)
    ↓
Step Definitions (Glue Code)
    ↓
Keywords (Business Logic)
    ↓
Page Objects (UI Interactions)
    ↓
Playwright (Browser Automation)
```

**Purpose**: Separate concerns, improve maintainability, and enable non-technical stakeholders to understand tests.

---

## Feature Files

**Location**: `/features/*.feature`

**Purpose**: 
- Define test scenarios in plain English using Gherkin syntax
- Enable collaboration between business analysts, QA, and developers
- Serve as living documentation of application behavior
- Make tests readable by non-technical stakeholders

**Example**:
```gherkin
Feature: Organization Management
  
  Scenario: Create new organization with validation
    Given I login with username "admin" and password "password"
    When I navigate to Organizations
    And I click Add New Organization
    Then I should see validation errors for required fields
```

**Why Gherkin?**
- **Business-readable**: Anyone can understand what's being tested
- **Reusable steps**: Same step can be used across multiple scenarios
- **Documentation**: Features describe actual business requirements
- **Traceability**: Link tests directly to requirements

---

## Step Definitions

**Location**: `/src/steps/*.steps.ts`

**Purpose**:
- Map Gherkin steps to executable TypeScript code
- Act as the "glue" between feature files and implementation
- Keep logic minimal - delegate to Keywords or Page Objects
- Provide type-safe access to shared context (PWWorld)

**Example**:
```typescript
Given("I login with username {string} and password {string}", 
  async function (this: PWWorld, username: string, password: string) {
    const kw = new LoginKeywords(this.page);
    await kw.login(username, password);
  }
);
```

**Key Responsibilities**:
1. **Parameter extraction**: Get values from Gherkin steps
2. **Instantiation**: Create Keywords or Page Object instances
3. **Delegation**: Call appropriate methods from lower layers
4. **Context management**: Access shared state via `this.page`, `this.browser`

**Why Step Definitions?**
- **Decoupling**: Separate test intent from implementation
- **Reusability**: One step definition can be used in multiple scenarios
- **Maintainability**: Change implementation without changing feature files
- **Type safety**: TypeScript ensures correct parameter types

---

## Keywords Layer

**Location**: `/src/keywords/*.ts`

**Purpose**:
- Encapsulate complex business workflows
- Orchestrate multiple page object calls
- Implement business logic and validation rules
- Provide high-level test actions

**Example**:
```typescript
export class LoginKeywords {
  private loginPage: LoginPage;
  
  constructor(private page: Page) {
    this.loginPage = new LoginPage(page);
  }
  
  async login(username: string, password: string) {
    await this.loginPage.open();
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

**Key Responsibilities**:
1. **Workflow orchestration**: Combine multiple page actions into business flows
2. **Business logic**: Implement conditional logic based on business rules
3. **Data management**: Handle test data and state
4. **Abstraction**: Hide implementation details from step definitions

**When to Use Keywords?**
- ✅ Multi-step business workflows (e.g., complete login flow)
- ✅ Complex scenarios requiring multiple page interactions
- ✅ Business logic that spans multiple pages
- ✅ Reusable high-level actions

**When NOT to Use Keywords?**
- ❌ Simple single-page actions (use Page Objects directly)
- ❌ Pure UI interactions (belongs in Page Objects)

---

## Page Objects

**Location**: `/src/pages/*.ts`

**Purpose**:
- Encapsulate UI elements and interactions for a specific page
- Provide atomic, reusable actions
- Hide locator details from higher layers
- Centralize element selectors for easy maintenance

**Example**:
```typescript
export class LoginPage {
  constructor(private page: Page) {}
  
  async open() {
    await this.page.goto(env.baseUrl);
    await this.page.screenshot({ path: 'screenshots/login.png' });
  }
  
  async enterCredentials(username: string, password: string) {
    await this.page.locator("input#signInFormUsername").fill(username);
    await this.page.locator("input#signInFormPassword").fill(password);
  }
  
  async clickSignIn() {
    await this.page.locator("input[aria-label='submit']").click();
  }
}
```

**Key Responsibilities**:
1. **Element location**: Define and manage locators
2. **Atomic actions**: Provide single-purpose methods (click, fill, verify)
3. **Wait strategies**: Handle element visibility and loading states
4. **Screenshots**: Capture visual evidence at key points
5. **Encapsulation**: Hide implementation details

**Best Practices**:
- ✅ One class per page/component
- ✅ Methods should be atomic (do one thing)
- ✅ Return values for chaining or assertions
- ✅ Use descriptive method names
- ✅ Keep locators private

**Why Page Objects?**
- **Maintainability**: Change locator in one place
- **Reusability**: Same action used across multiple tests
- **Readability**: `loginPage.clickSignIn()` vs `page.locator(...).click()`
- **DRY principle**: Don't repeat locators

---

## Architecture Flow

### Example: Login Test Flow

**1. Feature File** (What to test)
```gherkin
Given I login with username "admin" and password "pass123"
```

**2. Step Definition** (Glue layer)
```typescript
Given("I login with username {string} and password {string}", 
  async function (this: PWWorld, user: string, pass: string) {
    const kw = new LoginKeywords(this.page);
    await kw.login(user, pass);
  }
);
```

**3. Keywords** (Business workflow)
```typescript
async login(username: string, password: string) {
  await this.loginPage.open();
  await this.loginPage.enterCredentials(username, password);
  await this.loginPage.clickSignIn();
  await this.loginPage.selectOrganization(env.organization);
  await this.loginPage.clickLogin();
}
```

**4. Page Objects** (UI interactions)
```typescript
async enterCredentials(username: string, password: string) {
  await this.page.locator("#username").fill(username);
  await this.page.locator("#password").fill(password);
}
```

**5. Playwright** (Browser automation)
```typescript
await page.locator("#username").fill("admin");
```

---

## Benefits

### 1. **Separation of Concerns**
- Feature files: Business requirements
- Step definitions: Test orchestration
- Keywords: Business logic
- Page objects: UI interactions

### 2. **Maintainability**
- UI changes: Update only Page Objects
- Business logic changes: Update only Keywords
- Test scenarios: Update only Feature files
- No cascading changes across layers

### 3. **Reusability**
- Same step definitions across multiple scenarios
- Same keywords for different test suites
- Same page objects for different workflows

### 4. **Readability**
- Non-technical stakeholders can read feature files
- Developers understand clear separation of layers
- New team members onboard faster

### 5. **Testability**
- Each layer can be tested independently
- Mock lower layers for unit testing
- Integration testing at any layer

### 6. **Scalability**
- Add new features without affecting existing code
- Parallel test execution
- Easy to extend with new pages/keywords

---

## Quick Reference

| Layer | Purpose | Example |
|-------|---------|---------|
| **Feature Files** | Define WHAT to test | `Given I login with valid credentials` |
| **Step Definitions** | Map Gherkin to code | `Given("I login...", async function() {...})` |
| **Keywords** | Implement business workflows | `async login() { open(); enter(); click(); }` |
| **Page Objects** | Interact with UI elements | `async clickSignIn() { locator.click(); }` |

---

## When to Use Each Layer

### Use Feature Files when:
- Defining new test scenarios
- Documenting business requirements
- Collaborating with non-technical stakeholders

### Use Step Definitions when:
- Mapping Gherkin steps to code
- Extracting parameters from steps
- Accessing shared test context

### Use Keywords when:
- Implementing multi-step workflows
- Orchestrating multiple page interactions
- Adding business logic to tests

### Use Page Objects when:
- Interacting with UI elements
- Defining element locators
- Implementing atomic page actions

---

## Summary

This three-layer architecture provides:
- ✅ Clear separation of concerns
- ✅ High maintainability
- ✅ Maximum reusability
- ✅ Business-readable tests
- ✅ Easy scalability
- ✅ Type-safe implementation

**Result**: A robust, maintainable, and scalable test automation framework that bridges the gap between business requirements and technical implementation.
