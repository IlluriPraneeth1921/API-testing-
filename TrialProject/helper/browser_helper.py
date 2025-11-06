from playwright.sync_api import sync_playwright

class BrowserHelper:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
    
    def launch_browser(self, headless=False):
        """Launch browser and create a new page"""
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=headless)
        self.page = self.browser.new_page()
        print("Browser launched and page created")
        return self.page
    
    def navigate_to(self, url, timeout=30000):
        """Navigate to the specified URL and wait for redirects"""
        if not self.page:
            raise Exception("Browser not launched. Call launch_browser() first.")
        
        print(f"Navigating to: {url}")
        self.page.goto(url, timeout=timeout)
        
        # Wait for any redirects to complete
        self.page.wait_for_load_state('networkidle', timeout=timeout)
        print(f"Final URL after redirects: {self.page.url}")
        print("Page loaded successfully")
        return self.page
    
    def wait_for_url_change(self, url, timeout=30000):
                   
        # Wait for any redirects to complete
        self.page.wait_for_load_state(url, timeout=timeout)
        print(f"Final URL after redirects: {self.page.url}")
        print("Page loaded successfully")
        return self.page
    
    
    
 
    
    def close_browser(self):
        """Close browser and cleanup"""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        print("Browser closed")