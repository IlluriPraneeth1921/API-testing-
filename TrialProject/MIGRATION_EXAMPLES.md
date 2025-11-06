# Katalon to Playwright Migration Examples

## 📚 Real Migration Examples

### Example 1: Simple Login Test

#### Original Katalon Script:
```groovy
// Login Test - Original Katalon
WebUI.openBrowser('')
WebUI.navigateToUrl('https://app.example.com')
WebUI.maximizeWindow()

WebUI.setText(findTestObject('LoginPage/txt_Username'), GlobalVariable.Username)
WebUI.setText(findTestObject('LoginPage/txt_Password'), GlobalVariable.Password)
WebUI.click(findTestObject('LoginPage/btn_Login'))

WebUI.verifyElementPresent(findTestObject('Dashboard/lbl_Welcome'))
WebUI.verifyTextPresent('Welcome')

WebUI.closeBrowser()
```

#### Migrated Playwright Script:
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: Simple Login Test
Original: LoginTest.groovy
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

import pytest
import logging
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from config.global_variables import GlobalVars

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestSimpleLogin:
    """Test class for simple login functionality"""
    
    @pytest.fixture
    def browser_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_simple_login(self, browser_setup):
        """Test simple login functionality"""
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        GlobalVars.load_config(environment="standard")
        
        try:
            logger.info("=== TEST START: Simple Login Test ===")
            
            # Navigate to application
            logger.info(f"🌍 Navigating to: {GlobalVars.BASE_URL}")
            page.goto(GlobalVars.BASE_URL)
            
            # Enter username
            logger.info("⌨️ Entering username")
            username_field = self.objects.username_field()
            username_field.fill(GlobalVars.USERNAME)
            
            # Enter password
            logger.info("⌨️ Entering password")
            password_field = self.objects.password_field()
            password_field.fill(GlobalVars.PASSWORD)
            
            # Click login button
            logger.info("🖱️ Clicking login button")
            login_button = self.objects.login_button()
            login_button.click()
            
            # Wait for page load
            page.wait_for_load_state('networkidle')
            
            # Verify welcome message
            logger.info("🔍 Verifying welcome message")
            welcome_label = self.objects.welcome_label()
            assert welcome_label.is_visible(), "Welcome message should be visible"
            
            # Verify welcome text
            welcome_text = welcome_label.text_content()
            assert "Welcome" in welcome_text, f"Expected 'Welcome' in text, got: {welcome_text}"
            
            logger.info("✅ PASS: Simple login test completed successfully")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Simple login test failed - {str(e)}")
            logger.error(f"Current URL: {page.url}")
            helpers.take_screenshot("simple_login_failure")
            raise

# Required locators to add to AllObjects.py:
"""
def username_field(self):
    return self.page.locator("input[name='username']")

def password_field(self):
    return self.page.locator("input[name='password']")

def login_button(self):
    return self.page.locator("button[type='submit']")

def welcome_label(self):
    return self.page.locator(".welcome-message")
"""
```

### Example 2: Form Submission Test

#### Original Katalon Script:
```groovy
// Form Test - Original Katalon
WebUI.openBrowser('')
WebUI.navigateToUrl(GlobalVariable.FormURL)

WebUI.setText(findTestObject('Form/txt_FirstName'), 'John')
WebUI.setText(findTestObject('Form/txt_LastName'), 'Doe')
WebUI.setText(findTestObject('Form/txt_Email'), 'john.doe@example.com')
WebUI.selectOptionByText(findTestObject('Form/sel_Country'), 'United States')
WebUI.check(findTestObject('Form/chk_Newsletter'))
WebUI.click(findTestObject('Form/btn_Submit'))

WebUI.verifyElementPresent(findTestObject('Form/msg_Success'))
WebUI.closeBrowser()
```

#### Migrated Playwright Script:
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: Form Submission Test
Original: FormTest.groovy
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

import pytest
import logging
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from config.global_variables import GlobalVars

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestFormSubmission:
    """Test class for form submission functionality"""
    
    @pytest.fixture
    def browser_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_form_submission(self, browser_setup):
        """Test form submission with validation"""
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        GlobalVars.load_config(environment="standard")
        
        # Test data
        form_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'country': 'United States'
        }
        
        try:
            logger.info("=== TEST START: Form Submission Test ===")
            logger.info(f"Form data: {form_data}")
            
            # Navigate to form
            logger.info(f"🌍 Navigating to form: {GlobalVars.FORM_URL}")
            page.goto(GlobalVars.FORM_URL)
            
            # Fill form using helper method
            logger.info("📝 Filling form data")
            helpers.fill_form_data(form_data)
            
            # Select country dropdown
            logger.info("🔽 Selecting country")
            helpers.select_dropdown_option(
                self.objects.country_dropdown(),
                form_data['country'],
                'united'
            )
            
            # Check newsletter checkbox
            logger.info("☑️ Checking newsletter subscription")
            newsletter_checkbox = self.objects.newsletter_checkbox()
            newsletter_checkbox.check()
            
            # Submit form
            logger.info("🖱️ Submitting form")
            submit_button = self.objects.submit_button()
            submit_button.click()
            
            # Wait for submission
            page.wait_for_load_state('networkidle')
            
            # Verify success message
            logger.info("🔍 Verifying success message")
            success_message = self.objects.success_message()
            assert success_message.is_visible(), "Success message should be visible"
            
            logger.info("✅ PASS: Form submission test completed successfully")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Form submission test failed - {str(e)}")
            helpers.take_screenshot("form_submission_failure")
            raise

# Required additions to AllHelpers.py:
"""
def fill_form_data(self, form_data):
    '''Fill form with data dictionary'''
    logger.info("📝 Filling form with provided data")
    
    for field_name, value in form_data.items():
        logger.debug(f"Filling field '{field_name}' with value '{value}'")
        field = self.objects.form_field(field_name)
        field.fill(value)
    
    logger.info("✅ Form data filled successfully")
"""

# Required locators to add to AllObjects.py:
"""
def form_field(self, field_name):
    return self.page.locator(f"input[name='{field_name}']")

def country_dropdown(self):
    return self.page.locator("select[name='country']")

def newsletter_checkbox(self):
    return self.page.locator("input[name='newsletter']")

def submit_button(self):
    return self.page.locator("button[type='submit']")

def success_message(self):
    return self.page.locator(".success-message")
"""
```

### Example 3: Data-Driven Test

#### Original Katalon Script:
```groovy
// Data-Driven Test - Original Katalon
import com.kms.katalon.core.testdata.TestDataFactory

def testData = TestDataFactory.findTestData('UserData')

for (int i = 1; i <= testData.getRowNumbers(); i++) {
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.URL)
    
    String username = testData.getValue('Username', i)
    String password = testData.getValue('Password', i)
    String expectedResult = testData.getValue('ExpectedResult', i)
    
    WebUI.setText(findTestObject('Login/txt_Username'), username)
    WebUI.setText(findTestObject('Login/txt_Password'), password)
    WebUI.click(findTestObject('Login/btn_Login'))
    
    if (expectedResult == 'Success') {
        WebUI.verifyElementPresent(findTestObject('Dashboard/lbl_Dashboard'))
    } else {
        WebUI.verifyElementPresent(findTestObject('Login/msg_Error'))
    }
    
    WebUI.closeBrowser()
}
```

#### Migrated Playwright Script:
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: Data-Driven Login Test
Original: DataDrivenTest.groovy
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

import pytest
import logging
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from config.global_variables import GlobalVars

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestDataDrivenLogin:
    """Data-driven test for login functionality"""
    
    @pytest.fixture
    def browser_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    # Test data
    test_data = [
        {"username": "valid_user", "password": "valid_pass", "expected": "Success"},
        {"username": "invalid_user", "password": "invalid_pass", "expected": "Failure"},
        {"username": "valid_user", "password": "wrong_pass", "expected": "Failure"},
        {"username": "", "password": "valid_pass", "expected": "Failure"},
    ]
    
    @pytest.mark.parametrize("test_case", test_data)
    def test_login_with_data(self, browser_setup, test_case):
        """Test login with different data sets"""
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        GlobalVars.load_config(environment="standard")
        
        username = test_case["username"]
        password = test_case["password"]
        expected_result = test_case["expected"]
        
        try:
            logger.info(f"=== TEST START: Data-Driven Login - {expected_result} Case ===")
            logger.info(f"Username: {username}")
            logger.info(f"Password: {'*' * len(password) if password else 'Empty'}")
            logger.info(f"Expected Result: {expected_result}")
            
            # Navigate to login page
            logger.info(f"🌍 Navigating to: {GlobalVars.BASE_URL}")
            page.goto(GlobalVars.BASE_URL)
            
            # Perform login
            logger.info("🔑 Performing login")
            helpers.perform_login(username, password)
            
            # Wait for response
            page.wait_for_load_state('networkidle')
            
            # Validate result based on expected outcome
            if expected_result == "Success":
                logger.info("🔍 Validating successful login")
                dashboard = self.objects.dashboard_element()
                assert dashboard.is_visible(), "Dashboard should be visible for successful login"
                logger.info("✅ Success case validated")
            else:
                logger.info("🔍 Validating failed login")
                error_message = self.objects.error_message()
                assert error_message.is_visible(), "Error message should be visible for failed login"
                logger.info("✅ Failure case validated")
            
            logger.info(f"✅ PASS: Data-driven test completed - {expected_result}")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Data-driven test failed - {str(e)}")
            logger.error(f"Test case: {test_case}")
            helpers.take_screenshot(f"data_driven_failure_{expected_result.lower()}")
            raise

# Required addition to AllHelpers.py:
"""
def perform_login(self, username, password):
    '''Perform login with given credentials'''
    logger.info(f"🔑 Logging in with username: {username}")
    
    # Fill username
    username_field = self.objects.username_field()
    username_field.fill(username)
    
    # Fill password
    password_field = self.objects.password_field()
    password_field.fill(password)
    
    # Click login
    login_button = self.objects.login_button()
    login_button.click()
    
    logger.info("Login attempt completed")
"""
```

### Example 4: API + UI Combined Test

#### Original Katalon Script:
```groovy
// API + UI Test - Original Katalon
import com.kms.katalon.core.testobject.RequestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS

// Create user via API
RequestObject request = findTestObject('API/CreateUser')
def response = WS.sendRequest(request)
WS.verifyResponseStatusCode(response, 201)

def userId = WS.getElementPropertyValue(response, 'id')

// Verify user in UI
WebUI.openBrowser('')
WebUI.navigateToUrl(GlobalVariable.AdminURL)
WebUI.setText(findTestObject('Search/txt_UserId'), userId)
WebUI.click(findTestObject('Search/btn_Search'))
WebUI.verifyElementPresent(findTestObject('UserList/row_User'))
```

#### Migrated Playwright Script:
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: API + UI Combined Test
Original: ApiUiTest.groovy
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

import pytest
import logging
import requests
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from config.global_variables import GlobalVars

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestApiUiCombined:
    """Combined API and UI test"""
    
    @pytest.fixture
    def browser_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_create_user_api_verify_ui(self, browser_setup):
        """Create user via API and verify in UI"""
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        GlobalVars.load_config(environment="standard")
        
        user_data = {
            "name": "Test User",
            "email": "testuser@example.com",
            "role": "user"
        }
        
        try:
            logger.info("=== TEST START: API + UI Combined Test ===")
            
            # Step 1: Create user via API
            logger.info("🔗 Creating user via API")
            api_response = helpers.create_user_via_api(user_data)
            user_id = api_response['id']
            logger.info(f"✅ User created with ID: {user_id}")
            
            # Step 2: Verify user in UI
            logger.info("🌍 Navigating to admin interface")
            page.goto(GlobalVars.ADMIN_URL)
            
            # Search for user
            logger.info(f"🔍 Searching for user ID: {user_id}")
            search_field = self.objects.user_search_field()
            search_field.fill(str(user_id))
            
            search_button = self.objects.search_button()
            search_button.click()
            
            # Wait for results
            page.wait_for_load_state('networkidle')
            
            # Verify user appears in results
            logger.info("🔍 Verifying user in search results")
            user_row = self.objects.user_row(user_id)
            assert user_row.is_visible(), f"User {user_id} should be visible in search results"
            
            # Verify user details
            user_name = self.objects.user_name_cell(user_id)
            assert user_name.text_content() == user_data['name'], "User name should match"
            
            logger.info("✅ PASS: API + UI test completed successfully")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: API + UI test failed - {str(e)}")
            helpers.take_screenshot("api_ui_test_failure")
            raise

# Required addition to AllHelpers.py:
"""
def create_user_via_api(self, user_data):
    '''Create user via API call'''
    logger.info(f"🔗 Making API call to create user: {user_data}")
    
    api_url = f"{GlobalVars.API_BASE_URL}/users"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {GlobalVars.API_TOKEN}'
    }
    
    response = requests.post(api_url, json=user_data, headers=headers)
    
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    
    response_data = response.json()
    logger.info(f"✅ API call successful, user ID: {response_data['id']}")
    
    return response_data
"""

# Required locators to add to AllObjects.py:
"""
def user_search_field(self):
    return self.page.locator("input[name='user_search']")

def search_button(self):
    return self.page.locator("button[type='submit']")

def user_row(self, user_id):
    return self.page.locator(f"tr[data-user-id='{user_id}']")

def user_name_cell(self, user_id):
    return self.page.locator(f"tr[data-user-id='{user_id}'] td.name")
"""
```

## 🎯 Key Migration Patterns Summary

### 1. **Structure Pattern**:
- Always include proper imports and logging setup
- Use pytest fixtures for browser management
- Follow consistent class and method naming

### 2. **Logging Pattern**:
- Start with test boundary markers
- Log each major step with emojis
- Include relevant data in logs
- Capture screenshots on failure

### 3. **Error Handling Pattern**:
- Use try-catch blocks
- Log errors with context
- Take screenshots for debugging
- Re-raise exceptions for pytest

### 4. **Locator Pattern**:
- Keep all locators in AllObjects.py
- Use descriptive method names
- Return page.locator() objects

### 5. **Helper Pattern**:
- Create reusable helper methods
- Include logging in helpers
- Handle common patterns generically

These examples demonstrate the complete migration process from Katalon to Playwright, maintaining functionality while improving structure, logging, and maintainability.