Feature: Navigation Verification

  @navigation
  Scenario: Verify left navigation elements after organization search
    Given I login with username "george.parker" and password "Password123#"
    When I search for organization and verify navigation "Test"
    Then I should see all left navigation elements:
      | Profile            |
      | Locations          |
      | Staff Members      |
      | Supported Programs |
      | Attachments        |
      | Assignments        |
      | Roles              |
      | Forms              |
      | Notes              |
      | Letters            |
      | Service Events     |
      | Contracts          |