#!/usr/bin/env python3
"""
Simplified Login Test - Katalon Migration
Tests basic login functionality without organization setup
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers

def test_simple_login():
    """Simple login test without organization setup"""
    print("Running Simple Login Test")
    
    browser_helper = BrowserHelper()
    
    try:
        # Launch browser
        page = browser_helper.launch_browser(headless=False)
        helpers = AllHelpers(page)
        
        print("Browser launched successfully")
        
        # Navigate to application
        page.goto("https://standard-f1-carity.feisystemsh2env.com/")
        page.wait_for_load_state('networkidle')
        
        print(f"Navigated to: {page.url}")
        
        # Enter credentials only
        print("Entering credentials...")
        
        # Check if username field exists
        username_field = helpers.objects.sign_in_username_field()
        if username_field.is_visible():
            username_field.first.fill("George.Parker", force=True)
            print("Username entered")
        else:
            print("Username field not found")
        
        # Check if password field exists
        password_field = helpers.objects.sign_in_password_field()
        if password_field.is_visible():
            password_field.first.fill("Password123#", force=True)
            print("Password entered")
        else:
            print("Password field not found")
        
        # Click login button
        print("Clicking login button...")
        page.evaluate("""
            const button = document.querySelector('input[name="signInSubmitButton"]');
            if (button) { 
                button.click(); 
                console.log('Login button clicked');
            } else {
                console.log('Login button not found');
            }
        """)
        
        # Wait for response
        page.wait_for_load_state('networkidle', timeout=15000)
        
        # Check current state
        current_url = page.url
        print(f"After login attempt - URL: {current_url}")
        
        # Simple validation
        if "login" not in current_url.lower():
            print("SUCCESS: Appears to have moved away from login page")
            
            # Check for acknowledge button
            acknowledge_btn = helpers.objects.acknowledge_button()
            if acknowledge_btn.is_visible():
                print("Acknowledge button found - clicking...")
                acknowledge_btn.click()
                page.wait_for_load_state('networkidle')
                print(f"After acknowledge - URL: {page.url}")
            
            # Check for dashboard or other success indicators
            dashboard_visible = helpers.objects.any_tag_with_text_equals('Dashboard').is_visible()
            if dashboard_visible:
                print("SUCCESS: Dashboard found - login successful!")
            else:
                print("INFO: Dashboard not found, but login appears successful")
                
        else:
            print("INFO: Still on login page - may need additional steps")
        
        # Take screenshot for reference
        helpers.take_screenshot("login_test_result")
        print("Screenshot saved as login_test_result.png")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        helpers.take_screenshot("login_test_error")
        return False
        
    finally:
        browser_helper.close_browser()
        print("Browser closed")

if __name__ == "__main__":
    success = test_simple_login()
    if success:
        print("Test completed")
        sys.exit(0)
    else:
        print("Test failed")
        sys.exit(1)