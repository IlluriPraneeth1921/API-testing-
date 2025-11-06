#!/usr/bin/env python3
"""
Test runner for BDD tests
"""
import subprocess
import sys
import os

def run_tests(test_type="all", tags=None, headless=False):
    """Run BDD tests with options"""
    
    # Base command
    cmd = ["python", "-m", "pytest"]
    
    # Add test paths
    if test_type == "login":
        cmd.extend(["step_definitions/login_steps.py"])
    elif test_type == "forms":
        cmd.extend(["step_definitions/forms_steps.py"])
    else:
        cmd.extend(["step_definitions/"])
    
    # Add markers/tags
    if tags:
        cmd.extend(["-m", tags])
    
    # Add verbose output
    cmd.extend(["-v", "--tb=short"])
    
    # Set environment variables
    env = os.environ.copy()
    if headless:
        env["HEADLESS"] = "true"
    
    print(f"Running command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, env=env, check=False)
        return result.returncode
    except Exception as e:
        print(f"Error running tests: {e}")
        return 1

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run BDD tests")
    parser.add_argument("--type", choices=["all", "login", "forms"], 
                       default="all", help="Type of tests to run")
    parser.add_argument("--tags", help="Test tags/markers to run")
    parser.add_argument("--headless", action="store_true", 
                       help="Run in headless mode")
    
    args = parser.parse_args()
    
    exit_code = run_tests(args.type, args.tags, args.headless)
    sys.exit(exit_code)