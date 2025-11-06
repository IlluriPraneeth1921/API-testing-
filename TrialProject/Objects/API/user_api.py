#!/usr/bin/env python3
"""
API Object: User API
Migrated from Katalon API Test Object

Handles all user-related API endpoints and data structures
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import json

@dataclass
class UserCredentials:
    """User credentials data structure"""
    username: str
    password: str
    organization: str = ""
    location: str = ""
    staff_member: str = ""

@dataclass
class UserProfile:
    """User profile data structure"""
    user_id: str
    username: str
    email: str
    first_name: str
    last_name: str
    organization: str
    location: str
    role: str
    is_active: bool = True

class UserAPI:
    """
    User API Object - handles user-related API operations
    Equivalent to Katalon API Test Object
    """
    
    def __init__(self, base_url: str = None):
        GlobalVars.load_config(environment="standard")
        self.base_url = (base_url or GlobalVars.G_ENDPOINT).rstrip('/')
        self.endpoints = {
            'login': '/api/auth/login',
            'logout': '/api/auth/logout',
            'profile': '/api/user/profile',
            'users': '/api/users',
            'user_by_id': '/api/users/{user_id}',
            'validate_token': '/api/auth/validate'
        }
    
    def get_endpoint(self, endpoint_name: str, **kwargs) -> str:
        """Get full endpoint URL with parameters"""
        endpoint = self.endpoints.get(endpoint_name, '')
        if kwargs:
            endpoint = endpoint.format(**kwargs)
        return f"{self.base_url}{endpoint}"
    
    def get_login_payload(self, credentials: UserCredentials) -> Dict[str, Any]:
        """Get login request payload"""
        return {
            "username": credentials.username,
            "password": credentials.password,
            "organization": credentials.organization,
            "location": credentials.location,
            "staffMember": credentials.staff_member
        }
    
    def get_user_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        """Get standard headers for user API requests"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers
    
    def parse_login_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse login response and extract relevant data"""
        return {
            'token': response_data.get('access_token', ''),
            'refresh_token': response_data.get('refresh_token', ''),
            'user_id': response_data.get('user_id', ''),
            'expires_in': response_data.get('expires_in', 3600),
            'user_profile': response_data.get('user', {})
        }
    
    def create_user_profile(self, user_data: Dict[str, Any]) -> UserProfile:
        """Create UserProfile object from API response"""
        return UserProfile(
            user_id=user_data.get('id', ''),
            username=user_data.get('username', ''),
            email=user_data.get('email', ''),
            first_name=user_data.get('firstName', ''),
            last_name=user_data.get('lastName', ''),
            organization=user_data.get('organization', ''),
            location=user_data.get('location', ''),
            role=user_data.get('role', ''),
            is_active=user_data.get('isActive', True)
        )
    
    def validate_login_response(self, response_data: Dict[str, Any]) -> bool:
        """Validate login response structure"""
        required_fields = ['access_token', 'user_id']
        return all(field in response_data for field in required_fields)
    
    def get_expected_status_codes(self) -> Dict[str, int]:
        """Get expected status codes for different operations"""
        return {
            'login_success': 200,
            'login_failure': 401,
            'unauthorized': 401,
            'forbidden': 403,
            'not_found': 404,
            'server_error': 500
        }