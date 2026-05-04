# Next Session TODO - April 14, 2026

## COMPLETED THIS SESSION (April 13)
- ✅ TC556255 - Assign Location: 20/20 PASSING (value verification + cleanup)
- ✅ TC556258 - Unassign Location: 15/15 PASSING (bulk unassign with page.evaluate fast scan)
- ✅ Playwright built-in locators (getByRole) introduced in new code
- ✅ TC556256 - Assign Staff: code written, 15/22 passed on best run
- ✅ TC556263 - Unassign Staff: code written, not yet tested (env down)

## PRIORITY 1: Validate TC556256 (Assign Staff)
Best run was 15/22 — failed on location field in staff modal form fill.
Fix applied: added `waitForTimeout(AVG)` before location field + better fallback chain.
Need to rerun when F1 environment is stable.

Run: `npm run test:tc556256`

### Known Issues in TC556256
- Staff modal has different combobox IDs than location modal
- Assignment Type "CMA" not available in staff modal → falls back to "APS Supervisor" (OK)
- Staff Member dropdown found via 2nd combobox fallback (OK)
- Location field: specific locator `input[id^="toLocation"]` doesn't match staff modal
  - Fallback chain: `input[id*="ocation"]` → `input[aria-label*="ocation"]` → 3rd combobox by position
  - Added `waitForTimeout(AVG)` before location field (cascading field may need time)

## PRIORITY 2: Validate TC556263 (Unassign Staff)
Code written, step definitions in place. Never got a clean run due to env issues.

Run: `npm run test:tc556263`

### TC556263 Implementation
- Uses `page.evaluate()` fast scan for staff assignment indicators in grid rows
- `fillUnassignStaffForm()` uses same pattern as `fillUnassignLocationForm()` (backdrop dismiss + combobox ArrowDown)
- Falls back to selecting first 3 rows if no staff assignments detected

## PRIORITY 3: Implement 4 New PBI915981 Scenarios
After TC556256 + TC556263 are green:
1. Verify running query again shows updated data
2. Verify Select All Records button never displays
3. Verify selections retained on cancel
4. Verify multiple sequential operations retain selections

## WHAT'S WORKING (don't break this)
- TC556255: Login → Search → Select → Assign Location (CMA, retry loop) → Profile verification (getByRole table/row, 3-value check) → Cleanup unassign
- TC556258: Login → Search → Fast scan (page.evaluate) → Select assigned persons → Unassign Location (combobox ArrowDown + getByRole option) → All 6 persons unassigned
- Playwright built-in locators: getByRole('table'), getByRole('row'), getByRole('option'), getByRole('dialog') — all working in new code
- fillUnassignLocationForm: backdrop dismiss + scoped to mat-dialog-container + combobox ArrowDown + first option
- fillStaffAssignmentForm: fallback chains for staffMember (2nd combobox) and location (3rd combobox)
- fillUnassignStaffForm: same pattern as location unassign

## KEY FILES MODIFIED THIS SESSION
- `src/core/world.ts` — added `assignedEffectiveDate`
- `src/data/test-data.ts` — added TC556258, TC556256, TC556263 data; added `staffMember`, `isPrimary` to modal type
- `src/pages/BulkAssignmentModalPage.ts` — `fillLocationAssignmentForm` returns values; added `fillStaffAssignmentForm`, `fillUnassignLocationForm`, `fillUnassignStaffForm`
- `src/pages/PersonProfilePage.ts` — added `verifyLocationAssignmentValues` (getByRole table/row)
- `src/steps/bulk-assignment.steps.ts` — TC556255 cleanup step, TC556258 unassign steps, TC556256 staff assign steps, TC556263 staff unassign steps
- `features/bulk-assignment.feature` — updated TC556255 (cleanup step), TC556256 (new step text), TC556258 (simplified), TC556263 (new step text)
- `package.json` — added test:tc556256, test:tc556258, test:tc556263 scripts

## ENVIRONMENT
- F1: https://standard-f1-carity.feisystemsh2env.com/
- Login: george.parker / Password123#
- Org: Quantum / Quantum Services Medical Equipment / Self
- ⚠ F1 was having intermittent login timeouts (Acknowledge → Organization transition) on April 13 evening

## RUN COMMANDS
```bash
npm run test:tc556255   # Assign Location (20 steps)
npm run test:tc556256   # Assign Staff (22 steps) — NEEDS VALIDATION
npm run test:tc556258   # Unassign Location (15 steps)
npm run test:tc556263   # Unassign Staff — NEEDS VALIDATION
npm run test:bulk-assignment-smoke  # Smoke test
```
