# Configuration Management

This directory contains configuration files similar to Katalon's GlobalVariables and execution profiles.

## Files

- `test_config.json` - JSON-based configuration (similar to Katalon's GlobalVariables)
- `global_variables.py` - Python class for accessing configuration values
- `environments.py` - Environment-specific configurations (similar to Katalon's execution profiles)

## Usage

### Method 1: Using GlobalVariables class (Recommended)

```python
from config.global_variables import GlobalVars

# Load configuration for specific environment
GlobalVars.load_config(environment="dev")  # or "staging", "prod"

# Access values
username = GlobalVars.USERNAME
password = GlobalVars.PASSWORD
base_url = GlobalVars.BASE_URL
```

### Method 2: Direct environment import

```python
from config.environments import ENVIRONMENTS

# Get configuration for specific environment
config = ENVIRONMENTS["dev"]
username = config["credentials"]["username"]
```

## Environment Switching

To switch environments, simply change the environment parameter:

```python
# For development
GlobalVars.load_config(environment="dev")

# For staging
GlobalVars.load_config(environment="staging")

# For production
GlobalVars.load_config(environment="prod")
```

## Adding New Environments

1. Add new environment to `test_config.json`
2. Add corresponding configuration to `environments.py`
3. Update the ENVIRONMENTS dictionary

## Security Note

- Never commit real passwords to version control
- Use environment variables for sensitive data in CI/CD
- Consider using encrypted configuration files for production