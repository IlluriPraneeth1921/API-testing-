#!/usr/bin/env python3
"""
Check if password is base64 encoded
"""

import base64
import sys
import os
sys.path.append(os.path.dirname(__file__))

from config.global_variables import GlobalVars

def check_password():
    """Check if password needs decoding"""
    
    GlobalVars.load_config(environment="standard")
    password = GlobalVars.G_DB_PASSWORD
    
    print(f"Original password: {password}")
    
    # Check if it's base64 encoded
    try:
        decoded = base64.b64decode(password).decode('utf-8')
        print(f"Base64 decoded: {decoded}")
        
        # Check if decoded makes sense
        if decoded.isprintable() and len(decoded) > 0:
            print("Password appears to be base64 encoded!")
            return decoded
        else:
            print("Password is not base64 encoded")
            return password
            
    except Exception as e:
        print(f"Not base64 encoded: {e}")
        return password

if __name__ == "__main__":
    check_password()