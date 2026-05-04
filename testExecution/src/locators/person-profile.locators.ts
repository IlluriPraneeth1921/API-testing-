/**
 * Person Profile Screen Locators
 *
 * Screen: Person Profile (accessed via header search or grid link)
 *
 * Left Panel: Assignments → Location Assignment / Staff Assignment
 * Main Content: Assignment tables, profile details
 *
 * ─── REFACTOR NOTE (April 2026) ───────────────────────────────────────────────
 * The following locators were REMOVED from this file because they are exact
 * duplicates of entries already in CommonLocators:
 *
 *   REMOVED          → USE INSTEAD
 *   assignmentTable  → CommonLocators.matTable
 *   assignmentRow    → CommonLocators.matRow
 *
 * Also removed (partial duplicate — use CommonLocators.matRow directly):
 *   searchResultRow  → CommonLocators.matRow  (the 'tr.search-result' part
 *                      was a fallback; mat-row is the stable selector)
 *
 * WHY: RULES.md §1.5 — generic Angular Material components belong in
 * CommonLocators. Screen-specific locators stay in this file.
 *
 * Audit tool: npm run audit:locators (src/tools/audit-locators.ts)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * NOTE: Left nav items (Profile, Locations, Assignments, etc.) → navigation.locators.ts
 *       Header search bar → header.locators.ts
 *       Common table/dialog elements → common.locators.ts
 */
export const PersonProfileLocators = {
  // ═══ PAGE HEADER ═══
  personName: 'h1.person-name, h1[class*="person"], .person-header h1',
  personId: '.person-identifier, [class*="person-id"]',

  // ═══ OPEN PROFILE (from Bulk Assignments grid) ═══
  openProfileBtn: 'button[title="Open Person Profile"]',

  // ═══ LEFT PANEL - ASSIGNMENT SUB-SECTIONS ═══
  // These appear after clicking "Assignments" in the left nav
  locationAssignment: 'span:text-is("Location Assignment")',
  staffAssignment: 'span:text-is("Staff Assignment")',
  locationAssignmentAlt: 'a:has-text("Location Assignment"), button:has-text("Location Assignment")',
  staffAssignmentAlt: 'a:has-text("Staff Assignment"), button:has-text("Staff Assignment")',

  // ═══ ASSIGNMENT TABLES ═══
  assignmentTable: 'mat-table[role="table"]',
  assignmentRow: 'mat-row',
  locationColumn: '.mat-column-location, .mat-column-locationName',
  staffColumn: '.mat-column-staffMember, .mat-column-staffName',
  assignmentTypeColumn: '.mat-column-assignmentType',
  effectiveDateColumn: '.mat-column-effectiveStartDate',
  statusColumn: '.mat-column-status',

  // ═══ SEARCH RESULTS (when searching person via header) ═══
  searchResultRow: 'mat-row, tr.search-result',
  searchResultPersonName: 'mat-row .mat-column-personName, mat-row .mat-column-fullName',
} as const;

export type PersonProfileLocatorKeys = keyof typeof PersonProfileLocators;
