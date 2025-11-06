#!/usr/bin/env python3
"""
API Test Case: User Login API Test
Migrated from Katalon API Test Case

Test Case: Validate user login via API endpoint
Purpose: Test API authentication and user login functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
import logging
from helper.api_helper import APIHelper
from Objects.API.user_api import UserAPI, UserCredentials
from config.global_variables import GlobalVars

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestUserLoginAPI:
    """Test class for User Login API validation"""
    
    @pytest.fixture
    def api_setup(self):
        """Setup API helper and user API object"""
        # Load configuration
        GlobalVars.load_config(environment="standard")
        
        # Initialize API components
        api_helper = APIHelper(timeout=30)
        user_api = UserAPI(GlobalVars.BASE_URL)
        
        yield api_helper, user_api
        
        # Cleanup
        api_helper.clear_session()
    
    def test_user_login_api_success(self, api_setup):
        """
        Test Case: Validate successful user login via API
        
        Steps:
        1. Prepare login credentials from global variables
        2. Send POST request to login endpoint
        3. Verify response status code (200)
        4. Verify response contains access token
        5. Verify user profile data in response
        """
        api_helper, user_api = api_setup
        
        # Step 1: Prepare login credentials
        logger.info("=== API TEST START: User Login Success ===")
        
        credentials = UserCredentials(
            username=GlobalVars.USERNAME,
            password=GlobalVars.PASSWORD,
            organization=GlobalVars.ORGANIZATION,
            location=GlobalVars.LOCATION,
            staff_member=GlobalVars.STAFF_MEMBER
        )
        
        logger.info(f"Test Environment: standard")
        logger.info(f"API Base URL: {GlobalVars.BASE_URL}")
        logger.info(f"Username: {credentials.username}")
        logger.info(f"Organization: {credentials.organization}")
        
        try:
            # Step 2: Send login request
            logger.info("Step 1: Sending login API request")
            
            login_url = user_api.get_endpoint('login')
            login_payload = user_api.get_login_payload(credentials)
            headers = user_api.get_user_headers()
            
            logger.info(f"Login URL: {login_url}")
            
            response = api_helper.post_request(
                url=login_url,
                data=login_payload,
                headers=headers
            )
            
            # Step 3: Verify response status code
            logger.info("Step 2: Verifying response status code")
            expected_status = user_api.get_expected_status_codes()['login_success']
            api_helper.assert_status_code(expected_status)
            
            # Step 4: Verify response contains access token
            logger.info("Step 3: Verifying response structure")
            response_data = api_helper.get_json_response()
            
            # Validate login response structure
            assert user_api.validate_login_response(response_data), "Invalid login response structure"
            
            # Parse login response
            login_data = user_api.parse_login_response(response_data)
            
            # Verify access token exists
            assert login_data['token'], "Access token not found in response"
            logger.info(f"✅ Access token received: {login_data['token'][:20]}...")
            
            # Step 5: Verify user profile data
            logger.info("Step 4: Verifying user profile data")
            
            if login_data['user_profile']:
                user_profile = user_api.create_user_profile(login_data['user_profile'])
                
                # Verify user profile fields
                assert user_profile.username == credentials.username, f"Username mismatch: expected {credentials.username}, got {user_profile.username}"
                assert user_profile.organization == credentials.organization, f"Organization mismatch: expected {credentials.organization}, got {user_profile.organization}"
                assert user_profile.is_active, "User should be active"
                
                logger.info(f"✅ User Profile Verified:")
                logger.info(f"  User ID: {user_profile.user_id}")
                logger.info(f"  Username: {user_profile.username}")
                logger.info(f"  Email: {user_profile.email}")
                logger.info(f"  Organization: {user_profile.organization}")
                logger.info(f"  Role: {user_profile.role}")
            
            # Additional API-specific validations
            logger.info("Step 5: Additional API validations")
            
            # Verify response time is acceptable (< 5 seconds)
            response_time = api_helper.get_response_time()
            assert response_time < 5.0, f"Response time too slow: {response_time}s"
            logger.info(f"✅ Response time acceptable: {response_time:.2f}s")
            
            # Verify token expiration is set
            assert login_data['expires_in'] > 0, "Token expiration not set"
            logger.info(f"✅ Token expires in: {login_data['expires_in']} seconds")
            
            logger.info("✅ PASS: User Login API test completed successfully")
            logger.info("=== API TEST COMPLETED ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: User Login API test failed - {str(e)}")
            logger.error(f"Response Status: {api_helper.last_response.status_code if api_helper.last_response else 'No response'}")
            logger.error(f"Response Body: {api_helper.last_response.text if api_helper.last_response else 'No response'}")
            logger.error("=== API TEST FAILED ===")
            raise
    
    def test_user_login_api_invalid_credentials(self, api_setup):
        """
        Test Case: Validate API response for invalid credentials
        
        Steps:
        1. Prepare invalid login credentials
        2. Send POST request to login endpoint
        3. Verify response status code (401)
        4. Verify error message in response
        """
        api_helper, user_api = api_setup
        
        logger.info("=== API TEST START: User Login Invalid Credentials ===")
        
        # Step 1: Prepare invalid credentials
        invalid_credentials = UserCredentials(
            username="invalid_user",
            password="wrong_password",
            organization=GlobalVars.ORGANIZATION,
            location=GlobalVars.LOCATION,
            staff_member=GlobalVars.STAFF_MEMBER
        )
        
        try:
            # Step 2: Send login request with invalid credentials
            logger.info("Step 1: Sending login request with invalid credentials")
            
            login_url = user_api.get_endpoint('login')
            login_payload = user_api.get_login_payload(invalid_credentials)
            headers = user_api.get_user_headers()
            
            response = api_helper.post_request(
                url=login_url,
                data=login_payload,
                headers=headers
            )
            
            # Step 3: Verify response status code is 401 (Unauthorized)
            logger.info("Step 2: Verifying unauthorized response")
            expected_status = user_api.get_expected_status_codes()['login_failure']
            api_helper.assert_status_code(expected_status)
            
            # Step 4: Verify error message
            logger.info("Step 3: Verifying error message")
            response_data = api_helper.get_json_response()
            
            # Check for error message
            assert 'error' in response_data or 'message' in response_data, "Error message not found in response"
            
            error_message = response_data.get('error', response_data.get('message', ''))
            logger.info(f"✅ Error message received: {error_message}")
            
            # Verify no access token is provided
            assert 'access_token' not in response_data, "Access token should not be provided for invalid credentials"
            
            logger.info("✅ PASS: Invalid credentials API test completed successfully")
            logger.info("=== API TEST COMPLETED ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: Invalid credentials API test failed - {str(e)}")
            logger.error("=== API TEST FAILED ===")
            raise
    
    def test_user_profile_api_with_token(self, api_setup):
        """
        Test Case: Validate user profile API with authentication token
        
        Steps:
        1. Login to get authentication token
        2. Use token to access user profile endpoint
        3. Verify profile data matches login credentials
        """
        api_helper, user_api = api_setup
        
        logger.info("=== API TEST START: User Profile with Token ===")
        
        credentials = UserCredentials(
            username=GlobalVars.USERNAME,
            password=GlobalVars.PASSWORD,
            organization=GlobalVars.ORGANIZATION,
            location=GlobalVars.LOCATION,
            staff_member=GlobalVars.STAFF_MEMBER
        )
        
        try:
            # Step 1: Login to get token
            logger.info("Step 1: Logging in to get authentication token")
            
            login_url = user_api.get_endpoint('login')
            login_payload = user_api.get_login_payload(credentials)
            headers = user_api.get_user_headers()
            
            login_response = api_helper.post_request(
                url=login_url,
                data=login_payload,
                headers=headers
            )
            
            api_helper.assert_status_code(200)
            login_data = user_api.parse_login_response(api_helper.get_json_response())
            token = login_data['token']
            
            logger.info(f"✅ Authentication token obtained: {token[:20]}...")
            
            # Step 2: Access user profile with token
            logger.info("Step 2: Accessing user profile endpoint with token")
            
            profile_url = user_api.get_endpoint('profile')
            auth_headers = user_api.get_user_headers(token)
            
            profile_response = api_helper.get_request(
                url=profile_url,
                headers=auth_headers
            )
            
            # Step 3: Verify profile response
            logger.info("Step 3: Verifying user profile response")
            
            api_helper.assert_status_code(200)
            profile_data = api_helper.get_json_response()
            
            # Create user profile object
            user_profile = user_api.create_user_profile(profile_data)
            
            # Verify profile matches credentials
            assert user_profile.username == credentials.username, "Profile username mismatch"
            assert user_profile.organization == credentials.organization, "Profile organization mismatch"
            
            logger.info(f"✅ User Profile API Verified:")
            logger.info(f"  User ID: {user_profile.user_id}")
            logger.info(f"  Username: {user_profile.username}")
            logger.info(f"  Email: {user_profile.email}")
            logger.info(f"  Full Name: {user_profile.first_name} {user_profile.last_name}")
            logger.info(f"  Organization: {user_profile.organization}")
            logger.info(f"  Location: {user_profile.location}")
            logger.info(f"  Role: {user_profile.role}")
            logger.info(f"  Active: {user_profile.is_active}")
            
            logger.info("✅ PASS: User Profile API test completed successfully")
            logger.info("=== API TEST COMPLETED ===")
            
        except Exception as e:
            logger.error(f"❌ FAIL: User Profile API test failed - {str(e)}")
            logger.error("=== API TEST FAILED ===")
            raise

def run_standalone():
    """Run API tests standalone without pytest"""
    print("Running API Test Migration - User Login API Tests")
    
    # Load configuration
    GlobalVars.load_config(environment="standard")
    
    # Initialize API components
    api_helper = APIHelper(timeout=30)
    user_api = UserAPI(GlobalVars.BASE_URL)
    
    try:
        test_instance = TestUserLoginAPI()
        
        # Create mock fixture
        class MockFixture:
            def __init__(self, api_helper, user_api):
                self.api_helper = api_helper
                self.user_api = user_api
            
            def __iter__(self):
                return iter([self.api_helper, self.user_api])
        
        fixture = MockFixture(api_helper, user_api)
        
        # Run tests
        print("\n1. Running successful login API test...")
        test_instance.test_user_login_api_success(fixture)
        
        print("\n2. Running invalid credentials API test...")
        test_instance.test_user_login_api_invalid_credentials(fixture)
        
        print("\n3. Running user profile API test...")
        test_instance.test_user_profile_api_with_token(fixture)
        
        print("\n✅ All API tests completed successfully!")
        
    except Exception as e:
        print(f"❌ API tests failed: {e}")
        return 1
    finally:
        api_helper.clear_session()
    
    return 0

if __name__ == "__main__":
    exit_code = run_standalone()
    sys.exit(exit_code)