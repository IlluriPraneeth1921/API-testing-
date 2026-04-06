@bulk-assignment
Feature: Bulk Assignments

  Background:
    Given I login with username "george.parker" and password "Password123#"
    Then I should see the dashboard
    When I navigate to Bulk Assignments via the ellipsis menu

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
    Then a confirmation modal displays with assignment message
    When I click Continue on confirmation
    Then the assignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Location Assignment section
    Then the assigned location appears in the persons location assignments

  @bulk-assignment @TC556256 @PBI915981
  Scenario: TC556256 - Validate Staff Bulk Assignment fields and assign staff
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select 1 or more records
    And I click the Assign Staff button
    Then the Staff Member Bulk Assignments modal displays
    And I verify Assignment Type is a required single select dropdown
    And I verify Staff Member is a required single select dropdown
    And I verify Location is a required single select dropdown
    And I verify Effective Start Date is a required date field
    And I verify Note field allows maximum 10000 characters
    And I verify Is Primary Assignment is an optional checkbox
    When I fill in all required fields and click Continue
    Then a confirmation modal displays with staff assignment message
    When I click Continue on confirmation
    Then the assignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Staff Assignment section
    Then the assigned staff member appears in the persons staff assignments

  @bulk-assignment @TC556258 @PBI915981
  Scenario: TC556258 - Validate Location Bulk Unassignment fields and unassign location
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select 1 or more records with existing location assignments
    And I click the Unassign Location button
    Then the Location Bulk Unassignments modal displays
    And I verify Discharge Reason dropdown displays expected values
    And I verify Other Discharge Reason appears when Other is selected
    And I verify Notes field allows maximum 10000 characters
    When I fill in all required fields and click Continue
    Then a confirmation modal displays with unassignment message
    When I click Continue on confirmation
    Then the unassignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Location Assignment section
    Then the location assignment has been removed or end-dated

  @bulk-assignment @TC556263 @PBI915981
  Scenario: TC556263 - Validate Staff Bulk Unassignment fields and unassign staff
    Given I am on the Bulk Assignments page
    When I fill in search criteria and click Run Query
    Then the Bulk Assignments list displays filtered records
    When I select 1 or more records with existing staff assignments
    And I click the Unassign Staff button
    Then the Staff Member Bulk Unassignments modal displays
    And I verify Unassign Reason dropdown displays expected values
    And I verify Other Unassign Reason appears when Other is selected
    And I verify Notes field allows maximum 10000 characters
    When I fill in all required fields and click Continue
    Then a confirmation modal displays with staff unassignment message
    When I click Continue on confirmation
    Then the unassignment status is displayed
    When I click the Close button
    Then the Bulk Assignments list is NOT refreshed
    And previously selected records remain selected
    When I open the person profile for a selected person
    And I navigate to Staff Assignment section
    Then the staff assignment has been removed or end-dated

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
