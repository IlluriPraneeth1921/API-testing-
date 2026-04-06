# Blue Compass Test Automation Framework

Playwright + Cucumber BDD test automation framework for Blue Compass (Angular 17.3.11).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run smoke test
npm run test:smoke

# Run all tests
npm run test

# Run specific test suites
npm run test:organization
npm run test:navigation
npm run test:queries
```

## 📁 Project Structure

```
src/
├── locators/           # 🎯 Centralized Locator Registry
│   ├── index.ts        # Re-exports all locators
│   ├── common.locators.ts    # ⭐ Shared Angular Material components
│   ├── header.locators.ts    # Header/navigation bar
│   ├── navigation.locators.ts # Left sidebar & menus
│   ├── table.locators.ts     # Data tables & pagination
│   ├── forms.locators.ts     # Form inputs & validation
│   ├── search.locators.ts    # Search functionality
│   └── login.locators.ts     # Login page specific
├── pages/              # Page Object classes
├── steps/              # Cucumber step definitions
├── keywords/           # Reusable action keywords
├── config/             # Environment configuration
├── hooks/              # Test hooks (before/after)
└── utils/              # Utility functions

features/               # Cucumber feature files
reports/                # Test reports & screenshots
```

## 🎯 Centralized Locator Registry

All element selectors are centralized in `src/locators/` to:

1. **Isolate upgrade changes** - When Angular/Pillar upgrades happen, update locators in ONE place
2. **Single source of truth** - Easy to audit and maintain
3. **Type safety** - TypeScript autocomplete and compile-time checking

### Locator Priority (Stability Ranking)

| Priority | Selector Type | Stability | Example |
|----------|--------------|-----------|---------|
| 1 | `aria-label` | ⭐ HIGHEST | `[aria-label='Search']` |
| 2 | `id` | HIGH | `#search-input` |
| 3 | `role` | HIGH | `[role="button"]` |
| 4 | `mat-column-*` | HIGH | `.mat-column-firstName` |
| 5 | text-based | MEDIUM | `button:has-text('Save')` |
| 6 | CSS classes | MEDIUM | `.primary-button` |
| 7 | positional | ⚠️ LOW | `.nth(0)` - AVOID |

### Usage in Page Objects

```typescript
import { HeaderLocators, TableLocators } from "@src/locators";

// Use centralized locators
const adminTab = this.page.locator(HeaderLocators.administrationTab);
const dataTable = this.page.locator(TableLocators.table);
```

## 🔄 Handling Angular/Pillar Upgrades

When framework upgrades break selectors:

1. **First**: Update `common.locators.ts` (affects all screens)
2. **Then**: Update component-specific locator files as needed
3. **Verify**: Run `npm run test:smoke`

### Example: Angular Material Table Upgrade

```typescript
// Before (in common.locators.ts)
matTable: 'mat-table[role="table"]',

// After upgrade (only change here)
matTable: 'mat-table[role="grid"]',  // New Angular Material version
```

All Page Objects automatically use the updated selector!

## 📊 Test Reports

Reports are generated in `reports/{timestamp}/`:
- `test-report.html` - HTML test report
- `screenshots/` - Step-by-step screenshots

## 🧪 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests |
| `npm run test:smoke` | Run smoke tests |
| `npm run test:organization` | Organization tests |
| `npm run test:navigation` | Navigation tests |
| `npm run test:qa` | Run with QA environment |
| `npm run test:std-f1` | Run with STD-F1 environment |

## 🔧 Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
BASE_URL=https://your-environment.com
USERNAME=your-username
PASSWORD=your-password
ORGANIZATION=your-org
```

## 📝 Adding New Tests

### 1. Create Locators First

```typescript
// src/locators/new-feature.locators.ts
export const NewFeatureLocators = {
  submitBtn: "[aria-label='Submit']",
  nameInput: "#name-field",
} as const;
```

### 2. Export in Index

```typescript
// src/locators/index.ts
export { NewFeatureLocators } from './new-feature.locators';
```

### 3. Create Page Object

```typescript
// src/pages/NewFeaturePage.ts
import { NewFeatureLocators } from "@src/locators";

export class NewFeaturePage {
  constructor(private page: Page) {}
  
  async submit() {
    await this.page.locator(NewFeatureLocators.submitBtn).click();
  }
}
```

### 4. Write Feature & Steps

```gherkin
# features/new-feature.feature
@new-feature
Scenario: Test new feature
  Given I navigate to new feature
  When I submit the form
  Then I should see success message
```

## 🛠️ Generating Locators for New Screens

### Option 1: Playwright Codegen (Recommended)

```bash
npx playwright codegen https://your-app-url.com
```

Records your interactions and generates selectors automatically.

### Option 2: Browser Console Script

Paste in DevTools to extract all interactive elements:

```javascript
const elements = document.querySelectorAll('button, input, a, [role], [aria-label]');
const selectors = Array.from(elements).map(el => ({
  tag: el.tagName,
  ariaLabel: el.getAttribute('aria-label'),
  id: el.id,
  role: el.getAttribute('role'),
  text: el.textContent?.trim().substring(0, 30)
}));
console.table(selectors);
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Quick start guide (this file) |
| `RULES.md` | ⭐ **All coding rules and standards** |
| `PROMPT_GUIDE.md` | ⭐ **How to prompt AI for new tests** |
| `IMPLEMENTATION_SUMMARY.md` | Technical implementation details |
| `CONVERSATION_LOG.md` | Development history |
| `NEXT_SESSION_TODO.md` | Upcoming tasks (Screen Generator tool) |

## Spec Documents

- Requirements: `.kiro/specs/test-automation-improvement/requirements.md`
- Design: `.kiro/specs/test-automation-improvement/design.md`

## 🔒 Original Backup

The original framework is preserved in `katalon-to-playwright/testExecution/` (untouched).
All improvements are in this `testExecution copy/` folder.

---

**Last Updated**: April 3, 2026
**Smoke Test Status**: ✅ PASSING (25/25 steps)
