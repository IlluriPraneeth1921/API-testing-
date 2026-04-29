/**
 * Bulk Assignment Screen Locators
 * Generated based on BulkAssignment.txt HTML analysis
 * 
 * Screen: Bulk Assignments List View
 * Path: /bulk-assignments (accessed via 3-dot ellipsis menu)
 * 
 * Elements: Screen-specific locators
 * CommonLocators: Use for mat-table, pagination, common buttons
 */
export const BulkAssignmentLocators = {
  // ═══ PAGE HEADER ═══
  pageTitle: 'h1:has-text("Bulk Assignments")',
  backButton: '[aria-label="Back"]',
  
  // ═══ ACTION BUTTONS (Primary Actions Bar) ═══
  assignLocationBtn: 'button[title="Assign Location"]',
  assignStaffBtn: 'button[title="Assign Staff"]',
  unassignLocationBtn: 'button[title="Unassign Location"]',
  unassignStaffBtn: 'button[title="Unassign Staff"]',
  exportBtn: 'button[title="Export"]',
  
  // ═══ SEARCH/FILTER ═══
  advancedSearchBtn: '[aria-label="Open Advanced Search"]',
  advancedSearchPanel: '.cdk-overlay-pane, .query-filter-overlay',
  searchButton: 'button:has-text("Search")',
  clearButton: 'button:has-text("Clear")',
  runQueryBtn: 'button:has-text("Run Query")',
  
  // ═══ ADVANCED SEARCH PANEL FIELDS ═══
  // Note: These are in an overlay panel - selectors may need adjustment based on actual HTML
  searchPanelContainer: '.mat-mdc-menu-panel, .cdk-overlay-pane',
  queryTypeDropdown: '[aria-label="Query Type"]',
  staffAssignmentTypeDropdown: '[aria-label="Staff Assignment Type"]', // Appears after Query Type selection
  locationSearchDropdown: '[aria-label="Location"]', // 3rd mandatory - appears after Staff Assignment Type
  stateProvinceDropdown: '[aria-label="State/Province"]',
  countyAreaDropdown: '[aria-label="County Area"]',
  firstNameInput: '[aria-label="First Name"]',
  lastNameInput: '[aria-label="Last Name"]',
  pmiNumberInput: '[aria-label="PMI Number"]',
  closeAdvancedSearchBtn: '[aria-label="Close Advanced Search"]',
  locationAssignmentDropdown: 'mat-select:has-text("Location Assignment"), [aria-label*="Location Assignment"]',
  staffAssignmentDropdown: 'mat-select:has-text("Staff Assignment"), [aria-label*="Staff Assignment"]',
  
  // Dynamic selector for all required comboboxes (useful for cascading dropdowns)
  allRequiredComboboxes: 'input[role="combobox"][aria-required="true"]',
  
  // ═══ EMPTY STATE ═══
  emptyListMessage: 'a.empty-list-message:has-text("No Bulk Assignments record")',
  
  // ═══ TABLE ELEMENTS ═══
  bulkAssignmentTable: 'mat-table[role="table"]',
  tableOptionsBtn: '[aria-label*="Sort and Column options"]',
  skipToPaginatorBtn: '[aria-label*="Skip to the paginator"]',
  
  // ═══ TABLE COLUMNS ═══
  columnSelection: '.mat-column-ui_selection',
  columnPersonName: '.mat-column-personName',
  columnPersonId: '.mat-column-personIdentifier',
  
  // ═══ ROW SELECTION ═══
  selectAllCheckbox: '#mat-mdc-checkbox-1-input',
  selectAllCheckboxLabel: '[aria-label="Select all rows checkbox"]',
  rowCheckbox: 'mat-checkbox input[type="checkbox"]',
  selectedRowCount: '.cdk-visually-hidden:has-text("total rows are currently selected")',
  
  // ═══ MODAL DIALOGS ═══
  modalContainer: 'mat-dialog-container',
  modalTitle: 'mat-dialog-title, .mat-mdc-dialog-title',
  modalContent: 'mat-dialog-content',
  modalActions: 'mat-dialog-actions',
  
  // ═══ MODAL FORM FIELDS ═══
  assignmentTypeDropdown: 'mat-select[formcontrolname*="assignmentType"], mat-select:has-text("Assignment Type")',
  locationDropdown: 'mat-select[formcontrolname*="location"], mat-select:has-text("Location")',
  staffMemberDropdown: 'mat-select[formcontrolname*="staffMember"], mat-select:has-text("Staff Member")',
  effectiveStartDate: 'input[formcontrolname*="effectiveStartDate"], input[placeholder*="Effective"]',
  noteField: 'textarea[formcontrolname*="note"], textarea',
  isPrimaryCheckbox: 'mat-checkbox:has-text("Primary")',
  
  // ═══ UNASSIGN MODAL FIELDS ═══
  dischargeReasonDropdown: 'mat-select:has-text("Discharge Reason")',
  otherDischargeReasonDropdown: 'mat-select:has-text("Other")',
  unassignReasonDropdown: 'mat-select:has-text("Unassign Reason")',
  otherUnassignReasonDropdown: 'mat-select:has-text("Other")',
  
  // ═══ CONFIRMATION DIALOG ═══
  confirmationText: '.mat-dialog-content:has-text("Would you like to continue")',
  
  // ═══ STATUS/PROGRESS ═══
  assignmentStatus: '.assignment-status, .status-message',
  progressIndicator: 'mat-progress-bar, mat-spinner',
  
  // ═══ SELECT ALL RECORDS (PBI 915981 - should never display) ═══
  selectAllRecordsBtn: 'button:has-text("Select All Records")',
  
  // ═══ CHECKED CHECKBOX STATE ═══
  checkedCheckbox: 'mat-checkbox.mat-mdc-checkbox-checked input[type="checkbox"]',
  
} as const;

export type BulkAssignmentLocatorKeys = keyof typeof BulkAssignmentLocators;
