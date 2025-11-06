import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from helper.browser_helper import BrowserHelper
from Objects.LoginPage.login_page import LoginPage

def test_login():
    print("Starting login test...")
    browser_helper = BrowserHelper()
    
    try:
        # Launch browser
        page = browser_helper.launch_browser(headless=False)

        
        
        # Navigate to login page
        browser_helper.navigate_to("https://standard-f5-carity.feisystemsh2env.com/")
        
        page.wait_for_timeout(10000) 

        # Create login page object with browser helper
        login_page = LoginPage(page, browser_helper)

        print("page.url : "+page.url)
        
        # Store current URL before login
        login_url = page.url

        print("login_url1 : "+login_url)
        # Perform login - update credentials as needed
        print("Attempting login...")
        login_page.login("George.Parker", "Password123#", wait_time=20000)
        
        print("login_url2 : "+"https://standard-f5-carity.feisystemsh2env.com/")

      
        
        # Check login result
        if login_page.is_login_successful():
            print("PASS: Login successful!")
        else:
            error_msg = login_page.get_error_message()
            if error_msg:
                print(f"FAIL: Login failed - {error_msg}")
            else:
                print("FAIL: Login failed")
            
    except Exception as e:
        print(f"FAIL: Test failed with error: {e}")
        sys.exit(1)
    finally:
        browser_helper.close_browser()

if __name__ == "__main__":
    test_login()
    print("Login test completed!")