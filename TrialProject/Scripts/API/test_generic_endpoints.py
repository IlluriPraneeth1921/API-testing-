#!/usr/bin/env python3
"""
Generic Endpoints API Tests
Migrated from Katalon Generic API Test Cases

Tests all generic CRUD operations
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
import logging
from helper.api_helper import APIHelper
from Objects.API.generic_endpoints import GenericEndpoints
from config.global_variables import GlobalVars

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestGenericEndpoints:
    """Test class for Generic API Endpoints"""
    
    @pytest.fixture
    def api_setup(self):
        """Setup API helper and generic endpoints"""
        GlobalVars.load_config(environment="standard")
        api_helper = APIHelper(timeout=60)
        generic_api = GenericEndpoints()
        yield api_helper, generic_api
        api_helper.clear_session()
    
    def test_get_with_primary_key(self, api_setup):
        """Test GET request with primary key"""
        api_helper, generic_api = api_setup
        
        logger.info("=== TEST: GET with Primary Key ===")
        
        # Create request
        request = generic_api.get_with_primary_key(
            resource=GlobalVars.G_SERVICE_LIMIT_RESOURCE,
            primary_key="f8ebd203-36a6-4def-83c5-b06500dfc0ca"
        )
        
        # Build URL and send request
        url = generic_api.build_url(request)
        headers = generic_api.get_standard_headers()
        
        logger.info(f"Request URL: {url}")
        
        response = api_helper.get_request(url=url, headers=headers)
        
        # Verify response
        api_helper.assert_status_code(200)
        
        # Verify specific fields from Katalon verification script
        verification_rules = generic_api.get_verification_rules()
        for field_path, expected_value in verification_rules.items():
            api_helper.verify_json_field(field_path, expected_value)
        
        logger.info("✅ GET with Primary Key test passed")
    
    def test_get_without_primary_key(self, api_setup):
        """Test GET request without primary key"""
        api_helper, generic_api = api_setup
        
        logger.info("=== TEST: GET without Primary Key ===")
        
        request = generic_api.get_without_primary_key(
            resource=GlobalVars.G_SERVICE_LIMIT_RESOURCE
        )
        
        url = generic_api.build_url(request)
        headers = generic_api.get_standard_headers()
        
        response = api_helper.get_request(url=url, headers=headers)
        api_helper.assert_status_code(200)
        
        logger.info("✅ GET without Primary Key test passed")
    
    def test_post_without_primary_key(self, api_setup):
        """Test POST request without primary key"""
        api_helper, generic_api = api_setup
        
        logger.info("=== TEST: POST without Primary Key ===")
        
        test_data = {
            "name": "Test Resource",
            "description": "Test Description",
            "active": True
        }
        
        request = generic_api.post_without_primary_key(
            resource="test-resources",
            json_body=test_data
        )
        
        url = generic_api.build_url(request)
        headers = generic_api.get_standard_headers()
        
        response = api_helper.post_request(url=url, data=request.json_body, headers=headers)
        api_helper.assert_status_code(201)
        
        logger.info("✅ POST without Primary Key test passed")
    
    def test_put_with_primary_key(self, api_setup):
        """Test PUT request with primary key"""
        api_helper, generic_api = api_setup
        
        logger.info("=== TEST: PUT with Primary Key ===")
        
        test_data = {
            "name": "Updated Resource",
            "description": "Updated Description",
            "active": False
        }
        
        full_url = f"{GlobalVars.G_ENDPOINT}/test-resources/123"
        
        request = generic_api.put_with_primary_key(
            request_url=full_url,
            json_body=test_data
        )
        
        url = generic_api.build_url(request)
        headers = generic_api.get_standard_headers()
        
        response = api_helper.put_request(url=url, data=request.json_body, headers=headers)
        api_helper.assert_status_code(200)
        
        logger.info("✅ PUT with Primary Key test passed")
    
    def test_delete_with_primary_key(self, api_setup):
        """Test DELETE request with primary key"""
        api_helper, generic_api = api_setup
        
        logger.info("=== TEST: DELETE with Primary Key ===")
        
        request = generic_api.delete_with_primary_key(
            resource=GlobalVars.G_ORGANIZATION_FORM_ACTIVITY_INSTANCE_RESOURCE,
            primary_key="8D56E545-56C0-4712-95B1-AAFE00C381A9"
        )
        
        url = generic_api.build_url(request)
        headers = generic_api.get_standard_headers()
        
        response = api_helper.delete_request(url=url, headers=headers)
        api_helper.assert_status_code(204)
        
        logger.info("✅ DELETE with Primary Key test passed")

def run_standalone():
    """Run generic endpoints tests standalone"""
    print("Running Generic Endpoints API Tests")
    
    GlobalVars.load_config(environment="standard")
    api_helper = APIHelper(timeout=60)
    generic_api = GenericEndpoints()
    
    try:
        test_instance = TestGenericEndpoints()
        
        class MockFixture:
            def __init__(self, api_helper, generic_api):
                self.api_helper = api_helper
                self.generic_api = generic_api
            
            def __iter__(self):
                return iter([self.api_helper, self.generic_api])
        
        fixture = MockFixture(api_helper, generic_api)
        
        # Run tests
        print("\n1. Testing GET with Primary Key...")
        test_instance.test_get_with_primary_key(fixture)
        
        print("\n2. Testing GET without Primary Key...")
        test_instance.test_get_without_primary_key(fixture)
        
        print("\n3. Testing POST without Primary Key...")
        test_instance.test_post_without_primary_key(fixture)
        
        print("\n4. Testing PUT with Primary Key...")
        test_instance.test_put_with_primary_key(fixture)
        
        print("\n5. Testing DELETE with Primary Key...")
        test_instance.test_delete_with_primary_key(fixture)
        
        print("\n✅ All Generic Endpoints tests completed!")
        
    except Exception as e:
        print(f"❌ Tests failed: {e}")
        return 1
    finally:
        api_helper.clear_session()
    
    return 0

if __name__ == "__main__":
    exit_code = run_standalone()
    sys.exit(exit_code)