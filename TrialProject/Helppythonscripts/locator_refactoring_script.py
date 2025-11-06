#!/usr/bin/env python3
"""
Locator Refactoring Script
Automated script to replace direct locators with object repository methods
Used for refactoring AllHelpers.py to use AllObjects.py
"""

import re
import os
from typing import Dict, List, Tuple

class LocatorRefactorer:
    """Refactor direct locators to use object repository pattern"""
    
    def __init__(self):
        self.replacements = self._define_replacements()
        
    def _define_replacements(self) -> List[Tuple[str, str]]:
        """Define locator replacement mappings"""
        return [
            # Login Objects
            ('self.page.locator("#signInFormUsername")', 'self.objects.sign_in_username_field()'),
            ('self.page.locator("#signInFormPassword")', 'self.objects.sign_in_password_field()'),
            ('self.page.locator("[name=\'signInSubmitButton\']")', 'self.objects.sign_in_submit_button()'),
            ('self.page.locator("text=Acknowledge")', 'self.objects.acknowledge_button()'),
            
            # Data-testid Objects (generic pattern)
            (r'self\.page\.locator\("\[data-testid=\'([^\']+)\'\]"\)', r'self.objects.data_testid_element(\'\1\')'),
            
            # Text-based Objects (generic pattern)
            (r'self\.page\.locator\("text=([^"]+)"\)', r'self.objects.any_tag_with_text_equals(\'\1\')'),
            (r'self\.page\.locator\(f"text=\{([^}]+)\}"\)', r'self.objects.any_tag_with_text_equals(\1)'),
            
            # Material UI Objects
            ('self.page.locator("mat-icon:has-text(\'chevron_right\')")', 'self.objects.mat_icon_any_text(\'chevron_right\')'),
            ('self.page.locator("mat-icon:has-text(\'keyboard_arrow_down\')")', 'self.objects.mat_icon_any_text(\'keyboard_arrow_down\')'),
            ('self.page.locator("mat-icon:has-text(\'keyboard_arrow_down\')").nth(1)', 'self.objects.mat_icon_any_text(\'keyboard_arrow_down\', 2)'),
            ('self.page.locator(".mat-pseudo-checkbox").first', 'self.objects.mat_pseudo_checkbox(1)'),
            ('self.page.locator(".mat-input").nth(9)', 'self.objects.mat_input_field(10)'),
            ('self.page.locator("mat-row").first', 'self.objects.mat_row_element(1)'),
            ('self.page.locator("mat-table")', 'self.objects.mat_table()'),
            ('self.page.locator(".mat-dialog-container")', 'self.objects.mat_dialog_container()'),
            
            # File Upload Objects
            ('self.page.locator("input[type=\'file\']")', 'self.objects.file_input()'),
            
            # Dashboard Objects
            (r'self\.page\.locator\(f"\[aria-label=\'Toggle \{([^}]+)\}\]"\)', r'self.objects.toggle_button(\1)'),
            ('self.page.locator("[aria-label=\'Add Tile\']")', 'self.objects.add_tile_button()'),
            ('self.page.locator("#tile-search")', 'self.objects.tile_search_box()'),
            ('self.page.locator(".action-btn.plr-primary")', 'self.objects.action_button_primary()'),
            (r'self\.page\.locator\("\.grid-list-wrapper"\)\.nth\(([^)]+) - 1\)', r'self.objects.grid_list_wrapper(\1)'),
            
            # Search Objects
            ('self.page.locator("[aria-label=\'Advanced Search\']")', 'self.objects.advanced_search_button()'),
            
            # Menu Objects
            ('self.page.locator("[role=\'menuitem\']")', 'self.objects.menu_item_role()'),
        ]
    
    def add_objects_to_allobjects(self, file_path: str) -> None:
        """Add new object methods to AllObjects.py"""
        new_objects = '''
    # Login Objects
    def sign_in_username_field(self):
        """Sign in username field"""
        return self.page.locator("#signInFormUsername")
    
    def sign_in_password_field(self):
        """Sign in password field"""
        return self.page.locator("#signInFormPassword")
    
    def sign_in_submit_button(self):
        """Sign in submit button"""
        return self.page.locator("[name='signInSubmitButton']")
    
    def acknowledge_button(self):
        """Acknowledge button"""
        return self.page.locator("text=Acknowledge")
    
    # Data-testid Objects
    def data_testid_element(self, testid):
        """Element with data-testid attribute"""
        return self.page.locator(f"[data-testid='{testid}']")
    
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
        return self.page.locator("[role='menuitem']")'''
        
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the last method and add new objects before the end
        insertion_point = content.rfind('    def is_element_visible(self, locator):')
        if insertion_point != -1:
            # Find the end of this method
            method_end = content.find('\n    def ', insertion_point + 1)
            if method_end == -1:
                method_end = len(content)
            
            # Insert new objects after this method
            new_content = content[:method_end] + new_objects + content[method_end:]
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"Added new object methods to {file_path}")
    
    def refactor_file(self, file_path: str) -> None:
        """Refactor a single file to use object repository"""
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return
        
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply replacements
        for old_pattern, new_pattern in self.replacements:
            if old_pattern.startswith('r\'') or '\\' in old_pattern:
                # Use regex replacement
                pattern = old_pattern.strip('r\'').strip('\'')
                content = re.sub(pattern, new_pattern, content)
            else:
                # Use simple string replacement
                content = content.replace(old_pattern, new_pattern)
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Refactored: {file_path}")
        else:
            print(f"No changes needed: {file_path}")
    
    def generate_summary(self, output_file: str) -> None:
        """Generate refactoring summary"""
        summary = """# Locator Refactoring Summary

## Replacements Applied

### Login Objects
- `#signInFormUsername` → `sign_in_username_field()`
- `#signInFormPassword` → `sign_in_password_field()`
- `[name='signInSubmitButton']` → `sign_in_submit_button()`
- `text=Acknowledge` → `acknowledge_button()`

### Data-testid Objects
- `[data-testid='...']` → `data_testid_element('...')`

### Text-based Objects
- `text=...` → `any_tag_with_text_equals('...')`

### Material UI Objects
- `mat-icon:has-text('...')` → `mat_icon_any_text('...')`
- `.mat-pseudo-checkbox` → `mat_pseudo_checkbox()`
- `.mat-input` → `mat_input_field()`
- `mat-row` → `mat_row_element()`
- `mat-table` → `mat_table()`
- `.mat-dialog-container` → `mat_dialog_container()`

### File Upload Objects
- `input[type='file']` → `file_input()`

### Dashboard Objects
- `[aria-label='Toggle ...']` → `toggle_button()`
- `[aria-label='Add Tile']` → `add_tile_button()`
- `#tile-search` → `tile_search_box()`
- `.action-btn.plr-primary` → `action_button_primary()`
- `.grid-list-wrapper` → `grid_list_wrapper()`

### Search Objects
- `[aria-label='Advanced Search']` → `advanced_search_button()`

### Menu Objects
- `[role='menuitem']` → `menu_item_role()`

## Benefits
1. **Maintainability** - Centralized locator management
2. **Reusability** - Objects can be used across different helpers
3. **Consistency** - Standardized approach to element selection
4. **Debugging** - Easier to update selectors in one place
"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(summary)
        print(f"Summary generated: {output_file}")

def main():
    """Main execution function"""
    refactorer = LocatorRefactorer()
    
    # Define file paths
    base_path = os.path.dirname(os.path.abspath(__file__))
    project_path = os.path.dirname(base_path)
    
    all_helpers_path = os.path.join(project_path, 'helper', 'AllHelpers.py')
    all_objects_path = os.path.join(project_path, 'Objects', 'AllObjects.py')
    summary_path = os.path.join(project_path, 'LOCATOR_REFACTORING_SUMMARY.md')
    
    print("Starting locator refactoring process...")
    
    # Step 1: Add new objects to AllObjects.py
    print("\n1. Adding new object methods to AllObjects.py...")
    refactorer.add_objects_to_allobjects(all_objects_path)
    
    # Step 2: Refactor AllHelpers.py
    print("\n2. Refactoring AllHelpers.py...")
    refactorer.refactor_file(all_helpers_path)
    
    # Step 3: Generate summary
    print("\n3. Generating summary...")
    refactorer.generate_summary(summary_path)
    
    print("\nLocator refactoring completed successfully!")
    print(f"Files modified:")
    print(f"  - {all_objects_path}")
    print(f"  - {all_helpers_path}")
    print(f"  - {summary_path}")

if __name__ == "__main__":
    main()