#!/usr/bin/env python3
"""
Comprehensive API Test Suite Runner
Executes all API tests and generates detailed reports
"""

import pytest
import sys
import os
from datetime import datetime
import json

def main():
    """Run all API tests with comprehensive reporting"""
    
    # Ensure we're in the project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    # Create reports directory if it doesn't exist
    reports_dir = os.path.join(project_root, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Generate timestamp for unique report names
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Define report file paths
    html_report = os.path.join(reports_dir, f"api_test_suite_report_{timestamp}.html")
    junit_report = os.path.join(reports_dir, f"api_junit_report_{timestamp}.xml")
    json_report = os.path.join(reports_dir, f"api_json_report_{timestamp}.json")
    
    print("Starting API Test Suite Execution...")
    print(f"HTML Report: {html_report}")
    print(f"JUnit Report: {junit_report}")
    print(f"JSON Report: {json_report}")
    print("-" * 80)
    
    # Pytest arguments for comprehensive reporting
    pytest_args = [
        # Test discovery - all API tests
        "Scripts/API/",
        
        # Verbose output
        "-v",
        "-s",
        
        # HTML Report with enhanced features
        f"--html={html_report}",
        "--self-contained-html",
        
        # JUnit XML Report
        f"--junit-xml={junit_report}",
        
        # JSON Report
        f"--json-report",
        f"--json-report-file={json_report}",
        
        # Show local variables in tracebacks
        "-l",
        
        # Show extra test summary info
        "-r", "A",
        
        # Capture output
        "--tb=short",
        
        # Show durations
        "--durations=0",
        
        # Continue on first failure for comprehensive reporting
        "--maxfail=10"
    ]
    
    # Run the tests
    print("Executing API test suite...")
    exit_code = pytest.main(pytest_args)
    
    # Generate summary
    print("-" * 80)
    print("API Test Suite Execution Completed!")
    print(f"Exit Code: {exit_code}")
    print(f"Reports Location: {reports_dir}")
    print(f"HTML Report: file:///{html_report.replace(os.sep, '/')}")
    
    # Try to read and display JSON report summary
    try:
        if os.path.exists(json_report):
            with open(json_report, 'r') as f:
                report_data = json.load(f)
                summary = report_data.get('summary', {})
                print("\nTest Summary:")
                print(f"  Total Tests: {summary.get('total', 0)}")
                print(f"  Passed: {summary.get('passed', 0)}")
                print(f"  Failed: {summary.get('failed', 0)}")
                print(f"  Skipped: {summary.get('skipped', 0)}")
                print(f"  Duration: {summary.get('duration', 0):.2f}s")
    except Exception as e:
        print(f"Could not read JSON report: {e}")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())