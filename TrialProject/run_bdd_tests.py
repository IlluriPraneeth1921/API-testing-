#!/usr/bin/env python3
"""
BDD Test runner using pytest (without pytest-bdd dependency)
"""
import subprocess
import sys
import os

def run_bdd_tests(test_type="all", markers=None, headless=False):
    """Run BDD-style tests with options"""
    
    # Base command
    cmd = ["python", "-m", "pytest"]
    
    # Add test files
    if test_type == "login":
        cmd.extend(["test_login_bdd.py"])
    elif test_type == "forms":
        cmd.extend(["test_forms_bdd.py"])
    elif test_type == "dashboard":
        cmd.extend(["test_dashboard_bdd.py"])
    elif test_type == "advanced":
        cmd.extend(["test_advanced_bdd.py"])
    else:
        cmd.extend(["test_login_bdd.py", "test_forms_bdd.py", "test_dashboard_bdd.py", "test_advanced_bdd.py"])
    
    # Add markers
    if markers:
        cmd.extend(["-m", markers])
    
    # Add verbose output
    cmd.extend(["-v", "-s"])
    
    # Set environment variables
    env = os.environ.copy()
    if headless:
        env["HEADLESS"] = "true"
    
    print(f"Running BDD tests: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, env=env, check=False)
        return result.returncode
    except Exception as e:
        print(f"Error running tests: {e}")
        return 1

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run BDD-style tests")
    parser.add_argument("--type", choices=["all", "login", "forms", "dashboard", "advanced"], 
                       default="all", help="Type of tests to run")
    parser.add_argument("--markers", help="Test markers to run")
    parser.add_argument("--headless", action="store_true", 
                       help="Run in headless mode")
    
    args = parser.parse_args()
    
    exit_code = run_bdd_tests(args.type, args.markers, args.headless)
    sys.exit(exit_code)