from playwright.sync_api import sync_playwright

def test_open_site():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            page.goto("https://standard-f1-carity.feisystemsh2env.com/", timeout=30000)
            page.wait_for_load_state('networkidle')
            
            # Get the actual page title for debugging
            title = page.title()
            print(f"Page title: {title}")
            
            # Check if page loaded successfully
            assert page.url.startswith("https://standard-f1-carity.feisystemsh2env.com")
            print("Test passed: Page loaded successfully!")
            
        except Exception as e:
            print(f"Error: {e}")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_open_site()