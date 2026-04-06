# Prompt Guide for Test Automation

Use this guide when asking AI to create new test cases for the Blue Compass test automation framework.

---

## Quick Start Template

Copy and customize this template when requesting new test automation:

```
I need to automate a new test case for [FEATURE NAME].

**Screen/Page:** [Screen name in Blue Compass]
**Test Scenario:** [What the test should verify]

**Pre-conditions:**
- [List any setup needed]

**Test Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Results:**
- [What should happen]

**Please follow the rules in RULES.md:**
- Add locators to appropriate locator file (not hardcoded)
- Use centralized locators from @src/locators
- Follow Page Object naming conventions
- Add console logs with [PAGE_PREFIX] format
- Take screenshots at key steps
- Use explicit timeouts
- Create reusable step definitions
- Add appropriate tags to feature file

**Environment:** [QA/STD-F1/etc.]
```

---

## Detailed Prompt Examples

### Example 1: New Page Object

```
Create a new Page Object for the "Person Search" screen.

**Elements on the screen:**
- Search type dropdown (aria-label="Search Type")
- Search input field (id="search-input")
- Search button (text="Search")
- Results table with columns: Name, ID, DOB, Status
- Pagination controls

**Actions needed:**
- Search for a person by name
- Verify search results
- Click on a result row
- Navigate through pagination

**Please follow RULES.md:**
- Create locators in search.locators.ts or new person-search.locators.ts
- No hardcoded selectors in Page Object
- Add console logs with [PERSON-SEARCH] prefix
- Take screenshots after search and results
```

### Example 2: New Test Scenario

```
Add a new test scenario for verifying user can edit an existing organization.

**Feature:** Organization Management
**Scenario:** Edit organization details

**Steps:**
1. Login as admin
2. Search for organization "Test Org"
3. Click on organization to open details
4. Click Edit button
5. Change organization name to "Updated Org"
6. Click Save
7. Verify success message
8. Verify updated name is displayed

**Tags:** @organization @regression @medium

**Please follow RULES.md for:**
- Locators (add any new ones to forms.locators.ts)
- Page Object methods (add to OrganizationPage.ts)
- Step definitions (add to organization.steps.ts)
- Feature file format
```

### Example 3: Adding Locators Only

```
I need to add locators for the "Reports" screen.

**Elements to add:**
- Report type dropdown
- Date range picker (start and end)
- Generate Report button
- Download button
- Report preview area
- Export options (PDF, Excel, CSV)

**Please:**
1. Create new file: src/locators/reports.locators.ts
2. Export from src/locators/index.ts
3. Follow locator priority (aria-label > id > role > text)
4. Use proper naming conventions (Btn, Input, Dropdown suffixes)
5. Add comments for each group
```

### Example 4: Updating Existing Test

```
Update the smoke test to include verification of the new "Notifications" feature.

**New steps to add after login:**
1. Click notification bell icon
2. Verify notification panel opens
3. Verify "No new notifications" message (or notification count)
4. Close notification panel

**Please:**
- Add locators to header.locators.ts (notification elements are in header)
- Update LoginPages.ts or create NotificationPage.ts
- Add steps to login.steps.ts
- Update smoke.feature with new steps
- Follow all rules in RULES.md
```

---

## Key Rules to Reference

When giving prompts, remind the AI about these key rules:

### Locators
```
- All locators in src/locators/ files
- NO hardcoded selectors in Page Objects
- Priority: aria-label > id > role > mat-* > text > CSS > positional
- Use CommonLocators for Angular Material components
```

### Page Objects
```
- Import locators from @src/locators
- Console logs with [PAGE_PREFIX] format
- Screenshots with numbered naming (01-description.png)
- Explicit timeouts on all waits
- Use expect() for assertions
```

### Step Definitions
```
- Reusable with parameters
- Organized by feature
- Use World context for shared state
```

### Feature Files
```
- Include @smoke, @regression, or priority tags
- Business language in steps
- Descriptive scenario names
```

---

## Verification Checklist

After AI generates code, verify:

```bash
# 1. Check for hardcoded locators
npm run verify:locators

# 2. Check TypeScript compilation
npx tsc --noEmit

# 3. Run the new test
npm run test:smoke
# or
npm run test --tags @your-new-tag
```

---

## Common Mistakes to Avoid

### ❌ Don't Accept This:

```typescript
// Hardcoded selector
const button = this.page.locator("button:has-text('Submit')");
```

### ✅ Ask for This Instead:

```typescript
// Using centralized locator
const button = this.page.locator(FormLocators.submitBtn);
```

---

### ❌ Don't Accept This:

```typescript
// No timeout specified
await element.waitFor({ state: 'visible' });
```

### ✅ Ask for This Instead:

```typescript
// Explicit timeout
await element.waitFor({ state: 'visible', timeout: 10000 });
```

---

### ❌ Don't Accept This:

```typescript
// No console log
async clickSubmit() {
  await this.page.locator(FormLocators.submitBtn).click();
}
```

### ✅ Ask for This Instead:

```typescript
// With console log
async clickSubmit() {
  console.log('[FORM] Clicking Submit button');
  await this.page.locator(FormLocators.submitBtn).click();
  console.log('[FORM] Submit button clicked');
}
```

---

## Sample Full Prompt

Here's a complete example prompt you can adapt:

```
I need to automate the "Create New Person" workflow in Blue Compass.

**Screen:** Person Management > Add New Person
**Environment:** QA

**Test Scenario:** Verify user can create a new person with required fields

**Pre-conditions:**
- User is logged in as admin
- User is on the Person Search page

**Test Steps:**
1. Click "Add New Person" button
2. Fill required fields:
   - First Name: "Test"
   - Last Name: "Person"
   - Date of Birth: "01/01/1990"
   - Gender: "Male"
3. Click Continue
4. Verify Potential Duplicates page
5. Click Continue (no duplicates)
6. Verify Person Created successfully
7. Verify person appears in search results

**Expected Results:**
- Person is created with correct details
- Success message is displayed
- Person is searchable

**Elements I can see on the screen:**
- First Name input (id="firstName")
- Last Name input (id="lastName")
- DOB picker (aria-label="Date of Birth")
- Gender dropdown (role="combobox")
- Continue button (text="Continue")
- Success message (class="success-message")

**Please follow RULES.md:**
1. Create/update locators in forms.locators.ts or person.locators.ts
2. Create PersonPage.ts Page Object (or update existing)
3. Add step definitions to person.steps.ts
4. Create person.feature with @person @regression tags
5. Use [PERSON] prefix for console logs
6. Take screenshots at each major step
7. NO hardcoded locators - all from centralized files
8. Run verify:locators before completing

**After completion, show me:**
- New/updated locator file
- Page Object code
- Step definitions
- Feature file
- Verification script output
```

---

## Quick Reference

| What You Need | What to Ask For |
|---------------|-----------------|
| New screen automation | Page Object + Locators + Steps + Feature |
| Add test to existing feature | Steps + Feature update |
| New locators only | Locator file + index.ts export |
| Update existing test | Specify which files to modify |
| Bug fix in test | Describe the issue + expected behavior |

---

**Remember:** Always reference `RULES.md` in your prompts to ensure consistent code generation!
