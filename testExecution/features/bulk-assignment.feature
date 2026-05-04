@bulk-assignment
Feature: Bulk Assignments

  Background:
    Given I login with username "george.parker" and password "Password123#"
    Then I should see the dashboard
    When I navigate to Bulk Assignments via the ellipsis menu

  # ═══════════════════════════════════════════════════════════════
  # KATALON MIGRATED TEST CASES
  # ═══════════════════════════════════════════════════════════════

  @bulk-assignment @TC440985
  Scenario: TC440985 - Validate buttons on Bulk Assignment list page
    Given I am on the Bulk Assignments page
    Then I should see the Assign Location button
    And I should see the Assign Staff button
    And I should see the Unassign Location button
    And I should see the Unassign Staff button
    And I should see the Export button

  @bulk-assignment @TC440987
  Scenario: TC440987 - Validate columns on Bulk Assignment list page
    Given I am on the Bulk Assignments page
    When I open column select panel and enable all columns
    Then I should see column "Person Name"
    And I should see column "Person ID"
    And I should see column "Date of Birth"
    And I should see column "Medicaid ID"
    And I should see column "County"
    And I should see column "Location Assignment Type"
    And I should see column "Assigned Location"
    And I should see column "Location Assignment Effective Date"
    And I should see column "Staff Assignment Type"
    And I should see column "Assigned Staff"
    And I should see column "Staff Assignment Effective Date"

  @bulk-assignment @TC440973
  Scenario: TC440973 - Validate filters on Bulk Assignment list page
    Given I am on the Bulk Assignments page
    When I open the Advanced Search panel
    And I select query type "Has Staff Assignment"
    Then I should see filter label "Staff Assignment Type"
    When I clear the advanced search
    And I select query type "Has No Staff Assignment"
    Then I should see filter label "Staff Assignment Type"
    When I clear the advanced search
    And I select query type "Has No Location Assignment"
    Then I should see filter label "Location Assignment Type"
    And I should see filter label "First Name"
    And I should see filter label "Last Name"
    And I should see filter label "PMI Number"
    When I clear and close the advanced search

  @bulk-assignment @TC440978
  Scenario: TC440978 - Validate different filter combinations return correct results
    Given I am on the Bulk Assignments page
    When I open the Advanced Search panel
    And I run query with filter combination "Has Staff Assignment" and staff type "Case Worker Supervisor" and location "All Locations"
    Then search results are displayed or no results message shown
    When I clear and close the advanced search
    And I open the Advanced Search panel
    And I run query with filter combination "Has No Staff Assignment" and staff type "Caseworker" and location "All Locations"
    Then search results are displayed or no results message shown

  @bulk-assignment @TC503938
  Scenario: TC503938 - Validate user sees number of selected records
    Given I am on the Bulk Assignments page
    When I open the Advanced Search panel
    And I run query with filter combination "Has No Staff Assignment" and staff type "Caseworker" and location "All Locations"
    Then search results are displayed or no results message shown
    When I select the header checkbox to select all records
    Then I should see the selected on page indicator
    And I should see the paginator range label

  @bulk-assignment @TC556242
  Scenario: TC556242 - Validate user is able to export Bulk Assignments
    Given I am on the Bulk Assignments page
    Then I should see the Export button

  # ═══════════════════════════════════════════════════════════════
  # EXISTING TEST CASES (Updated for PBI 915981)
  # ═══════════════════════════════════════════════════════════════

  @bulk-assignment @TC556255 @PBI915981
  Scenario: TC556255 - Validate Location Bulk Assignment fields and assign location
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select 1 or more records
    And I click the Assign Location button
    Then the Location Bulk Assignments modal displays
    And I verify Assignment Type is a required single select dropdown
    And I verify Location is a required single select dropdown
    And I verify Effective Start Date is a required date field
    And I verify Note field allows maximum 10000 characters
    When I fill in all required fields and click Continue
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Location Assignment section
    Then the assigned location appears in the persons location assignments
    And I cleanup the location assignment for the assigned person

  @bulk-assignment @TC556256 @PBI915981
  Scenario: TC556256 - Validate Staff Bulk Assignment fields and assign staff
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select 1 or more records
    And I click the Assign Staff button
    Then the staff assignment modal is visible
    And I verify Assignment Type is a required single select dropdown
    And I verify Staff Member dropdown is visible
    And I verify Location is a required single select dropdown
    And I verify Effective Start Date is a required date field
    And I verify Note field allows maximum 10000 characters
    And I verify Is Primary checkbox is visible
    When I fill in staff assignment form and submit
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Staff Assignment section
    Then the assigned staff appears in the persons staff assignments
    And I cleanup the staff assignment for the assigned person

  @bulk-assignment @TC556258 @PBI915981
  Scenario: TC556258 - Validate Location Bulk Unassignment fields and unassign location
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select all persons with existing location assignments
    And I click the Unassign Location button
    Then the Location Bulk Unassignments modal displays
    When I fill in the unassign location form and click Continue
    Then a confirmation modal displays with unassignment message
    When I click Continue on confirmation
    Then the unassignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed

  @bulk-assignment @TC556263 @PBI915981
  Scenario: TC556263 - Validate Staff Bulk Unassignment fields and unassign staff
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select all persons with existing staff assignments
    And I click the Unassign Staff button
    Then the staff unassignment modal is visible
    When I fill in the unassign staff form and click Continue
    Then a confirmation modal displays with unassignment message
    When I click Continue on confirmation
    Then the unassignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed

  # ═══════════════════════════════════════════════════════════════
  # NEW TEST CASES (PBI 915981)
  # ═══════════════════════════════════════════════════════════════

  @bulk-assignment @PBI915981 @new
  Scenario: Verify running query again via advanced search displays latest assignment changes
    Given I am on the Bulk Assignments page
    When I open Advanced Search panel
    And I enter search criteria and click Search
    Then search results are displayed in the grid
    When I note the current assignment status of displayed records
    And I select multiple person records
    And I complete a location assignment operation
    Then the grid list is NOT refreshed and selections retained
    And the grid still shows old assignment data
    When I click Search button again in Advanced Search
    Then the grid now displays updated assignment data
    And selections are cleared after new search

  @bulk-assignment @PBI915981 @new
  Scenario: Verify Select All Records button never displays
    Given I am on the Bulk Assignments page
    When I enter search criteria and click Search
    Then search results are displayed in the grid
    And the Select All Records button is NOT displayed
    When I select a few records individually
    Then the Select All Records button still does not appear
    When I scroll through the grid
    Then the Select All Records button does not appear at any point
    When I perform a bulk operation and return to grid
    Then the Select All Records button still does not appear

  @bulk-assignment @PBI915981 @new
  Scenario: Verify selections retained when user cancels bulk operation dialog
    Given I am on the Bulk Assignments page
    When I enter search criteria and click Search
    Then search results are displayed in the grid
    When I select multiple person records
    And I note the current selection count
    And I click Assign Location button to open dialog
    Then the Assign Location dialog opens
    When I click Cancel on the dialog
    Then all previous selections are still intact
    And grid data has not changed
    When I click Assign Staff button to open dialog
    And I click Cancel on the dialog
    Then all previous selections are still intact
    When I click Unassign Location button to open dialog
    And I click Cancel on the dialog
    Then all previous selections are still intact
    When I click Unassign Staff button to open dialog
    And I click Cancel on the dialog
    Then all previous selections are still intact

  @bulk-assignment @PBI915981 @new
  Scenario: Verify multiple sequential bulk operations retain selections without refresh
    Given I am on the Bulk Assignments page
    When I enter search criteria and click Search
    Then search results are displayed in the grid
    When I select multiple person records
    And I note the grid data and selection count
    And I complete a location assignment operation
    Then the list is NOT refreshed and selections are retained
    When I complete a staff assignment operation
    Then the list is NOT refreshed and selections are retained
    When I complete a location unassignment operation
    Then the list is NOT refreshed and selections are retained
    When I complete a staff unassignment operation
    Then the list is NOT refreshed and selections are retained

  # ═══════════════════════════════════════════════════════════════
  # SMOKE TEST
  # ═══════════════════════════════════════════════════════════════

  @bulk-assignment @smoke
  Scenario: Verify Bulk Assignments page loads correctly
    Given I am on the Bulk Assignments page
    Then I should see the Bulk Assignments page title
    And I should see the Assign Location button
    And I should see the Assign Staff button
    And I should see the Unassign Location button
    And I should see the Unassign Staff button
    And I should see the Export button
    And I should see the Advanced Search button
