#!/usr/bin/env python3
"""
API Keywords Helper
Migrated from Katalon API_Keywords.groovy

Provides utility functions for API testing
"""

import random
import string
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger(__name__)

class APIKeywords:
    """
    API Keywords Helper - migrated from Katalon API_Keywords.groovy
    Provides utility functions for API testing and data manipulation
    """
    
    @staticmethod
    def random_alphanumeric(length: int) -> str:
        """Generate random alphanumeric string"""
        logger.info(f"Generating random alphanumeric string of length {length}")
        result = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
        logger.info(f"Generated alphanumeric string: {result}")
        return result
    
    @staticmethod
    def random_string(length: int) -> str:
        """Generate random alphabetic string"""
        logger.info(f"Generating random alphabetic string of length {length}")
        result = ''.join(random.choices(string.ascii_letters, k=length))
        logger.info(f"Generated alphabetic string: {result}")
        return result
    
    @staticmethod
    def random_number(length: int) -> str:
        """Generate random numeric string"""
        logger.info(f"Generating random numeric string of length {length}")
        result = ''.join(random.choices(string.digits, k=length))
        logger.info(f"Generated numeric string: {result}")
        return result
    
    @staticmethod
    def get_required_date(days: int, date_format: str = "%Y-%m-%d") -> str:
        """Get date with specified days offset"""
        logger.info(f"Calculating date with {days} days offset using format {date_format}")
        target_date = datetime.now() + timedelta(days=days)
        result = target_date.strftime(date_format)
        logger.info(f"Generated date: {result}")
        return result
    
    @staticmethod
    def get_response_text(response_text: str) -> Dict[str, Any]:
        """Convert JSON response text to dictionary"""
        logger.info("Converting JSON response text to dictionary")
        try:
            result = json.loads(response_text)
            logger.info(f"Successfully parsed JSON response with {len(result)} keys")
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            raise
    
    @staticmethod
    def verify_array_list_is_sorted(arr: List[Dict], sort_key: str, sort_type: str) -> bool:
        """Verify if array is sorted by specified key"""
        if len(arr) <= 1:
            return True
        
        is_ascending = sort_type.upper() in ["ASC", "ASCENDING"]
        
        for i in range(1, len(arr)):
            current_val = str(arr[i].get(sort_key, "")).replace("-", "")
            prev_val = str(arr[i-1].get(sort_key, "")).replace("-", "")
            
            if is_ascending:
                if current_val < prev_val:
                    return False
            else:
                if current_val > prev_val:
                    return False
        
        return True
    
    @staticmethod
    def verify_element_text_in_array_list(arr: List[Dict], element_name: str, 
                                        element_text: str, match_type: str) -> bool:
        """Verify element text in array list"""
        for item in arr:
            element_value = str(item.get(element_name, ""))
            
            if match_type.upper() == "CONTAINS":
                if element_text.lower() not in element_value.lower():
                    return False
            elif match_type.upper() == "EXACT":
                if element_value.lower() != element_text.lower():
                    return False
        
        return True
    
    @staticmethod
    def verify_response_status_response_body(response: requests.Response, 
                                           expected_status: int = 200) -> Optional[str]:
        """Verify response status and body for successful request"""
        logger.info(f"Verifying response status and body - Expected: {expected_status}, Actual: {response.status_code}")
        
        if response.status_code == expected_status:
            logger.info(f"✅ Status code verification PASSED: {response.status_code}")
            
            try:
                response_data = response.json()
                logger.info("Successfully parsed response JSON")
                
                # Verify standard response structure
                has_error = response_data.get('hasError', True)
                if not has_error:
                    logger.info("✅ Response indicates no errors")
                else:
                    logger.warning("⚠️ Response indicates errors present")
                
                response_messages = response_data.get('responseMessages', [])
                if not response_messages:
                    logger.info("✅ No response messages found")
                else:
                    logger.info(f"Response messages found: {len(response_messages)}")
                
                # Return model key if available
                model_key = response_data.get('model')
                if model_key:
                    logger.info(f"Model key extracted: {model_key}")
                else:
                    logger.warning("No model key found in response")
                return model_key
                
            except json.JSONDecodeError:
                logger.error("❌ Failed to parse response as JSON")
                return None
        else:
            logger.error(f"❌ Status code verification FAILED: Expected {expected_status}, got {response.status_code}")
            logger.error(f"Response text: {response.text}")
            return None
    
    @staticmethod
    def verify_multiple_strings_contains_in_response_body(response: requests.Response, 
                                                        strings_to_verify: str, 
                                                        is_regex: bool = False) -> bool:
        """Verify multiple strings contain in response body"""
        response_text = response.text
        
        if ";" in strings_to_verify:
            strings_list = strings_to_verify.split(";")
        else:
            strings_list = [strings_to_verify]
        
        for search_string in strings_list:
            search_string = search_string.strip()
            if is_regex:
                import re
                if not re.search(search_string, response_text):
                    return False
            else:
                if search_string not in response_text:
                    return False
        
        return True
    
    @staticmethod
    def get_with_key_verify_user_message_invalid_input(response: requests.Response, 
                                                      expected_status: int, 
                                                      log_message: str, 
                                                      user_message: str) -> bool:
        """Verify user message for invalid input in GET with key API"""
        if response.status_code == expected_status:
            logger.info(f"Valid response received with status code: {response.status_code}")
            
            response_text = response.text
            
            if "INVALID URL" in log_message.upper():
                return user_message in response_text
            elif "BLANK KEY" in log_message.upper():
                return user_message in response_text
            elif "INVALID KEY" in log_message.upper():
                try:
                    response_data = response.json()
                    has_error = response_data.get('hasError', False)
                    return has_error and user_message in response_text
                except json.JSONDecodeError:
                    return user_message in response_text
            
            return True
        else:
            logger.error(f"Unexpected status code: {response.status_code}")
            return False
    
    @staticmethod
    def refresh_browser():
        """Refresh browser - placeholder for web integration"""
        logger.info("Browser refresh requested (web integration required)")
    
    @staticmethod
    def login_with_parameters(credentials: Dict[str, str]) -> bool:
        """Login with parameters - placeholder for web integration"""
        logger.info(f"Login requested for user: {credentials.get('Username')}")
        logger.info("Web integration required for actual login")
        return True