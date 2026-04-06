@regression
Feature: Regression Test Suite
  Complete test coverage for all features
  
  @regression @login
  Scenario: Complete login flow
    Given I login with username "admin" and password "password"
    Then I should see the dashboard
  
  @regression @administration
  Scenario: Administration sections validation
    Given I login with username "admin" and password "password"
    When I navigate to Administration tab
    Then I should see all administration sections
  
  @regression @contact-form
  Scenario: Contact form search and validation
    Given I login with username "admin" and password "password"
    When I navigate to Contact Form
    And I search for "test"
    Then I should see contact form columns
    And I should see contact form data
  
  @regression @queries
  Scenario: Run person assignments query
    Given I login with username "admin" and password "password"
    When I navigate to Queries
    And I click filter list
    And I select Person Assignments
    And I select My CaseLoad
    And I click Run Query
    Then I should see query results columns
