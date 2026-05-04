# Blue Compass Test Automation Framework

Playwright + Cucumber BDD framework for Blue Compass application testing.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run smoke test
npm run test:smoke

# Run specific TC
npm run test:tc556255

# Run by tag
npx cucumber-js --tags @bulk-assignment
```

---

## Project Structure

```
src/
├── config/
│   └── env.ts                  ← Environment, Waits, TestData (START HERE)
├── locators/
│   ├── index.ts                ← Exports all locators
│   ├── common.locators.ts      ← Shared Angular Material components
│   └── [module].locators.ts    ← Screen-specific locators per module
├── pages/
│   ├── [Module]ListPage.ts     ← Grid, action buttons, row selection
│   ├── [Module]SearchPage.ts   ← Search/filter panel, dropdowns
│   └── [Module]ModalPage.ts    ← Dialog forms, confirmation
├── steps/
│   └── [module].steps.ts       ← Cucumber step definitions
├── utils/
│   ├── dropdown-helper.ts      ← Autocomplete dropdown utility
│   └── html-capture.ts         ← HTML capture for locator discovery
└── hooks/
    └── hooks.ts                ← Before/After hooks, browser setup
features/
└── [module]-[tc].feature       ← Gherkin feature files
```

---

## How to Automate a New Test Case

### Step 1: Prepare

1. Read `RULES.md` - all coding standards
2. Read `AUTOMATION_PROMPT.md` - prompt template
3. Get the TC steps (from test management tool or document)
4. You do NOT need to provide HTML - Kiro captures it automatically

### Step 2: Use the Prompt

Copy the template from `AUTOMATION_PROMPT.md`, fill in:
- TC number and module name
- TC steps (paste from test management tool)

Paste into Kiro chat. Kiro will:
1. Create a minimal navigation step with HTML capture calls
2. Run the test to capture screen HTML
3. Read the captured HTML to extract locators
4. Build the full automation (locators → pages → steps → feature)
5. Run again to verify
6. Remove capture calls once stable

### Step 3: What Gets Created

For a module called `person-search` with TC `TC789012`:

| File | Purpose |
|------|---------|
| `src/locators/person-search.locators.ts` | Screen-specific locators |
| `src/pages/PersonSearchListPage.ts` | Grid and results |
| `src/pages/PersonSearchSearchPage.ts` | Search filters |
| `src/pages/PersonSearchModalPage.ts` | Dialogs (if any) |
| `src/steps/person-search.steps.ts` | Step definitions |
| `features/person-search-tc789012.feature` | Feature file |
| `src/config/env.ts` | TestData section added |

### Step 4: Verify

Run `VERIFICATION_CHECKLIST.md` against your output:

```bash
# Compile check
npx tsc --noEmit

# Run the TC
npx cucumber-js --tags @TC789012

# Check for hardcoded values
grep -rn "waitForTimeout([0-9]" src/steps/person-search.steps.ts
grep -rn "locator('" src/pages/PersonSearch*.ts | grep -v "Locators\."
```

---

## Configuration

### Environment Files

| File | Environment |
|------|-------------|
| `.env` | Active environment (edit this) |
| `.env.std-f1` | STD-F1 reference |
| `.env.qa` | QA reference |

### Wait Configuration (in .env)

```env
WAIT_MIN=500          # UI transitions
WAIT_AVG=2000         # Dropdown populate, panel open
WAIT_MAX=5000         # Page load, search results
WAIT_ELEMENT_TIMEOUT=10000  # Element visibility
WAIT_TYPE_DELAY=150   # Autocomplete keystroke delay
```

### Test Data (in .env)

```env
BA_QUERY_TYPE=Has No Staff    # Bulk Assignment query type
```

---

## Key Patterns

### Dropdown Selection (Angular Material Autocomplete)

```typescript
import { DropdownHelper } from '@src/utils/dropdown-helper';

const dropdown = new DropdownHelper(page);

// Type and select specific value
await dropdown.selectAutocompleteValue('[aria-label="Query Type"]', 'Has No Staff');

// Select first available option
await dropdown.selectFirstAutocompleteOption('[aria-label="Location"]');
```

### Stacked Dialogs

When the app shows confirmation on top of the form dialog:

```typescript
// Always use .last() for buttons in stacked dialogs
await page.locator(CommonLocators.continueBtn).last().click();
await page.locator(CommonLocators.closeBtn).last().click();
```

### Cascading Dropdowns

Some screens have dropdowns that appear after selecting a previous one:

```typescript
// Select 1st → wait → Select 2nd → wait → Select 3rd
await dropdown.selectAutocompleteValue(locator1, value);
await page.waitForTimeout(Waits.AVG);  // Wait for next dropdown to appear
await dropdown.selectFirstAutocompleteOption(locator2);
await page.waitForTimeout(Waits.AVG);
await dropdown.selectFirstAutocompleteOption(locator3);
```

### Self-Service HTML Capture (Locator Discovery)

Kiro captures HTML automatically during test runs to discover locators:

```typescript
import { captureInteractiveElements } from '@src/utils/html-capture';

// Capture main page elements
await captureInteractiveElements(page, 'module-main-page');

// Capture after opening a panel (reveals hidden fields)
await searchPage.openPanel();
await captureInteractiveElements(page, 'module-search-panel');

// Capture modal content (reveals form fields)
await listPage.clickAction();
await captureInteractiveElements(page, 'module-modal');
```

Captures save to `reports/html-captures/` as HTML tables showing:
- Tag, ID, aria-label, title, role, formcontrolname, text, and raw HTML

Kiro reads these files, extracts locators, cross-references with CommonLocators,
and adds only screen-specific ones to the module locator file.
Once locators are stable, capture calls are removed from the final code.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `KATALON_MIGRATION_GUIDE.md` | **START HERE for new module migrations** — process, mapping tables, rules, reusable prompt |
| `RULES.md` | All coding standards and conventions |
| `AUTOMATION_PROMPT.md` | Prompt template for new TC automation (non-migration) |
| `VERIFICATION_CHECKLIST.md` | Post-automation quality checklist |
| `PROMPT_GUIDE.md` | Detailed prompt examples and tips |
| `.kiro/steering/test-automation-standards.md` | Auto-loaded Kiro rules |

---

## Commands

```bash
npm run test:smoke        # Smoke tests
npm run test:tc556255     # TC556255 specifically
npm run test              # All tests
npm run verify:locators   # Check locator usage
npx tsc --noEmit          # TypeScript compile check
```
