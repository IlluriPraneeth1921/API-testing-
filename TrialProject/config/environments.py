"""
Environment-specific configurations
Similar to Katalon's execution profiles
"""

# Standard Environment
STANDARD_CONFIG = {
    "base_url": "https://standard-f1-carity.feisystemsh2env.com/",
    "credentials": {
        "username": "George.Parker",
        "password": "Password123#",
        "organization": "Quantum Services",
        "location": "Quantum Services Medical Equipment",
        "staff_member": "Self"
    },
    "browser": {
        "headless": False,
        "timeout": 30000
    }
}

# Staging Environment
STAGING_CONFIG = {
    "base_url": "https://staging-carity.example.com/",
    "credentials": {
        "username": "staging.user",
        "password": "StagingPass123#",
        "organization": "Staging Organization",
        "location": "Staging Location",
        "staff_member": "Staging Staff"
    },
    "browser": {
        "headless": False,
        "timeout": 30000
    }
}

# Production Environment (for production testing)
PROD_CONFIG = {
    "base_url": "https://prod-carity.example.com/",
    "credentials": {
        "username": "prod.user",
        "password": "ProdPass123#",
        "organization": "Production Organization",
        "location": "Production Location",
        "staff_member": "Production Staff"
    },
    "browser": {
        "headless": True,  # Run headless in production
        "timeout": 45000
    }
}

# Environment mapping
ENVIRONMENTS = {
    "standard": STANDARD_CONFIG,
    "staging": STAGING_CONFIG,
    "prod": PROD_CONFIG
}