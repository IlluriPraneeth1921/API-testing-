/**
 * Test Data Registry - Per Test Case
 * 
 * Each TC has its own data object with all values needed for that scenario.
 * Shared/default values are in `defaults` and merged into each TC.
 * 
 * USAGE IN STEPS:
 *   import { getTestData } from '@src/data/test-data';
 *   const td = getTestData('TC556255');
 *   await searchPage.searchWithMandatoryFields(td.search);
 *   await modalPage.fillLocationAssignmentForm(td.modal);
 * 
 * ADDING A NEW TC:
 *   1. Add a new entry in `testCaseData` below
 *   2. Only specify values that differ from `defaults`
 *   3. Use getTestData('TC_ID') in your step file
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BulkAssignmentSearchData {
  queryType: string;
  staffAssignmentType: string;
  searchLocation: string;
}

export interface BulkAssignmentModalData {
  assignmentType: string;
  modalLocation: string;
  effectiveStartDate: string; // empty = today
  note: string;
  staffMember?: string;       // for staff assignment
  isPrimary?: boolean;        // for staff assignment
}

export interface BulkAssignmentTestData {
  search: BulkAssignmentSearchData;
  modal: BulkAssignmentModalData;
  confirmationText: string;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULTS - shared across TCs unless overridden
// ═══════════════════════════════════════════════════════════════

const defaults: BulkAssignmentTestData = {
  search: {
    queryType: 'Has No Staff',
    staffAssignmentType: 'APS Intake',
    searchLocation: 'All Locations',
  },
  modal: {
    assignmentType: 'Primary',
    modalLocation: 'Quantum Services Medical Equipment',
    effectiveStartDate: '', // empty = use today
    note: 'Test assignment via automation',
  },
  confirmationText: 'You are about to assign a location to the selected member records',
};

// ═══════════════════════════════════════════════════════════════
// PER-TC DATA - only override what differs from defaults
// ═══════════════════════════════════════════════════════════════

const testCaseData: Record<string, Partial<BulkAssignmentTestData>> = {
  // Katalon migrated — list/column/search validation TCs (use defaults, no overrides needed)
  TC440985: {}, // Buttons visible
  TC440987: {}, // Column select panel
  TC440973: {}, // Query type options
  TC556242: {}, // Export button

  TC440978: {
    search: { ...defaults.search, queryType: 'Has Staff Assignment', staffAssignmentType: 'Case Worker Supervisor', searchLocation: 'All Locations' },
  },

  TC503938: {
    search: { ...defaults.search, queryType: 'Has No Staff Assignment', staffAssignmentType: 'Caseworker', searchLocation: 'All Locations' },
  },

  TC556255: {
    // Assign Location flow - CMA is the actual assignment type in this env
    modal: {
      ...defaults.modal,
      assignmentType: 'CMA',
    },
  },

  TC556258: {
    // Unassign Location flow — confirmed working on dev-f5 (April 2026)
    // searchUntilResults found: "Has No Staff Assignment" + "APS Intake Staff" returns rows
    // "Has Location Assignment" query type does not show Staff/Location dropdowns on this env
    search: {
      ...defaults.search,
      queryType: 'Has No Staff Assignment',
      staffAssignmentType: 'APS Intake Staff',
      searchLocation: 'All Locations',
    },
    confirmationText: 'You are about to unassign',
  },

  TC556256: {
    // Assign Staff flow — values from dev-f5 actual data (April 2026)
    modal: {
      ...defaults.modal,
      assignmentType: 'BI Case Coordinator',
      staffMember: 'Smith Parker',
      modalLocation: 'Quantum Services Medical Equipment',
      isPrimary: false,
    },
    confirmationText: 'You are about to assign a staff member to the selected member records',
  },

  TC556263: {
    // Unassign Staff flow — confirmed working on dev-f5 (April 2026)
    // searchUntilResults found: "Has No Staff Assignment" + "BI Case Coordinator" returns 40 rows
    search: {
      ...defaults.search,
      queryType: 'Has No Staff Assignment',
      staffAssignmentType: 'BI Case Coordinator',
      searchLocation: 'All Locations',
    },
    confirmationText: 'You are about to unassign',
  },

  // TC556257: placeholder — not yet implemented
};

// ═══════════════════════════════════════════════════════════════
// ACCESSOR
// ═══════════════════════════════════════════════════════════════

/**
 * Get test data for a specific TC, merged with defaults.
 * @param tcId - Test case ID (e.g. 'TC556255')
 * @returns Fully merged test data object
 */
export function getTestData(tcId: string): BulkAssignmentTestData {
  const overrides = testCaseData[tcId] || {};
  const merged: BulkAssignmentTestData = {
    search: { ...defaults.search, ...overrides.search },
    modal: { ...defaults.modal, ...overrides.modal },
    confirmationText: overrides.confirmationText || defaults.confirmationText,
  };

  console.log(`[TEST_DATA] Loaded data for ${tcId}:`);
  console.log(`[TEST_DATA]   Search: queryType="${merged.search.queryType}", staffType="${merged.search.staffAssignmentType}", location="${merged.search.searchLocation}"`);
  console.log(`[TEST_DATA]   Modal:  assignmentType="${merged.modal.assignmentType}", location="${merged.modal.modalLocation}"`);

  return merged;
}

/**
 * Get default test data (when no specific TC is needed)
 */
export function getDefaultTestData(): BulkAssignmentTestData {
  return { ...defaults, search: { ...defaults.search }, modal: { ...defaults.modal } };
}
