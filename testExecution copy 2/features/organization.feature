Feature: Organization Management

  @organization
  Scenario: Create new organization with validation
    Given I login with username "george.parker" and password "Password123#"
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
    
