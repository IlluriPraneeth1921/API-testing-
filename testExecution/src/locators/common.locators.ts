/**
 * Common Locators - Shared across ALL screens
 * 
 * UPGRADE IMPACT: When Angular Material or Pillar upgrades happen,
 * update these selectors ONCE and all screens benefit.
 * 
 * These are framework-level components that appear on multiple screens.
 */
export const CommonLocators = {
  // ============================================
  // ANGULAR MATERIAL COMPONENTS
  // Update these when Angular Material version changes
  // ============================================
  
  // Tables
  matTable: 'mat-table[role="table"]',
  matHeaderRow: 'mat-header-row',
  matRow: 'mat-row',
  matCell: 'mat-cell',
  matHeaderCell: 'mat-header-cell',
  
  // Form Controls
  matSelect: 'mat-select',
  matOption: 'mat-option',
  matInput: 'input.mat-mdc-input-element',
  matCheckbox: 'mat-checkbox',
  matRadio: 'mat-radio-button',
  matSlideToggle: 'mat-slide-toggle',
  
  // Buttons
  matButton: 'button.mat-mdc-button',
  matRaisedButton: 'button.mat-mdc-raised-button',
  matFab: 'button.mat-mdc-fab',
  matMiniFab: 'button.mat-mdc-mini-fab',
  matIconButton: 'button.mat-mdc-icon-button',
  
  // Icons
  matIcon: 'mat-icon',
  
  // Dialogs/Overlays
  matDialog: 'mat-dialog-container',
  matDialogTitle: 'mat-dialog-title',
  matDialogContent: 'mat-dialog-content',
  matDialogActions: 'mat-dialog-actions',
  matSnackbar: 'mat-snack-bar-container',
  
  // Progress Indicators
  matSpinner: 'mat-spinner',
  matProgressBar: 'mat-progress-bar',
  
  // ============================================
  // PAGINATION (Same on every table)
  // ============================================
  paginatorFirst: '[aria-label="First page"]',
  paginatorPrevious: '[aria-label="Previous page"]',
  paginatorNext: '[aria-label="Next page"]',
  paginatorLast: '[aria-label="Last page"]',
  paginatorPageSize: '.mat-mdc-paginator-page-size-select',
  paginatorRangeLabel: '.mat-mdc-paginator-range-label',
  
  // ============================================
  // COMMON BUTTONS (Text-based)
  // ============================================
  continueBtn: "button:has-text('Continue')",
  cancelBtn: "button:has-text('Cancel')",
  saveBtn: "button:has-text('Save')",
  submitBtn: "button:has-text('Submit')",
  closeBtn: "button:has-text('Close')",
  deleteBtn: "button:has-text('Delete')",
  editBtn: "button:has-text('Edit')",
  addBtn: "button:has-text('Add')",
  searchBtn: "button:has-text('Search')",
  clearBtn: "button:has-text('Clear')",
  
  // ============================================
  // COMMON FORM ELEMENTS
  // ============================================
  textInput: 'input[type="text"]',
  passwordInput: 'input[type="password"]',
  emailInput: 'input[type="email"]',
  searchInput: 'input[type="search"]',
  combobox: '[role="combobox"]',
  listbox: '[role="listbox"]',
  
  // ============================================
  // COMMON STRUCTURAL ELEMENTS
  // ============================================
  loadingOverlay: '.loading-overlay, .cdk-overlay-backdrop',
  errorMessage: '.error-message, .mat-mdc-form-field-error',
  successMessage: '.success-message',
  warningMessage: '.warning-message',
  
  // ============================================
  // ACCESSIBILITY ROLES
  // ============================================
  roleButton: '[role="button"]',
  roleLink: '[role="link"]',
  roleTab: '[role="tab"]',
  roleTabPanel: '[role="tabpanel"]',
  roleMenu: '[role="menu"]',
  roleMenuItem: '[role="menuitem"]',
  roleDialog: '[role="dialog"]',
  roleAlert: '[role="alert"]',
  roleGrid: '[role="grid"]',
  roleRow: '[role="row"]',
} as const;

export type CommonLocatorKeys = keyof typeof CommonLocators;
