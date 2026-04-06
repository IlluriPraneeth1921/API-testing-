/**
 * Search & Results Locators
 * Centralized selectors for search functionality and results
 */
export const SearchLocators = {
  // Search Type Dropdown
  searchTypeCombobox: '[role="combobox"]',
  organizationsOption: 'mat-option:has-text("Organizations")',
  personsOption: 'mat-option:has-text("Persons")',
  
  // Search Input
  searchTextBox: 'input[type="text"]',
  
  // Main Content Area
  mainContent: '#main-content',
  
  // Action Buttons
  addNewPersonBtn: 'button:has-text("Add New Person")',
  addNewOrganizationBtn: 'text=Add New Organization',
  exportResultsBtn: 'button:has-text("Export Results")',
  
  // Search Panel Tabs
  searchTab: '[role="tab"]:has-text("Search")',
  advancedSearchTab: '[role="tab"]:has-text("Advanced Search")',
  
  // Search/Clear Buttons
  searchButton: '.primary-button:has-text("Search")',
  clearButton: '.secondary-button:has-text("Clear")',
} as const;

export type SearchLocatorKeys = keyof typeof SearchLocators;
