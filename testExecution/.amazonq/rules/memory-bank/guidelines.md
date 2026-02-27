# Development Guidelines

## Code Quality Standards

### File Organization
- **TypeScript files**: Use `.ts` extension for all source files
- **Configuration files**: Use `.js` for root-level config (cucumber.js) and `.ts` for src config files
- **Feature files**: Use `.feature` extension with Gherkin syntax in `/features` directory
- **Imports**: Use path aliases `@src/*` for cleaner imports instead of relative paths

### Naming Conventions
- **Classes**: PascalCase (e.g., `LoginPage`, `PWWorld`, `LoginKeywords`)
- **Files**: Match class names (e.g., `LoginPage` class in `LoginPages.ts`)
- **Functions**: camelCase (e.g., `launchBrowser`, `getRunTimestamp`)
- **Constants**: camelCase for objects (e.g., `env`), SCREAMING_SNAKE_CASE for true constants
- **Private fields**: Prefix with `private` keyword (e.g., `private page: Page`)

### Code Formatting
- **Line endings**: CRLF (Windows style) - 100% of files use `\r\n`
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Always use semicolons at end of statements
- **Quotes**: Use double quotes for strings
- **Trailing commas**: Not required in objects/arrays

### TypeScript Standards
- **Strict mode**: Enabled - always use proper typing
- **Type annotations**: Use explicit types for function parameters and class properties
- **Type imports**: Use `import type` for type-only imports (e.g., `import type { Page } from "playwright"`)
- **Definite assignment**: Use `!` operator for properties initialized in hooks (e.g., `browser!: Browser`)
- **Async/await**: Always use async/await for asynchronous operations, never use `.then()` chains

## Architectural Patterns

### Three-Layer Architecture
This codebase follows a strict three-layer pattern:

**Layer 1: Step Definitions** (`/src/steps`)
- Map Gherkin steps to code
- Use `this: PWWorld` for type-safe context access
- Instantiate Keywords or Page Objects
- Keep logic minimal - delegate to lower layers

**Layer 2: Keywords** (`/src/keywords`)
- Business logic layer for complex workflows
- Orchestrate multiple page object calls
- Example: LoginKeywords orchestrates entire login flow

**Layer 3: Page Objects** (`/src/pages`)
- UI interaction layer
- Encapsulate element locators and actions
- One class per page/component
- Methods should be atomic actions

### Cucumber World Pattern
```typescript
// Always extend World class
export class PWWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  // Page object instances
  loginPage!: LoginPage;
}

// Use 'this: PWWorld' in step definitions
Given("step text", async function (this: PWWorld) {
  // Access shared state via this.page, this.browser, etc.
});
```

### Page Object Implementation Pattern
```typescript
export class PageName {
  constructor(private page: Page) {}
  
  async actionMethod() {
    const element = this.page.locator("selector");
    await element.click();
  }
}
```

### Keyword Implementation Pattern
```typescript
export class FeatureKeywords {
  private pageObject: PageClass;
  
  constructor(private page: Page) {
    this.pageObject = new PageClass(page);
  }
  
  async businessAction() {
    await this.pageObject.action1();
    await this.pageObject.action2();
  }
}
```

## Common Implementation Patterns

### Environment Configuration (5/5 files)
```typescript
import { env } from "@src/config/env";

// Access configuration values
const url = env.baseUrl;
const headless = env.headless;
```

### Browser Initialization (3/5 files)
```typescript
// In hooks.ts
Before(async function (this: PWWorld) {
  this.browser = await launchBrowser();
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
});

After(async function (this: PWWorld) {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});
```

### Screenshot Capture Pattern (3/5 files)
```typescript
// Automatic on failure
if (scenario.result?.status === Status.FAILED) {
  const png = await this.page.screenshot({ fullPage: true });
  await this.attach(png, "image/png");
}

// Manual with timestamped directory
const timestamp = getRunTimestamp();
await this.page.screenshot({ 
  path: `reports/${timestamp}/screenshots/step-name.png` 
});
```

### Timeout Management (4/5 files)
```typescript
// Global timeout in cucumber-timeout.ts
setDefaultTimeout(120 * 1000); // 120 seconds

// Element-specific timeouts
await element.waitFor({ state: 'visible', timeout: 30000 });
await this.page.waitForTimeout(2000); // Fixed delays
```

### Singleton Pattern for Timestamps (2/5 files)
```typescript
// Ensures consistent timestamp across test run
let runTimestamp: string | null = null;

export const getRunTimestamp = () => {
  if (!runTimestamp) {
    runTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }
  return runTimestamp;
};
```

### Dynamic Imports in Steps (2/5 files)
```typescript
// Lazy load page objects when needed
When("step text", async function (this: PWWorld) {
  const { ContactFormPage } = await import("@src/pages/ContactFormPage");
  const page = new ContactFormPage(this.page);
  await page.method();
});
```

### Conditional Page Object Initialization (1/5 files)
```typescript
// Initialize only if not already created
if (!this.organizationPage) {
  this.organizationPage = new OrganizationPage(this.page);
}
```

## Playwright-Specific Patterns

### Locator Strategies
```typescript
// Attribute selectors
this.page.locator("[aria-label='primary-layout-header-container']")

// Text matching
this.page.locator("span:text-is('Organization')") // Exact match
this.page.locator("button").filter({ hasText: /log in/i }) // Regex

// Input types
this.page.locator("input#signInFormUsername")
this.page.locator("input[role='combobox']")

// Nth element
this.page.locator("selector").nth(1)
this.page.locator("selector").first()
```

### Wait Strategies
```typescript
// Wait for element state
await element.waitFor({ state: 'visible', timeout: 30000 });

// Wait for navigation
await this.page.goto(url, { waitUntil: "domcontentloaded" });
await this.page.waitForLoadState('networkidle', { timeout: 30000 });

// Fixed delays (use sparingly)
await this.page.waitForTimeout(2000);
```

### Assertions
```typescript
import { expect } from "@playwright/test";

await expect(element).toBeVisible();
await expect(this.page).toHaveURL(/pattern/, { timeout: 10000 });
```

## Testing Best Practices

### Console Logging Pattern (5/5 files)
```typescript
// Use descriptive prefixes for log organization
console.log('[LOGIN] Opening URL: ${url}');
console.log('[LOGIN] Credentials entered');
console.log('✅ HTML Report: ${reportPath}/index.html');
```

### Error Handling
```typescript
// Graceful fallback with catch
if (await element.isVisible().catch(() => false)) {
  // Handle element
}

// Retry logic with loops
for (let attempt = 0; attempt < maxRetries; attempt++) {
  // Retry logic
}
```

### File System Operations (2/5 files)
```typescript
import * as fs from "fs";

// Check existence before operations
if (!fs.existsSync(path)) {
  fs.mkdirSync(path, { recursive: true });
}

// Read and parse JSON
const fileContent = fs.readFileSync(jsonPath, "utf8").trim();
const jsonData = JSON.parse(fileContent);
```

### Report Generation Pattern (1/5 files)
```typescript
// Generate timestamped reports
const timestamp = getRunTimestamp();
const reportPath = `reports/${timestamp}`;

// Copy artifacts to report directory
fs.copyFileSync(jsonPath, `${reportPath}/cucumber-report.json`);

// Generate HTML report
reporter.generate({
  jsonDir: reportPath,
  reportPath: reportPath,
  openReportInBrowser: true
});
```

## Configuration Patterns

### Module Exports (2/5 files)
```typescript
// CommonJS for config files
module.exports = {
  default: {
    require: ["src/config/**/*.ts"],
    requireModule: ["ts-node/register"]
  }
};
```

### Environment Variables (2/5 files)
```typescript
import * as dotenv from "dotenv";
dotenv.config();

export const env = {
  baseUrl: process.env.BASE_URL || "default-value",
  headless: (process.env.HEADLESS || "true") === "true"
};
```

### Cucumber Configuration
```typescript
// Load timeout config first
require: [
  "src/config/cucumber-timeout.ts",
  "src/hooks/**/*.ts",
  "src/steps/**/*.ts"
]

// Enable TypeScript support
requireModule: ["ts-node/register", "tsconfig-paths/register"]
```

## Anti-Patterns to Avoid

- **Don't** use relative imports when path aliases are available
- **Don't** put business logic in step definitions - use Keywords layer
- **Don't** put UI interactions in Keywords - use Page Objects
- **Don't** create new browser instances per step - reuse from World
- **Don't** use hardcoded waits without trying element-specific waits first
- **Don't** forget to close browser/context/page in After hooks
- **Don't** skip screenshot capture on failures
- **Don't** use single quotes for strings (use double quotes)
- **Don't** omit semicolons
- **Don't** use `any` type - always provide proper TypeScript types
