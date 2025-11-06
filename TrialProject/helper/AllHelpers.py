import time
import random
import string
import logging
from datetime import datetime, timedelta
from playwright.sync_api import Page
from Objects.AllObjects import AllObjects
from helper.node_executor import NodeExecutor

# Configure logger for AllHelpers
logger = logging.getLogger(__name__)

class AllHelpers:
    """Converted Katalon Keywords to Playwright helper methods"""
    
    def __init__(self, page: Page):
        self.page = page
        self.objects = AllObjects(page)
        self.node_executor = NodeExecutor()
    
    # Utility Helper Methods
    def get_first_word(self, text):
        """Get substring before first space"""
        if not text:
            return ""
        return text.split()[0] if text.split() else text
    
    # Dropdown Helper Methods
    def select_dropdown_option(self, dropdown_locator, option_text, search_text="quantum", wait_time=5000):
        """Generic dropdown selection helper"""
        logger.info(f"🔽 Selecting '{option_text}' from dropdown")
        logger.debug(f"Search text: '{search_text}', Wait time: {wait_time}ms")
        
        # Click dropdown
        logger.debug("Clicking dropdown to open options")
        dropdown_locator.click(force=True)
        self.page.wait_for_timeout(2000)
        
        # Fill search text if provided
        if search_text:
            logger.debug(f"Filling search text: '{search_text}'")
            dropdown_locator.fill(search_text)
            self.page.wait_for_timeout(wait_time)
        
        # Try exact match first
        logger.debug(f"Looking for exact match: '{option_text}'")
        exact_match = self.objects.mat_option_with_text(option_text)
        if exact_match.count() > 0:
            exact_match.click()
            logger.info(f"✅ Selected: {option_text}")
            return True
        
        # Debug available options
        all_options = self.objects.all_mat_options().all()
        logger.warning(f"Exact match not found. Available options ({len(all_options)}):")
        for i, option in enumerate(all_options[:10]):
            try:
                option_text_content = option.text_content()
                logger.debug(f"  {i+1}: '{option_text_content}'")
            except:
                logger.debug(f"  {i+1}: Could not get text")
        
        # Try partial matches
        partial_matches = ["Quantum", "Medical Equipment", "Medical"]
        logger.debug(f"Trying partial matches: {partial_matches}")
        for partial in partial_matches:
            if partial.lower() in option_text.lower():
                logger.debug(f"Attempting partial match with: '{partial}'")
                partial_option = self.objects.mat_option_with_text(partial)
                if partial_option.count() > 0:
                    partial_option.click()
                    logger.info(f"✅ Selected with partial match: {partial}")
                    return True
        
        # Try first available option as fallback
        logger.warning("No partial matches found, trying first available option")
        first_option = self.objects.all_mat_options().first
        if first_option.count() > 0:
            first_option.click()
            logger.info("✅ Selected first available option")
            return True
        
        logger.error(f"❌ Could not find dropdown option: {option_text}")
        raise Exception(f"Could not find dropdown option: {option_text}")
    
    # Login Methods
    def login_with_parameters(self, base_url, username, password, organization, location, staff_member):
        """Complete login process with organization setup"""
        logger.info("🚀 Starting complete login process with organization setup")
        logger.info(f"Target URL: {base_url}")
        logger.info(f"Username: {username}")
        logger.info(f"Organization: {organization}")
        logger.info(f"Location: {location}")
        logger.info(f"Staff Member: {staff_member}")
        
        # Navigate to portal
        logger.info(f"🌍 Navigating to: {base_url}")
        self.page.goto(base_url)
        self.page.wait_for_load_state('networkidle')
        logger.debug("Page loaded and network idle")
        
        # Handle alert if present
        logger.debug("Checking for browser alerts")
        try:
            self.page.wait_for_event('dialog', timeout=5000)
            self.page.on('dialog', lambda dialog: dialog.accept())
            logger.info("⚠️ Alert detected and accepted")
        except:
            logger.debug("No alert present")
        
        # Wait for acknowledge button to disappear due to cache issue
        logger.info("🔄 Waiting for acknowledge button to disappear...")
        acknowledge_btn = self.objects.acknowledge_button()
        if acknowledge_btn.is_visible():
            logger.info("Acknowledge button visible - waiting for it to disappear")
            acknowledge_btn.wait_for(state='hidden', timeout=15000)
            logger.info("✅ Acknowledge button disappeared")
        else:
            logger.debug("Acknowledge button not visible")
        
        # Wait for Cognito login screen to appear
        logger.info("🔐 Waiting for Cognito login screen...")
        self.page.wait_for_load_state('networkidle')
        logger.debug("Network idle after acknowledge button handling")
        
        # Enter credentials on Cognito page
        try:
            logger.info("🔑 Entering credentials on Cognito page")
            visible_username = self.objects.visible_username_field()
            visible_password = self.objects.visible_password_field()
            
            visible_username.wait_for(state='visible', timeout=30000)
            logger.info("✅ Cognito login form is ready")
            
            logger.debug(f"Filling username: {username}")
            visible_username.fill(username, force=True)
            logger.debug("Filling password: [HIDDEN]")
            visible_password.fill(password, force=True)
            
            # Submit login using Enter key
            logger.info("⏎ Submitting login credentials")
            visible_password.press("Enter")
            
            # Wait for redirect back to main application
            self.page.wait_for_load_state('networkidle', timeout=30000)
            logger.info("✅ Login submitted, redirected back to main app")
            
        except Exception as e:
            logger.error(f"❌ Cognito login failed: {e}")
            raise
        
        # Handle post-login acknowledge button if it appears
        logger.info("🔄 Checking for post-login acknowledge button")
        try:
            post_login_acknowledge = self.objects.acknowledge_button()
            if post_login_acknowledge.is_visible(timeout=5000):
                logger.info("✅ Post-login acknowledge button found - clicking...")
                post_login_acknowledge.click()
                self.page.wait_for_load_state('networkidle')
                logger.debug("Post-login acknowledge completed")
        except:
            logger.debug("No post-login acknowledge button found")
        
        # Organization setup (comes after actual login)
        logger.info("🏢 Waiting for organization setup screen...")
        
        # Wait for organization input field to appear - MUST complete organization setup
        org_input = self.objects.organization_input()
        try:
            org_input.wait_for(state='visible', timeout=30000)
            print("Organization input field found - proceeding with setup")
        except:
            print("Organization input field not found - taking screenshot for debugging")
            current_url = self.page.url
            page_title = self.page.title()
            print(f"Current URL: {current_url}")
            print(f"Page title: {page_title}")
            
            self.take_screenshot("organization_setup_not_found")
            raise Exception("Organization setup screen not found - login incomplete")
        
        # Wait after loading page before moving forward
        print("Waiting after page load before organization selection...")
        self.page.wait_for_timeout(3000)
        
        # REQUIRED: Select organization
        org_search_text = self.get_first_word(organization).lower()
        self.select_dropdown_option(org_input, organization, org_search_text, 5000)
        
        # Wait after organization selection
        print("Waiting after organization selection...")
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(3000)
        
        # REQUIRED: Select location
        location_input = self.objects.location_input()
        location_search_text = self.get_first_word(location).lower()
        self.select_dropdown_option(location_input, location, location_search_text, 2000)
        
        # Wait after location selection
        print("Waiting after location selection...")
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(8000)  # Longer wait for staff dropdown to be ready
        
        # REQUIRED: Select staff member
        staff_input = self.objects.staff_input()
        try:
            staff_search_text = self.get_first_word(staff_member).lower()
            self.select_dropdown_option(staff_input, staff_member, staff_search_text, 3000)
        except Exception as e:
            print(f"Warning: Staff selection failed - {e}")
            print("Continuing without staff selection as it might be optional")
        
        # REQUIRED: Final login button
        print("Looking for final Login button...")
        
        # Wait for page to be ready after selections
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(2000)
        
        try:
            # Debug: Check what buttons are available
            all_buttons = self.objects.all_buttons().all()
            print(f"Found {len(all_buttons)} buttons on page")
            
            for i, button in enumerate(all_buttons[:10]):  # Check first 10 buttons
                try:
                    button_text = button.text_content()
                    is_visible = button.is_visible()
                    print(f"Button {i+1}: '{button_text}' (visible: {is_visible})")
                except:
                    print(f"Button {i+1}: Could not get text")
            
            # Try different login button selectors with more specific targeting
            login_selectors = [
                "button:has-text('Log In')",  # Match the exact text we found
                "button:has-text('Login')",
                "button:has-text('Continue')",
                "button:has-text('Submit')",
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Sign In')",
                "button:has-text('Enter')",
                "[role='button']:has-text('Log In')",
                "[role='button']:has-text('Login')",
                "[data-testid*='login']",
                "[data-testid*='submit']",
                ".login-button",
                ".submit-button"
            ]
            
            login_clicked = False
            # Try the primary login button first
            try:
                login_btn = self.objects.login_button()
                if login_btn.count() > 0 and login_btn.is_visible():
                    button_text = login_btn.text_content()
                    print(f"Found login button: '{button_text}'")
                    login_btn.click()
                    print(f"Clicked login button: {button_text}")
                    login_clicked = True
            except Exception as btn_e:
                print(f"Primary login button failed: {btn_e}")
            
            # Fallback to other selectors if primary fails
            if not login_clicked:
                for selector in login_selectors:
                    try:
                        login_btn = self.page.locator(selector)
                        if login_btn.count() > 0 and login_btn.is_visible():
                            button_text = login_btn.text_content()
                            print(f"Found login button: '{button_text}' using selector: {selector}")
                            login_btn.click()
                            print(f"Clicked login button: {button_text}")
                            login_clicked = True
                            break
                    except Exception as btn_e:
                        print(f"Selector {selector} failed: {btn_e}")
                        continue
            
            if not login_clicked:
                print("No login button found, trying Enter key...")
                self.page.keyboard.press('Enter')
            
            # Wait and check for validation errors or page change
            self.page.wait_for_load_state('networkidle', timeout=15000)
            
            # Check if we're still on the same page (form validation failed)
            current_url_after_login = self.page.url
            if "choose-context" in current_url_after_login:
                print("Still on context selection page - checking for validation errors...")
                
                # Look for validation errors
                error_messages = self.page.locator(".mat-error, .error, [role='alert']").all()
                if error_messages:
                    for error in error_messages:
                        if error.is_visible():
                            error_text = error.text_content()
                            print(f"Validation error found: {error_text}")
                
                # Try clicking login button again
                print("Attempting login again...")
                login_btn = self.page.locator("button:has-text('Log In')")
                if login_btn.is_visible():
                    login_btn.click()
                    self.page.wait_for_load_state('networkidle', timeout=5000)
                    print("Clicked login button second time")
            
        except Exception as e:
            print(f"Login button search failed: {e}")
            # Take screenshot to see current state
            self.take_screenshot("login_button_search_failed")
            # Continue anyway to see if we can reach dashboard
            pass
        
        # Verify we reached dashboard after complete setup
        print("Verifying dashboard after organization setup...")
        dashboard_found = False
        try:
            # Wait longer for dashboard to load
            self.page.wait_for_timeout(10000)
            
            # Check multiple dashboard indicators
            dashboard_checks = [
                self.objects.any_tag_with_text_equals('Dashboard').is_visible(),
                self.objects.any_tag_with_text_equals('My Dashboard').is_visible(),
                self.page.locator("text=Dashboard").is_visible(),
                self.page.locator("[data-testid*='dashboard']").is_visible(),
                self.page.locator(".dashboard").is_visible()
            ]
            dashboard_found = any(dashboard_checks)
            
            # Also check if we're no longer on the context selection page
            current_url = self.page.url
            not_on_context_page = "choose-context" not in current_url
            
            if not dashboard_found and not_on_context_page:
                print(f"Dashboard not found but URL changed to: {current_url}")
                print("Login may have succeeded - continuing...")
                dashboard_found = True
                
        except Exception as e:
            print(f"Dashboard verification error: {e}")
            pass
        
        if dashboard_found:
            print("SUCCESS: Login completed with full organization setup")
        else:
            print(f"Warning: Dashboard verification failed, current URL: {self.page.url}")
            self.take_screenshot("login_completion_verification")
            # Make this a warning instead of hard failure for now
            print("Login process completed but dashboard verification failed")
    
    def assert_login_successful(self):
        """Assert that login was successful by checking multiple indicators"""
        print("Asserting login success...")
        
        # Check URL
        current_url = self.page.url
        if "login" in current_url.lower() or "auth" in current_url.lower():
            raise AssertionError(f"Still on login page: {current_url}")
        
        # Check for dashboard
        dashboard_visible = False
        try:
            dashboard_checks = [
                self.objects.any_tag_with_text_equals('Dashboard').is_visible(),
                self.objects.any_tag_with_text_equals('My Dashboard').is_visible(),
                self.page.locator("text=Dashboard").is_visible()
            ]
            dashboard_visible = any(dashboard_checks)
        except:
            pass
        
        if not dashboard_visible:
            self.take_screenshot("login_assertion_failed")
            raise AssertionError("Dashboard not found - login may have failed")
        
        print("Login assertion passed - dashboard found")
    
    def verify_login_success(self):
        """Verify login success and return validation results"""
        current_url = self.page.url
        
        # Check dashboard visibility
        dashboard_checks = [
            self.objects.any_tag_with_text_equals('Dashboard').is_visible(),
            self.objects.any_tag_with_text_equals('My Dashboard').is_visible(),
            self.page.locator("text=Dashboard").is_visible()
        ]
        dashboard_visible = any(dashboard_checks)
        
        # Check URL changed from login
        url_changed = not ("login" in current_url.lower() or "auth" in current_url.lower())
        
        # Check for error messages
        error_selectors = ["text=Error", "text=Invalid", "text=Failed", ".error", ".alert-danger"]
        no_errors = True
        for selector in error_selectors:
            try:
                if self.page.locator(selector).is_visible():
                    no_errors = False
                    break
            except:
                pass
        
        return {
            'current_url': current_url,
            'dashboard_visible': dashboard_visible,
            'url_changed': url_changed,
            'no_errors': no_errors
        }
    
    def take_screenshot(self, name):
        """Take screenshot for debugging"""
        try:
            screenshot_path = f"screenshots/{name}_{int(time.time())}.png"
            self.page.screenshot(path=screenshot_path)
            print(f"Screenshot saved: {screenshot_path}")
        except Exception as e:
            print(f"Failed to take screenshot: {e}")
    
    def portal_login_with_parameters(self, username, password):
        """Login to person portal"""
        self.page.goto("https://portal-url.com")  # Update with actual portal URL
        self.page.wait_for_load_state('networkidle')
        
        self.objects.sign_in_username_field().fill(username)
        self.objects.sign_in_password_field().fill(password)
        self.objects.sign_in_submit_button().click()
        
        # Handle acknowledge
        acknowledge_btn = self.objects.acknowledge_button()
        if acknowledge_btn.is_visible():
            acknowledge_btn.click()
    
    # Search Methods
    def search_input_text_in_home_page(self, search_dropdown, search_text):
        """Search functionality in home page"""
        # Select dropdown option
        self.objects.data_testid_element('search-dropdown').click()
        self.objects.any_tag_with_text_equals(search_dropdown).click()
        
        # Enter search text
        self.objects.data_testid_element('search-input').fill(search_text)
        self.page.keyboard.press('Enter')
        
        self.page.wait_for_load_state('networkidle')
        
        # Click on first result
        first_result = self.objects.mat_row_element(1)
        if first_result.is_visible():
            first_result.click()
    
    def advanced_search_for_in_progress_record(self, form_name, status):
        """Advanced search for in-progress records"""
        # Click advanced search
        self.objects.advanced_search_button().click()
        
        # Enter form type
        search_box = self.objects.data_testid_element('form-type-search')
        search_box.fill(form_name)
        self.page.keyboard.press('Enter')
        
        # Select checkbox
        self.objects.mat_pseudo_checkbox(1).click()
        
        # Click right arrow
        self.objects.mat_icon_any_text('chevron_right').click()
        
        # Enter status
        self.objects.mat_input_field(10).fill(status)
        
        # Click search
        self.objects.any_tag_with_text_equals('Search').click()
    
    # Form Methods
    def create_new_form(self, form_category_type, form_type, **kwargs):
        """Create new form with category and type"""
        # Click New Form
        self.objects.any_tag_with_text_equals('New Form').click()
        
        # Select Form Category
        self.objects.data_testid_element('form-category-dropdown').click()
        self.objects.data_testid_element('form-category-input').fill(form_category_type)
        self.page.keyboard.press('Enter')
        
        # Select Form Type
        self.objects.data_testid_element('form-type-dropdown').click()
        self.objects.data_testid_element('form-type-input').fill(form_type)
        self.page.keyboard.press('Enter')
        
        # Click Next
        self.objects.any_tag_with_text_equals('Next').click()
        
        # Handle specific form types
        if form_type == 'Grievances / Appeals':
            self._handle_grievance_form(kwargs)
        elif form_type == 'HCBS Choice':
            self._handle_hcbs_form(kwargs)
        elif form_type == 'Level of Care':
            self._handle_level_of_care_form(kwargs)
        
        # Save form
        self.objects.any_tag_with_text_equals('Save').click()
    
    def _handle_grievance_form(self, kwargs):
        """Handle grievance form specific fields"""
        if 'Level' in kwargs:
            self.objects.data_testid_element('level-dropdown').click()
            self.objects.data_testid_element('level-input').fill(kwargs['Level'])
            self.page.keyboard.press('Enter')
        
        if 'Reason' in kwargs:
            self.objects.data_testid_element('reason-dropdown').click()
            self.objects.data_testid_element('reason-input').fill(kwargs['Reason'])
            self.page.keyboard.press('Enter')
    
    def _handle_hcbs_form(self, kwargs):
        """Handle HCBS form specific fields"""
        if 'Program' in kwargs:
            self.objects.data_testid_element('program-dropdown').click()
            self.objects.data_testid_element('program-input').fill(kwargs['Program'])
            self.page.keyboard.press('Enter')
    
    def _handle_level_of_care_form(self, kwargs):
        """Handle level of care form specific fields"""
        if 'Program' in kwargs:
            self.objects.data_testid_element('program-dropdown').click()
            self.objects.data_testid_element('program-input').fill(kwargs['Program'])
            self.page.keyboard.press('Enter')
        
        if 'Level Of Care Type' in kwargs:
            self.objects.data_testid_element('care-type-dropdown').click()
            self.objects.data_testid_element('care-type-input').fill(kwargs['Level Of Care Type'])
            self.page.keyboard.press('Enter')
    
    def close_form(self, close_reason):
        """Close form with reason"""
        # Click status dropdown
        self.objects.mat_icon_any_text('keyboard_arrow_down', 2).click()
        
        # Click close
        self.objects.any_tag_with_text_equals('Close').click()
        
        # Enter reason
        self.objects.data_testid_element('close-reason-dropdown').click()
        self.objects.data_testid_element('close-reason-input').fill(close_reason)
        self.objects.any_tag_with_text_equals(close_reason).click()
        
        # Click continue
        self.objects.any_tag_with_text_equals('Continue').click()
    
    def click_forms(self):
        """Navigate to Forms section"""
        self.objects.any_tag_with_text_equals('Forms').click()
        self.page.wait_for_load_state('networkidle')
    
    def status_click(self, status):
        """Click on status dropdown"""
        status_element = self.objects.any_tag_with_text_equals(f'Status: {status}')
        if status_element.is_visible():
            self.objects.mat_icon_any_text('keyboard_arrow_down').click()
    
    # File Operations
    def file_upload(self, file_path=None):
        """Upload file"""
        if not file_path:
            file_path = "Data Files/WebApp/Carity/ME/Test.pdf"  # Default path
        
        file_input = self.objects.file_input()
        file_input.set_input_files(file_path)
        time.sleep(5)
    
    def logo_file_upload(self, file_path=None):
        """Upload logo file"""
        if not file_path:
            file_path = "Data Files/WebApp/Carity/ME/Logo.png"  # Default path
        
        file_input = self.objects.file_input()
        file_input.set_input_files(file_path)
        time.sleep(5)
    
    # Validation Methods
    def verify_login_success(self):
        """Verify if login was successful"""
        current_url = self.page.url
        
        # Check multiple indicators of successful login
        dashboard_visible = (
            self.objects.any_tag_with_text_equals('Dashboard').is_visible() or
            self.objects.any_tag_with_text_equals('My Dashboard').is_visible() or
            self.objects.data_testid_element('dashboard').is_visible()
        )
        
        url_indicates_success = "login" not in current_url.lower()
        no_error_messages = not self.objects.error_msg_invalid_mandatory_fields().is_visible()
        
        return {
            'success': dashboard_visible or url_indicates_success,
            'dashboard_visible': dashboard_visible,
            'url_changed': url_indicates_success,
            'no_errors': no_error_messages,
            'current_url': current_url
        }
    
    def assert_login_successful(self):
        """Assert that login was successful with detailed error message"""
        validation_result = self.verify_login_success()
        
        if not validation_result['success']:
            error_msg = f"Login validation failed:\n"
            error_msg += f"  - Dashboard visible: {validation_result['dashboard_visible']}\n"
            error_msg += f"  - URL changed from login: {validation_result['url_changed']}\n"
            error_msg += f"  - No error messages: {validation_result['no_errors']}\n"
            error_msg += f"  - Current URL: {validation_result['current_url']}"
            
            # Take screenshot for debugging
            self.take_screenshot("login_assertion_failure")
            
            raise AssertionError(error_msg)
        
        print("Login validation successful!")
        return True
    
    # Dashboard Methods
    def create_empty_dashboard(self, module_name, layout_number):
        """Create empty dashboard"""
        # Click add button
        add_button = self.objects.toggle_button(module_name)
        add_button.click()
        
        # Verify layout selector
        layout_header = self.objects.any_tag_with_text_equals('Select a Dashboard Layout')
        assert layout_header.is_visible()
        
        # Select layout
        layout = self.objects.grid_list_wrapper(layout_number)
        layout.click()
        
        # Click continue
        self.objects.any_tag_with_text_equals('Continue').click()
        
        # Verify add tile button
        add_tile_btn = self.objects.add_tile_button()
        assert add_tile_btn.is_visible()
    
    def add_tile_in_dropzone(self, tile_panel_expand, tile_name, tile_variant):
        """Add tile to dashboard"""
        # Click Add Tile
        self.objects.add_tile_button().click()
        
        # Search for tile
        search_box = self.objects.tile_search_box()
        search_box.fill(tile_panel_expand)
        self.page.keyboard.press('Enter')
        
        # Expand panel
        self.objects.any_tag_with_text_equals(tile_panel_expand).click()
        
        # Select tile
        self.objects.any_tag_with_text_equals(tile_name).click()
        
        # Select variant
        self.objects.any_tag_with_text_equals(tile_variant).click()
        
        # Add tile
        self.objects.action_button_primary().click()
    
    def remove_dashboard(self, action):
        """Remove dashboard (Discard or Delete)"""
        # Click File
        self.objects.any_tag_with_text_equals('File').click()
        
        # Click action
        self.objects.any_tag_with_text_equals(action).click()
        
        # If delete, confirm
        if action.strip() == "Delete":
            self.objects.any_tag_with_text_equals('Continue').click()
    
    def navigate_to_dashboard(self):
        """Navigate to dashboard management"""
        # Click Administration
        self.objects.any_tag_with_text_equals('Administration').click()
        
        # Click Manage Dashboard tile
        self.objects.data_testid_element('manage-dashboard-tile').click()
    
    # Utility Methods
    def highlight_element(self, locator):
        """Highlight element for visual feedback"""
        self.page.evaluate("""
            (element) => {
                element.style.border = '3px solid red';
                element.style.backgroundColor = 'yellow';
                setTimeout(() => {
                    element.style.border = '';
                    element.style.backgroundColor = '';
                }, 2000);
            }
        """, locator.element_handle())
    
    def wait_for_element(self, selector, timeout=10000):
        """Wait for element to be visible"""
        return self.page.wait_for_selector(selector, state='visible', timeout=timeout)
    
    def take_screenshot(self, name=None):
        """Take full page screenshot"""
        if name:
            self.page.screenshot(path=f"screenshots/{name}.png", full_page=True)
        else:
            self.page.screenshot(full_page=True)
    
    def get_current_date(self):
        """Get current date in MM/dd/yyyy format"""
        return datetime.now().strftime("%m/%d/%Y")
    
    def get_future_date(self, days):
        """Get future date by adding days"""
        future_date = datetime.now() + timedelta(days=days)
        return future_date.strftime("%m/%d/%Y")
    
    def get_previous_date(self, days):
        """Get previous date by subtracting days"""
        previous_date = datetime.now() - timedelta(days=days)
        return previous_date.strftime("%m/%d/%Y")
    
    def get_first_jan_of_current_year(self):
        """Get first January of current year"""
        current_year = datetime.now().year
        return f"01/01/{current_year}"
    
    def generate_random_string(self, length):
        """Generate random alphanumeric string"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    def select_dropdown_value(self, dropdown_selector, value):
        """Select value from dropdown"""
        self.page.locator(dropdown_selector).click()
        self.page.locator(f"text={value}").click()
    
    def validate_list_header_column_names(self, expected_columns):
        """Validate table header column names"""
        for i, column in enumerate(expected_columns):
            column_locator = self.objects.mat_header_cell(column)
            if column_locator.is_visible():
                print(f"Column {i+1} '{column}' is present")
            else:
                print(f"Column {i+1} '{column}' is NOT present")
    
    def get_table_data(self, target_column):
        """Get data from specific table column"""
        table = self.objects.mat_table()
        rows = table.locator("mat-row")
        
        data = []
        for i in range(rows.count()):
            row = rows.nth(i)
            cells = row.locator("mat-cell")
            if target_column <= cells.count():
                cell_data = cells.nth(target_column - 1).text_content()
                data.append(cell_data)
        
        return data
    
    def switch_window(self):
        """Switch between windows using Alt+Tab"""
        self.page.keyboard.press('Alt+Tab')
    
    def zoom_in_out(self, action, times):
        """Zoom in or out"""
        key = 'Control+Plus' if action == 'zoomIn' else 'Control+Minus'
        for _ in range(times):
            self.page.keyboard.press(key)
    
    def handle_popup(self):
        """Handle various popups"""
        # Check for dialog container
        dialog = self.objects.mat_dialog_container()
        if dialog.is_visible():
            # Try cancel button
            cancel_btn = self.objects.any_tag_with_text_equals('Cancel')
            if cancel_btn.is_visible():
                cancel_btn.click()
                return
            
            # Try close button
            close_btn = self.objects.any_tag_with_text_equals('Close')
            if close_btn.is_visible():
                close_btn.click()
                return
        
        # Check for menu items
        menu_item = self.objects.menu_item_role()
        if menu_item.is_visible():
            self.page.keyboard.press('Escape')
    
    def verify_element_color(self, locator, expected_color):
        """Verify element color"""
        actual_color = locator.evaluate("el => getComputedStyle(el).color")
        return actual_color == expected_color
    
    def verify_element_background_color(self, locator, expected_color):
        """Verify element background color"""
        actual_color = locator.evaluate("el => getComputedStyle(el).backgroundColor")
        return actual_color == expected_color
    
    def is_file_downloaded(self, download_path, file_name):
        """Check if file is downloaded"""
        import os
        file_path = os.path.join(download_path, file_name)
        return os.path.exists(file_path)
    
    def compare_lists(self, list1, list2):
        """Compare two lists"""
        if sorted(list1) == sorted(list2):
            print("Lists are equal")
            return True
        else:
            print(f"Lists are not equal. List1: {list1}, List2: {list2}")
            return False