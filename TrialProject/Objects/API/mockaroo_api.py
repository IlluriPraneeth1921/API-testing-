#!/usr/bin/env python3
"""
Mockaroo API Object
Migrated from Katalon API Object: Mockaroo/GET_Mockaroo_Data.rs

Handles Mockaroo test data API operations
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from config.global_variables import GlobalVars

@dataclass
class MockarooRequest:
    """Mockaroo API request structure"""
    endpoint: str
    api_key: str

class MockarooAPI:
    """
    Mockaroo API Object
    Migrated from Katalon Mockaroo API object
    """
    
    def __init__(self, api_key: str = None):
        GlobalVars.load_config(environment="standard")
        self.api_key = api_key or GlobalVars.G_MOCKAROO_API_KEY
        self.default_endpoint = GlobalVars.G_MOCKAROO_ENDPOINT if hasattr(GlobalVars, 'G_MOCKAROO_ENDPOINT') else "https://my.api.mockaroo.com/SystenAccount.json"
    
    def get_mockaroo_data(self, endpoint: str = None) -> MockarooRequest:
        """
        GET Mockaroo data
        Equivalent to GET_Mockaroo_Data.rs
        URL: ${strMockarooEndPoint}?key=${strMockarooAPIKey}
        """
        return MockarooRequest(
            endpoint=endpoint or self.default_endpoint,
            api_key=self.api_key
        )
    
    def build_url(self, request: MockarooRequest) -> str:
        """Build complete Mockaroo URL with API key"""
        return f"{request.endpoint}?key={request.api_key}"
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for Mockaroo requests"""
        return {
            "Accept": "application/json"
        }
    
    def get_verification_rules(self) -> Dict[str, Any]:
        """
        Get verification rules from Katalon verification script
        Based on GET_Mockaroo_Data.rs verification script
        """
        return {
            'emailAddress': "Bale.Andrewartha@hostgator.com"
        }