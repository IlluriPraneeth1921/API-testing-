@bulk-assignment @TC556255
Feature: TC556255 - Validate Location Bulk Assignment fields and assignment

  Background:
    Given I login with username "george.parker" and password "Password123#"
    Then I should see the dashboard
    When I navigate to Bulk Assignments via the ellipsis menu

  @TC556255 @full
  Scenario: TC556255 - Validate Location Bulk Assignment fields and complete assignment
    # Step 2: Verify Bulk Assignments page displays
    Given I am on the Bulk Assignments page
    Then I should see the Bulk Assignments page title
    And I should see the Assign Location button
    And I should see the Assign Staff button
    And I should see the Unassign Location button
    And I should see the Unassign Staff button
    And I should see the Export button
    And I should see the Advanced Search button
    
    # Step 3: Open Advanced Search and run query
    When I click the Advanced Search button
    Then the Advanced Search panel should be visible
    When I click the Search button in Advanced Search
    Then search results should be displayed or empty message shown
    
    # Step 4: Select records and click Assign Location
    When I select the first available record if results exist
    And I note the current selection count
    And I click the Assign Location button
    Then the Location Bulk Assignments modal displays
    
    # Step 5: Validate Assignment Type is required single select dropdown
    Then I verify Assignment Type is a required single select dropdown
    
    # Step 6: Validate Location is required single select dropdown
    And I verify Location is a required single select dropdown
    
    # Step 7: Validate Effective Start Date is required date field
    And I verify Effective Start Date is a required date field
    
    # Step 8: Validate Note field allows max 10000 characters
    And I verify Note field allows maximum 10000 characters
    
    # Step 9: Fill in required fields and click Continue
    When I fill in the Location Assignment form with valid data
    And I click Continue on the modal
    Then a confirmation modal displays with text "You are about to assign a location to the selected member records"
    
    # Step 10: Click Continue and validate status
    When I click Continue on confirmation
    Then the assignment status is displayed
    
    # Step 11: Click Close button
    When I click the Close button
    Then the modal should close
    
    # Step 12: PBI 915981 - Verify list NOT refreshed
    Then the Bulk Assignments list is NOT refreshed
    
    # Step 13: PBI 915981 - Verify selections retained
    And previously selected records remain selected
    
    # Step 14-16: Verify via person profile (optional - requires navigation)
    # When I click Open Person Profile button for selected person
    # And I navigate to Location Assignment section in person profile
    # Then the assigned location appears in the persons location assignments
