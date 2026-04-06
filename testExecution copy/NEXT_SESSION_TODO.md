# Next Session TODO - April 4, 2026

## Priority 1: Fix TC556255 Empty Search Results

### Problem
The search returns "No Bulk Assignments record(s) available" because the combination of first options from all 3 mandatory dropdowns doesn't have data.

### Solution Options

1. **Ask user for specific values** that have data:
   - Query Type: ?
   - Staff Assignment Type: ?
   - Location: ?

2. **Try different option indices** - Modify `selectFirstAutocompleteOption` to accept an index parameter

3. **Check test data** - Verify what data exists in the STD-F1 environment

### Code Location
`src/steps/bulk-assignment.steps.ts` - "I click the Search button in Advanced Search" step (line ~158)

---

## Priority 2: Complete TC556255 Flow

Once records are returned, complete these steps:
1. Select record(s) from the grid
2. Click "Assign Location" button
3. Verify modal opens
4. Fill Assignment Type, Location, Effective Start Date, Note
5. Click Continue
6. Verify confirmation modal
7. Complete assignment
8. Verify list not refreshed and selections retained

---

## Priority 3: Add Locator to Common Locators

Consider moving the dynamic dropdown selector to common locators:
```typescript
// common.locators.ts
allRequiredComboboxes: 'input[role="combobox"][aria-required="true"]',
```

---

## Files to Review

| File | Purpose |
|------|---------|
| `SESSION_CONTEXT_2026-04-03.md` | Full context from today's session |
| `src/steps/bulk-assignment.steps.ts` | Step definitions (search step needs data fix) |
| `src/locators/bulk-assignment.locators.ts` | Locators (all 3 mandatory dropdowns added) |
| `reports/html-captures/` | HTML captures showing dropdown values |

---

## Test Commands

```bash
# Run TC556255 test
cd "katalon-to-playwright/testExecution copy"
npm run test:tc556255

# Run smoke test (should still pass)
npm run test:smoke
```

---

## What's Working

- ✅ Login with george.parker
- ✅ Navigation to Bulk Assignments (via Administration tab)
- ✅ Page element verification
- ✅ Advanced Search panel opens
- ✅ All 3 mandatory dropdowns selected dynamically
- ✅ HTML capture utility for locator discovery
- ✅ DropdownHelper utility for autocomplete dropdowns

---

## Key Discovery

The Bulk Assignment search has **cascading mandatory dropdowns**:
1. Query Type (always visible)
2. Staff Assignment Type (appears after Query Type selected)
3. Location (appears after Staff Assignment Type selected)

The test now handles this dynamically by finding all `input[role="combobox"][aria-required="true"]` elements.
