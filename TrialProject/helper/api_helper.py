#!/usr/bin/env python3
"""
API Helper - handles HTTP requests and API operations
Migrated from Katalon Custom Keywords for API testing

Provides reusable API testing functionality
"""

import requests
import json
import logging
from typing import Dict, Any, Optional, Tuple
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time

logger = logging.getLogger(__name__)

class APIHelper:
    """
    API Helper class for handling HTTP requests and API operations
    Equivalent to Katalon Custom Keywords for API testing
    """
    
    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.session = requests.Session()
        self.timeout = timeout
        self.max_retries = max_retries
        self.setup_session()
        self.last_response = None
        self.request_history = []
    
    def setup_session(self):
        """Setup session with retry strategy"""
        retry_strategy = Retry(
            total=self.max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def send_request(self, method: str, url: str, headers: Optional[Dict[str, str]] = None, 
                    data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> requests.Response:
        """
        Send HTTP request with logging and error handling
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            url: Request URL
            headers: Request headers
            data: Request body data
            params: URL parameters
            
        Returns:
            requests.Response object
        """
        start_time = time.time()
        
        # Prepare request data
        json_data = json.dumps(data) if data else None
        
        logger.info(f"=== API REQUEST ===")
        logger.info(f"Method: {method.upper()}")
        logger.info(f"URL: {url}")
        logger.info(f"Headers: {headers}")
        if data:
            logger.info(f"Request Body: {json_data}")
        if params:
            logger.info(f"Parameters: {params}")
        
        try:
            # Send request
            response = self.session.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=self.timeout
            )
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Store response for later use
            self.last_response = response
            
            # Log response details
            logger.info(f"=== API RESPONSE ===")
            logger.info(f"Status Code: {response.status_code}")
            logger.info(f"Response Time: {response_time:.2f}s")
            logger.info(f"Response Headers: {dict(response.headers)}")
            
            # Log response body (truncate if too long)
            response_text = response.text
            if len(response_text) > 1000:
                logger.info(f"Response Body (truncated): {response_text[:1000]}...")
            else:
                logger.info(f"Response Body: {response_text}")
            
            # Store request history
            self.request_history.append({
                'method': method.upper(),
                'url': url,
                'status_code': response.status_code,
                'response_time': response_time,
                'timestamp': time.time()
            })
            
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ API Request failed: {str(e)}")
            logger.error(f"URL: {url}")
            logger.error(f"Method: {method}")
            raise
    
    def post_request(self, url: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> requests.Response:
        """Send POST request"""
        return self.send_request('POST', url, headers, data)
    
    def get_request(self, url: str, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None) -> requests.Response:
        """Send GET request"""
        return self.send_request('GET', url, headers, params=params)
    
    def put_request(self, url: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> requests.Response:
        """Send PUT request"""
        return self.send_request('PUT', url, headers, data)
    
    def delete_request(self, url: str, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        """Send DELETE request"""
        return self.send_request('DELETE', url, headers)
    
    def verify_status_code(self, expected_status: int, actual_response: Optional[requests.Response] = None) -> bool:
        """Verify response status code"""
        response = actual_response or self.last_response
        if not response:
            raise ValueError("No response available for verification")
        
        success = response.status_code == expected_status
        if success:
            logger.info(f"✅ Status code verification PASSED: {response.status_code}")
        else:
            logger.error(f"❌ Status code verification FAILED: Expected {expected_status}, got {response.status_code}")
        
        return success
    
    def verify_response_contains(self, expected_text: str, actual_response: Optional[requests.Response] = None) -> bool:
        """Verify response contains expected text"""
        response = actual_response or self.last_response
        if not response:
            raise ValueError("No response available for verification")
        
        success = expected_text in response.text
        if success:
            logger.info(f"✅ Response contains verification PASSED: Found '{expected_text}'")
        else:
            logger.error(f"❌ Response contains verification FAILED: '{expected_text}' not found in response")
        
        return success
    
    def verify_json_field(self, field_path: str, expected_value: Any, actual_response: Optional[requests.Response] = None) -> bool:
        """Verify JSON field value in response"""
        response = actual_response or self.last_response
        if not response:
            raise ValueError("No response available for verification")
        
        try:
            response_json = response.json()
            
            # Navigate through nested fields (e.g., "user.profile.name")
            current_value = response_json
            for field in field_path.split('.'):
                current_value = current_value[field]
            
            success = current_value == expected_value
            if success:
                logger.info(f"✅ JSON field verification PASSED: {field_path} = {current_value}")
            else:
                logger.error(f"❌ JSON field verification FAILED: {field_path} = {current_value}, expected {expected_value}")
            
            return success
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"❌ JSON field verification ERROR: {str(e)}")
            return False
    
    def get_json_response(self, response: Optional[requests.Response] = None) -> Dict[str, Any]:
        """Get JSON response data"""
        response = response or self.last_response
        if not response:
            raise ValueError("No response available")
        
        try:
            return response.json()
        except json.JSONDecodeError:
            logger.error("Failed to parse response as JSON")
            raise
    
    def assert_status_code(self, expected_status: int, actual_response: Optional[requests.Response] = None):
        """Assert response status code (raises exception on failure)"""
        if not self.verify_status_code(expected_status, actual_response):
            response = actual_response or self.last_response
            raise AssertionError(f"Expected status code {expected_status}, got {response.status_code}")
    
    def assert_response_contains(self, expected_text: str, actual_response: Optional[requests.Response] = None):
        """Assert response contains text (raises exception on failure)"""
        if not self.verify_response_contains(expected_text, actual_response):
            raise AssertionError(f"Response does not contain expected text: '{expected_text}'")
    
    def assert_json_field(self, field_path: str, expected_value: Any, actual_response: Optional[requests.Response] = None):
        """Assert JSON field value (raises exception on failure)"""
        if not self.verify_json_field(field_path, expected_value, actual_response):
            raise AssertionError(f"JSON field {field_path} does not match expected value {expected_value}")
    
    def get_response_time(self) -> float:
        """Get last response time from history"""
        if self.request_history:
            return self.request_history[-1]['response_time']
        return 0.0
    
    def clear_session(self):
        """Clear session and history"""
        self.session.close()
        self.session = requests.Session()
        self.setup_session()
        self.last_response = None
        self.request_history.clear()
        logger.info("API session cleared")