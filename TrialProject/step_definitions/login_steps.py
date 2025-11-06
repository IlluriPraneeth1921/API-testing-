import pytest
from pytest_bdd import scenarios, given, when, then, parsers
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from helper.browser_helper import BrowserHelper
from Objects.LoginPage.login_page import LoginPage

# Load scenarios from feature file
scenarios('../features/login.feature')

@pytest.fixture
def browser_context():
    """Browser context fixture"""
    browser_helper = BrowserHelper()
    page = browser_helper.launch_browser(headless=False)
    yield browser_helper, page
    browser_helper.close_browser()

@given('the browser is launched')
def browser_launched(browser_context):
    """Browser is launched"""
    browser_helper, page = browser_context
    assert page is not None

@given('I navigate to the login page')
def navigate_to_login(browser_context):
    """Navigate to login page"""
    browser_helper, page = browser_context
    browser_helper.navigate_to("https://standard-f1-carity.feisystemsh2env.com/")

@when(parsers.parse('I enter username "{username}"'))
def enter_username(browser_context, username):
    """Enter username"""
    browser_helper, page = browser_context
    login_page = LoginPage(page, browser_helper)
    login_page.wait_for_login_form()
    login_page.enter_username(username)

@when(parsers.parse('I enter password "{password}"'))
def enter_password(browser_context, password):
    """Enter password"""
    browser_helper, page = browser_context
    login_page = LoginPage(page, browser_helper)
    login_page.enter_password(password)

@when('I click the login button')
def click_login(browser_context):
    """Click login button"""
    browser_helper, page = browser_context
    login_page = LoginPage(page, browser_helper)
    login_page.click_login()

@when('I acknowledge the terms')
def acknowledge_terms(browser_context):
    """Acknowledge terms"""
    browser_helper, page = browser_context
    acknowledge_btn = page.locator("text=Acknowledge")
    if acknowledge_btn.is_visible():
        acknowledge_btn.click()

@when(parsers.parse('I select organization "{organization}"'))
def select_organization(browser_context, organization):
    """Select organization"""
    browser_helper, page = browser_context
    page.locator("[data-testid='organization-dropdown']").click()
    page.locator("[data-testid='organization-input']").fill(organization)
    page.locator(f"text={organization}").click()

@when(parsers.parse('I select location "{location}"'))
def select_location(browser_context, location):
    """Select location"""
    browser_helper, page = browser_context
    page.locator("[data-testid='location-dropdown']").click()
    page.locator("[data-testid='location-input']").fill(location)
    page.locator(f"text={location}").click()

@when(parsers.parse('I select staff member "{staff_member}"'))
def select_staff_member(browser_context, staff_member):
    """Select staff member"""
    browser_helper, page = browser_context
    page.locator("[data-testid='staff-dropdown']").click()
    page.locator("[data-testid='staff-input']").fill(staff_member)
    page.locator(f"text={staff_member}").click()

@when('I click final login')
def click_final_login(browser_context):
    """Click final login button"""
    browser_helper, page = browser_context
    page.locator("text=Login").click()
    page.wait_for_load_state('networkidle')

@then('I should be logged in successfully')
def verify_login_success(browser_context):
    """Verify login success"""
    browser_helper, page = browser_context
    # Wait for URL change or dashboard element
    page.wait_for_load_state('networkidle')
    assert "login" not in page.url.lower() or page.locator("text=Dashboard").is_visible()

@then('I should see the dashboard')
def verify_dashboard(browser_context):
    """Verify dashboard is visible"""
    browser_helper, page = browser_context
    dashboard_element = page.locator("text=Dashboard")
    assert dashboard_element.is_visible()

@then('I should see the main dashboard')
def verify_main_dashboard(browser_context):
    """Verify main dashboard"""
    browser_helper, page = browser_context
    main_dashboard = page.locator("text=My Dashboard")
    assert main_dashboard.is_visible()

@then(parsers.parse('I should see "{result}"'))
def verify_result(browser_context, result):
    """Verify expected result"""
    browser_helper, page = browser_context
    if result == "dashboard":
        assert page.locator("text=Dashboard").is_visible()
    elif result == "error message":
        assert page.locator(".error-message").is_visible()
    else:
        assert page.locator(f"text={result}").is_visible()