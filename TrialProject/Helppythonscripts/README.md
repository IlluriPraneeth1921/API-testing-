# Helper Python Scripts

This folder contains utility scripts used for automating various tasks in the TrialProject.

## Scripts

### 1. locator_refactoring_script.py

**Purpose**: Automates the refactoring of direct locators to use object repository pattern.

**What it does**:
- Adds new object methods to AllObjects.py
- Replaces direct locators in AllHelpers.py with object method calls
- Generates a comprehensive refactoring summary

**Usage**:
```bash
cd TrialProject/Helppythonscripts
python locator_refactoring_script.py
```

**Features**:
- **Automated Replacement**: Uses regex and string replacement to convert 80+ locators
- **Object Generation**: Automatically adds 20+ new object methods to AllObjects.py
- **Summary Generation**: Creates detailed documentation of all changes
- **Backup Safe**: Only modifies files if changes are detected

**Replacements Handled**:
- Login objects (username, password, submit button)
- Data-testid elements
- Text-based locators
- Material UI components
- File upload elements
- Dashboard components
- Search elements
- Menu items

**Benefits**:
- Saves hours of manual refactoring work
- Ensures consistency across all replacements
- Reduces human error in pattern matching
- Provides complete audit trail of changes

**Files Modified**:
- `Objects/AllObjects.py` - Adds new object methods
- `helper/AllHelpers.py` - Replaces direct locators
- `LOCATOR_REFACTORING_SUMMARY.md` - Creates documentation

## Usage Guidelines

1. **Backup First**: Always backup your files before running automation scripts
2. **Review Changes**: Check the generated summary to understand what was modified
3. **Test After**: Run your tests to ensure all replacements work correctly
4. **Customize**: Modify the script patterns if you have different locator conventions

## Script Structure

```python
class LocatorRefactorer:
    def _define_replacements(self):
        # Define all locator mappings
    
    def add_objects_to_allobjects(self, file_path):
        # Add new object methods
    
    def refactor_file(self, file_path):
        # Apply replacements to target file
    
    def generate_summary(self, output_file):
        # Create documentation
```

## Future Enhancements

- Add support for more locator patterns
- Include validation of object method calls
- Add rollback functionality
- Support for multiple file processing
- Integration with CI/CD pipelines