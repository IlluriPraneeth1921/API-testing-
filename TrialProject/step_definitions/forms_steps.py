import pytest
from pytest_bdd import scenarios, given, when, then, parsers
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers

# Load scenarios from feature file
scenarios('../features/forms.feature')

@pytest.fixture
def app_context():
    """Application context fixture"""
    browser_helper = BrowserHelper()
    page = browser_helper.launch_browser(headless=False)
    helpers = AllHelpers(page)
    yield browser_helper, page, helpers
    browser_helper.close_browser()

@given(parsers.parse('I am logged in as "{username}"'))
def login_as_user(app_context, username):
    """Login as specific user"""
    browser_helper, page, helpers = app_context
    helpers.login_with_parameters(username, "Password123#", "Quantum Services", 
                                "Quantum Services Medical Supplies", "Self")

@given('I am on the forms page')
def navigate_to_forms(app_context):
    """Navigate to forms page"""
    browser_helper, page, helpers = app_context
    helpers.click_forms()

@when(parsers.parse('I click "{button_text}"'))
def click_button(app_context, button_text):
    """Click button with specific text"""
    browser_helper, page, helpers = app_context
    page.locator(f"text={button_text}").click()

@when(parsers.parse('I select form category "{category}"'))
def select_form_category(app_context, category):
    """Select form category"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='form-category-dropdown']").click()
    page.locator("[data-testid='form-category-input']").fill(category)
    page.keyboard.press('Enter')

@when(parsers.parse('I select form type "{form_type}"'))
def select_form_type(app_context, form_type):
    """Select form type"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='form-type-dropdown']").click()
    page.locator("[data-testid='form-type-input']").fill(form_type)
    page.keyboard.press('Enter')

@when(parsers.parse('I select program "{program}"'))
def select_program(app_context, program):
    """Select program"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='program-dropdown']").click()
    page.locator("[data-testid='program-input']").fill(program)
    page.keyboard.press('Enter')

@when(parsers.parse('I select level "{level}"'))
def select_level(app_context, level):
    """Select level"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='level-dropdown']").click()
    page.locator("[data-testid='level-input']").fill(level)
    page.keyboard.press('Enter')

@when(parsers.parse('I select reason "{reason}"'))
def select_reason(app_context, reason):
    """Select reason"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='reason-dropdown']").click()
    page.locator("[data-testid='reason-input']").fill(reason)
    page.keyboard.press('Enter')

@given('I have an open form')
def have_open_form(app_context):
    """Ensure there's an open form"""
    browser_helper, page, helpers = app_context
    # Create a form if none exists
    helpers.create_new_form("HCBS", "HCBS Choice", Program="Test Program")

@when('I click the status dropdown')
def click_status_dropdown(app_context):
    """Click status dropdown"""
    browser_helper, page, helpers = app_context
    page.locator("mat-icon:has-text('keyboard_arrow_down')").click()

@when(parsers.parse('I select "{option}"'))
def select_option(app_context, option):
    """Select option from dropdown"""
    browser_helper, page, helpers = app_context
    page.locator(f"text={option}").click()

@when(parsers.parse('I enter close reason "{reason}"'))
def enter_close_reason(app_context, reason):
    """Enter close reason"""
    browser_helper, page, helpers = app_context
    page.locator("[data-testid='close-reason-dropdown']").click()
    page.locator("[data-testid='close-reason-input']").fill(reason)
    page.locator(f"text={reason}").click()

@when('I click advanced search')
def click_advanced_search(app_context):
    """Click advanced search"""
    browser_helper, page, helpers = app_context
    page.locator("[aria-label='Advanced Search']").click()

@when(parsers.parse('I enter form type "{form_type}"'))
def enter_form_type(app_context, form_type):
    """Enter form type in search"""
    browser_helper, page, helpers = app_context
    search_box = page.locator("[data-testid='form-type-search']")
    search_box.fill(form_type)
    page.keyboard.press('Enter')

@when(parsers.parse('I enter status "{status}"'))
def enter_status(app_context, status):
    """Enter status in search"""
    browser_helper, page, helpers = app_context
    page.locator(".mat-input").nth(9).fill(status)

@then('the form should be created successfully')
def verify_form_created(app_context):
    """Verify form creation"""
    browser_helper, page, helpers = app_context
    success_message = page.locator("text=Form created successfully")
    assert success_message.is_visible() or page.locator(".form-container").is_visible()

@then('the grievance form should be created')
def verify_grievance_form_created(app_context):
    """Verify grievance form creation"""
    browser_helper, page, helpers = app_context
    form_header = page.locator("text=Grievances / Appeals")
    assert form_header.is_visible()

@then('the form should be closed')
def verify_form_closed(app_context):
    """Verify form is closed"""
    browser_helper, page, helpers = app_context
    closed_status = page.locator("text=Closed")
    assert closed_status.is_visible()

@then('I should see matching forms')
def verify_matching_forms(app_context):
    """Verify search results"""
    browser_helper, page, helpers = app_context
    search_results = page.locator("mat-row")
    assert search_results.count() > 0