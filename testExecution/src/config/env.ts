/**
 * Environment Configuration
 * 
 * All environment-specific settings, credentials, test data, and timeouts.
 * Values come from .env files per environment (STD-F1, STD-F3, QA, etc.)
 * 
 * RULE: No hardcoded values in Page Objects or Step Definitions.
 *       Everything flows from here.
 */
import * as dotenv from "dotenv";
dotenv.config({ override: false });

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT & CREDENTIALS
// ═══════════════════════════════════════════════════════════════
export const env = {
  baseUrl: process.env.BASE_URL || "https://standard-f1-carity.feisystemsh2env.com/",
  headless: (process.env.HEADLESS || "true") === "true",
  browser: process.env.BROWSER || "chromium",
  username: process.env.APP_USERNAME || "George.Parker",
  password: process.env.PASSWORD || "Password123#",
  organization: process.env.ORGANIZATION || "Quantum",
  location: process.env.LOCATION || "Quantum Services Medical Equipment",
  staffMember: process.env.STAFF_MEMBER || "Self",
};

// ═══════════════════════════════════════════════════════════════
// WAIT TIMEOUTS (milliseconds)
// Adjust per environment via .env overrides if needed
// ═══════════════════════════════════════════════════════════════
export const Waits = {
  /** Short waits - UI transitions, click settling (300-500ms) */
  MIN: Number(process.env.WAIT_MIN) || 500,
  /** Medium waits - dropdown populate, panel open (1500-2000ms) */
  AVG: Number(process.env.WAIT_AVG) || 2000,
  /** Long waits - page load, search results, API responses (5000ms) */
  MAX: Number(process.env.WAIT_MAX) || 5000,
  /** Extra long waits - slow page transitions, MMIS/org creation (8000ms) */
  LONG: Number(process.env.WAIT_LONG) || 8000,
  /** Element visibility timeout for assertions */
  ELEMENT_TIMEOUT: Number(process.env.WAIT_ELEMENT_TIMEOUT) || 10000,
  /** Autocomplete type delay between keystrokes */
  TYPE_DELAY: Number(process.env.WAIT_TYPE_DELAY) || 150,
};

