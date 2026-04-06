/**
 * Centralized Locator Registry
 * 
 * All element locators are defined here to:
 * 1. Isolate Angular upgrade changes to these files only
 * 2. Provide a single source of truth for selectors
 * 3. Enable easy locator auditing and maintenance
 * 
 * FILE ORGANIZATION:
 * - common.locators.ts    → Shared Angular Material & framework components (UPDATE FIRST on upgrades)
 * - header.locators.ts    → Header/navigation bar elements
 * - navigation.locators.ts → Left sidebar & menu items
 * - table.locators.ts     → Data tables & pagination
 * - forms.locators.ts     → Form inputs, buttons, validation
 * - search.locators.ts    → Search functionality
 * - login.locators.ts     → Login page specific
 * 
 * Locator Priority (use in this order):
 * 1. aria-label - Most stable, accessibility-friendly
 * 2. id - Stable if not dynamically generated
 * 3. role - Semantic, framework-agnostic
 * 4. mat-column-* - Angular Material semantic classes
 * 5. text-based - OK if labels don't change
 * 6. CSS classes - Medium risk
 * 7. positional (nth) - HIGH RISK, avoid if possible
 * 
 * UPGRADE GUIDE:
 * When Angular Material or Pillar upgrades happen:
 * 1. First update common.locators.ts (affects all screens)
 * 2. Then update component-specific files as needed
 * 3. Run smoke test to verify: npm run test:smoke
 */

// Common/Shared locators - UPDATE FIRST on framework upgrades
export { CommonLocators } from './common.locators';

// Component-specific locators
export { LoginLocators } from './login.locators';
export { HeaderLocators } from './header.locators';
export { SearchLocators } from './search.locators';
export { TableLocators } from './table.locators';
export { FormLocators } from './forms.locators';
export { NavigationLocators } from './navigation.locators';
export { BulkAssignmentLocators } from './bulk-assignment.locators';

// Re-export types
export type { CommonLocatorKeys } from './common.locators';
export type { LoginLocatorKeys } from './login.locators';
export type { HeaderLocatorKeys } from './header.locators';
export type { SearchLocatorKeys } from './search.locators';
export type { TableLocatorKeys } from './table.locators';
export type { FormLocatorKeys } from './forms.locators';
export type { NavigationLocatorKeys } from './navigation.locators';
export type { BulkAssignmentLocatorKeys } from './bulk-assignment.locators';
