Feature: Form Management
  As a user
  I want to manage forms
  So that I can create and process applications

  Background:
    Given I am logged in as "George.Parker"
    And I am on the forms page

  Scenario: Create a new HCBS Choice form
    When I click "New Form"
    And I select form category "HCBS"
    And I select form type "HCBS Choice"
    And I click "Next"
    And I select program "Medicaid Waiver"
    And I click "Save"
    Then the form should be created successfully

  Scenario: Create a grievance form
    When I click "New Form"
    And I select form category "Appeals"
    And I select form type "Grievances / Appeals"
    And I click "Next"
    And I select level "Level 1"
    And I select reason "Service Denial"
    And I click "Save"
    Then the grievance form should be created

  Scenario: Close an existing form
    Given I have an open form
    When I click the status dropdown
    And I select "Close"
    And I enter close reason "Completed"
    And I click "Continue"
    Then the form should be closed

  Scenario: Search for forms
    When I click advanced search
    And I enter form type "HCBS Choice"
    And I enter status "In Progress"
    And I click "Search"
    Then I should see matching forms