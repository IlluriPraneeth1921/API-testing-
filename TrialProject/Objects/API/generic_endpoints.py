#!/usr/bin/env python3
"""
Generic API Endpoints
Migrated from Katalon API Objects: GenericEndPoints

Handles generic CRUD operations for API endpoints
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from config.global_variables import GlobalVars

@dataclass
class GenericAPIRequest:
    """Generic API request structure"""
    endpoint: str
    resource: str
    primary_key: Optional[str] = None
    json_body: Optional[Dict[str, Any]] = None
    cookie_header: Optional[str] = None

class GenericEndpoints:
    """
    Generic API Endpoints Object
    Migrated from Katalon GenericEndPoints API objects
    """
    
    def __init__(self, base_endpoint: str = None):
        GlobalVars.load_config(environment="standard")
        self.base_endpoint = base_endpoint or GlobalVars.G_ENDPOINT
        self.bearer_token = GlobalVars.G_API_BEARER_TOKEN
        self.cookie_header = GlobalVars.G_COOKIE_HEADER
    
    def get_standard_headers(self) -> Dict[str, str]:
        """Get standard headers for API requests"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.bearer_token}",
            "Cookie": self.cookie_header,
            "Accept": "*/*"
        }
    
    def get_with_primary_key(self, resource: str, primary_key: str) -> GenericAPIRequest:
        """
        GET request with primary key
        Equivalent to GET_WithPrimaryKey.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=resource,
            primary_key=primary_key,
            cookie_header=self.cookie_header
        )
    
    def get_without_primary_key(self, resource: str) -> GenericAPIRequest:
        """
        GET request without primary key
        Equivalent to GET_WithoutPrimaryKey.rs
        URL: ${strEndPoint}/${strResource}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=resource,
            cookie_header=self.cookie_header
        )
    
    def get_with_primary_key_child(self, resource: str, primary_key: str, child_resource: str) -> GenericAPIRequest:
        """
        GET request with primary key for child resource
        Equivalent to GET_WithPrimaryKey_Child.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}/${childResource}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=f"{resource}/{primary_key}/{child_resource}",
            cookie_header=self.cookie_header
        )
    
    def post_without_primary_key(self, resource: str, json_body: Dict[str, Any]) -> GenericAPIRequest:
        """
        POST request without primary key
        Equivalent to POST_WithoutPrimaryKey.rs
        URL: ${strEndPoint}/${strResource}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=resource,
            json_body=json_body,
            cookie_header=self.cookie_header
        )
    
    def post_with_primary_key(self, resource: str, primary_key: str, json_body: Dict[str, Any]) -> GenericAPIRequest:
        """
        POST request with primary key
        Equivalent to POST_WithPrimaryKey.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=resource,
            primary_key=primary_key,
            json_body=json_body,
            cookie_header=self.cookie_header
        )
    
    def post_with_primary_key_child(self, resource: str, primary_key: str, child_resource: str, json_body: Dict[str, Any]) -> GenericAPIRequest:
        """
        POST request with primary key for child resource
        Equivalent to POST_WithPrimaryKey_Child.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}/${childResource}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=f"{resource}/{primary_key}/{child_resource}",
            json_body=json_body,
            cookie_header=self.cookie_header
        )
    
    def put_with_primary_key(self, request_url: str, json_body: Dict[str, Any]) -> GenericAPIRequest:
        """
        PUT request with primary key
        Equivalent to PUT_WithPrimaryKey.rs
        URL: ${strRequestUrl}
        """
        return GenericAPIRequest(
            endpoint="",  # Full URL provided
            resource=request_url,
            json_body=json_body,
            cookie_header=self.cookie_header
        )
    
    def delete_with_primary_key(self, resource: str, primary_key: str) -> GenericAPIRequest:
        """
        DELETE request with primary key
        Equivalent to DELETE_WithPrimaryKey.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=resource,
            primary_key=primary_key,
            cookie_header=self.cookie_header
        )
    
    def delete_with_primary_key_child(self, resource: str, primary_key: str, child_resource: str) -> GenericAPIRequest:
        """
        DELETE request with primary key for child resource
        Equivalent to DELETE_WithPrimaryKey_Child.rs
        URL: ${strEndPoint}/${strResource}/${strPrimaryKey}/${childResource}
        """
        return GenericAPIRequest(
            endpoint=self.base_endpoint,
            resource=f"{resource}/{primary_key}/{child_resource}",
            cookie_header=self.cookie_header
        )
    
    def build_url(self, request: GenericAPIRequest) -> str:
        """Build complete URL from request object"""
        if request.endpoint == "":  # Full URL provided in resource
            return request.resource
        
        url = f"{request.endpoint}/{request.resource}"
        if request.primary_key:
            url = f"{url}/{request.primary_key}"
        return url
    
    def get_verification_rules(self) -> Dict[str, Any]:
        """
        Get verification rules from Katalon verification scripts
        Based on GET_WithPrimaryKey.rs verification script
        """
        return {
            'model.assignedLocation.key': "64663e87-1862-4f94-828f-aafd011fec72",
            'model.genericPropertyConfigurations[0].name': "User Role Permission"
        }