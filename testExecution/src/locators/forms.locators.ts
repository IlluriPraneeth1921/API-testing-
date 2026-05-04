/**
 * Forms Locators
 * Centralized selectors for form inputs, buttons, and validation
 *
 * ─── REFACTOR NOTE (April 2026) ───────────────────────────────────────────────
 * The following locators were REMOVED from this file because they are exact
 * duplicates of entries already in CommonLocators:
 *
 *   REMOVED          → USE INSTEAD
 *   continueButton   → CommonLocators.continueBtn
 *   textInput        → CommonLocators.textInput
 *   searchInput      → CommonLocators.searchInput
 *   combobox         → CommonLocators.combobox
 *
 * WHY: RULES.md §1.5 — duplicates in module files cause confusion about which
 * to use and make upgrades harder (you'd need to update two places).
 *
 * Audit tool: npm run audit:locators (src/tools/audit-locators.ts)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * This file retains ONLY Blue Compass specific form configurations:
 * - Organization form field id patterns
 * - Blue Compass specific validation messages
 * - Blue Compass specific page headers and success indicators
 * - Blue Compass specific button styling classes (.primary-button, etc.)
 *
 * NOTE: For common buttons (Continue, Cancel, Save), see CommonLocators.
 */
export const FormLocators = {
  // Buttons (Blue Compass specific styling)
  primaryButton: '.primary-button',
  secondaryButton: '.secondary-button',
  // NOTE: continueButton → use CommonLocators.continueBtn
  createButton: "button:has-text('Create')",
  submitButton: 'button[type="submit"]',
  closeButton: '[class*="mini-fab"]',
  
  // Input Fields
  // NOTE: textInput, searchInput, combobox → use CommonLocators equivalents
  
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
