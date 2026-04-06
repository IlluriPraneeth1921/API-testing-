/**
 * Login Page Locators
 * Centralized selectors for login and authentication flow
 */
export const LoginLocators = {
  // Cognito Login Form - using nth(1) because there are duplicate forms
  // TODO: Request data-testid from dev team to avoid positional selectors
  usernameField: 'input#signInFormUsername',
  passwordField: 'input#signInFormPassword',
  submitButton: "input[aria-label='submit']",
  
  // Acknowledge Button (dynamic text matching)
  acknowledgeButton: "button, input[type='button'], input[type='submit']",
  acknowledgeButtonText: /acknowledge/i,
  
  // Organization Selection
  organizationLabel: "span:text-is('Organization')",
  combobox: "input[role='combobox']",
  
  // Login Button
  loginButton: 'button',
  loginButtonText: /log in/i,
  
  // Dashboard Verification
  dashboardHeader: "[aria-label='primary-layout-header-container']",
} as const;

export type LoginLocatorKeys = keyof typeof LoginLocators;
