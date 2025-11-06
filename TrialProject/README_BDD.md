# BDD Test Framework

## Structure
```
TrialProject/
├── features/                 # Feature files (.feature)
│   ├── login.feature
│   └── forms.feature
├── step_definitions/         # Step definitions (.py)
│   ├── login_steps.py
│   └── forms_steps.py
├── Objects/                  # Page objects
├── helper/                   # Helper classes
├── reports/                  # Test reports
└── conftest.py              # Pytest configuration
```

## Installation
```bash
cd TrialProject
venv1\Scripts\activate.bat
pip install -r requirements.txt
playwright install
```

## Running Tests

### All Tests
```bash
python run_tests.py
```

### Specific Test Types
```bash
python run_tests.py --type login
python run_tests.py --type forms
```

### With Tags/Markers
```bash
python run_tests.py --tags smoke
python run_tests.py --tags "smoke and login"
```

### Headless Mode
```bash
python run_tests.py --headless
```

### Direct pytest Commands
```bash
# Run all BDD tests
pytest step_definitions/ -v

# Run specific feature
pytest step_definitions/login_steps.py -v

# Run with markers
pytest -m smoke -v

# Generate HTML report
pytest --html=reports/report.html --self-contained-html
```

## Feature File Examples

### Login Feature
- Basic login scenarios
- Organization setup
- Data-driven tests with examples

### Forms Feature  
- Form creation workflows
- Different form types
- Form management operations

## Step Definitions
- Reusable step implementations
- Integration with existing helpers
- Proper fixture management

## Benefits
- **Readable**: Business-readable scenarios
- **Maintainable**: Separation of test logic and implementation
- **Reusable**: Common steps across features
- **Reporting**: HTML reports with scenario results