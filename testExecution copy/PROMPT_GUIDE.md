# Prompt Guide: Generating New Screen Automation

This guide shows how to generate test automation for new screens in Blue Compass.

---

## Option 1: Automated Workflow Script (RECOMMENDED)

The fastest way to generate automation for a new screen:

### Interactive Mode
```bash
npm run generate:automation
```

This will:
1. Ask for screen name
2. Ask how to scan (HTML file or live URL)
3. Scan the page for elements
4. Show duplicates with CommonLocators and ask for approval
5. Move approved locators to CommonLocators
6. Generate locator file, page object, and feature file
7. Update index exports
8. Run verification

### Command Line Mode
```bash
# From HTML file
npm run generate:automation -- --name "PersonSearch" --html "./temp/page.html"

# From live URL (browser opens for login)
npm run generate:automation -- --name "PersonSearch" --url "/persons/search"
```

### Workflow Steps

| Step | What Happens | User Action |
|------|--------------|-------------|
| 1 | Scans screen for elements | Wait for scan |
| 2 | **TC VALIDATION** - Analyzes TCs against HTML | **Review missing elements** |
| 3 | Shows elements already in CommonLocators | Review |
| 4 | Shows candidates for CommonLocators | Approve which to move |
| 5 | Updates CommonLocators (if approved) | Confirm |
| 6 | Generates screen-specific locator file | Auto |
| 7 | Generates Page Object | Auto |
| 8 | Generates Feature file template | Auto |
| 9 | Updates index exports | Auto |
| 10 | Runs verification | Optional |

---

## CRITICAL: TC Validation Step (Step 2)

**Before generating any code**, the workflow MUST:

### 1. Analyze Test Cases for Required Elements

For each TC step, identify what UI elements are needed:
- Form fields (inputs, dropdowns, checkboxes)
- Buttons (action buttons, submit, cancel)
- Tables and their columns
- Modals/dialogs
- Navigation elements

### 2. Cross-Reference Against Provided HTML

Check if the HTML contains:
- The required elements
- Proper selectors (aria-label, id, role, etc.)

### 3. Report Missing Elements

If TC requires elements NOT found in HTML, **STOP and ask user**:

```
⚠️ MISSING ELEMENTS DETECTED

The following TC steps require elements not found in the provided HTML:

TC556255 - Location Bulk Assignment:
  ❌ Step: "I fill in search criteria" 
     Missing: Advanced Search panel fields (First Name, Last Name, DOB, etc.)
     HTML provided shows only the button to open Advanced Search, not the panel content
  
  ❌ Step: "I verify Assignment Type dropdown"
     Missing: Modal dialog with Assignment Type field
     HTML provided shows main page, not the modal when opened

REQUIRED: Please provide HTML for:
1. Advanced Search panel (when expanded)
2. Assign Location modal dialog
3. Assign Staff modal dialog
4. Unassign Location modal dialog
5. Unassign Staff modal dialog
6. Confirmation dialog

Without this HTML, the generated locators will be guesses and tests will likely fail.
```

### 4. Only Proceed After Confirmation

- If all elements found → Continue to Step 3
- If elements missing → Wait for user to provide additional HTML
- If user says "proceed anyway" → Generate with warnings in code comments

### Example Validation Output

```
✅ TC VALIDATION REPORT

Screen: Bulk Assignments
TCs Analyzed: 9

ELEMENTS FOUND IN HTML:
✅ Page title (h1:has-text("Bulk Assignments"))
✅ Assign Location button (button[title="Assign Location"])
✅ Assign Staff button (button[title="Assign Staff"])
✅ Unassign Location button (button[title="Unassign Location"])
✅ Unassign Staff button (button[title="Unassign Staff"])
✅ Export button (button[title="Export"])
✅ Advanced Search button ([aria-label="Open Advanced Search"])
✅ Table (mat-table[role="table"])
✅ Row selection checkboxes

ELEMENTS MISSING FROM HTML:
❌ Advanced Search panel fields
❌ Modal dialogs (Assign Location, Assign Staff, etc.)
❌ Confirmation dialog

RECOMMENDATION:
Please provide HTML for the missing elements before proceeding.
```

---

## Option 2: Manual with Kiro Prompts

If you prefer manual control or need customization:

## Quick Start

### Important: Common vs Screen-Specific Locators

Before generating, understand the locator hierarchy:

```
CommonLocators (common.locators.ts)
├── Angular Material components (mat-table, mat-option, etc.)
├── Common buttons (Continue, Save, Cancel)
├── Pagination controls
└── Accessibility roles

{Screen}Locators ({screen}.locators.ts)
├── Screen-specific headers/titles
├── Screen-specific form fields
├── Screen-specific buttons
└── Unique elements only on this screen
```

**Rule**: If an element exists in CommonLocators, use it from there. Don't duplicate!

### Step 1: Get the HTML

1. Open the screen in Chrome
2. Press F12 (DevTools)
3. Right-click on `<body>` → Copy → Copy outerHTML
4. Or for specific section: Right-click element → Copy → Copy outerHTML

### Step 2: Use This Prompt Template

```
Generate test automation for the [SCREEN NAME] screen.

Screen Name: [e.g., PersonDetails, CaseManagement, Reports]
Screen Path: [e.g., /persons/{id}/details]

IMPORTANT: 
- Check CommonLocators first for shared elements (mat-table, buttons, pagination)
- Only create screen-specific locators for unique elements
- Use CommonLocators in the Page Object for shared elements

Here's the HTML:
[PASTE HTML HERE]

Please generate:
1. Locator file (src/locators/{screen}.locators.ts) - ONLY screen-specific elements
2. Page Object (src/pages/{Screen}Page.ts) - Import both CommonLocators and screen locators
3. Feature file template (features/{screen}.feature)
4. Step definitions (src/steps/{screen}.steps.ts)
```

---

## Example Prompts

### Example 1: Simple Screen

```
Generate test automation for the Person Search screen.

Screen Name: PersonSearch
Screen Path: /persons/search

Here's the HTML:
<div class="search-container">
  <input aria-label="Search persons" type="text" />
  <button aria-label="Search">Search</button>
  <mat-table role="table">
    <mat-header-row>...</mat-header-row>
    <mat-row class="mat-column-firstName">...</mat-row>
  </mat-table>
</div>

Please generate locators and page object.
```

### Example 2: Complex Form Screen

```
Generate test automation for the New Person form.

Screen Name: NewPerson
Screen Path: /persons/new

Key interactions:
- Fill personal details (name, DOB, SSN)
- Select gender from dropdown
- Add address
- Click Save

Here's the HTML:
[PASTE HTML]

Please generate all files including validation scenarios.
```

### Example 3: Just Locators

```
Analyze this HTML and generate only the locator file.
Prioritize aria-label and role attributes.
Flag any high-risk positional selectors.

Screen Name: Dashboard
HTML:
[PASTE HTML]
```

---

## What Kiro Will Generate

### 1. Locator File (`src/locators/{screen}.locators.ts`)

```typescript
export const PersonSearchLocators = {
  // HIGH STABILITY - aria-label based
  searchInput: "[aria-label='Search persons']",
  searchBtn: "[aria-label='Search']",
  
  // MEDIUM STABILITY - mat-column classes
  columnFirstName: '.mat-column-firstName',
  columnLastName: '.mat-column-lastName',
  
  // LOW STABILITY - positional (needs review)
  // firstResult: '.mat-row:first-child',  // TODO: Add data-testid
} as const;
```

### 2. Page Object (`src/pages/{Screen}Page.ts`)

```typescript
import { PersonSearchLocators } from "@src/locators";

export class PersonSearchPage {
  constructor(private page: Page) {}
  
  async searchFor(term: string) {
    await this.page.locator(PersonSearchLocators.searchInput).fill(term);
    await this.page.locator(PersonSearchLocators.searchBtn).click();
  }
  
  async getFirstResult() {
    return this.page.locator(PersonSearchLocators.columnFirstName).first();
  }
}
```

### 3. Feature File (`features/{screen}.feature`)

```gherkin
@person-search
Feature: Person Search

  Scenario: Search for a person by name
    Given I am logged in
    When I search for "John"
    Then I should see search results
    And the results should contain "John"
```

### 4. Step Definitions (`src/steps/{screen}.steps.ts`)

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { PersonSearchPage } from '@src/pages/PersonSearchPage';

When('I search for {string}', async function(term: string) {
  const page = new PersonSearchPage(this.page);
  await page.searchFor(term);
});
```

---

## Tips for Best Results

### DO:
- ✅ Include the full HTML of the screen
- ✅ Mention key user interactions
- ✅ Specify the screen name and path
- ✅ Ask for specific files if you don't need all

### DON'T:
- ❌ Paste minified HTML (hard to read)
- ❌ Include sensitive data in HTML
- ❌ Skip the screen name

---

## Locator Priority (What Kiro Looks For)

| Priority | Attribute | Stability | Example |
|----------|-----------|-----------|---------|
| 1 | `aria-label` | ⭐ HIGHEST | `[aria-label='Submit']` |
| 2 | `id` | HIGH | `#search-input` |
| 3 | `role` | HIGH | `[role="button"]` |
| 4 | `data-testid` | HIGH | `[data-testid="save-btn"]` |
| 5 | `mat-column-*` | HIGH | `.mat-column-firstName` |
| 6 | text content | MEDIUM | `button:has-text('Save')` |
| 7 | CSS class | MEDIUM | `.primary-button` |
| 8 | positional | ⚠️ LOW | `.nth(0)` - AVOID |

---

## After Generation - IMPORTANT WORKFLOW

### Step 1: Review Generated Locators
Check the stability ratings (HIGH/MEDIUM/LOW)

### Step 2: Check Against CommonLocators
Run the verification script to find duplicates:
```bash
npm run verify:locators
```

If it shows warnings like:
```
⚠ person-search.locators.ts: "continueBtn" has same value as CommonLocators.continueBtn
```

**Then use CommonLocators instead** - don't duplicate!

### Step 3: Update Page Object to Use Common Where Applicable
```typescript
// WRONG - duplicating common locator
import { PersonSearchLocators } from "@src/locators";
await this.page.locator(PersonSearchLocators.continueBtn).click();

// CORRECT - use CommonLocators for shared elements
import { PersonSearchLocators, CommonLocators } from "@src/locators";
await this.page.locator(CommonLocators.continueBtn).click();
```

### Step 4: Add to Index & Test
1. Add export to `src/locators/index.ts`
2. Run `npm run verify:locators` again (should have fewer warnings)
3. Run `npm run test:smoke`

### Decision Guide: Common vs Screen-Specific

| Element Type | Where to Put |
|--------------|--------------|
| mat-table, mat-row, mat-option | `CommonLocators` |
| Continue, Save, Cancel buttons | `CommonLocators` |
| Pagination controls | `CommonLocators` |
| Screen-specific headers | `{Screen}Locators` |
| Screen-specific form fields | `{Screen}Locators` |
| Screen-specific buttons | `{Screen}Locators` |

---

## Quick Commands

```bash
# RECOMMENDED: Interactive automation workflow
npm run generate:automation

# Generate from HTML file
npm run generate:automation -- --name "ScreenName" --html "./temp/page.html"

# Generate from live URL
npm run generate:automation -- --name "ScreenName" --url "/path"

# Alternative: Simple screen scanner (no workflow)
npm run generate:screen -- --name "ScreenName" --html "./temp/page.html"

# Verify locators are properly centralized
npm run verify:locators

# Run smoke test
npm run test:smoke

# Run specific feature
npm run test -- --tags @person-search

# Generate with Playwright Codegen (alternative)
npx playwright codegen https://your-app-url.com
```
