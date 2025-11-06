import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

from helper.browser_helper import BrowserHelper
from Objects.LoginPage.login_page import LoginPage

def test_simple_login():
    """Simple login test without BDD"""
    print("Starting simple login test...")
    
    browser_helper = BrowserHelper()
    
    try:
        # Launch browser
        page = browser_helper.launch_browser(headless=False)
        
        # Navigate to login page
        browser_helper.navigate_to("https://standard-f1-carity.feisystemsh2env.com/")
        
        # Create login page object
        login_page = LoginPage(page, browser_helper)
        
        # Perform login
        login_page.login("George.Parker", "Password123#", wait_time=5000)
        
        print("✓ Simple login test completed successfully!")
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        raise
    finally:
        browser_helper.close_browser()

if __name__ == "__main__":
    test_simple_login()