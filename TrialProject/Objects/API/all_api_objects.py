#!/usr/bin/env python3
"""
All API Objects - Centralized API object management
Migrated from Katalon API Object Repository

Provides unified access to all API objects
"""

from .generic_endpoints import GenericEndpoints
from .mockaroo_api import MockarooAPI
from .user_api import UserAPI
from config.global_variables import GlobalVars

class AllAPIObjects:
    """
    Centralized API Objects Manager
    Provides unified access to all API objects
    """
    
    def __init__(self, environment: str = "standard"):
        # Load configuration
        GlobalVars.load_config(environment=environment)
        
        # Initialize API objects
        self.generic_endpoints = GenericEndpoints()
        self.mockaroo_api = MockarooAPI()
        self.user_api = UserAPI(GlobalVars.BASE_URL)
    
    def get_generic_endpoints(self) -> GenericEndpoints:
        """Get Generic Endpoints API object"""
        return self.generic_endpoints
    
    def get_mockaroo_api(self) -> MockarooAPI:
        """Get Mockaroo API object"""
        return self.mockaroo_api
    
    def get_user_api(self) -> UserAPI:
        """Get User API object"""
        return self.user_api