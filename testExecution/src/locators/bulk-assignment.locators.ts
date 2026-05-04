/**
 * Bulk Assignment Screen Locators
 * 
 * ONLY screen-specific locators live here.
 * For shared elements (tables, buttons, dialogs, pagination), use CommonLocators.
 * 
 * Verified from HTML captures: 2026-04-10
 * Screens: List View, Advanced Search Panel, Assign/Unassign Modals
 */
export const BulkAssignmentLocators = {

  // ═══ LIST PAGE ═══

  /** Page title - h1 element */
  pageTitle: 'h1:has-text("Bulk Assignments")',
  /** Back navigation button */
  backButton: '[aria-label="Back"]',
  /** Assign Location action button */
  assignLocationBtn: 'button[title="Assign Location"]',
  /** Assign Staff action button */
  assignStaffBtn: 'button[title="Assign Staff"]',
  /** Unassign Location action button */
  unassignLocationBtn: 'button[title="Unassign Location"]',
  /** Unassign Staff action button */
  unassignStaffBtn: 'button[title="Unassign Staff"]',
  /** Export action button */
  exportBtn: 'button[title="Export"]',
  /** Empty state message when no records */
  emptyListMessage: 'a.empty-list-message:has-text("No Bulk Assignments record")',
  /** Row checkbox - scoped to mat-row in usage */
  rowCheckbox: 'mat-checkbox input[type="checkbox"]',
  /** Checked mat-checkbox row indicator */
  checkedCheckbox: 'mat-checkbox.mat-mdc-checkbox-checked',
  /** Person name column cell */
  personNameCell: '.mat-column-personName',
  /** Header row checkbox (select all) */
  headerCheckbox: 'mat-checkbox[id*="checkbox-"]',
  /** "X selected on page." indicator text */
  selectedOnPageIndicator: 'span:has-text("selected on page.")',

  // ═══ COLUMN SELECT PANEL ═══

  /** Column options / tune button */
  columnOptionsBtn: '.plr-primary-button.column-options',
  /** "Column Select" label inside the panel */
  columnSelectLabel: 'span:has-text("Column Select")',
  /** Column list option items */
  columnListOption: 'mat-list-option',

  // ═══ ADVANCED SEARCH PANEL ═══

  /** Open Advanced Search button */
  advancedSearchBtn: '[aria-label="Open Advanced Search"]',
  /** Close Advanced Search button */
  closeAdvancedSearchBtn: '[aria-label="Close Advanced Search"]',
  /** Run Query button inside search panel */
  runQueryBtn: 'button:has-text("Run Query")',
  /** Query Type - 1st mandatory cascading dropdown */
  queryTypeDropdown: '[aria-label="Query Type"]',
  /** Staff Assignment Type - 2nd mandatory, appears after Query Type */
  staffAssignmentTypeDropdown: '[aria-label="Staff Assignment Type"]',
  /** Location - 3rd mandatory, appears after Staff Assignment Type */
  searchLocationDropdown: '[aria-label="Location"][role="combobox"]',

  // ═══ ASSIGN LOCATION MODAL ═══
  // Verified from HTML capture: assign-location-modal-interactive-2026-04-10

  /** Assignment Type - autocomplete combobox inside modal */
  assignmentTypeDropdown: 'input[id^="assignmentType"][role="combobox"]',
  /** To Location - autocomplete combobox inside modal */
  modalLocationDropdown: 'input[id^="toLocation"][role="combobox"]',
  /** Effective Start Date - date input */
  effectiveStartDate: 'input[aria-label="Effective Start Date"]',
  /** Note - textarea */
  noteField: 'textarea[aria-label="Note"]',

  // ═══ ASSIGN STAFF MODAL ═══

  /** Staff Member dropdown in assign staff modal */
  staffMemberDropdown: 'input[id^="staffMember"][role="combobox"], input[id^="toStaffMember"][role="combobox"]',
  /** Is Primary checkbox */
  isPrimaryCheckbox: 'mat-checkbox:has-text("Primary")',

  // ═══ UNASSIGN MODALS ═══

  /** Discharge Reason dropdown - aria-label based */
  dischargeReasonDropdown: '[aria-label="Discharge Reason"]',
  /** Unassign Reason dropdown - aria-label based */
  unassignReasonDropdown: '[aria-label="Unassign Reason"]',

} as const;

export type BulkAssignmentLocatorKeys = keyof typeof BulkAssignmentLocators;
