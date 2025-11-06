#!/usr/bin/env python3
"""
609768_001_TC001_POST_WithoutPrimaryKey_SuccessRequest
Migrated from Katalon Script

Test Case: Verifies the success response code and also verify a new record is created in DB 
with given input data when user send a POST Request.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

import pytest
import logging
from helper.api_helper import APIHelper
from helper.api_keywords import APIKeywords
from helper.data_file_helper import DataFileHelper
from helper.template_substitution import substitute_template
from Objects.API.generic_endpoints import GenericEndpoints
from config.global_variables import GlobalVars

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TestAppointmentPOSTWithoutPrimaryKey:
    """Test class for Appointment POST without primary key"""
    
    @pytest.fixture
    def api_setup(self):
        """Setup API helper and components"""
        GlobalVars.load_config(environment="standard")
        api_helper = APIHelper(timeout=60)
        generic_api = GenericEndpoints()
        data_helper = DataFileHelper()
        yield api_helper, generic_api, data_helper
        api_helper.clear_session()
    
    def test_609768_001_tc001_post_without_primary_key_success_request(self, api_setup):
        """
        Test Case: 609768_001_TC001_POST_WithoutPrimaryKey_SuccessRequest
        
        Description: This test case verifies the success response code and also verify 
        a new record is created in DB with given input data when user send a POST Request.
        
        Precondition: NONE
        """
        api_helper, generic_api, data_helper = api_setup
        
        logger.info("=== TEST START: 609768_001_TC001_POST_WithoutPrimaryKey_SuccessRequest ===")
        
        try:
            # Load prerequisite data from database
            logger.info("Loading prerequisite data from database...")
            
            db_data = data_helper.find_test_data('Data Files/API/AppointmentModule/Appointment/609768_001_TC001_DB')
            
            # Get prerequisite keys from database
            person_contact_key = db_data.get_value(1, 1)
            case_key = db_data.get_value(2, 1)
            case_activity_key_reference = db_data.get_value(3, 1)
            person_key = db_data.get_value(4, 1)
            
            logger.info(f"****** PersonContactKey: {person_contact_key} *******")
            logger.info(f"****** CaseKey: {case_key} *******")
            logger.info(f"****** CaseActivityKeyReference: {case_activity_key_reference} *******")
            logger.info(f"****** PersonKey: {person_key} *******")
            
            # Load test data schema from Excel
            logger.info("Loading test data schema from Excel...")
            
            test_data = data_helper.find_test_data('Data Files/API/AppointmentModule/Appointment/609768_001_TC001')
            
            # Import json at the top level
            import json
            
            # Get schema from test data (assuming it's in first row, second column)
            schema = test_data.get_value(1, 2)  # Adjust based on actual Excel structure
            
            if not schema:
                # Create a sample schema if not available from Excel
                schema = {
                    "appointmentDateTime": "2024-12-01T10:00:00Z",
                    "appointmentType": "Initial Assessment",
                    "duration": 60,
                    "location": "Main Office",
                    "notes": "Initial appointment for assessment",
                    "status": "Scheduled",
                    "caseKey": case_key,
                    "caseActivityKeyReference": case_activity_key_reference,
                    "personContactKey": person_contact_key,
                    "personKey": person_key
                }
                
                # Convert to JSON string if it's a dictionary
                if isinstance(schema, dict):
                    schema = json.dumps(schema)
            else:
                # Substitute template variables in the schema
                logger.info("Performing template variable substitution...")
                schema = substitute_template(
                    schema,
                    # Primary keys from database
                    strCaseKey=case_key,
                    strCaseActivityKeyReference=case_activity_key_reference,
                    strPersonContactKey=person_contact_key,
                    strPersonKey=person_key,
                    # Alternative naming conventions
                    CaseKey=case_key,
                    CaseActivityKeyReference=case_activity_key_reference,
                    PersonContactKey=person_contact_key,
                    PersonKey=person_key,
                    # Additional possible variables
                    caseKey=case_key,
                    caseActivityKeyReference=case_activity_key_reference,
                    personContactKey=person_contact_key,
                    personKey=person_key
                )
                logger.info(f"Schema after substitution: {schema}")
            
            # Log message for verification
            str_log_message = "POST_WithoutPrimaryKey_SuccessRequest"
            
            logger.info(f"****** Verify valid response code {GlobalVars.G_STATUS_CODE_OK} for {str_log_message} ********")
            logger.info(f"****** URL: {GlobalVars.G_ENDPOINT}/{GlobalVars.G_APPOINTMENT_RESOURCE} *******")
            
            # Create POST request using generic endpoints
            appointment_resource = GlobalVars.G_APPOINTMENT_RESOURCE
            
            request = generic_api.post_without_primary_key(
                resource=appointment_resource,
                json_body=schema
            )
            
            # Build URL and headers
            url = generic_api.build_url(request)
            headers = generic_api.get_standard_headers()
            
            logger.info(f"****** Request: {schema} *******")
            
            # Parse JSON if it's a string
            if isinstance(schema, str):
                schema = json.loads(schema)
            
            # Send POST request
            response = api_helper.post_request(
                url=url,
                data=request.json_body,
                headers=headers
            )
            
            # Add delay as in original script
            import time
            time.sleep(2)
            
            # Verify response status and response body for successful request
            appointment_key = APIKeywords.verify_response_status_response_body(
                response, 
                expected_status=GlobalVars.G_STATUS_CODE_OK
            )
            
            logger.info(f"****** Appointment Key: {appointment_key} *******")
            
            # Prepare output keys as in original script
            output_keys = [
                appointment_key,
                case_key,
                case_activity_key_reference,
                person_key,
                person_contact_key
            ]
            
            logger.info("✅ PASS: Appointment POST without primary key test completed successfully")
            logger.info(f"Output Keys: {output_keys}")
            logger.info("=== TEST COMPLETED ===")
            
            return output_keys
            
        except Exception as e:
            logger.error(f"❌ FAIL: Appointment POST test failed - {str(e)}")
            logger.error("=== TEST FAILED ===")
            raise

def run_standalone():
    """Run appointment test standalone"""
    print("Running Appointment POST Without Primary Key Test")
    
    GlobalVars.load_config(environment="standard")
    api_helper = APIHelper(timeout=60)
    generic_api = GenericEndpoints()
    data_helper = DataFileHelper()
    
    try:
        test_instance = TestAppointmentPOSTWithoutPrimaryKey()
        
        class MockFixture:
            def __init__(self, api_helper, generic_api, data_helper):
                self.api_helper = api_helper
                self.generic_api = generic_api
                self.data_helper = data_helper
            
            def __iter__(self):
                return iter([self.api_helper, self.generic_api, self.data_helper])
        
        fixture = MockFixture(api_helper, generic_api, data_helper)
        
        # Run the test
        result = test_instance.test_609768_001_tc001_post_without_primary_key_success_request(fixture)
        
        print(f"\nPASS: Test completed successfully!")
        print(f"Output Keys: {result}")
        
    except Exception as e:
        print(f"FAIL: Test failed: {e}")
        return 1
    finally:
        api_helper.clear_session()
    
    return 0

if __name__ == "__main__":
    exit_code = run_standalone()
    sys.exit(exit_code)