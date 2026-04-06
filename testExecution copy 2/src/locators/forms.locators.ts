/**
 * Forms Locators
 * Centralized selectors for form inputs, buttons, and validation
 * 
 * NOTE: For common buttons (Continue, Cancel, Save), see CommonLocators.
 * This file contains Blue Compass specific form configurations.
 */
export const FormLocators = {
  // Buttons (Blue Compass specific styling)
  primaryButton: '.primary-button',
  secondaryButton: '.secondary-button',
  continueButton: "button:has-text('Continue')",
  createButton: "button:has-text('Create')",
  submitButton: 'button[type="submit"]',
  closeButton: '[class*="mini-fab"]',
  
  // Input Fields
  textInput: 'input[type="text"]',
  searchInput: 'input[type="search"]',
  combobox: '[role="combobox"]',
  
  // Organization Form Fields (Blue Compass specific)
  fullNameInput: 'input[id^="fullName"]',
  shortNameInput: 'input[id^="shortName"]',
  npiInput: 'input[id^="nationalProviderIdentifier"]',
  
  // Validation Messages (Blue Compass specific text)
  validationFullName: 'text=The required field "Full Name" has not been completed.',
  validationShortName: 'text=The required field "Short Name" has not been completed.',
  validationAtLeastOne: 'text=At least one field of the following is required',
  
  // Page Headers (Blue Compass specific)
  newOrganizationHeader: "h1:has-text('New Organization')",
  createOrganizationHeader: "div:has-text('Create Organization')",
  
  // Duplicate/Match Sections (Blue Compass specific)
  potentialDuplicates: "div:has-text('Potential Duplicates')",
  potentialMMISMatches: "div:has-text('Potential MMIS Matches')",
  
  // Debug/Utility selectors
  allInputs: 'input',
  
  // Success indicators
  successOrganizationCreated: "text=Organization created successfully",
  successCreated: "text=Successfully created",
  successOrgCreated: "text=Organization has been created",
  successGeneric: "div:has-text('Success')",
  
  // Organization page check
  organizationText: 'text=Organization',
  organizationContainer: 'table, .organization, [class*="org"]',
} as const;

export type FormLocatorKeys = keyof typeof FormLocators;
