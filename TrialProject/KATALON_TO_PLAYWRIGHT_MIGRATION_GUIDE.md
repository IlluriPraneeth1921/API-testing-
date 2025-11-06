# Katalon to Playwright Migration Guide

## 📋 Overview

This document provides a comprehensive guide for migrating Katalon Studio test cases to Playwright with Python. The migration follows established patterns and reuses common infrastructure components.

## 🏗️ Architecture Overview

### Project Structure
```
TrialProject/
├── config/                     # Configuration Management
│   ├── global_variables.py     # GlobalVariables (like Katalon)
│   ├── test_config.json       # Environment configurations
│   └── environments.py        # Environment-specific settings
├── Objects/                    # Object Repository
│   └── AllObjects.py          # Centralized locators
├── helper/                     # Helper Methods
│   ├── AllHelpers.py          # Business logic helpers
│   └── browser_helper.py      # Browser management
├── Scripts/                    # Test Scripts
│   └── WebApp/Carity/Standard/SmokeTest/
│       └── validate_user_login_standard_application.py
├── reports/                    # Test Reports
└── screenshots/               # Debug screenshots
```

## 🚀 Migration Process

### Step 1: Analyze Katalon Test Case

**Before Migration:**
- [ ] Identify test steps and business logic
- [ ] Extract locators used in the test
- [ ] Note custom keywords and their functionality
- [ ] Identify test data and GlobalVariables used
- [ ] Document expected test flow

**Example Analysis:**
```groovy
// Original Katalon Script
WebUI.openBrowser('')
WebUI.maximizeWindow()
CustomKeywords.'loginWithParametersf4'(GlobalVariable.Username, GlobalVariable.Password)
WebUI.verifyElementPresent(findTestObject('Dashboard/DashboardElement'))
```

### Step 2: Create Test File Structure

**Template for New Test:**
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: [Original Test Name]
Original: [Original Script File]

Test Case: [Test Description]
Purpose: [Test Purpose]
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

import pytest
import logging
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from config.global_variables import GlobalVars

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestNewFunctionality:
    """Test class for new functionality"""
    
    @pytest.fixture
    def browser_setup(self):
        """Setup browser for tests"""
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_new_functionality(self, browser_setup):
        """
        Test Case: [Test Description]
        
        Steps:
        1. [Step 1 description]
        2. [Step 2 description]
        3. [Step 3 description]
        """
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        # Load test data from GlobalVariables
        GlobalVars.load_config(environment="standard")
        
        try:
            logger.info("=== TEST START: [Test Name] ===")
            logger.info("Step 1: [Description]")
            
            # Test implementation with detailed logging
            logger.info("🔧 Performing action...")
            # Your test logic here
            
            logger.info("✅ PASS: Test completed successfully")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Test failed - {str(e)}")
            logger.error(f"Current URL at failure: {page.url}")
            helpers.take_screenshot("test_failure")
            logger.error("=== TEST FAILED ===")
            raise

def run_standalone():
    """Run test standalone without pytest"""
    print("Running Migrated Test")
    
    browser_helper = BrowserHelper()
    
    try:
        page = browser_helper.launch_browser(headless=False)
        test_instance = TestNewFunctionality()
        
        class MockFixture:
            def __init__(self, browser_helper, page):
                self.browser_helper = browser_helper
                self.page = page
            
            def __iter__(self):
                return iter([self.browser_helper, self.page])
        
        fixture = MockFixture(browser_helper, page)
        test_instance.test_new_functionality(fixture)
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Test failed: {e}")
        return 1
    finally:
        browser_helper.close_browser()
    
    return 0

if __name__ == "__main__":
    exit_code = run_standalone()
    sys.exit(exit_code)
```

### Step 3: Add Locators to AllObjects.py

**Pattern for Adding New Locators:**
```python
# In Objects/AllObjects.py

def new_element_locator(self):
    """Description of the element"""
    return self.page.locator("css-selector")

def form_input_field(self, field_name):
    """Generic form input field"""
    return self.page.locator(f"input[name='{field_name}']")

def button_with_text(self, button_text):
    """Button with specific text"""
    return self.page.locator(f"button:has-text('{button_text}')")
```

### Step 4: Create Helper Methods in AllHelpers.py

**Pattern for Adding Helper Methods:**
```python
# In helper/AllHelpers.py

def new_helper_method(self, param1, param2):
    """Helper method for specific functionality"""
    logger.info(f"🔧 Starting {self.__class__.__name__}.new_helper_method")
    logger.info(f"Parameters: param1={param1}, param2={param2}")
    
    try:
        # Implementation logic
        element = self.objects.new_element_locator()
        element.click()
        
        logger.info("✅ Helper method completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Helper method failed: {str(e)}")
        raise

def fill_form_data(self, form_data):
    """Fill form with data dictionary"""
    logger.info("📝 Filling form with provided data")
    
    for field_name, value in form_data.items():
        logger.debug(f"Filling field '{field_name}' with value '{value}'")
        field = self.objects.form_input_field(field_name)
        field.fill(value)
    
    logger.info("✅ Form data filled successfully")
```

### Step 5: Add Test Data to GlobalVariables

**Update Configuration Files:**

**config/test_config.json:**
```json
{
  "environments": {
    "standard": {
      "base_url": "https://standard-f1-carity.feisystemsh2env.com/",
      "credentials": {
        "username": "George.Parker",
        "password": "Password123#",
        "organization": "Quantum Services",
        "location": "Quantum Services Medical Equipment",
        "staff_member": "Self"
      },
      "new_test_data": {
        "field1": "value1",
        "field2": "value2"
      }
    }
  }
}
```

**config/global_variables.py (if new properties needed):**
```python
@property
def NEW_FIELD(self):
    return self.get("new_test_data.field1")
```

## 🎯 Migration Patterns

### Pattern 1: Simple Element Interaction
**Katalon:**
```groovy
WebUI.click(findTestObject('Page/Button'))
WebUI.setText(findTestObject('Page/Input'), 'text')
```

**Playwright:**
```python
logger.info("🖱️ Clicking button")
self.objects.button_locator().click()

logger.info("⌨️ Entering text")
self.objects.input_locator().fill('text')
```

### Pattern 2: Dropdown Selection
**Katalon:**
```groovy
WebUI.selectOptionByText(findTestObject('Page/Dropdown'), 'Option')
```

**Playwright:**
```python
logger.info("🔽 Selecting dropdown option")
self.select_dropdown_option(
    self.objects.dropdown_locator(), 
    'Option', 
    self.get_first_word('Option').lower()
)
```

### Pattern 3: Validation
**Katalon:**
```groovy
WebUI.verifyElementPresent(findTestObject('Page/Element'))
```

**Playwright:**
```python
logger.info("✅ Validating element presence")
element = self.objects.element_locator()
assert element.is_visible(), "Element should be visible"
logger.info("Element validation passed")
```

### Pattern 4: Custom Keywords
**Katalon:**
```groovy
CustomKeywords.'package.Class.method'(param1, param2)
```

**Playwright:**
```python
logger.info("🔧 Executing custom helper method")
helpers.custom_helper_method(param1, param2)
```

## 🛠️ Reusable Components

### Already Built Infrastructure:
- ✅ **AllObjects.py** - Centralized locators
- ✅ **AllHelpers.py** - Common helper methods
- ✅ **GlobalVariables** - Configuration management
- ✅ **Browser Helper** - Browser management
- ✅ **Logging Framework** - Detailed logging
- ✅ **Report Generation** - HTML reports with logs
- ✅ **Screenshot Capability** - Error debugging

### Common Helper Methods Available:
```python
# Dropdown selection with smart search
self.select_dropdown_option(locator, option_text, search_text, wait_time)

# Text extraction utilities
self.get_first_word(text)

# Login functionality
self.login_with_parameters(base_url, username, password, organization, location, staff_member)

# Validation methods
self.assert_login_successful()
self.verify_login_success()

# Screenshot capture
self.take_screenshot(name)
```

## 📊 Testing and Validation

### Running Tests

**Single Test:**
```bash
pytest Scripts/WebApp/Carity/Standard/SmokeTest/test_name.py -v
```

**With HTML Report:**
```bash
pytest Scripts/WebApp/Carity/Standard/SmokeTest/test_name.py -v --html=reports/test_report.html --self-contained-html --log-cli-level=INFO
```

**Standalone Execution:**
```bash
python Scripts/WebApp/Carity/Standard/SmokeTest/test_name.py
```

### Report Locations:
- **HTML Reports**: `C:\Whitelisted\TrialProject\reports\`
- **Screenshots**: `C:\Whitelisted\TrialProject\screenshots\`

## 🔍 Debugging and Troubleshooting

### Common Issues and Solutions:

**1. Element Not Found:**
```python
# Add debug logging
logger.debug("Looking for element with selector: css-selector")
element = self.page.locator("css-selector")
logger.debug(f"Element count: {element.count()}")

# Take screenshot for debugging
self.take_screenshot("element_not_found_debug")
```

**2. Timing Issues:**
```python
# Add explicit waits
element.wait_for(state='visible', timeout=30000)

# Add page load waits
self.page.wait_for_load_state('networkidle')
```

**3. Dropdown Selection Issues:**
```python
# Use the robust dropdown helper
self.select_dropdown_option(
    dropdown_locator, 
    option_text, 
    self.get_first_word(option_text).lower(),
    wait_time=5000
)
```

## 📋 Migration Checklist

### Pre-Migration:
- [ ] Analyze Katalon test case
- [ ] Identify required locators
- [ ] Identify required helper methods
- [ ] Identify test data requirements

### During Migration:
- [ ] Create test file with proper structure
- [ ] Add new locators to AllObjects.py (if needed)
- [ ] Add new helper methods to AllHelpers.py (if needed)
- [ ] Add test data to configuration (if needed)
- [ ] Implement test logic with logging
- [ ] Add error handling and screenshots

### Post-Migration:
- [ ] Test execution (standalone)
- [ ] Test execution (pytest)
- [ ] Verify HTML report generation
- [ ] Verify screenshot capture on failure
- [ ] Code review and documentation

## 🎯 Best Practices

### Logging:
- Use emojis for visual clarity (🚀, ✅, ❌, 🔧)
- Log test start/end boundaries
- Log each major step
- Log parameters and results
- Log errors with context

### Error Handling:
- Always capture screenshots on failure
- Log current URL and page title on errors
- Use try-catch blocks for critical sections
- Provide meaningful error messages

### Code Organization:
- Keep locators in AllObjects.py
- Keep business logic in AllHelpers.py
- Keep test data in GlobalVariables
- Keep tests focused and single-purpose

### Reusability:
- Use existing helper methods when possible
- Create generic helper methods for common patterns
- Use configuration for environment-specific data
- Follow established naming conventions

## 📚 Examples

### Complete Migration Example:

**Original Katalon Test:**
```groovy
WebUI.openBrowser('')
WebUI.navigateToUrl(GlobalVariable.URL)
WebUI.maximizeWindow()
WebUI.setText(findTestObject('LoginPage/Username'), GlobalVariable.Username)
WebUI.setText(findTestObject('LoginPage/Password'), GlobalVariable.Password)
WebUI.click(findTestObject('LoginPage/LoginButton'))
WebUI.verifyElementPresent(findTestObject('Dashboard/WelcomeMessage'))
WebUI.closeBrowser()
```

**Migrated Playwright Test:**
```python
def test_user_login(self, browser_setup):
    """Test user login functionality"""
    browser_helper, page = browser_setup
    helpers = AllHelpers(page)
    
    GlobalVars.load_config(environment="standard")
    
    try:
        logger.info("=== TEST START: User Login ===")
        
        # Navigate to application
        logger.info(f"🌍 Navigating to: {GlobalVars.BASE_URL}")
        page.goto(GlobalVars.BASE_URL)
        
        # Enter credentials
        logger.info("🔑 Entering login credentials")
        self.objects.username_field().fill(GlobalVars.USERNAME)
        self.objects.password_field().fill(GlobalVars.PASSWORD)
        
        # Click login
        logger.info("🖱️ Clicking login button")
        self.objects.login_button().click()
        
        # Verify success
        logger.info("✅ Verifying login success")
        welcome_msg = self.objects.welcome_message()
        assert welcome_msg.is_visible(), "Welcome message should be visible"
        
        logger.info("✅ PASS: User login successful")
        logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
        
    except Exception as e:
        logger.error(f"❌ FAIL: Login test failed - {str(e)}")
        helpers.take_screenshot("login_failure")
        raise
```

## 🔄 Continuous Improvement

### Regular Updates:
- Review and refactor common patterns
- Update helper methods based on usage
- Optimize locator strategies
- Enhance error handling
- Improve logging clarity

### Performance Optimization:
- Minimize wait times where possible
- Use efficient locator strategies
- Implement page object patterns
- Cache frequently used elements

## 📞 Support and Resources

### Documentation:
- This migration guide
- Playwright documentation: https://playwright.dev/python/
- pytest documentation: https://docs.pytest.org/

### Project Structure:
- Configuration: `config/`
- Objects: `Objects/AllObjects.py`
- Helpers: `helper/AllHelpers.py`
- Tests: `Scripts/WebApp/`
- Reports: `reports/`

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Author**: Migration Team  
**Project**: Katalon to Playwright Migration