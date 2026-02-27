@smoke
Feature: Smoke Test Suite
  Critical path tests to validate core functionality
  
  @smoke @critical
  Scenario: Validate critical application features
    Given I login with username "admin" and password "password"
    Then I should see the dashboard
    When I navigate to Administration tab
    Then I should see all administration sections
