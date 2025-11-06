class AllObjects:
    """Converted Katalon Object Repository to Playwright locators"""
    
    def __init__(self, page):
        self.page = page
    
    # Standard Objects
    def any_tag_with_text_equals(self, text, index=1):
        """Any element with exact text match"""
        if text == "Acknowledge":
            return self.page.locator("button:has-text('Acknowledge')")
        return self.page.locator(f"(//*[text()='{text}'])[{index}]")
    
    def button_open_record(self, number=1):
        """Open record button"""
        return self.page.locator(f"//div/div/div/div/wpc-button/wpc-access-resolver/button/span[{number}]")
    
    def mat_icon_any_text(self, value, position=1):
        """Material icon with specific text"""
        return self.page.locator(f"(//mat-icon[contains(text(),'{value}')])[{position}]")
    
    def three_ellipses(self):
        """Three ellipses menu"""
        return self.page.locator("//mat-icon[text()='more_vert']")
    
    def three_ellipses_all_records(self):
        """Three ellipses for all records"""
        return self.page.locator("//button[@aria-label='More options']")
    
    def all_mandatory_fields(self):
        """All mandatory field indicators"""
        return self.page.locator("//*[@required or contains(@class,'required')]")
    
    def any_tag_with_aria_label_following_button(self, aria_label, position=1):
        """Button with aria-label"""
        return self.page.locator(f"(//button[contains(@aria-label,'{aria_label}')])[{position}]")
    
    def any_tag_with_following_mat_icon(self, value, position=1):
        """Element following mat-icon"""
        return self.page.locator(f"(//*[following::mat-icon[contains(text(),'{value}')]])[{position}]")
    
    def any_tag_with_text_following_button(self, text, position=1):
        """Element with text following button"""
        return self.page.locator(f"(//*[text()='{text}']//following::button)[{position}]")
    
    def any_tag_with_text_following_span(self, text, position=1):
        """Element with text following span"""
        return self.page.locator(f"(//*[text()='{text}']//following::span)[{position}]")
    
    def column_name(self, value, position=1):
        """Table column header"""
        return self.page.locator(f"(//mat-header-cell//span[contains(.,'{value}')])[{position}]")
    
    def column_name_with_role(self, value, position=1):
        """Column with role attribute"""
        return self.page.locator(f"(//*[@role='columnheader'][contains(.,'{value}')])[{position}]")
    
    def mat_radio_btn(self, value, position=1):
        """Material radio button"""
        return self.page.locator(f"(//mat-radio-button[contains(.,'{value}')])[{position}]")
    
    def radio_button(self, value, position=1):
        """Generic radio button"""
        return self.page.locator(f"(//input[@type='radio'][@value='{value}'])[{position}]")
    
    def select_county(self, county_name):
        """Select county dropdown"""
        return self.page.locator(f"//mat-option[contains(.,'{county_name}')]")
    
    def side_panel_navigation(self, nav_item):
        """Side panel navigation item"""
        return self.page.locator(f"//nav//a[contains(.,'{nav_item}')]")
    
    def error_msg_invalid_mandatory_fields(self):
        """Error message for mandatory fields"""
        return self.page.locator("//mat-error | //*[contains(@class,'error')]")
    
    def mat_hint_for_field(self, field_name):
        """Material hint for field"""
        return self.page.locator(f"//mat-hint[contains(.,'{field_name}')]")
    
    def get_data_from_table_with_index(self, row, col):
        """Get data from table cell"""
        return self.page.locator(f"//table//tr[{row}]//td[{col}]")
    
    def li_text(self, text, position=1):
        """List item with text"""
        return self.page.locator(f"(//li[contains(.,'{text}')])[{position}]")
    
    def mat_select_list_aria_label(self, aria_label):
        """Material select with aria-label"""
        return self.page.locator(f"//mat-select[@aria-label='{aria_label}']")
    
    def role_warnings(self):
        """Elements with warning role"""
        return self.page.locator("//*[@role='alert' or contains(@class,'warning')]")
    
    def values_for_permissions(self, permission_name):
        """Permission values"""
        return self.page.locator(f"//*[contains(@data-permission,'{permission_name}')]")
    
    # PC_ProAppl Objects
    def btn_any_aria_following_mat_icon(self, value, position=1):
        """Button with aria-label following mat-icon"""
        return self.page.locator(f"(//button[contains(@aria-label,'{value}')])[{position}]//following::mat-icon")
    
    def btn_any_aria_label_descendant_span(self, aria_label, position=1):
        """Button with aria-label containing span"""
        return self.page.locator(f"(//button[contains(@aria-label,'{aria_label}')]//span)[{position}]")
    
    def btn_any_aria_label_following_span(self, aria_label, position=1):
        """Button with aria-label following span"""
        return self.page.locator(f"(//button[contains(@aria-label,'{aria_label}')])[{position}]//following::span")
    
    def div_any_class(self, class_name, position=1):
        """Div with specific class"""
        return self.page.locator(f"(//div[contains(@class,'{class_name}')])[{position}]")
    
    def span_any_class(self, class_name, position=1):
        """Span with specific class"""
        return self.page.locator(f"(//span[contains(@class,'{class_name}')])[{position}]")
    
    # PM Objects
    def any_tag_with_class_following_span_text(self, class_name, text, position=1):
        """Element with class following span text"""
        return self.page.locator(f"(//*[contains(@class,'{class_name}')]//following::span[contains(.,'{text}')])[{position}]")
    
    def mat_tree_node_any_tag_with_follow_mat_icon(self, value, position=1):
        """Mat-tree-node with following mat-icon"""
        return self.page.locator(f"(//mat-tree-node//*[following::mat-icon[contains(text(),'{value}')]])[{position}]")
    
    def wpc_panel_any_tag_with_class(self, class_name, position=1):
        """WPC panel element with class"""
        return self.page.locator(f"(//wpc-panel//*[contains(@class,'{class_name}')])[{position}]")
    
    def wpc_panel_any_tag_with_title(self, title, position=1):
        """WPC panel element with title"""
        return self.page.locator(f"(//wpc-panel//*[@title='{title}'])[{position}]")
    
    # RatesPage Objects
    def button_open_record_in_ellipsis(self):
        """Open record button in ellipsis menu"""
        return self.page.locator("//button[contains(@aria-label,'Open record')]")
    
    # Utility Methods
    def wait_for_element(self, locator, timeout=10000):
        """Wait for element to be visible"""
        locator.wait_for(state='visible', timeout=timeout)
        return locator
    
    def click_element(self, locator, force=False):
        """Click element with optional force"""
        if force:
            locator.click(force=True)
        else:
            locator.click()
    
    def fill_element(self, locator, text, force=False):
        """Fill element with text"""
        if force:
            locator.fill(text, force=True)
        else:
            locator.fill(text)
    
    def get_element_text(self, locator):
        """Get element text content"""
        return locator.text_content()
    
    def is_element_visible(self, locator):
        """Check if element is visible"""
        return locator.is_visible()
    
    # Login Objects
    def sign_in_username_field(self):
        """Sign in username field"""
        return self.page.locator("#signInFormUsername").first
    
    def sign_in_password_field(self):
        """Sign in password field"""
        return self.page.locator("#signInFormPassword").first
    
    def sign_in_submit_button(self):
        """Sign in submit button"""
        return self.page.locator("[name='signInSubmitButton']")
    
    def acknowledge_button(self):
        """Acknowledge button"""
        return self.page.locator("button:has-text('Acknowledge')")
    
    # Data-testid Objects
    def data_testid_element(self, testid):
        """Element with data-testid attribute"""
        return self.page.locator(f"[data-testid='{testid}']")
    
    def id_contains_element(self, id_text):
        """Element with id attribute containing specific text"""
        return self.page.locator(f"[id*='{id_text}']")
    
    def dropdown_arrow_for_field(self, dropdown_name):
        """Dropdown arrow for specific field"""
        return self.page.locator(f"//input[contains(@id,'{dropdown_name}')]/following-sibling::mat-icon")
    
    # Search Objects
    def advanced_search_button(self):
        """Advanced search button"""
        return self.page.locator("[aria-label='Advanced Search']")
    
    def mat_pseudo_checkbox(self, position=1):
        """Material pseudo checkbox"""
        return self.page.locator(".mat-pseudo-checkbox").nth(position - 1)
    
    def mat_input_field(self, position=1):
        """Material input field"""
        return self.page.locator(".mat-input").nth(position - 1)
    
    def mat_row_element(self, position=1):
        """Material row element"""
        return self.page.locator("mat-row").nth(position - 1)
    
    def mat_row_element(self, position=1):
        """Material row element"""
        return self.page.locator("mat-row").nth(position - 1)
    
    # File Upload Objects
    def file_input(self):
        """File input element"""
        return self.page.locator("input[type='file']")
    
    # Dashboard Objects
    def toggle_button(self, module_name):
        """Toggle button for module"""
        return self.page.locator(f"[aria-label='Toggle {module_name}']")
    
    def add_tile_button(self):
        """Add tile button"""
        return self.page.locator("[aria-label='Add Tile']")
    
    def tile_search_box(self):
        """Tile search box"""
        return self.page.locator("#tile-search")
    
    def action_button_primary(self):
        """Primary action button"""
        return self.page.locator(".action-btn.plr-primary")
    
    def grid_list_wrapper(self, position=1):
        """Grid list wrapper"""
        return self.page.locator(".grid-list-wrapper").nth(position - 1)
    
    # Table Objects
    def mat_table(self):
        """Material table"""
        return self.page.locator("mat-table")
    
    def mat_header_cell(self, text=None):
        """Material header cell"""
        if text:
            return self.page.locator(f"mat-header-cell >> text={text}")
        return self.page.locator("mat-header-cell")
    
    def mat_cell(self):
        """Material cell"""
        return self.page.locator("mat-cell")
    
    # Dialog Objects
    def mat_dialog_container(self):
        """Material dialog container"""
        return self.page.locator(".mat-dialog-container")
    
    def menu_item_role(self):
        """Menu item with role"""
        return self.page.locator("[role='menuitem']")
    
    # Login Form Objects
    def visible_username_field(self):
        """Visible username input field"""
        return self.page.locator("input[type='text']:visible, input[type='email']:visible").first
    
    def visible_password_field(self):
        """Visible password input field"""
        return self.page.locator("input[type='password']:visible").first
    
    # Organization Setup Objects
    def organization_input(self):
        """Organization combobox input"""
        return self.page.locator("input[role='combobox'][id*='organization']")
    
    def location_input(self):
        """Location combobox input"""
        return self.page.locator("input[role='combobox'][id*='location']")
    
    def staff_input(self):
        """Staff combobox input"""
        return self.page.locator("input[role='combobox'][id*='staff']")
    
    def mat_option_with_text(self, text):
        """Material option with specific text"""
        return self.page.locator(f"mat-option:has-text('{text}')").first
    
    def all_mat_options(self):
        """All material options"""
        return self.page.locator("mat-option")
    
    def login_button(self):
        """Login button"""
        return self.page.locator("button:has-text('Log In')")
    
    def all_buttons(self):
        """All buttons on page"""
        return self.page.locator("button")