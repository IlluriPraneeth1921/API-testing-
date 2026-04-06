Feature: Smoke Test

  @smoke
  Scenario: Validate the smoke Test 
    Given I login with username "george.parker" and password "Password123#"
    Then I should see the dashboard
    When I navigate to Administration tab
    Then I should see all administration sections
    When I navigate to Contact Form
    Then I should see contact form columns
    When I navigate to Queries
    And I click filter list
    And I select Person Assignments
    And I select My CaseLoad
    And I click Run Query
    Then I should see query results columns
    When I click Add New Organization
    And I click Continue without filling required fields
    Then I should see validation errors for required fields
    When I fill organization details with random data
    And I click Continue
    Then I should see Potential Duplicates page
    When I click Continue
    Then I should see Potential MMIS Matches page
    When I click Continue
    Then I should see Create Organization page
    When I click Create
    And I click Continue
    Then I should see the created organization