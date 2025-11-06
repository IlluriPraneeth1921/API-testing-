#!/usr/bin/env python3
"""
Migrated from Katalon Script: Validate user able to login Standard Application
Original: Script1721416891019.groovy

Test Case: Validate user login to Standard Application
Purpose: Smoke test to verify user can successfully login to the Standard application
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

class TestValidateUserLoginStandardApplication:
    """Test class for validating user login to Standard Application"""
    
    @pytest.fixture
    def browser_setup(self):
        """Setup browser for tests"""
        browser_helper = BrowserHelper()
        page = browser_helper.launch_browser(headless=False)
        yield browser_helper, page
        browser_helper.close_browser()
    
    def test_validate_user_login_standard_application(self, browser_setup):
        """
        Test Case: Validate user able to login Standard Application
        
        Steps:
        1. Open browser and maximize window
        2. Login with parameters using credentials from global variables
        3. Verify successful login
        """
        browser_helper, page = browser_setup
        
        # Initialize helpers
        helpers = AllHelpers(page)
        
        # Load test data from GlobalVariables (similar to Katalon)
        GlobalVars.load_config(environment="standard")  # Standard environment for Carity
        
        login_credentials = {
            'Username': GlobalVars.USERNAME,
            'Password': GlobalVars.PASSWORD,
            'Organization': GlobalVars.ORGANIZATION,
            'Location': GlobalVars.LOCATION,
            'StaffMember': GlobalVars.STAFF_MEMBER
        }
        
        try:
            # Step 1: Browser is already opened and maximized in fixture
            logger.info("=== TEST START: Validate User Login Standard Application ===")
            logger.info("Step 1: Browser opened and maximized")
            logger.info(f"Test Environment: {GlobalVars.load_config.__defaults__[0] if hasattr(GlobalVars.load_config, '__defaults__') else 'standard'}")
            logger.info(f"Base URL: {GlobalVars.BASE_URL}")
            logger.info(f"Username: {login_credentials['Username']}")
            logger.info(f"Organization: {login_credentials['Organization']}")
            logger.info(f"Location: {login_credentials['Location']}")
            logger.info(f"Staff Member: {login_credentials['StaffMember']}")
            
            # Step 2: Login with parameters (equivalent to Custom Keyword loginWithParametersf4)
            logger.info("Step 2: Starting login process with parameters")
            helpers.login_with_parameters(
                base_url=GlobalVars.BASE_URL,
                username=login_credentials['Username'],
                password=login_credentials['Password'],
                organization=login_credentials['Organization'],
                location=login_credentials['Location'],
                staff_member=login_credentials['StaffMember']
            )
            logger.info("Login process completed successfully")
            
            # Step 3: Verify successful login using AllHelpers validation
            logger.info("Step 3: Verifying login success...")
            
            # Use AllHelpers validation method
            helpers.assert_login_successful()
            
            logger.info("✅ PASS: User successfully logged into Standard Application")
            logger.info(f"Final URL: {page.url}")
            logger.info("=== TEST COMPLETED SUCCESSFULLY ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Login test failed - {str(e)}")
            logger.error(f"Current URL at failure: {page.url}")
            logger.error(f"Page title at failure: {page.title()}")
            # Take screenshot for debugging using AllHelpers
            helpers.take_screenshot("login_failure_screenshot")
            logger.error("Screenshot captured for debugging")
            logger.error("=== TEST FAILED ===")
            raise
    
    def test_validate_user_login_with_error_handling(self, browser_setup):
        """
        Enhanced test with better error handling and validation
        """
        browser_helper, page = browser_setup
        helpers = AllHelpers(page)
        
        # Load test data from GlobalVariables
        GlobalVars.load_config(environment="standard")
        
        login_credentials = {
            'Username': GlobalVars.USERNAME,
            'Password': GlobalVars.PASSWORD,
            'Organization': GlobalVars.ORGANIZATION,
            'Location': GlobalVars.LOCATION,
            'StaffMember': GlobalVars.STAFF_MEMBER
        }
        
        try:
            logger.info("=== Starting Enhanced Login Test with Error Handling ===")
            
            # Navigate to application using GlobalVariables
            initial_url = GlobalVars.BASE_URL
            logger.info(f"Initial URL: {initial_url}")
            
            # Perform login using AllHelpers
            logger.info("Performing login with enhanced error handling")
            helpers.login_with_parameters(
                base_url=GlobalVars.BASE_URL,
                username=login_credentials['Username'],
                password=login_credentials['Password'],
                organization=login_credentials['Organization'],
                location=login_credentials['Location'],
                staff_member=login_credentials['StaffMember']
            )
            
            # Enhanced validation using AllHelpers
            logger.info("Running enhanced validation checks")
            validation_result = helpers.verify_login_success()
            
            logger.info(f"Final URL: {validation_result['current_url']}")
            
            logger.info("Validation Results:")
            logger.info(f"  Dashboard visible: {'PASS' if validation_result['dashboard_visible'] else 'FAIL'}")
            logger.info(f"  URL changed from login: {'PASS' if validation_result['url_changed'] else 'FAIL'}")
            logger.info(f"  No error messages: {'PASS' if validation_result['no_errors'] else 'FAIL'}")
            
            # Use AllHelpers assertion method
            helpers.assert_login_successful()
            
            logger.info("✅ SUCCESS: All enhanced login validations passed!")
            
        except Exception as e:
            logger.error(f"❌ ERROR: Enhanced test failed - {str(e)}")
            # Capture debug information using AllHelpers
            helpers.take_screenshot("enhanced_login_failure")
            logger.error(f"Debug - Current URL: {page.url}")
            logger.error(f"Debug - Page Title: {page.title()}")
            logger.error("Enhanced test failed with error handling")
            raise

def run_standalone():
    """Run test standalone without pytest"""
    print("Running Katalon Migration Test - Validate User Login Standard Application")
    
    browser_helper = BrowserHelper()
    
    try:
        page = browser_helper.launch_browser(headless=False)
        test_instance = TestValidateUserLoginStandardApplication()
        
        # Create mock browser_setup fixture
        class MockFixture:
            def __init__(self, browser_helper, page):
                self.browser_helper = browser_helper
                self.page = page
            
            def __iter__(self):
                return iter([self.browser_helper, self.page])
        
        fixture = MockFixture(browser_helper, page)
        
        # Run the test
        test_instance.test_validate_user_login_standard_application(fixture)
        
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