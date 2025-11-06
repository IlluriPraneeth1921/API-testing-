#!/usr/bin/env python3
"""
Debug Login Test - To understand the actual login flow
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))

from helper.browser_helper import BrowserHelper
from helper.AllHelpers import AllHelpers

def debug_login_flow():
    """Debug the actual login flow to understand what happens"""
    print("=== DEBUG LOGIN FLOW ===")
    
    browser_helper = BrowserHelper()
    
    try:
        page = browser_helper.launch_browser(headless=False)
        helpers = AllHelpers(page)
        
        # Navigate to application
        print("1. Navigating to application...")
        page.goto("https://standard-f1-carity.feisystemsh2env.com/")
        page.wait_for_load_state('networkidle')
        print(f"   URL: {page.url}")
        print(f"   Title: {page.title()}")
        
        # Check for acknowledge button
        print("2. Checking for acknowledge button...")
        acknowledge_btn = helpers.objects.acknowledge_button()
        if acknowledge_btn.is_visible():
            print("   Acknowledge button found - waiting for it to disappear")
            page.wait_for_timeout(5000)  # Wait 5 seconds
            if acknowledge_btn.is_visible():
                print("   Acknowledge button still visible after 5 seconds")
            else:
                print("   Acknowledge button disappeared")
                
            # Wait additional time for login form to appear
            print("   Waiting additional 10 seconds for login form...")
            page.wait_for_timeout(10000)
            page.wait_for_load_state('networkidle')
            
            print(f"   URL after wait: {page.url}")
            print(f"   Title after wait: {page.title()}")
        else:
            print("   No acknowledge button found")
        
        # Check for login form
        print("3. Checking for login form...")
        username_field = helpers.objects.sign_in_username_field()
        password_field = helpers.objects.sign_in_password_field()
        
        print(f"   Username field visible: {username_field.is_visible()}")
        print(f"   Password field visible: {password_field.is_visible()}")
        
        # Check for alternative selectors on Cognito page
        print("   Checking alternative selectors...")
        alt_username = page.locator("input[name='username']").first
        alt_password = page.locator("input[name='password']").first
        
        print(f"   Alt username field visible: {alt_username.is_visible()}")
        print(f"   Alt password field visible: {alt_password.is_visible()}")
        
        # Check for any input fields
        all_inputs = page.locator("input").count()
        print(f"   Total input fields found: {all_inputs}")
        
        # Inspect each input field
        for i in range(all_inputs):
            input_elem = page.locator("input").nth(i)
            try:
                input_type = input_elem.get_attribute("type")
                input_name = input_elem.get_attribute("name")
                input_id = input_elem.get_attribute("id")
                input_visible = input_elem.is_visible()
                print(f"   Input {i}: type={input_type}, name={input_name}, id={input_id}, visible={input_visible}")
            except:
                print(f"   Input {i}: Could not get attributes")
        
        # Try to find and use visible input fields
        visible_text_inputs = page.locator("input[type='text']:visible, input[type='email']:visible").count()
        visible_password_inputs = page.locator("input[type='password']:visible").count()
        
        print(f"   Visible text inputs: {visible_text_inputs}")
        print(f"   Visible password inputs: {visible_password_inputs}")
        
        if visible_text_inputs > 0 and visible_password_inputs > 0:
            print("4. Found visible login fields - entering credentials...")
            
            # Use first visible text input for username
            username_input = page.locator("input[type='text']:visible, input[type='email']:visible").first
            username_input.fill("George.Parker", force=True)
            
            # Use first visible password input
            password_input = page.locator("input[type='password']:visible").first
            password_input.fill("Password123#", force=True)
            
            print("5. Looking for submit button...")
            # Try different submit button selectors
            submit_selectors = [
                "input[type='submit']",
                "button[type='submit']", 
                "button:has-text('Sign')",
                "input[value*='Sign']",
                "[name*='submit']"
            ]
            
            button_clicked = False
            for selector in submit_selectors:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible():
                        print(f"   Found submit button with selector: {selector}")
                        btn.click()
                        button_clicked = True
                        break
                except:
                    continue
            
            if not button_clicked:
                print("   No submit button found - trying Enter key")
                password_input.press("Enter")
        else:
            print("4. No visible login fields found")
            
        # Wait for response after login attempt
        print("6. Waiting for login response...")
        page.wait_for_load_state('networkidle', timeout=15000)
        
        print(f"   New URL: {page.url}")
        print(f"   New Title: {page.title()}")
            
        # Check what elements are now visible
        print("7. Checking visible elements after login...")
        
        # Check for organization dropdown
        org_dropdown = helpers.objects.data_testid_element('organization-dropdown')
        print(f"   Organization dropdown visible: {org_dropdown.is_visible()}")
        
        # Check for dashboard
        dashboard = helpers.objects.any_tag_with_text_equals('Dashboard')
        print(f"   Dashboard visible: {dashboard.is_visible()}")
        
        # Check for acknowledge button again
        print(f"   Acknowledge button visible: {acknowledge_btn.is_visible()}")
        
        # Get page content for analysis
        print("8. Getting page content...")
        page_content = page.content()
        
        # Check for common elements
        if "organization" in page_content.lower():
            print("   'organization' text found in page")
        if "dashboard" in page_content.lower():
            print("   'dashboard' text found in page")
        if "login" in page_content.lower():
            print("   'login' text found in page")
        
        # Take screenshot for analysis
        print("9. Taking screenshot...")
        helpers.take_screenshot("debug_login_flow")
        print("   Screenshot saved as debug_login_flow.png")
        
        # Wait for manual inspection
        print("10. Pausing for manual inspection (10 seconds)...")
        page.wait_for_timeout(10000)
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        helpers.take_screenshot("debug_error")
        
    finally:
        browser_helper.close_browser()
        print("Browser closed")

if __name__ == "__main__":
    debug_login_flow()