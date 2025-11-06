# BDD Framework with Playwright + Python

## Framework Overview

This is a **hybrid BDD framework** using **Playwright + Python + pytest** without external BDD dependencies. It combines the readability of BDD scenarios with the power of Playwright automation and the flexibility of pytest.

### Key Features

- ✅ **BDD-style scenarios** in docstrings (Given-When-Then)
- ✅ **Page Object Model** with AllObjects.py (70+ locators)
- ✅ **Business Logic Layer** with AllHelpers.py (comprehensive methods)
- ✅ **Parameterized testing** with pytest.mark.parametrize
- ✅ **Modular test organization** by functionality
- ✅ **Flexible test runner** with multiple execution options

## Architecture Components

### 1. **AllObjects.py** - Object Repository
```python
# Converted 70+ Katalon objects to Playwright locators
objects = AllObjects(page)
forms_link = objects.any_tag_with_text_equals("Forms")
save_button = objects.button_open_record(1)
search_icon = objects.mat_icon_any_text("search")
```

**Key Methods:**
- `any_tag_with_text_equals(text, index=1)` - Find elements by text
- `mat_icon_any_text(value, position=1)` - Material icons
- `button_open_record(number=1)` - Specific buttons
- `column_name(value, position=1)` - Table columns
- `mat_radio_btn(value, position=1)` - Radio buttons
- `error_msg_invalid_mandatory_fields()` - Error detection

### 2. **AllHelpers.py** - Business Logic
```python
# High-level business operations
helpers = AllHelpers(page)
helpers.login_with_parameters(username, password, org, location, staff)
helpers.create_new_form("HCBS", "HCBS Choice", Program="Medicaid Waiver")
helpers.search_input_text_in_home_page("Form Type", "HCBS Choice")
```

**Key Categories:**
- **Login Methods**: `login_with_parameters()`, `portal_login_with_parameters()`
- **Form Operations**: `create_new_form()`, `close_form()`, `click_forms()`
- **Search Methods**: `search_input_text_in_home_page()`, `advanced_search_for_in_progress_record()`
- **Dashboard Methods**: `create_empty_dashboard()`, `add_tile_in_dropzone()`
- **Utility Methods**: Date handling, screenshots, file operations, table validation

### 3. **BDD Test Structure**
```python
def test_create_hcbs_form(self, app_setup):
    """
    Scenario: Create a new HCBS Choice form
    Given I am logged in and on the forms page
    When I click "New Form"
    And I select form category "HCBS"
    And I select form type "HCBS Choice"
    Then the form should be created successfully
    """
    browser_helper, page, helpers = app_setup
    
    # Given
    helpers.click_forms()
    
    # When
    helpers.create_new_form("HCBS", "HCBS Choice", Program="Medicaid Waiver")
    
    # Then
    assert page.locator("text=Form created").is_visible()
```

## Test Files Structure

### Current Test Files:
1. **test_login_bdd.py** - Login scenarios
2. **test_forms_bdd.py** - Form creation and management
3. **test_dashboard_bdd.py** - Dashboard operations (NEW)
4. **test_advanced_bdd.py** - Advanced scenarios (NEW)

### Test Runner Options:
```bash
# Run specific test types
python run_bdd_tests.py --type login
python run_bdd_tests.py --type forms
python run_bdd_tests.py --type dashboard
python run_bdd_tests.py --type advanced
python run_bdd_tests.py --type all

# Run with markers
python run_bdd_tests.py --markers smoke
python run_bdd_tests.py --headless
```

## How to Extend the Framework

### 1. **Adding New Object Locators**

Add to `AllObjects.py`:
```python
def new_element_locator(self, value, position=1):
    """Description of the element"""
    return self.page.locator(f"//xpath[contains(.,'{value}')][{position}]")

def custom_button(self, button_text):
    """Custom button locator"""
    return self.page.locator(f"//button[text()='{button_text}']")
```

### 2. **Adding New Helper Methods**

Add to `AllHelpers.py`:
```python
def new_business_operation(self, param1, param2):
    """New business logic method"""
    # Use AllObjects for element interactions
    element = self.objects.new_element_locator(param1)
    self.objects.click_element(element)
    
    # Combine multiple operations
    self.objects.fill_element(input_field, param2)
    self.page.keyboard.press('Enter')
```

### 3. **Creating New BDD Test Files**

Create `test_new_feature_bdd.py`:
```python
import pytest
from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers
from Objects.AllObjects import AllObjects

class TestNewFeatureBDD:
    @pytest.fixture
    def feature_setup(self):
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        helpers = AllHelpers(page)
        objects = AllObjects(page)
        
        # Setup logic
        yield browser_helper, page, helpers, objects
        browser_helper.close_browser()
    
    def test_new_scenario(self, feature_setup):
        """
        Scenario: New feature scenario
        Given preconditions
        When actions
        Then assertions
        """
        browser_helper, page, helpers, objects = feature_setup
        
        # Implementation using helpers and objects
```

### 4. **Update Test Runner**

Add to `run_bdd_tests.py`:
```python
elif test_type == "new_feature":
    cmd.extend(["test_new_feature_bdd.py"])
```

## Advanced Usage Examples

### 1. **Complex Form Workflow**
```python
def test_complete_form_lifecycle(self, advanced_setup):
    browser_helper, page, helpers, objects = advanced_setup
    
    # Create form
    helpers.create_new_form("HCBS", "HCBS Choice", Program="Medicaid Waiver")
    
    # Fill mandatory fields
    mandatory_fields = objects.all_mandatory_fields()
    for i in range(mandatory_fields.count()):
        field = mandatory_fields.nth(i)
        helpers.generate_random_string(8)
        objects.fill_element(field, random_data, force=True)
    
    # Save and search
    objects.click_element(objects.any_tag_with_text_equals("Save"))
    helpers.search_input_text_in_home_page("Form Type", "HCBS Choice")
    
    # Close form
    helpers.close_form("Testing Complete")
```

### 2. **Table Data Validation**
```python
def test_table_validation(self, advanced_setup):
    browser_helper, page, helpers, objects = advanced_setup
    
    # Extract table data
    column_data = helpers.get_table_data(1)
    
    # Validate headers
    expected_headers = ["Form ID", "Status", "Date"]
    helpers.validate_list_header_column_names(expected_headers)
    
    # Get specific cell
    cell_data = objects.get_data_from_table_with_index(1, 1)
    cell_text = objects.get_element_text(cell_data)
```

### 3. **Parameterized Testing**
```python
@pytest.mark.parametrize("form_type,category,program", [
    ("HCBS Choice", "HCBS", "Medicaid Waiver"),
    ("Grievances", "Appeals", "Level 1"),
    ("Level of Care", "Assessment", "Nursing Home"),
])
def test_multiple_form_types(self, setup, form_type, category, program):
    helpers.create_new_form(category, form_type, Program=program)
```

## Running Tests

### Individual Test Methods:
```bash
# Run specific test method
python -m pytest test_dashboard_bdd.py::TestDashboardBDD::test_create_dashboard_with_tiles -v -s

# Run with markers
python -m pytest -m "smoke" -v -s

# Run in headless mode
set HEADLESS=true && python -m pytest test_advanced_bdd.py -v -s
```

### Using Test Runner:
```bash
# Run all tests
python run_bdd_tests.py

# Run specific suite
python run_bdd_tests.py --type dashboard

# Run in headless mode
python run_bdd_tests.py --headless --type advanced
```

## Best Practices

### 1. **BDD Scenario Writing**
- Use clear Given-When-Then structure
- Keep scenarios focused on business value
- Use descriptive scenario names
- Include examples for parameterized tests

### 2. **Object Locator Design**
- Make locators parameterized and reusable
- Use meaningful method names
- Include position parameters for multiple elements
- Add utility methods for common operations

### 3. **Helper Method Design**
- Combine multiple object interactions
- Handle error scenarios gracefully
- Use meaningful parameter names
- Include logging and feedback

### 4. **Test Organization**
- Group related scenarios in same test class
- Use appropriate fixtures for setup/teardown
- Keep tests independent and isolated
- Use markers for test categorization

## Framework Benefits

1. **Maintainability**: Centralized object repository and business logic
2. **Reusability**: Parameterized methods and helper functions
3. **Readability**: BDD scenarios in natural language
4. **Flexibility**: Multiple execution options and test organization
5. **Scalability**: Easy to extend with new objects and helpers
6. **Debugging**: Clear separation of concerns and detailed logging

## Migration from Katalon

This framework successfully converts:
- ✅ **70+ Katalon objects** → AllObjects.py methods
- ✅ **Katalon keywords** → AllHelpers.py methods  
- ✅ **Test cases** → BDD scenarios
- ✅ **Test suites** → pytest test classes
- ✅ **Data-driven tests** → pytest.mark.parametrize

The result is a more maintainable, flexible, and powerful test automation solution.