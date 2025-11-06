"""
Global Variables - Similar to Katalon's GlobalVariables
Centralized configuration for test data and settings
"""
import json
import os
from typing import Dict, Any

class GlobalVariables:
    """Centralized configuration management similar to Katalon's GlobalVariables"""
    
    _config = None
    _current_env = "standard"
    
    @classmethod
    def load_config(cls, config_file: str = None, environment: str = "standard"):
        """Load configuration from JSON file"""
        if config_file is None:
            config_file = os.path.join(os.path.dirname(__file__), "test_config.json")
        
        with open(config_file, 'r') as f:
            cls._config = json.load(f)
        
        cls._current_env = environment
    
    @classmethod
    def get(cls, key: str, default=None):
        """Get configuration value by key"""
        if cls._config is None:
            cls.load_config()
        
        # Support nested keys like "credentials.username"
        keys = key.split('.')
        value = cls._config.get("environments", {}).get(cls._current_env, {})
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k, default)
            else:
                return default
        
        return value
    
    @classmethod
    def set_environment(cls, environment: str):
        """Set current environment (dev, staging, prod)"""
        cls._current_env = environment
    
    # Convenience properties for common values
    @property
    def USERNAME(self):
        return self.get("credentials.username")
    
    @property
    def PASSWORD(self):
        return self.get("credentials.password")
    
    @property
    def ORGANIZATION(self):
        return self.get("credentials.organization")
    
    @property
    def LOCATION(self):
        return self.get("credentials.location")
    
    @property
    def STAFF_MEMBER(self):
        return self.get("credentials.staff_member")
    
    @property
    def BASE_URL(self):
        return self.get("base_url")
    
    # API Configuration Properties
    @property
    def G_ENDPOINT(self):
        return self.get("api.endpoint")
    
    @property
    def G_API_BEARER_TOKEN(self):
        return self.get("api.bearer_token")
    
    @property
    def G_COOKIE_HEADER(self):
        return self.get("api.cookie_header")
    
    @property
    def G_MOCKAROO_API_KEY(self):
        return self.get("api.mockaroo_api_key")
    
    @property
    def G_SERVICE_LIMIT_RESOURCE(self):
        return self.get("api.service_limit_resource")
    
    @property
    def G_ORGANIZATION_FORM_ACTIVITY_INSTANCE_RESOURCE(self):
        return self.get("api.organization_form_activity_instance_resource")
    
    # Database Configuration Properties
    @property
    def G_DB_SERVER_NAME(self):
        return self.get("database.server_name")
    
    @property
    def G_DB_NAME(self):
        return self.get("database.database_name")
    
    @property
    def G_DB_USERNAME(self):
        return self.get("database.username")
    
    @property
    def G_DB_PASSWORD(self):
        return self.get("database.password")
    
    @property
    def G_DB_CONNECTION_STRING(self):
        return self.get("database.connection_string")
    
    # Additional API Profile Properties
    @property
    def G_USER_POOL_ID(self):
        return self.get("api.user_pool_id")
    
    @property
    def G_CLIENT_ID(self):
        return self.get("api.client_id")
    
    # Appointment Module Properties
    @property
    def G_APPOINTMENT_RESOURCE(self):
        return self.get("api.appointment_resource")
    
    @property
    def G_STATUS_CODE_OK(self):
        return self.get("api.status_code_ok")
    
    @property
    def G_STATUS_CODE_BAD_REQUEST(self):
        return self.get("api.status_code_bad_request")
    
    @property
    def G_STATUS_CODE_FORBIDDEN(self):
        return self.get("api.status_code_forbidden")
    
    # Core API Resources
    @property
    def G_PERSON_RESOURCE(self):
        return self.get("api.person_resource")
    
    @property
    def G_CASE_RESOURCE(self):
        return self.get("api.case_resource")
    
    @property
    def G_ORGANIZATION_RESOURCE(self):
        return self.get("api.organization_resource")
    
    @property
    def G_LOCATION_RESOURCE(self):
        return self.get("api.location_resource")
    
    @property
    def G_STAFF_MEMBER_RESOURCE(self):
        return self.get("api.staff_member_resource")
    
    @property
    def G_PERSON_CONTACT_RESOURCE(self):
        return self.get("api.person_contact_resource")
    
    @property
    def G_CONTACT_RESOURCE(self):
        return self.get("api.contact_resource")
    
    @property
    def G_PROGRAM_RESOURCE(self):
        return self.get("api.program_resource")
    
    @property
    def G_REPORTABLE_EVENT_RESOURCE(self):
        return self.get("api.reportable_event_resource")
    
    @property
    def G_CASE_ACTIVITY_INSTANCE_RESOURCE(self):
        return self.get("api.case_activity_instance_resource")
    
    @property
    def G_SHORT_WAIT_TIME(self):
        return self.get("api.short_wait_time")
    
    @property
    def G_ADMIN_USERNAME(self):
        return self.get("api.admin_username")
    
    @property
    def G_ADMIN_PASSWORD(self):
        return self.get("api.admin_password")
    
    @property
    def G_MOCKAROO_ENDPOINT(self):
        return self.get("api.mockaroo_endpoint")
    
    @property
    def G_USER_CONTEXT_RESOURCE(self):
        return self.get("api.user_context_resource")

# Create singleton instance
GlobalVars = GlobalVariables()