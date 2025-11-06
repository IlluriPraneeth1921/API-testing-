#!/usr/bin/env python3
"""
Test Runner with Comprehensive Reporting
Executes API tests and generates detailed HTML reports
"""

import pytest
import sys
import os
from datetime import datetime

def main():
    """Run tests with comprehensive HTML reporting"""
    
    # Ensure we're in the project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    # Create reports directory if it doesn't exist
    reports_dir = os.path.join(project_root, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Generate timestamp for unique report names
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Define report file paths
    html_report = os.path.join(reports_dir, f"test_report_{timestamp}.html")
    junit_report = os.path.join(reports_dir, f"junit_report_{timestamp}.xml")
    
    print("Starting Test Execution with Reporting...")
    print(f"HTML Report: {html_report}")
    print(f"JUnit Report: {junit_report}")
    print("-" * 60)
    
    # Pytest arguments for comprehensive reporting
    pytest_args = [
        # Test discovery
        "Scripts/API/AppointmentModule/",
        
        # Verbose output
        "-v",
        "-s",
        
        # HTML Report
        f"--html={html_report}",
        "--self-contained-html",
        
        # JUnit XML Report
        f"--junit-xml={junit_report}",
        
        # Show local variables in tracebacks
        "-l",
        
        # Show extra test summary info
        "-r", "A",
        
        # Capture output
        "--tb=short",
        
        # Show durations
        "--durations=10"
    ]
    
    # Run the tests
    exit_code = pytest.main(pytest_args)
    
    print("-" * 60)
    print("Test execution completed!")
    print(f"Reports generated in: {reports_dir}")
    print(f"Open {html_report} in your browser to view detailed results")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())