#!/usr/bin/env python3
"""
API Helper Advanced
Migrated from Katalon ApiHelper.groovy

Provides advanced API helper functions for dynamic token management and request handling
"""

import json
import logging
import os
import subprocess
from typing import Dict, Any, Optional, List
import requests
from config.global_variables import GlobalVars

logger = logging.getLogger(__name__)

class ApiHelperAdvanced:
    """
    Advanced API Helper - migrated from Katalon ApiHelper.groovy
    Provides advanced API functionality including dynamic token management
    """
    
    def __init__(self):
        self.session = requests.Session()
    
    def set_request_body(self, request_data: Dict[str, Any], body_content: str) -> Dict[str, Any]:
        """Set request body content"""
        request_data['body'] = {
            'text': body_content,
            'contentType': 'application/json',
            'charset': 'UTF-8'
        }
        return request_data
    
    def get_test_object_paths(self, folder_path: str) -> Dict[str, Dict[str, str]]:
        """Get test object paths from folder (simulated for Python)"""
        test_object_data = {}
        
        if os.path.isdir(folder_path):
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    if file.endswith('.py'):
                        file_path = os.path.join(root, file)
                        relative_path = os.path.relpath(file_path, folder_path)
                        
                        test_object_data[relative_path] = {
                            'relativePath': relative_path,
                            'restUrl': f"api/{file.replace('.py', '')}"
                        }
        
        return test_object_data
    
    def extract_rest_url_from_file(self, file_path: str) -> Optional[str]:
        """Extract REST URL from file (placeholder implementation)"""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                # Simple extraction logic - can be enhanced based on file format
                if 'restUrl' in content:
                    # Extract URL pattern
                    lines = content.split('\n')
                    for line in lines:
                        if 'restUrl' in line and '=' in line:
                            return line.split('=')[1].strip().strip('"\'')
            return None
        except Exception as e:
            logger.error(f"Failed to extract REST URL from {file_path}: {e}")
            return None
    
    def get_dynamic_bearer_token(self, username: str, password: str) -> Optional[str]:
        """
        Get dynamic bearer token using AWS Cognito
        Migrated from getDynamicBearerToken method
        """
        try:
            user_pool_id = GlobalVars.G_USER_POOL_ID if hasattr(GlobalVars, 'G_USER_POOL_ID') else None
            client_id = GlobalVars.G_CLIENT_ID if hasattr(GlobalVars, 'G_CLIENT_ID') else None
            
            if not user_pool_id or not client_id:
                logger.warning("User Pool ID or Client ID not configured")
                return None
            
            logger.info(f"User Pool ID: {user_pool_id}")
            logger.info(f"Client ID: {client_id}")
            logger.info(f"Username: {username}")
            
            # Simulate Node.js execution for token generation
            # In real implementation, you would use boto3 or similar AWS SDK
            access_token = self._simulate_aws_cognito_auth(user_pool_id, client_id, username, password)
            
            logger.info(f"Access Token obtained: {access_token[:20] if access_token else 'None'}...")
            return access_token
            
        except Exception as e:
            logger.error(f"Failed to get dynamic bearer token: {e}")
            return None
    
    def _simulate_aws_cognito_auth(self, user_pool_id: str, client_id: str, 
                                 username: str, password: str) -> Optional[str]:
        """Simulate AWS Cognito authentication"""
        # This is a placeholder implementation
        # In real scenario, you would use boto3 to authenticate with AWS Cognito
        try:
            # Simulate token generation
            import hashlib
            import time
            
            # Create a simulated token based on user credentials and timestamp
            token_data = f"{username}:{password}:{user_pool_id}:{client_id}:{int(time.time())}"
            token_hash = hashlib.sha256(token_data.encode()).hexdigest()
            simulated_token = f"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.{token_hash[:50]}.signature"
            
            logger.info("Simulated AWS Cognito authentication successful")
            return simulated_token
            
        except Exception as e:
            logger.error(f"Simulated AWS Cognito authentication failed: {e}")
            return None
    
    def set_user_context(self, access_token: str) -> str:
        """
        Set user context and return cookie header
        Migrated from setUserContext1 method
        """
        try:
            # Simulate API call to save user context
            url = f"{GlobalVars.G_ENDPOINT}/{GlobalVars.G_USER_CONTEXT_RESOURCE}"
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = self.session.post(url, headers=headers, json={})
            
            logger.info(f"Set user context - Status Code: {response.status_code}")
            logger.info(f"Request URL: {url}")
            
            # Extract cookies from response
            cookie_header = ""
            if 'set-cookie' in response.headers:
                cookie_header = response.headers['set-cookie']
            elif response.cookies:
                cookie_parts = []
                for cookie in response.cookies:
                    cookie_parts.append(f"{cookie.name}={cookie.value}")
                cookie_header = "; ".join(cookie_parts)
            
            return cookie_header
            
        except Exception as e:
            logger.error(f"Failed to set user context: {e}")
            return ""
    
    def set_user_context_with_retry(self, access_token: str, max_retries: int = 3) -> str:
        """
        Set user context with retry mechanism
        Migrated from setUserContextMN method
        """
        delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempt {attempt + 1} - Setting user context")
                
                url = f"{GlobalVars.G_ENDPOINT}/{GlobalVars.G_USER_CONTEXT_RESOURCE}"
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                response = self.session.post(url, headers=headers, json={}, timeout=30)
                
                logger.info(f"Attempt {attempt + 1} - Status Code: {response.status_code}")
                
                if response.status_code != 504:  # Not Gateway Timeout
                    # Extract cookies
                    cookie_header = ""
                    if response.cookies:
                        cookie_parts = []
                        for cookie in response.cookies:
                            cookie_parts.append(f"{cookie.name}={cookie.value}")
                        cookie_header = "; ".join(cookie_parts)
                    
                    return cookie_header
                
                # If 504, wait and retry
                if attempt < max_retries - 1:
                    import time
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    import time
                    time.sleep(delay)
                    delay *= 2
        
        logger.warning("All attempts failed with 504 Gateway Timeout")
        return ""
    
    def execute_node_script(self, script_path: str, args: str) -> str:
        """Execute Node.js script and return output"""
        try:
            # Construct full path to script
            full_script_path = os.path.join(os.getcwd(), script_path)
            
            if not os.path.exists(full_script_path):
                logger.error(f"Node.js script not found: {full_script_path}")
                return ""
            
            # Execute Node.js script
            cmd = f"node {full_script_path} {args}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                logger.info("Node.js script executed successfully")
                return result.stdout.strip()
            else:
                logger.error(f"Node.js script failed: {result.stderr}")
                return ""
                
        except subprocess.TimeoutExpired:
            logger.error("Node.js script execution timed out")
            return ""
        except Exception as e:
            logger.error(f"Failed to execute Node.js script: {e}")
            return ""
    
    def build_authentication_headers(self, access_token: str, cookie_header: str = "") -> Dict[str, str]:
        """Build authentication headers for API requests"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if cookie_header:
            headers['Cookie'] = cookie_header
        
        return headers
    
    def close_session(self):
        """Close the requests session"""
        self.session.close()