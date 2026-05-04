/**
 * Navigation/Sidebar Locators
 * Centralized selectors for left navigation and menu items
 * 
 * NOTE: Organization profile left nav uses span:text-is() selectors
 * Person profile left nav uses button.side-navigation-item-button
 */
export const NavigationLocators = {
  // Left Navigation Elements — organization profile (span-based)
  profile: 'span:text-is("Profile")',
  locations: 'span:text-is("Locations")',
  staffMembers: 'span:text-is("Staff Members")',
  supportedPrograms: 'span:text-is("Supported Programs")',
  attachments: 'span:text-is("Attachments")',
  assignments: 'span:text-is("Assignments")',
  roles: 'span:text-is("Roles")',
  forms: 'span:text-is("Forms")',
  notes: 'span:text-is("Notes")',
  letters: 'span:text-is("Letters")',
  serviceEvents: 'span:text-is("Service Events")',
  contracts: 'span:text-is("Contracts")',
  
  // Contact Form
  contactForm: "span:text-is('Contact Form')",
  
  // Queries
  queries: "span:text-is('Queries')",
  runQuery: "span:text-is('Run Query')",
  personAssignments: "h2:text-is('Person Assignments')",
  
  // Administration Sections (h2 headers)
  systemAttachments: 'h2:text-is("System Attachments")',
  notificationDefinitions: 'h2:text-is("Notification Definitions & Triggers")',
  organizationRoles: 'h2:text-is("Organization Roles")',
  personAssignmentDefinitions: 'h2:text-is("Person Assignment Definitions")',
  programs: 'h2:text-is("Programs")',
  announcements: 'h2:text-is("Announcements")',
  systemAccount: 'h2:text-is("System Account")',
  rolesPermissions: 'h2:text-is("Roles & Permissions")',
  regionCountyMapping: 'h2:text-is("Region/County Mapping")',
  formDefinitions: 'h2:text-is("Form Definitions")',
  serviceDefinitions: 'h2:text-is("Service Definitions")',
  reportConfiguration: 'h2:text-is("Report Configuration")',
} as const;

export type NavigationLocatorKeys = keyof typeof NavigationLocators;
