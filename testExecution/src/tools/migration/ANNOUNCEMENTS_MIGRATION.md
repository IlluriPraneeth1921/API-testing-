# Announcements Module — Katalon → Playwright Migration Cheat Sheet

> Auto-generated from 16 Katalon Groovy regression scripts in:
> `Scripts/WebApp/Carity/Standard/Regression Test/Features/Announcements/`

---

## 📋 Test Cases (16 scripts)

| TC ID | Name | What It Tests |
|-------|------|---------------|
| 733064 | Validate Announcements Tile and logo in Administration page | Admin nav → Announcements tile with image |
| 733075 | Validate Quick Search for Announcements screen | Search box: type text + Enter, clear (X), search icon |
| 733080 | Validate Data Elements Table for Announcements list page | Table columns, row data, Add button, 3-dot menu (Edit/Delete), expand/collapse detail |
| 733094 | Validate Announcements tab icons and fields are displayed | Same as 733080 — columns, menu items, detail toggle |
| 733170 | Validate announcements can be created with full permissions | Full create flow: Status, Title, Type, Priority, Start/End Date, Details → Save |
| 749775 | Validate list of Announcements on dashboard tile in home screen | Dashboard tile shows announcements |
| 752310 | Validate clicking announcement tile navigates to list page | Dashboard tile → Announcements list navigation |
| 752316 | Validate Add Announcements button and back button | Add Announcement + Back button presence |
| 752639 | Validate data elements of Add Announcement popup | Verify all form fields present: Status, Title, Type, Priority, Start Date, End Date, Details |
| 752676 | Validate required field validations while creating announcements | Clear all fields → Save → verify error messages |
| 752911 | Validate announcements can be edited with required permissions | Edit flow via 3-dot menu |
| 752912 | Validate user can edit published announcements | Edit published announcement |
| 752913 | Validate user can edit status of announcements | Change status of existing announcement |
| 752914 | Validate data elements of Edit Announcement popup | Verify edit form fields |
| 753115 | Validate announcements can be deleted with required permissions | Delete flow via 3-dot menu |
| 753116 | Validate user can delete both draft and published announcements | Delete draft + published |

---

## 🖥️ Screens Visited

1. **Home Page** (dashboard with Announcements tile)
2. **Administration Page** (tile grid with Announcements image)
3. **Announcements List Page** (table with search, Add button, 3-dot menus)
4. **Add Announcement Dialog** (form with Status, Title, Type, Priority, Dates, Details)
5. **Edit Announcement Dialog** (same form, pre-populated)
6. **Delete Confirmation Dialog**

---

## 🎯 Elements Used (Extracted from Scripts)

### Navigation to Announcements
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Administration nav link | `spanAnyText('Administration')` | `span:has-text('Administration')` |
| 3-dots on home page (overflow menu) | `3dotsOnHomePage` | Needs HTML — likely `mat-icon:has-text('more_vert')` |
| Announcements tile image | `anyImageSrc('Announcements')` | `img[src*='Announcements']` or `img[alt='Announcements']` |

### Announcements List Page
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Add Announcement button | `spanAnyText('Add Announcement')` | `button:has-text('Add Announcement')` |
| Search input | `inputAnyID('searchInput')` | `input#searchInput` |
| Clear search button | `anyTagWithClass('btn-clear')` | `.btn-clear` |
| Search button | `anyTagWithClass('btn-search')` | `.btn-search` |
| 3-dot row menu | `3Ellipses` (Standard) | Needs HTML — likely `button[mat-icon-button]` per row |
| Edit menu item | `matIconAnyText('edit')` / `divAnyRole('menuitem', 1)` | `[role='menuitem']:has-text('Edit')` |
| Delete menu item | `matIconAnyText('delete')` / `divAnyRole('menuitem', 2)` | `[role='menuitem']:has-text('Delete')` |
| Menu container | `divAnyRole('menu')` | `[role='menu']` |
| Expand/collapse toggle | `anyTagWithClass('toggle-button mdc-icon-button mat-mdc-icon-button')` | `.toggle-button.mdc-icon-button` |

### Table Columns (verified in 733080, 733094)
| Column Name |
|-------------|
| Announcement Type |
| Title |
| Start Date |
| End Date |
| Priority |
| Status |

### Table Data Access
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Cell value (row R, col C) | `colValueAnyRowListPage(colNum: C, rowNum: R)` | Positional — needs HTML for exact selector |

### Add/Edit Announcement Form Fields
| Field | Katalon Locator | ID/Selector | Playwright Locator |
|-------|----------------|-------------|-------------------|
| Status dropdown | `input_DropDown(1)` | Positional | Needs HTML for aria-label/id |
| Title input | `inputAnyID('title')` | `id='title'` | `input#title` |
| Announcement Type dropdown | `input_DropDown(2)` | Positional | Needs HTML for aria-label/id |
| Display Priority input | `inputAnyID('displayPriority')` | `id='displayPriority'` | `input#displayPriority` |
| Start Date input | `inputAnyID('startDate')` | `id='startDate'` | `input#startDate` |
| End Date input | `inputAnyID('endDate')` | `id='endDate'` | `input#endDate` |
| Start Date calendar toggle | `anyTagWithClass('mat-datepicker-toggle', 1)` | — | `.mat-datepicker-toggle:nth(0)` |
| End Date calendar toggle | `anyTagWithClass('mat-datepicker-toggle', 3)` | — | `.mat-datepicker-toggle:nth(2)` |
| Calendar active date | `anyTagWithClass('mat-calendar-body-active')` | — | `.mat-calendar-body-active` |
| Announcement Details (rich text) | `anyTagWithClass('ck ck-content')` | CKEditor | `.ck.ck-content` |
| Save button | `spanAnyText('Save')` | — | Already in CommonLocators |
| Cancel button | `spanAnyText('Cancel')` | — | Already in CommonLocators |

### Dropdown Values Used
| Dropdown | Values |
|----------|--------|
| Status | `Draft`, `Published` |
| Announcement Type | `Deadlines` (+ others from dropdown) |

### Validation Error Messages
| Error Message |
|---------------|
| `The required field "Status" has not been completed.` |
| `The required field "Title" has not been completed.` |
| `The required field "Announcement Type" has not been completed.` |
| `The required field "Display Priority" has not been completed.` |
| `The required field "Announcement Details" has not been completed.` |

### Error Display Elements
| Element | Katalon Locator | Playwright Locator |
|---------|----------------|-------------------|
| Error list container | `anyTagWithClass_AllValues('error-list-content')` | `.error-list-content` |
| Individual error items | `anyTagWithClass('error-list-item ng-star-inserted', N)` | `.error-list-item` |
| Mat error messages | `matError(position: N)` | `mat-error:nth(N)` |

---

## 🔄 Mapping to Existing Playwright Structure

### Already Exists (reuse)
- `CommonLocators`: Save, Cancel buttons; mat-table, mat-row, pagination
- `LoginKeywords`: Login flow
- `NavigationPage`: Nav menu interactions
- `AdministrationPage`: Admin page navigation

### Needs Creation
- `announcements.locators.ts` — NEW
- `AnnouncementsListPage.ts` — NEW
- `AnnouncementFormPage.ts` — NEW (shared for Add/Edit)
- `announcements.feature` — NEW
- `announcements.steps.ts` — NEW
- `AnnouncementsKeywords.ts` — NEW

### ⚠️ HTML Still Needed For
1. **Announcements List Page** — to get proper selectors for 3-dot menu, table structure
2. **Add Announcement Dialog** — to get aria-labels for Status/Type dropdowns (currently positional)
3. **Edit Announcement Dialog** — verify same structure as Add
4. **Delete Confirmation Dialog** — to get confirm/cancel button selectors
5. **Dashboard Announcements Tile** — to get tile selector

---

## 📝 Suggested Test Flow (Playwright BDD)

```gherkin
@announcements
Feature: Announcements Management

  Background:
    Given I am logged in
    And I navigate to Administration
    And I click on Announcements tile

  # TC 733080 + 733094
  Scenario: Validate Announcements list page elements
    Then I should see the following table columns:
      | Announcement Type | Title | Start Date | End Date | Priority | Status |
    And I should see the "Add Announcement" button
    And I should see data in the first row
    When I click the 3-dot menu on the first row
    Then I should see "Edit" and "Delete" menu items

  # TC 733075
  Scenario: Validate Quick Search functionality
    When I search for "Automation" in the search box
    Then I should see filtered results
    When I clear the search
    Then I should see all results

  # TC 752639
  Scenario: Validate Add Announcement form fields
    When I click "Add Announcement"
    Then I should see the following form fields:
      | Status | Title | Announcement Type | Display Priority | Start Date | End Date | Announcement Details |

  # TC 733170
  Scenario: Create a new announcement
    When I click "Add Announcement"
    And I select Status "Draft"
    And I enter Title "Test Automation Title"
    And I select Announcement Type "Deadlines"
    And I enter Display Priority "1"
    And I select today as Start Date
    And I select today as End Date
    And I enter Announcement Details "Test Automation details"
    And I click "Save"
    Then the announcement should be created successfully

  # TC 752676
  Scenario: Validate required field errors
    When I click "Add Announcement"
    And I clear all fields
    And I click "Save"
    Then I should see required field errors for:
      | Status | Title | Announcement Type | Display Priority | Announcement Details |

  # TC 752911 + 752912
  Scenario: Edit an existing announcement
    When I click the 3-dot menu on the first row
    And I click "Edit"
    Then I should see the Edit Announcement form
    When I update the Title to "Updated Title"
    And I click "Save"
    Then the announcement should be updated

  # TC 753115 + 753116
  Scenario: Delete an announcement
    When I click the 3-dot menu on the first row
    And I click "Delete"
    Then I should see a confirmation dialog
    When I confirm deletion
    Then the announcement should be removed
```

---

## ✅ Migration Checklist

- [ ] Create `src/locators/announcements.locators.ts` with elements above
- [ ] Add export to `src/locators/index.ts`
- [ ] Create `src/pages/AnnouncementsListPage.ts`
- [ ] Create `src/pages/AnnouncementFormPage.ts` (shared Add/Edit)
- [ ] Create `src/keywords/AnnouncementsKeywords.ts`
- [ ] Create `features/announcements.feature`
- [ ] Create `src/steps/announcements.steps.ts`
- [ ] Capture HTML for: List page, Add dialog, Edit dialog, Delete confirmation, Dashboard tile
- [ ] Replace positional dropdown selectors with proper aria-label/id from HTML
- [ ] Run `npm run verify:locators` to check for CommonLocators duplicates
