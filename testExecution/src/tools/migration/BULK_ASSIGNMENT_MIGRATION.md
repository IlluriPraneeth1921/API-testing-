# Bulk Assignment Module — Katalon → Playwright Migration Cheat Sheet

> Auto-generated from 10 Katalon Groovy regression scripts in:
> `Scripts/WebApp/Carity/Standard/Regression Test/Features/BulkAssignments/`

---

## 📋 Test Cases (10 scripts)

| TC ID | Name | What It Tests |
|-------|------|---------------|
| 440985 | ValidateButtonsOnBulkAssignmentListPage | Verifies Assign Location, Assign Staff, Unassign Location, Unassign Staff, Export buttons |
| 440987 | ValidateColumnsOnBulkAssignmentListPage | Column Select → verifies all table columns visible |
| 440973 | ValidateFiltersOnBulkAssignmentListPage | Advanced Search filters: Query Type dropdown cycles through all 4 values, verifies conditional fields |
| 440978 | ValidateDifferentFilterCombinationsReturnsCorrectResults | Runs queries with different filter combos (Has Staff + Case Worker Supervisor + All Locations + George Parker) |
| 503938 | ValidateUserSeeNumberOfSelectedRecords | Select-all checkbox, verify "selected on page" count, pagination labels |
| 556242 | ValidateUserAbleExportBulkAssignments | Verify Export button visible |
| 556255 | ValidateFieldsInLocationBulkAssignments | Assign Location flow: required field validation → fill form → Confirmation → Close |
| 556256 | ValidateFieldsInStaffMemberBulkAssignments | Assign Staff flow: required field validation → fill form → Confirmation → Close |
| 556258 | ValidateFieldsInLocationBulkUnassignments | Unassign Location flow: required field validation → fill form → Confirmation → Close |
| 556263 | ValidateFieldsInStaffUnassignmentsBulkAssignments | Unassign Staff flow: required field validation → fill form → Confirmation → Close |

---

## 🖥️ Screens Visited

1. **Bulk Assignments List Page** (main page)
2. **Advanced Search Panel** (expandable on list page)
3. **Location Bulk Assignments Modal** (h1: "Location Bulk Assignments")
4. **Staff Member Bulk Assignments Modal** (h1: "Staff Member Bulk Assignments")
5. **Location Bulk Unassignments Modal** (h1: "Location Bulk Unassignments")
6. **Staff Member Bulk Unassignments Modal** (h1: "Staff Member Bulk Unassignments")
7. **Confirmation Page** (h1: "Confirmation")

---

## 🎯 Elements Used (Extracted from Scripts)

### Page Headers (h1)
| Text Value | Used In |
|------------|---------|
| `Bulk Assignments` | All scripts — main page verification |
| ` Location Bulk Assignments ` | 556255 — Assign Location modal |
| ` Staff Member Bulk Assignments ` | 556256 — Assign Staff modal |
| ` Location Bulk Unassignments ` | 556258 — Unassign Location modal |
| ` Staff Member Bulk Unassignments ` | 556263 — Unassign Staff modal |
| ` Confirmation ` | 556255, 556256, 556258, 556263 |

### Action Buttons (span text)
| Text Value | Playwright Locator Suggestion |
|------------|-------------------------------|
| ` Assign Location ` | `button:has-text('Assign Location')` |
| ` Assign Staff ` | `button:has-text('Assign Staff')` |
| ` Unassign Location ` | `button:has-text('Unassign Location')` |
| ` Unassign Staff ` | `button:has-text('Unassign Staff')` |
| ` Export ` | `button:has-text('Export')` |
| ` Run Query ` | `button:has-text('Run Query')` |
| ` Continue ` | `button:has-text('Continue')` → already in CommonLocators |
| ` Close ` | `button:has-text('Close')` → already in CommonLocators |
| `Clear` | `button:has-text('Clear')` → already in CommonLocators |
| `Cancel` | `button:has-text('Cancel')` → already in CommonLocators |
| `Column Select` | `span:has-text('Column Select')` |

### Buttons by aria-label
| aria-label | Playwright Locator |
|------------|-------------------|
| `Open Advanced Search` | `[aria-label='Open Advanced Search']` |
| `Close Advanced Search` | `[aria-label='Close Advanced Search']` |

### Navigation Elements
| Element | Katalon Object | Playwright Locator |
|---------|---------------|-------------------|
| Bulk Assignments nav link | `spanAnyText('Bulk Assignments')` | `span:has-text('Bulk Assignments')` |
| More menu icon | `matIconAnyText('more_vert')` | `mat-icon:has-text('more_vert')` |
| Column options button | `anyTagWithClass('plr-primary-button column-options')` | `.plr-primary-button.column-options` |

### Query Type Dropdown Values
| Value | Filter Context |
|-------|---------------|
| `Has Staff Assignment` | Shows: Staff Assignment Type, Assigned Staff dropdowns |
| `Has No Staff Assignment` | Shows: Staff Assignment Type dropdown |
| `Has Location Assignment` | Shows: Location Assignment Type dropdown |
| `Has No Location Assignment` | Shows: Location Assignment Type dropdown |

### Conditional Filter Labels (visible based on Query Type)
| Label | Visible When |
|-------|-------------|
| `Staff Assignment Type` | Has Staff / Has No Staff Assignment |
| `Location Assignment Type` | Has Location / Has No Location Assignment |
| `First Name` | Advanced Search expanded |
| `Last Name` | Advanced Search expanded |
| `PMI Number` | Advanced Search expanded |

### Table Columns (verified in 440987)
| Column Name |
|-------------|
| Person Name |
| Person ID |
| Date of Birth |
| Medicaid ID |
| County |
| Location Assignment Type |
| Assigned Location |
| Location Assignment Effective Date |
| Staff Assignment Type |
| Assigned Staff |
| Staff Assignment Effective Date |

### Form Fields — Assign Location Modal (556255)
| Field | Katalon Locator | ID/Selector |
|-------|----------------|-------------|
| Assignment Type dropdown | `input_DropDown(1)` | Positional — needs HTML |
| Location dropdown | `input_DropDown(2)` | Positional — needs HTML |
| Effective Start Date | `inputAnyID('effectiveStartDate_')` | `input[id*='effectiveStartDate_']` |
| Note textarea | `txtAreaAnyID('note_')` | `textarea[id*='note_']` |

### Form Fields — Assign Staff Modal (556256)
| Field | Katalon Locator | ID/Selector |
|-------|----------------|-------------|
| Assignment Type dropdown | `input_DropDown(1)` | Positional — needs HTML |
| Staff Member dropdown | `input_DropDown(2)` | Positional — needs HTML |
| Location dropdown | `input_DropDown(3)` | Positional — needs HTML |
| Effective Start Date | `inputAnyID('effectiveStartDate_')` | `input[id*='effectiveStartDate_']` |
| Note textarea | `txtAreaAnyID('note_')` | `textarea[id*='note_']` |

### Form Fields — Unassign Location Modal (556258)
| Field | Katalon Locator | ID/Selector |
|-------|----------------|-------------|
| Discharge Reason dropdown | `input_DropDown(1)` | Positional — needs HTML |
| Comment textarea | `txtAreaAnyID('comment_')` | `textarea[id*='comment_']` |

### Form Fields — Unassign Staff Modal (556263)
| Field | Katalon Locator | ID/Selector |
|-------|----------------|-------------|
| Unassign Reason dropdown | `input_DropDown(1)` | Positional — needs HTML |
| Comment textarea | `txtAreaAnyID('comment_')` | `textarea[id*='comment_']` |

### Validation Messages (p tag text)
| Message | Screen |
|---------|--------|
| `Assignment Type is required.` | Assign Location, Assign Staff |
| `Location is required.` | Assign Location, Assign Staff |
| `Effective Start Date is required.` | Assign Location, Assign Staff |
| `Staff Member is required.` | Assign Staff only |
| `Discharge Reason is required.` | Unassign Location |
| `Unassign Reason is required.` | Unassign Staff |

### Pagination & Selection
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Items per page label | `anyTagWithText('Items per page')` | `text='Items per page'` |
| Paginator range label | `anyTagWithClass('paginator-range-label')` | `.paginator-range-label` |
| Select-all checkbox | `anyTaganyAttributeAnyValue('mat-checkbox','id','checkbox-')` | `mat-checkbox[id*='checkbox-']` |
| Row checkboxes | `matcheckboxWithID('checkbox-', N)` | `mat-checkbox[id*='checkbox-']:nth(N)` |
| Selected count text | `spanAnyText(' selected on page. ')` | `span:has-text('selected on page.')` |

### Column Select Panel
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Column option items | `anyTaganyAttributeAnyValue('mat-list-option','role','menuitemcheckbox')` | `mat-list-option[role='menuitemcheckbox']` |
| Column checkbox | `matListOptionWithCalss('ng-star-inserted', N)` | Check `aria-checked` attribute |

### Custom Keywords Used
| Keyword | Purpose | Playwright Equivalent |
|---------|---------|----------------------|
| `loginWithParameters(m)` | Login flow | Already have LoginKeywords |
| `highlightElement(obj)` | Visual highlight for debugging | Not needed in Playwright |
| `compareStaticnDynamicOptions(obj, list)` | Compare dropdown values | Custom assertion helper |
| `selectvalueforanyDD(value, position)` | Select dropdown by position | Need dropdown helper |
| `getCurrentDate()` | Get current date string | `new Date().toLocaleDateString()` |

---

## 🔄 Mapping to Existing Playwright Structure

### Already Exists (reuse as-is)
- `CommonLocators`: Continue, Cancel, Close, Save buttons; mat-table, mat-row, pagination
- `LoginKeywords`: Login flow
- `NavigationPage`: Nav menu interactions

### Needs Creation
- `bulk-assignment.locators.ts` — **already exists**, verify/update with above elements
- `BulkAssignmentListPage.ts` — **already exists**, verify/update
- `BulkAssignmentModalPage.ts` — **already exists**, verify/update
- `BulkAssignmentSearchPage.ts` — **already exists**, verify/update

### ⚠️ HTML Still Needed For
1. **Assign Location modal** — to get proper selectors for Assignment Type, Location dropdowns (currently positional)
2. **Assign Staff modal** — Assignment Type, Staff Member, Location dropdowns
3. **Unassign Location modal** — Discharge Reason dropdown
4. **Unassign Staff modal** — Unassign Reason dropdown
5. **Column Select panel** — to verify mat-list-option structure

---

## 📝 Suggested Test Flow (Playwright BDD)

```gherkin
@bulk-assignment
Feature: Bulk Assignments

  Background:
    Given I am logged in
    And I navigate to Bulk Assignments

  # TC 440985
  Scenario: Validate buttons on Bulk Assignment list page
    Then I should see the following buttons:
      | Assign Location | Assign Staff | Unassign Location | Unassign Staff | Export |

  # TC 440987
  Scenario: Validate columns on Bulk Assignment list page
    When I open Column Select and enable all columns
    Then I should see the following columns:
      | Person Name | Person ID | Date of Birth | Medicaid ID | County |
      | Location Assignment Type | Assigned Location | Location Assignment Effective Date |
      | Staff Assignment Type | Assigned Staff | Staff Assignment Effective Date |

  # TC 440973
  Scenario Outline: Validate filters show correct conditional fields
    When I open Advanced Search
    And I select Query Type "<queryType>"
    Then I should see "<conditionalField>" label
    Examples:
      | queryType                    | conditionalField         |
      | Has Staff Assignment         | Staff Assignment Type    |
      | Has No Staff Assignment      | Staff Assignment Type    |
      | Has Location Assignment      | Location Assignment Type |
      | Has No Location Assignment   | Location Assignment Type |

  # TC 556255
  Scenario: Validate Location Bulk Assignment required fields and flow
    When I run query with "Has No Staff Assignment" and select 3 records
    And I click "Assign Location"
    Then I should see "Location Bulk Assignments" header
    When I click "Continue" without filling fields
    Then I should see validation errors:
      | Assignment Type is required. | Location is required. | Effective Start Date is required. |
    When I fill Assignment Type, Location, Effective Start Date, and Note
    And I click "Continue"
    Then I should see "Confirmation" header
    When I confirm and close
    Then I should return to Bulk Assignments list

  # TC 556256 — similar for Assign Staff (adds Staff Member required)
  # TC 556258 — similar for Unassign Location (Discharge Reason required)
  # TC 556263 — similar for Unassign Staff (Unassign Reason required)
```

---

## ✅ Migration Checklist

- [ ] Verify `bulk-assignment.locators.ts` has all elements above
- [ ] Add missing locators (Advanced Search button, Column Select, modal headers)
- [ ] Capture HTML for 4 modal dialogs (Assign Location/Staff, Unassign Location/Staff)
- [ ] Update `BulkAssignmentModalPage.ts` with proper dropdown selectors from HTML
- [ ] Create/update feature file with scenarios above
- [ ] Create step definitions for new scenarios
- [ ] Run `npm run verify:locators` to check for CommonLocators duplicates
