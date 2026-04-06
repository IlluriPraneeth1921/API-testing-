# Project Structure

## Directory Organization

### `/features`
Contains Gherkin feature files written in BDD syntax describing test scenarios:
- `organization.feature` - Organization management test scenarios
- `smoke.feature` - Critical smoke test scenarios

### `/src`
Main source code directory organized by responsibility:

#### `/src/config`
Configuration files for test framework setup:
- `cucumber-timeout.ts` - Timeout configurations for Cucumber steps
- `env.ts` - Environment variable management and configuration

#### `/src/core`
Core framework components:
- `browser.ts` - Browser initialization and management using Playwright
- `world.ts` - Cucumber World object for sharing state across steps

#### `/src/hooks`
Cucumber lifecycle hooks:
- `hooks.ts` - Before/After hooks for test setup and teardown

#### `/src/keywords`
Keyword-driven test actions (business logic layer):
- `AdministrationKeywords.ts` - Administration-related test actions
- `CommonKeywords.ts` - Shared/reusable test actions
- `LoginKeywords.ts` - Login-related test actions

#### `/src/pages`
Page Object Model implementations:
- `AdministrationPage.ts` - Administration page elements and interactions
- `ContactFormPage.ts` - Contact form page elements
- `LoginPages.ts` - Login page elements and interactions
- `OrganizationPage.ts` - Organization page elements
- `QueriesPage.ts` - Queries page elements

#### `/src/steps`
Cucumber step definitions mapping Gherkin to code:
- `login.steps.ts` - Login scenario step implementations
- `organization.steps.ts` - Organization scenario step implementations

#### `/src/utils`
Utility functions:
- `generateReport.ts` - HTML report generation logic
- `timestamp.ts` - Timestamp utilities for report naming

### `/reports`
Test execution reports with timestamped directories containing:
- HTML reports with test results
- Screenshots captured during test execution
- JSON reports for programmatic access

## Core Components and Relationships

```
Feature Files (Gherkin)
    ↓
Step Definitions (/src/steps)
    ↓
Keywords (/src/keywords) - Business Logic Layer
    ↓
Page Objects (/src/pages) - UI Interaction Layer
    ↓
Browser Core (/src/core/browser.ts)
    ↓
Playwright
```

## Architectural Patterns

### Page Object Model (POM)
Encapsulates page-specific elements and interactions in dedicated classes, promoting reusability and maintainability.

### Keyword-Driven Framework
Abstracts business logic into keyword classes, separating test intent from implementation details.

### Cucumber World Pattern
Uses Cucumber's World object to share state (browser, page instances) across step definitions.

### Environment-Based Configuration
Supports multiple environments through .env files (.env.qa, .env.std-f1) for flexible test execution.

### Timestamped Reporting
Generates unique report directories using ISO timestamps to preserve historical test results.
