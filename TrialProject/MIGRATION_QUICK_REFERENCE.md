# Katalon to Playwright Migration - Quick Reference

## 🚀 Quick Start Template

### New Test File Template
```python
#!/usr/bin/env python3
"""
Migrated from Katalon Script: [ORIGINAL_NAME]
Original: [ORIGINAL_FILE.groovy]
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

class Test[TestName]:
    @pytest.fixture
    def browser_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_[test_name](self, browser_setup):
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        GlobalVars.load_config(environment="standard")
        
        try:
            logger.info("=== TEST START: [Test Name] ===")
            # Your test logic here
            logger.info("✅ TEST COMPLETED SUCCESSFULLY")
        except Exception as e:
            logger.error(f"❌ TEST FAILED: {str(e)}")
            helpers.take_screenshot("test_failure")
            raise

if __name__ == "__main__":
    # Standalone execution code
```

## 🔄 Common Migration Patterns

### Katalon → Playwright Conversions

| Katalon | Playwright |
|---------|------------|
| `WebUI.openBrowser('')` | `browser_helper.launch_browser()` |
| `WebUI.navigateToUrl(url)` | `page.goto(url)` |
| `WebUI.click(object)` | `self.objects.element().click()` |
| `WebUI.setText(object, text)` | `self.objects.element().fill(text)` |
| `WebUI.selectOptionByText(dropdown, text)` | `self.select_dropdown_option(dropdown, text)` |
| `WebUI.verifyElementPresent(object)` | `assert self.objects.element().is_visible()` |
| `WebUI.takeScreenshot()` | `helpers.take_screenshot("name")` |
| `GlobalVariable.Variable` | `GlobalVars.VARIABLE` |

## 📁 File Locations

### Add New Locators:
**File**: `Objects/AllObjects.py`
```python
def new_element(self):
    """Description"""
    return self.page.locator("selector")
```

### Add New Helpers:
**File**: `helper/AllHelpers.py`
```python
def new_helper_method(self, param):
    """Helper description"""
    logger.info("🔧 Starting helper method")
    # Implementation
    logger.info("✅ Helper completed")
```

### Add New Config:
**File**: `config/test_config.json`
```json
{
  "environments": {
    "standard": {
      "new_data": "value"
    }
  }
}
```

## 🎯 Essential Helper Methods

### Already Available:
```python
# Dropdown selection
helpers.select_dropdown_option(locator, option_text, search_text, wait_time)

# Text utilities
helpers.get_first_word(text)

# Login flow
helpers.login_with_parameters(base_url, username, password, org, location, staff)

# Validation
helpers.assert_login_successful()
helpers.verify_login_success()

# Screenshots
helpers.take_screenshot("name")
```

## 🏃‍♂️ Quick Commands

### Run Single Test:
```bash
pytest Scripts/WebApp/Carity/Standard/SmokeTest/test_name.py -v
```

### Generate HTML Report:
```bash
pytest test_name.py -v --html=reports/report.html --self-contained-html --log-cli-level=INFO
```

### Run Standalone:
```bash
python test_name.py
```

## 🔍 Quick Debug

### Add Debug Logging:
```python
logger.debug(f"Element count: {element.count()}")
logger.debug(f"Current URL: {page.url}")
helpers.take_screenshot("debug_point")
```

### Common Wait Patterns:
```python
element.wait_for(state='visible', timeout=30000)
page.wait_for_load_state('networkidle')
page.wait_for_timeout(2000)
```

## ✅ Migration Checklist

- [ ] Create test file from template
- [ ] Add required locators to AllObjects.py
- [ ] Add required helpers to AllHelpers.py
- [ ] Add test data to config files
- [ ] Implement test with logging
- [ ] Test standalone execution
- [ ] Test pytest execution
- [ ] Verify HTML report
- [ ] Verify screenshot on failure

## 🎨 Logging Emojis

- 🚀 Test start
- ✅ Success/Pass
- ❌ Error/Fail
- 🔧 Action/Process
- 🌍 Navigation
- 🔑 Authentication
- 🖱️ Click action
- ⌨️ Text input
- 🔽 Dropdown selection
- 📝 Form filling
- 🔍 Validation/Check

## 📊 Report Locations

- **HTML Reports**: `C:\Whitelisted\TrialProject\reports\`
- **Screenshots**: `C:\Whitelisted\TrialProject\screenshots\`
- **Logs**: Console output and HTML report logs section

---
**Quick Reference v1.0** | **Katalon to Playwright Migration**