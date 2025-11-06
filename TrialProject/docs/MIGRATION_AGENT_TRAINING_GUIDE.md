# Migration Agent Training Guide
## Training AI Agents for Katalon to Playwright Migration

### Overview
This guide provides structured prompts, training methodologies, and best practices for training AI agents to perform automated Katalon to Playwright migrations.

## 1. Core Training Prompts

### 1.1 Initial Context Setting Prompt
```
You are a specialized migration agent trained to convert Katalon Studio test scripts to Playwright with Python. 

Your expertise includes:
- Katalon WebUI keywords to Playwright API mapping
- Page Object Model implementation
- Test framework architecture design
- Error handling and logging best practices
- Configuration management systems

Always follow these principles:
1. Maintain test logic integrity during migration
2. Implement proper Page Object Model patterns
3. Add comprehensive logging with emojis for readability
4. Create reusable helper methods
5. Establish centralized configuration management
6. Ensure robust error handling with screenshots
```

### 1.2 Migration Analysis Prompt
```
Analyze the provided Katalon script and identify:

1. **Test Structure Analysis:**
   - Test case purpose and scope
   - WebUI keywords used
   - Test data and variables
   - Verification points
   - Error handling mechanisms

2. **Migration Requirements:**
   - Required Playwright equivalents
   - Page Object Model components needed
   - Helper methods to create/reuse
   - Configuration variables to extract
   - Logging points to implement

3. **Architecture Decisions:**
   - File structure organization
   - Reusable component identification
   - Test data management approach
   - Reporting and logging strategy

Provide a detailed migration plan before starting implementation.
```

### 1.3 Implementation Prompt Template
```
Migrate the Katalon script following this architecture:

**File Structure:**
- Main test: Scripts/[TestPath]/[TestName].py
- Locators: Objects/AllObjects.py
- Helpers: helper/AllHelpers.py
- Config: config/global_variables.py
- Test Data: config/test_config.json

**Implementation Requirements:**
1. Convert WebUI keywords to Playwright methods
2. Extract locators to AllObjects.py with descriptive names
3. Create reusable methods in AllHelpers.py
4. Add comprehensive logging with emojis (🚀 ✅ ❌ 📝 🔍)
5. Implement error handling with screenshot capture
6. Use GlobalVars for configuration management
7. Add pytest fixtures for browser management
8. Include both basic and enhanced test methods

**Code Quality Standards:**
- Follow PEP 8 naming conventions
- Add docstrings for all methods
- Implement proper exception handling
- Use type hints where appropriate
- Maintain clean, readable code structure
```

## 2. Training Dataset Structure

### 2.1 Input-Output Pairs

#### Example Training Pair 1: Basic Login
**Input (Katalon):**
```groovy
WebUI.openBrowser('')
WebUI.maximizeWindow()
WebUI.navigateToUrl('https://app.example.com')
WebUI.setText(findTestObject('Page_Login/input_username'), 'testuser')
WebUI.setText(findTestObject('Page_Login/input_password'), 'password123')
WebUI.click(findTestObject('Page_Login/button_login'))
WebUI.verifyElementPresent(findTestObject('Page_Dashboard/div_welcome'))
```

**Expected Output (Playwright):**
```python
def test_basic_login(self, browser_setup):
    browser_helper, page = browser_setup
    helpers = AllHelpers(page)
    
    logger.info("🚀 Starting basic login test")
    
    try:
        # Navigate to application
        page.goto(GlobalVars.BASE_URL)
        logger.info(f"📝 Navigated to: {GlobalVars.BASE_URL}")
        
        # Perform login
        page.fill(AllObjects.LOGIN_USERNAME_INPUT, "testuser")
        page.fill(AllObjects.LOGIN_PASSWORD_INPUT, "password123")
        page.click(AllObjects.LOGIN_SUBMIT_BUTTON)
        logger.info("📝 Login credentials entered and submitted")
        
        # Verify success
        page.wait_for_selector(AllObjects.DASHBOARD_WELCOME_DIV)
        assert page.is_visible(AllObjects.DASHBOARD_WELCOME_DIV)
        logger.info("✅ Login successful - Dashboard visible")
        
    except Exception as e:
        logger.error(f"❌ Login test failed: {str(e)}")
        helpers.take_screenshot("login_failure")
        raise
```

### 2.2 Keyword Mapping Training Data

Create comprehensive mapping datasets:

```python
KATALON_TO_PLAYWRIGHT_MAPPINGS = {
    # Navigation
    "WebUI.openBrowser('')": "browser_helper.launch_browser()",
    "WebUI.navigateToUrl(url)": "page.goto(url)",
    "WebUI.maximizeWindow()": "# Handled in browser_helper",
    
    # Element Interactions
    "WebUI.setText(object, text)": "page.fill(locator, text)",
    "WebUI.click(object)": "page.click(locator)",
    "WebUI.selectOptionByLabel(object, label)": "page.select_option(locator, label=label)",
    
    # Verifications
    "WebUI.verifyElementPresent(object)": "assert page.is_visible(locator)",
    "WebUI.verifyElementText(object, text)": "assert page.text_content(locator) == text",
    
    # Waits
    "WebUI.waitForElementPresent(object, timeout)": "page.wait_for_selector(locator, timeout=timeout*1000)",
    "WebUI.waitForElementVisible(object, timeout)": "page.wait_for_selector(locator, state='visible', timeout=timeout*1000)"
}
```

## 3. Training Methodology

### 3.1 Progressive Training Approach

#### Phase 1: Basic Keyword Conversion
- Train on simple WebUI keyword mappings
- Focus on element interactions (click, type, select)
- Implement basic verification methods

#### Phase 2: Architecture Implementation
- Train on Page Object Model patterns
- Implement helper method creation
- Focus on code organization and reusability

#### Phase 3: Advanced Features
- Error handling and logging implementation
- Configuration management
- Test data handling and parameterization

#### Phase 4: Quality Assurance
- Code quality and best practices
- Performance optimization
- Documentation generation

### 3.2 Validation Criteria

Train the agent to validate migrations against these criteria:

```python
MIGRATION_VALIDATION_CHECKLIST = {
    "functionality": "All original test steps preserved",
    "architecture": "Page Object Model implemented correctly",
    "logging": "Comprehensive logging with emojis added",
    "error_handling": "Proper exception handling with screenshots",
    "configuration": "GlobalVars used for test data",
    "reusability": "Helper methods created for common actions",
    "maintainability": "Clean, documented, and organized code",
    "pytest_compatibility": "Proper pytest fixtures and structure"
}
```

## 4. Specific Training Prompts by Category

### 4.1 Element Locator Migration
```
Convert Katalon Test Objects to Playwright locators:

Rules:
1. Extract to AllObjects.py with descriptive names
2. Use CSS selectors or XPath as appropriate
3. Add comments explaining the element purpose
4. Group related locators together
5. Use constants with UPPER_CASE naming

Example:
Katalon: findTestObject('Page_Login/input_username')
Playwright: LOGIN_USERNAME_INPUT = "input[name='username']"
```

### 4.2 Helper Method Creation
```
Create reusable helper methods for common actions:

Guidelines:
1. Method names should be descriptive and action-oriented
2. Include comprehensive logging with emojis
3. Add proper error handling with screenshots
4. Use type hints for parameters
5. Add docstrings explaining purpose and parameters
6. Make methods generic and reusable

Focus on these common patterns:
- login_with_parameters()
- select_dropdown_option()
- wait_for_element_and_click()
- verify_text_content()
- take_screenshot()
```

### 4.3 Configuration Management
```
Implement GlobalVars configuration system:

Requirements:
1. Create global_variables.py with environment support
2. Use test_config.json for environment-specific data
3. Implement load_config() method with environment parameter
4. Support multiple environments (dev, test, prod, standard)
5. Include all test data: URLs, credentials, timeouts
6. Add validation for required configuration values
```

## 5. Quality Assurance Training

### 5.1 Code Review Prompts
```
Review the migrated code for:

1. **Functionality**: Does it preserve all original test logic?
2. **Architecture**: Is Page Object Model properly implemented?
3. **Logging**: Are all steps logged with appropriate emojis?
4. **Error Handling**: Are exceptions caught and screenshots taken?
5. **Reusability**: Are common actions extracted to helpers?
6. **Maintainability**: Is the code clean and well-documented?
7. **Performance**: Are waits and timeouts optimized?
8. **Standards**: Does it follow Python and pytest conventions?
```

### 5.2 Testing Validation
```
Validate the migration by:

1. Running the migrated test successfully
2. Comparing test results with original Katalon execution
3. Verifying all assertions pass
4. Checking log output for completeness
5. Testing error scenarios and screenshot capture
6. Validating configuration loading works correctly
7. Ensuring helper methods are reusable across tests
```

## 6. Advanced Training Scenarios

### 6.1 Complex Test Scenarios
Train on increasingly complex scenarios:

1. **Multi-step workflows** with navigation between pages
2. **Data-driven tests** with multiple test data sets
3. **API + UI combined tests** with service integrations
4. **File upload/download** operations
5. **Dynamic element handling** with waits and retries
6. **Cross-browser testing** configurations

### 6.2 Error Handling Training
```
Implement robust error handling for:

1. Element not found scenarios
2. Timeout exceptions
3. Network connectivity issues
4. Authentication failures
5. Data validation errors
6. Browser crashes or hangs
7. Configuration loading failures

Always include:
- Descriptive error messages
- Screenshot capture
- Current page state logging
- Cleanup operations
- Graceful test termination
```

## 7. Continuous Improvement

### 7.1 Feedback Loop Implementation
```
Establish feedback mechanisms:

1. **Success Metrics**: Track migration success rates
2. **Error Analysis**: Categorize and analyze migration failures
3. **Performance Metrics**: Measure migration speed and accuracy
4. **User Feedback**: Collect feedback on migrated test quality
5. **Pattern Recognition**: Identify common migration patterns
6. **Knowledge Base**: Build repository of solved migration challenges
```

### 7.2 Model Updates
```
Regular model improvement process:

1. **Weekly Reviews**: Analyze migration results and failures
2. **Pattern Updates**: Add new Katalon-Playwright mappings
3. **Helper Expansion**: Add new reusable helper methods
4. **Configuration Enhancement**: Improve GlobalVars capabilities
5. **Documentation Updates**: Keep migration guides current
6. **Training Data Expansion**: Add new migration examples
```

## 8. Implementation Checklist

### For Training Teams:
- [ ] Prepare diverse Katalon script samples
- [ ] Create expected Playwright output examples
- [ ] Establish validation criteria and metrics
- [ ] Set up automated testing pipeline
- [ ] Create feedback collection mechanisms
- [ ] Document common migration patterns
- [ ] Establish quality gates for migrations

### For Migration Agents:
- [ ] Master Katalon WebUI keyword mappings
- [ ] Understand Page Object Model implementation
- [ ] Learn comprehensive logging strategies
- [ ] Implement robust error handling
- [ ] Create reusable helper methods
- [ ] Manage configuration systems effectively
- [ ] Generate quality documentation
- [ ] Validate migration completeness

This training guide provides a structured approach to developing highly effective Katalon to Playwright migration agents with consistent, high-quality output.