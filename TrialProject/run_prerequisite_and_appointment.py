#!/usr/bin/env python3
"""
Run Prerequisite and Appointment Tests
Executes prerequisite setup followed by appointment tests with reporting
"""

import subprocess
import sys
import os
from datetime import datetime

def run_prerequisite():
    """Run the prerequisite database setup script"""
    print("=" * 60)
    print("STEP 1: Running API Prerequisite Setup")
    print("=" * 60)
    
    try:
        result = subprocess.run([
            sys.executable, 
            "Scripts/API/prerequisite/db_profile_settings_project_level.py"
        ], capture_output=True, text=True, cwd=os.getcwd())
        
        print("PREREQUISITE OUTPUT:")
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
            
        if result.returncode == 0:
            print("PASSED: Prerequisite setup completed successfully")
            return True
        else:
            print(f"FAILED: Prerequisite setup failed with exit code: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error running prerequisite: {e}")
        return False

def run_appointment_tests():
    """Run the appointment tests with reporting"""
    print("\n" + "=" * 60)
    print("STEP 2: Running Appointment Tests")
    print("=" * 60)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    reports_dir = "reports"
    os.makedirs(reports_dir, exist_ok=True)
    
    html_report = os.path.join(reports_dir, f"appointment_test_report_{timestamp}.html")
    junit_report = os.path.join(reports_dir, f"appointment_junit_report_{timestamp}.xml")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest",
            "Scripts/API/AppointmentModule/Appointment/test_609768_001_tc001_post_without_primary_key_success_request.py",
            "-v", "-s",
            f"--html={html_report}",
            "--self-contained-html",
            f"--junit-xml={junit_report}",
            "--tb=short"
        ], capture_output=True, text=True, cwd=os.getcwd())
        
        print("APPOINTMENT TEST OUTPUT:")
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
            
        print(f"\nReports generated:")
        print(f"  HTML: {html_report}")
        print(f"  JUnit: {junit_report}")
            
        if result.returncode == 0:
            print("PASSED: Appointment tests completed successfully")
            return True
        else:
            print(f"FAILED: Appointment tests failed with exit code: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error running appointment tests: {e}")
        return False

def main():
    """Main execution function"""
    print("Starting Prerequisite + Appointment Test Execution")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Run prerequisite
    prereq_success = run_prerequisite()
    
    # Step 2: Run appointment tests (regardless of prerequisite result)
    appointment_success = run_appointment_tests()
    
    # Summary
    print("\n" + "=" * 60)
    print("EXECUTION SUMMARY")
    print("=" * 60)
    print(f"Prerequisite Setup: {'PASSED' if prereq_success else 'FAILED'}")
    print(f"Appointment Tests:  {'PASSED' if appointment_success else 'FAILED'}")
    
    overall_success = prereq_success and appointment_success
    print(f"Overall Result:     {'SUCCESS' if overall_success else 'FAILURE'}")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())