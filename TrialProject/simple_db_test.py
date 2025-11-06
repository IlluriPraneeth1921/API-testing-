#!/usr/bin/env python3
"""
Simple Database Connection Test
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from config.global_variables import GlobalVars
import pyodbc

def test_connection():
    """Test database connection with SSL certificate fix"""
    
    print("SQL SERVER CONNECTION TEST")
    print("=" * 50)
    
    # Load configuration
    GlobalVars.load_config(environment="standard")
    
    server = GlobalVars.G_DB_SERVER_NAME
    database = GlobalVars.G_DB_NAME
    username = GlobalVars.G_DB_USERNAME
    password = GlobalVars.G_DB_PASSWORD
    
    print(f"Server: {server}")
    print(f"Database: {database}")
    print(f"Username: {username}")
    print()
    
    # Test with TrustServerCertificate=yes (fixes SSL issue)
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
        
        print("Testing connection with TrustServerCertificate=yes...")
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print(f"SUCCESS: Connection works! Test result: {result[0]}")
        
        # Test a real query
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES")
        table_count = cursor.fetchone()
        print(f"Database has {table_count[0]} tables")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    test_connection()