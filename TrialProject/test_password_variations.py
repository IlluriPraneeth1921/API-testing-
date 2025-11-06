#!/usr/bin/env python3
"""
Test different password variations
"""

import pyodbc
import base64

def test_passwords():
    """Test different password variations"""
    
    server = "mcs-mst-carity-v1-697a8-appdb.cqgoe5gpkllx.us-east-1.rds.amazonaws.com"
    database = "Standard.F1.Carity"
    username = "v.bonagiri"
    
    # Different password variations to try
    passwords = [
        "TmVudW5ha3VAMTM1",  # Original base64
        "Nenunaku@135",      # Decoded
        base64.b64decode("TmVudW5ha3VAMTM1").decode('utf-8'),  # Double check decode
    ]
    
    print("Testing different password variations...")
    print("=" * 50)
    
    for i, password in enumerate(passwords, 1):
        print(f"\nTest {i}: Password = '{password}'")
        
        try:
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={server};"
                f"DATABASE={database};"
                f"UID={username};"
                f"PWD={password};"
                f"Encrypt=yes;"
                f"TrustServerCertificate=yes;"
                f"Connection Timeout=30;"
            )
            
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print(f"SUCCESS: Connected with password '{password}'")
            conn.close()
            return password
            
        except Exception as e:
            error_msg = str(e)
            if "Login failed" in error_msg:
                print(f"FAILED: Login failed for password '{password}'")
            else:
                print(f"ERROR: {error_msg}")
    
    print("\nAll password variations failed.")
    return None

if __name__ == "__main__":
    test_passwords()