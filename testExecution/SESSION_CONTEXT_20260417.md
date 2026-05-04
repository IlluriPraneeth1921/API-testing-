# Session Context — April 17, 2026

## CRITICAL: Always work in `katalon-to-playwright/testExecution/` — NEVER `testExecution/`

---

## What Was Done This Session

- Fixed `getScreenshotKey()` bug in `visual-comparator.ts` — `indexOf('_')` broke hyphenated env names like `std-f1`, causing ALL comparisons to show 0% diff
- Fixed timing in `visual-scanner.ts` — `form_empty` waits for `mat-dialog-container`, `form_validation` waits for `mat-error`, `form_saved` waits for dialog close
- Fixed report-generator.ts — tabbed Baseline/Target/Diff view, fullscreen overlay on image click, plain English diff description
- Softened report colors (muted tones, not harsh red/green)
- Added DOM snapshot capture to visual-scanner.ts — captures columns, buttons with border detection, dialogs, error messages
- Added semantic diff to visual-comparator.ts — detects missing/added columns, button border differences
- Added Control Analysis block to report cards
- Fixed hover false positives — mouse moved to (0,0) + blur() before every screenshot
- Added header masking (80px) in comparator — header differences ignored in pixel diff
- Flagged issues dropped from 12 → 6 after hover fix (real differences only)
- Created `.kiro/steering/visual-regression-tool.md` with all critical rules
- Added `executePwsh` rule to steering — Kiro runs commands directly, never asks user
- Successfully ran full pipeline: std-f1 scan → dev-f5 scan → compare → report

## Known Blocker: Form Fields Not Captured in DOM Snapshot (PARKED)

The Announcements dialog form fields (Title, Status, Announcement Type, Display Priority, Start Date, End Date) are NOT appearing in the DOM snapshot. The dialog is 538px tall and fits in the 768px viewport — scrolling is NOT the issue.

Root cause: The Announcements form uses a custom Angular component structure that does NOT use `mat-form-field`, `label`, `mat-label`, `.mat-mdc-floating-label`, or any standard Angular Material label pattern. Only "Rich Text Editor" (CKEditor) is captured because it uses `mat-form-field`.

Attempted fixes (all failed): mat-form-field, label, mat-label, mat-select, [class*="label"], .mat-mdc-floating-label, scroll-to-top, viewport resize approach.

Decision: PARK this for now. The pixel diff screenshots are working correctly and showing real differences. The semantic diff (Control Analysis) works for columns, buttons, and error messages. Form field label detection for custom components is a future enhancement.

Next approach if revisited: Use Playwright's `page.accessibility.snapshot()` which reads the accessibility tree regardless of DOM structure — this would capture all labeled form controls including custom components.

## Script Status

| File | Status | Notes |
|------|--------|-------|
| `src/visual-regression/visual-comparator.ts` | Fixed | `getScreenshotKey()` uses env prefix matching; header masking 80px; semantic diff |
| `src/visual-regression/visual-scanner.ts` | Active | DOM snapshot captures columns/buttons but NOT dialog form fields (see blocker above) |
| `src/visual-regression/report-generator.ts` | Fixed | Tabbed view, fullscreen overlay, diff description, semantic diff block, muted colors |
| `src/visual-regression/page-explorer.ts` | Fixed | Timing fixes for all interaction types |
| `visual-regression/config/modules.json` | Complete | Announcements module configured |

## Current Report State

Last run: `npm run visual:compare -- --baseline std-f1 --target dev-f5 --module Announcements`
- 12 pairs compared, 6 flagged (hover false positives eliminated)
- Report at: `visual-regression/reports/std-f1_vs_dev-f5/report.html`
- Flagged: form_empty (3.4%), form_validation (4.3%), form_filled (4.5%), more_options_delete (3.9%), more_options_edit (3.9%), pagination_next (1.6%)

## Pending Tasks

1. Fix DOM snapshot to capture dialog form fields (see blocker above) — try viewport resize approach
2. Verify semantic diff shows: required marker (*) differences, field size differences, button border differences
3. Run full pipeline once DOM snapshot is fixed and verify Control Analysis shows meaningful differences
4. Validate TC556256 (Assign Staff) and TC556263 (Unassign Staff) — F1 env was unstable April 13

## Key Commands to Resume (run from `testExecution/` folder)

```bash
# Scan both envs
npm run visual:scan:std-f1 -- --module Announcements
npm run visual:scan:dev-f5 -- --module Announcements

# Compare and generate report
npm run visual:compare -- --baseline std-f1 --target dev-f5 --module Announcements

# Full scan all modules
npm run visual:scan:std-f1
npm run visual:scan:dev-f5
npm run visual:compare -- --baseline std-f1 --target dev-f5
```

Report: `visual-regression/reports/std-f1_vs_dev-f5/report.html`

---

To resume next session:
> "Read SESSION_CONTEXT_20260417.md in testExecution, then tell me what state we're in before doing anything"

