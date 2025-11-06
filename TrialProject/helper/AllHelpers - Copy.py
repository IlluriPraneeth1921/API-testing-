import time
import random
import string
from datetime import datetime, timedelta
from playwright.sync_api import Page
from Objects.AllObjects import AllObjects

class AllHelpers:
    """Converted Katalon Keywords to Playwright helper methods"""
    
    def __init__(self, page: Page):
        self.page = page
        self.objects = AllObjects(page)
    
    # Login Methods
    def login_with_parameters(self, username, password, organization, location, staff_member):
        """Complete login process with organization setup"""
        print("Starting login process...")
        
        # Navigate to portal
        self.page.goto("https://standard-f1-carity.feisystemsh2env.com/")
        self.page.wait_for_load_state('networkidle')
        
        # Enter credentials
        self.page.locator("#signInFormUsername").first.fill(username, force=True)
        self.page.locator("#signInFormPassword").first.fill(password, force=True)
        
        # Click login
        self.page.evaluate("""
            const button = document.querySelector('input[name="signInSubmitButton"]');
            if (button) { button.click(); }
        """)
        
        self.page.wait_for_load_state('networkidle')
        
        # Handle alert if present
        try:
            self.page.wait_for_event('dialog', timeout=5000)
            self.page.on('dialog', lambda dialog: dialog.accept())
        except:
            print("No alert present")
        
        # Click acknowledge
        acknowledge_btn = self.page.locator("text=Acknowledge")
        if acknowledge_btn.is_visible():
            acknowledge_btn.click()
            self.page.wait_for_load_state('networkidle')
        
        # Select organization
        self.page.locator("[data-testid='organization-dropdown']").click()
        self.page.locator("[data-testid='organization-input']").fill(organization)
        self.page.locator(f"text={organization}").click()
        
        # Select location
        self.page.locator("[data-testid='location-dropdown']").click()
        self.page.locator("[data-testid='location-input']").fill(location)
        self.page.locator(f"text={location}").click()
        
        # Select staff member
        self.page.locator("[data-testid='staff-dropdown']").click()
        self.page.locator("[data-testid='staff-input']").fill(staff_member)
        self.page.locator(f"text={staff_member}").click()
        
        # Final login
        self.page.locator("text=Login").click()
        self.page.wait_for_load_state('networkidle')
        
        print("Login completed successfully")
    
    def portal_login_with_parameters(self, username, password):
        """Login to person portal"""
        self.page.goto("https://portal-url.com")  # Update with actual portal URL
        self.page.wait_for_load_state('networkidle')
        
        self.page.locator("#signInFormUsername").first.fill(username)
        self.page.locator("#signInFormPassword").first.fill(password)
        self.page.locator("[name='signInSubmitButton']").click()
        
        # Handle acknowledge
        acknowledge_btn = self.page.locator("text=Acknowledge")
        if acknowledge_btn.is_visible():
            acknowledge_btn.click()
    
    # Search Methods
    def search_input_text_in_home_page(self, search_dropdown, search_text):
        """Search functionality in home page"""
        # Select dropdown option
        self.page.locator("[data-testid='search-dropdown']").click()
        self.page.locator(f"text={search_dropdown}").click()
        
        # Enter search text
        self.page.locator("[data-testid='search-input']").fill(search_text)
        self.page.keyboard.press('Enter')
        
        self.page.wait_for_load_state('networkidle')
        
        # Click on first result
        first_result = self.page.locator("mat-row").first
        if first_result.is_visible():
            first_result.click()
    
    def advanced_search_for_in_progress_record(self, form_name, status):
        """Advanced search for in-progress records"""
        # Click advanced search
        self.page.locator("[aria-label='Advanced Search']").click()
        
        # Enter form type
        search_box = self.page.locator("[data-testid='form-type-search']")
        search_box.fill(form_name)
        self.page.keyboard.press('Enter')
        
        # Select checkbox
        self.page.locator(".mat-pseudo-checkbox").first.click()
        
        # Click right arrow
        self.page.locator("mat-icon:has-text('chevron_right')").click()
        
        # Enter status
        self.page.locator(".mat-input").nth(9).fill(status)
        
        # Click search
        self.page.locator("text=Search").click()
    
    # Form Methods
    def create_new_form(self, form_category_type, form_type, **kwargs):
        """Create new form with category and type"""
        # Click New Form
        self.page.locator("text=New Form").click()
        
        # Select Form Category
        self.page.locator("[data-testid='form-category-dropdown']").click()
        self.page.locator("[data-testid='form-category-input']").fill(form_category_type)
        self.page.keyboard.press('Enter')
        
        # Select Form Type
        self.page.locator("[data-testid='form-type-dropdown']").click()
        self.page.locator("[data-testid='form-type-input']").fill(form_type)
        self.page.keyboard.press('Enter')
        
        # Click Next
        self.page.locator("text=Next").click()
        
        # Handle specific form types
        if form_type == 'Grievances / Appeals':
            self._handle_grievance_form(kwargs)
        elif form_type == 'HCBS Choice':
            self._handle_hcbs_form(kwargs)
        elif form_type == 'Level of Care':
            self._handle_level_of_care_form(kwargs)
        
        # Save form
        self.page.locator("text=Save").click()
    
    def _handle_grievance_form(self, kwargs):
        """Handle grievance form specific fields"""
        if 'Level' in kwargs:
            self.page.locator("[data-testid='level-dropdown']").click()
            self.page.locator("[data-testid='level-input']").fill(kwargs['Level'])
            self.page.keyboard.press('Enter')
        
        if 'Reason' in kwargs:
            self.page.locator("[data-testid='reason-dropdown']").click()
            self.page.locator("[data-testid='reason-input']").fill(kwargs['Reason'])
            self.page.keyboard.press('Enter')
    
    def _handle_hcbs_form(self, kwargs):
        """Handle HCBS form specific fields"""
        if 'Program' in kwargs:
            self.page.locator("[data-testid='program-dropdown']").click()
            self.page.locator("[data-testid='program-input']").fill(kwargs['Program'])
            self.page.keyboard.press('Enter')
    
    def _handle_level_of_care_form(self, kwargs):
        """Handle level of care form specific fields"""
        if 'Program' in kwargs:
            self.page.locator("[data-testid='program-dropdown']").click()
            self.page.locator("[data-testid='program-input']").fill(kwargs['Program'])
            self.page.keyboard.press('Enter')
        
        if 'Level Of Care Type' in kwargs:
            self.page.locator("[data-testid='care-type-dropdown']").click()
            self.page.locator("[data-testid='care-type-input']").fill(kwargs['Level Of Care Type'])
            self.page.keyboard.press('Enter')
    
    def close_form(self, close_reason):
        """Close form with reason"""
        # Click status dropdown
        self.page.locator("mat-icon:has-text('keyboard_arrow_down')").nth(1).click()
        
        # Click close
        self.page.locator("text=Close").click()
        
        # Enter reason
        self.page.locator("[data-testid='close-reason-dropdown']").click()
        self.page.locator("[data-testid='close-reason-input']").fill(close_reason)
        self.page.locator(f"text={close_reason}").click()
        
        # Click continue
        self.page.locator("text=Continue").click()
    
    def click_forms(self):
        """Navigate to Forms section"""
        self.page.locator("text=Forms").click()
        self.page.wait_for_load_state('networkidle')
    
    def status_click(self, status):
        """Click on status dropdown"""
        status_element = self.page.locator(f"text=Status: {status}")
        if status_element.is_visible():
            self.page.locator("mat-icon:has-text('keyboard_arrow_down')").click()
    
    # File Operations
    def file_upload(self, file_path=None):
        """Upload file"""
        if not file_path:
            file_path = "Data Files/WebApp/Carity/ME/Test.pdf"  # Default path
        
        file_input = self.page.locator("input[type='file']")
        file_input.set_input_files(file_path)
        time.sleep(5)
    
    def logo_file_upload(self, file_path=None):
        """Upload logo file"""
        if not file_path:
            file_path = "Data Files/WebApp/Carity/ME/Logo.png"  # Default path
        
        file_input = self.page.locator("input[type='file']")
        file_input.set_input_files(file_path)
        time.sleep(5)
    
    # Dashboard Methods
    def create_empty_dashboard(self, module_name, layout_number):
        """Create empty dashboard"""
        # Click add button
        add_button = self.page.locator(f"[aria-label='Toggle {module_name}']")
        add_button.click()
        
        # Verify layout selector
        layout_header = self.page.locator("text=Select a Dashboard Layout")
        assert layout_header.is_visible()
        
        # Select layout
        layout = self.page.locator(".grid-list-wrapper").nth(layout_number - 1)
        layout.click()
        
        # Click continue
        self.page.locator("text=Continue").click()
        
        # Verify add tile button
        add_tile_btn = self.page.locator("[aria-label='Add Tile']")
        assert add_tile_btn.is_visible()
    
    def add_tile_in_dropzone(self, tile_panel_expand, tile_name, tile_variant):
        """Add tile to dashboard"""
        # Click Add Tile
        self.page.locator("[aria-label='Add Tile']").click()
        
        # Search for tile
        search_box = self.page.locator("#tile-search")
        search_box.fill(tile_panel_expand)
        self.page.keyboard.press('Enter')
        
        # Expand panel
        self.page.locator(f"text={tile_panel_expand}").click()
        
        # Select tile
        self.page.locator(f"text={tile_name}").click()
        
        # Select variant
        self.page.locator(f"text={tile_variant}").click()
        
        # Add tile
        self.page.locator(".action-btn.plr-primary").click()
    
    def remove_dashboard(self, action):
        """Remove dashboard (Discard or Delete)"""
        # Click File
        self.page.locator("text=File").click()
        
        # Click action
        self.page.locator(f"text={action}").click()
        
        # If delete, confirm
        if action.strip() == "Delete":
            self.page.locator("text=Continue").click()
    
    def navigate_to_dashboard(self):
        """Navigate to dashboard management"""
        # Click Administration
        self.page.locator("text=Administration").click()
        
        # Click Manage Dashboard tile
        self.page.locator("[data-testid='manage-dashboard-tile']").click()
    
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
            column_locator = self.page.locator(f"mat-header-cell >> text={column}")
            if column_locator.is_visible():
                print(f"Column {i+1} '{column}' is present")
            else:
                print(f"Column {i+1} '{column}' is NOT present")
    
    def get_table_data(self, target_column):
        """Get data from specific table column"""
        table = self.page.locator("mat-table")
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
        dialog = self.page.locator(".mat-dialog-container")
        if dialog.is_visible():
            # Try cancel button
            cancel_btn = self.page.locator("text=Cancel")
            if cancel_btn.is_visible():
                cancel_btn.click()
                return
            
            # Try close button
            close_btn = self.page.locator("text=Close")
            if close_btn.is_visible():
                close_btn.click()
                return
        
        # Check for menu items
        menu_item = self.page.locator("[role='menuitem']")
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