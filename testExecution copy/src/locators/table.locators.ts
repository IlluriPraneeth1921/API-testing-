/**
 * Table/Grid Locators
 * Centralized selectors for data tables and pagination
 * 
 * NOTE: For base Angular Material table components, see CommonLocators.
 * This file contains Blue Compass specific table configurations.
 */
export const TableLocators = {
  // Table Structure (Blue Compass specific)
  table: 'mat-table[role="table"]',
  headerRow: 'mat-header-row',
  dataRow: 'mat-row.element-row',
  
  // Column Headers (using stable mat-column-* classes)
  // These are Blue Compass specific column names
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
  
  // Paginator Controls (aria-label based - STABLE)
  paginatorFirst: '[aria-label="First page"]',
  paginatorPrevious: '[aria-label="Previous page"]',
  paginatorNext: '[aria-label="Next page"]',
  paginatorLast: '[aria-label="Last page"]',
  itemsPerPageSelect: '.mat-mdc-paginator-page-size-select',
  paginatorRangeLabel: '.mat-mdc-paginator-range-label',
  
  // Table Actions
  columnOptionsBtn: 'mat-icon:text-is("tune")',
  columnSelectOption: "span:text-is('Column Select')",
  
  // Filter
  filterListIcon: "mat-icon:text-is('filter_list')",
  
  // Generic row/cell selectors
  tableRow: 'tr',
  listItem: "[class*='list-item']",
  
  // Column verification (for dynamic column checks)
  tableHeaderCell: 'th',
  tableDataCell: 'td',
  tableHeaderOrDataCell: 'th, td',
} as const;

export type TableLocatorKeys = keyof typeof TableLocators;
