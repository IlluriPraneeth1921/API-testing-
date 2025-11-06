Feature: User Login
  As a user
  I want to login to the application
  So that I can access the system

  Background:
    Given the browser is launched
    And I navigate to the login page

  Scenario: Successful login with valid credentials
    When I enter username "George.Parker"
    And I enter password "Password123#"
    And I click the login button
    Then I should be logged in successfully
    And I should see the dashboard

  Scenario: Login with organization setup
    When I enter username "George.Parker"
    And I enter password "Password123#"
    And I click the login button
    And I acknowledge the terms
    And I select organization "Quantum Services"
    And I select location "Quantum Services Medical Supplies"
    And I select staff member "Self"
    And I click final login
    Then I should see the main dashboard

  Scenario Outline: Login with different users
    When I enter username "<username>"
    And I enter password "<password>"
    And I click the login button
    Then I should see "<result>"

    Examples:
      | username      | password     | result           |
      | George.Parker | Password123# | dashboard        |
      | invalid.user  | wrongpass    | error message    |