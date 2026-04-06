# NEXT SESSION - Screen Generator Tool Implementation

## Date: April 2, 2026
## Resume From: Screen Generator Tool Development

---

## CONTEXT SUMMARY

We completed the Centralized Locator Registry implementation:
- ✅ Created 6 locator files in `src/locators/`
- ✅ Updated all 6 Page Objects to use centralized locators
- ✅ Smoke test PASSED (25/25 steps)
- ✅ Documentation saved

**User's Next Request**: Build a Screen Generator tool to auto-generate locators for new screens without hand-coding Angular elements.

---

## TASK: Build Screen Generator CLI Tool

### What It Should Do:

1. **Input**: URL of a new screen (after login)
2. **Process**: 
   - Navigate to the URL (with auth cookies)
   - Scan all interactive elements on the page
   - Extract stable selectors (prioritizing aria-label, role, id, mat-*)
   - Categorize elements (buttons, inputs, tables, navigation, etc.)
3. **Output**:
   - `src/locators/{screen-name}.locators.ts` - All selectors
   - `src/pages/{ScreenName}Page.ts` - Page Object template

### Command:
```bash
npm run generate:screen -- --url "/path/to/screen" --name "FeatureName"
```

### Example Output:
```
🔍 Scanning: https://standard-f1-carity.feisystemsh2env.com/persons/search
📦 Found 47 interactive elements
✅ Generated: src/locators/person-search.locators.ts
✅ Generated: src/pages/PersonSearchPage.ts

Locator Summary:
  - aria-label based: 12 (STABLE)
  - role based: 8 (STABLE)
  - mat-* classes: 15 (STABLE)
  - text-based: 7 (MEDIUM)
  - positional: 5 (HIGH RISK - review needed)
```

---

## IMPLEMENTATION PLAN

### Step 1: Create Generator Script
File: `src/tools/screen-generator.ts`

```typescript
// Pseudocode structure
interface GeneratorConfig {
  baseUrl: string;
  screenPath: string;
  screenName: string;
  outputDir: string;
}

async function generateScreen(config: GeneratorConfig) {
  // 1. Launch browser with existing auth
  // 2. Navigate to screen
  // 3. Query all interactive elements
  // 4. Extract best selectors for each
  // 5. Generate locator file
  // 6. Generate page object template
}
```

### Step 2: Element Scanner Logic
Priority order for selector extraction:
1. `aria-label` attribute
2. `id` attribute (if not dynamic)
3. `role` attribute + context
4. `data-testid` attribute
5. Angular Material classes (`mat-*`, `cdk-*`)
6. Text content (for buttons/links)
7. CSS class combinations
8. Positional (last resort, flag as HIGH RISK)

### Step 3: Template Generators

**Locator Template:**
```typescript
export const {ScreenName}Locators = {
  // Buttons
  submitBtn: "[aria-label='Submit']",
  cancelBtn: "[aria-label='Cancel']",
  
  // Inputs
  searchInput: "#search-field",
  
  // Tables
  dataTable: 'mat-table[role="table"]',
  
  // HIGH RISK - Review these
  // listItem: "[class*='list-item']", // nth(?) needed
} as const;
```

**Page Object Template:**
```typescript
import type { Page } from "playwright";
import { {ScreenName}Locators } from "@src/locators";

export class {ScreenName}Page {
  constructor(private page: Page) {}
  
  // Auto-generated method stubs
  async clickSubmit() {
    await this.page.locator({ScreenName}Locators.submitBtn).click();
  }
}
```

### Step 4: Add npm Script
```json
{
  "scripts": {
    "generate:screen": "ts-node src/tools/screen-generator.ts"
  }
}
```

---

## FILES TO CREATE

1. `src/tools/screen-generator.ts` - Main generator script
2. `src/tools/element-scanner.ts` - Element detection logic
3. `src/tools/template-generator.ts` - File generation
4. `src/tools/selector-ranker.ts` - Selector stability ranking
5. Update `package.json` - Add generate:screen script

---

## ALTERNATIVE QUICK APPROACHES (Document for User)

### Approach 1: Playwright Codegen (Immediate Use)
```bash
npx playwright codegen https://standard-f1-carity.feisystemsh2env.com/
```
- Records clicks/interactions
- Generates selectors automatically
- Copy selectors to locator files manually

### Approach 2: Browser Console Script
Paste in DevTools console to extract all interactive elements:
```javascript
// Quick element scanner
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

### Approach 3: VS Code Playwright Extension
1. Install "Playwright Test for VS Code"
2. Use "Record new" feature
3. Extract selectors from generated code

---

## QUESTIONS TO ASK USER TOMORROW

1. Do you need the generator to handle authentication automatically, or will you run it after manual login?
2. Should it generate step definitions too, or just locators + page objects?
3. Any specific naming conventions for the generated files?
4. Should high-risk selectors be commented out or included with warnings?

---

## REFERENCE FILES

- Existing locators pattern: `src/locators/*.locators.ts`
- Existing page objects: `src/pages/*.ts`
- Spec documents: `.kiro/specs/test-automation-improvement/`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`

---

## START COMMAND FOR TOMORROW

```
"Continue from NEXT_SESSION_TODO.md - build the Screen Generator tool"
```
