/**
 * Table/Grid Locators
 * Centralized selectors for data tables and pagination
 *
 * ─── REFACTOR NOTE (April 2026) ───────────────────────────────────────────────
 * The following locators were REMOVED from this file because they are exact
 * duplicates of entries already in CommonLocators. Page objects should import
 * from CommonLocators directly for these:
 *
 *   REMOVED → USE INSTEAD
 *   table              → CommonLocators.matTable
 *   headerRow          → CommonLocators.matHeaderRow
 *   paginatorFirst     → CommonLocators.paginatorFirst
 *   paginatorPrevious  → CommonLocators.paginatorPrevious
 *   paginatorNext      → CommonLocators.paginatorNext
 *   paginatorLast      → CommonLocators.paginatorLast
 *   itemsPerPageSelect → CommonLocators.paginatorPageSize
 *   paginatorRangeLabel→ CommonLocators.paginatorRangeLabel
 *
 * WHY: RULES.md §1.5 — "When extracting locators from HTML captures, ALWAYS
 * check CommonLocators first. If a common locator exists, use it instead of
 * creating a duplicate in the module-specific locator file."
 *
 * Audit tool: npm run audit:locators (src/tools/audit-locators.ts)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * This file retains ONLY Blue Compass specific table configurations:
 * - Screen-specific column names (.mat-column-*)
 * - Blue Compass specific table action buttons
 * - HTML table selectors (tr, th, td) not covered by CommonLocators
 */
export const TableLocators = {
  // Table Structure — Blue Compass specific variant
  // NOTE: generic mat-table → use CommonLocators.matTable
  // NOTE: generic mat-header-row → use CommonLocators.matHeaderRow
  dataRow: 'mat-row.element-row',
  
  // Column Headers (Blue Compass specific column names)
  columnAvatar: '.mat-column-avatar',
  columnFirstName: '.mat-column-firstName',
  columnLastName: '.mat-column-lastName',
  columnGender: '.mat-column-genderDisplayName',
  columnBirthDate: '.mat-column-birthDate',
  columnSSN: '.mat-column-socialSecurityNumber',
  columnPersonId: '.mat-column-identifier',
  columnMedicaidId: '.mat-column-medicaidNumber',
  columnPhone: '.mat-column-phoneNumber',
  columnAddress: '.mat-column-physicalAddress',
  
  // NOTE: paginatorFirst/Previous/Next/Last, itemsPerPageSelect, paginatorRangeLabel
  //       → use CommonLocators equivalents directly
  
  // Table Actions
  columnOptionsBtn: 'mat-icon:text-is("tune")',
  columnSelectOption: "span:text-is('Column Select')",
  
  // Filter
  filterListIcon: "mat-icon:text-is('filter_list')",
  
  // Generic row/cell selectors (HTML tables, not mat-table)
  tableRow: 'tr',
  listItem: "[class*='list-item']",
  tableHeaderCell: 'th',
  tableDataCell: 'td',
  tableHeaderOrDataCell: 'th, td',
} as const;

export type TableLocatorKeys = keyof typeof TableLocators;
