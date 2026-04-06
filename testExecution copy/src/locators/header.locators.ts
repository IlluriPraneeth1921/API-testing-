/**
 * Header/Navigation Locators
 * Centralized selectors for header, navigation, and user menu
 */
export const HeaderLocators = {
  // Main Header Container
  container: "[aria-label='primary-layout-header-container']",
  
  // Logo/Branding
  logo: "[aria-label='Carity Logo']",
  
  // Global Search Bar
  searchTypeDropdown: "[aria-label='Search Type Dropdown']",
  searchInput: "[aria-label='search']",
  searchHistoryBtn: "[aria-label='Search History']",
  advancedSearchBtn: "[aria-label='Advanced Search']",
  
  // Quick Access Buttons
  myNotesBtn: "[aria-label='Open scratch pad and add a new note']",
  incidentEventsBtn: 'button:has(.search-link__label:text("Incident Events"))',
  contactFormBtn: 'button:has(.search-link__label:text("Contact Form"))',
  
  // User Menu
  helpMenu: "[aria-label='User Help Menu']",
  userMenu: '#btn-help',
  moreOptionsBtn: "[aria-label='more options']",
  
  // Navigation Tabs
  administrationTab: "span:text-is('Administration')",
  queriesTab: "span:text-is('Queries')",
  
  // Slide Toggle
  sideColumnToggle: "[aria-label='Hide side column']",
} as const;

export type HeaderLocatorKeys = keyof typeof HeaderLocators;
