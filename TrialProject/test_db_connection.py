#!/usr/bin/env python3
"""
Database Connection Test Script
Tests SQL Server connection and identifies login issues
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from config.global_variables import GlobalVars
import pyodbc
import sqlalchemy
from urllib.parse import quote_plus

def test_sql_server_connection():
    """Test SQL Server connection with detailed error reporting"""
    
    print("=" * 60)
    print("SQL SERVER CONNECTION TEST")
    print("=" * 60)
    
    # Load configuration
    GlobalVars.load_config(environment="standard")
    
    server = GlobalVars.G_DB_SERVER_NAME
    database = GlobalVars.G_DB_NAME
    username = GlobalVars.G_DB_USERNAME
    password = GlobalVars.G_DB_PASSWORD
    
    print(f"Server: {server}")
    print(f"Database: {database}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password)}")
    print()
    
    # Test 1: Direct pyodbc connection
    print("TEST 1: Direct pyodbc connection")
    print("-" * 40)
    
    try:
        # Build connection string for pyodbc
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
            f"Connection Timeout=30;"
        )
        
        print(f"Connection String: {conn_str.replace(password, '*' * len(password))}")
        
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print(f"✅ SUCCESS: Direct pyodbc connection works! Result: {result[0]}")
        conn.close()
        
    except Exception as e:
        print(f"❌ FAILED: Direct pyodbc connection failed")
        print(f"Error: {str(e)}")
        print()
    
    # Test 2: SQLAlchemy connection
    print("TEST 2: SQLAlchemy connection")
    print("-" * 40)
    
    try:
        # URL encode password for special characters
        encoded_password = quote_plus(password)
        
        # Build SQLAlchemy connection string
        sqlalchemy_conn_str = (
            f"mssql+pyodbc://{username}:{encoded_password}@{server}:1433/{database}"
            f"?driver=ODBC+Driver+17+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
        )
        
        print(f"SQLAlchemy String: {sqlalchemy_conn_str.replace(encoded_password, '*' * len(password))}")
        
        engine = sqlalchemy.create_engine(sqlalchemy_conn_str)
        with engine.connect() as connection:
            result = connection.execute(sqlalchemy.text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"✅ SUCCESS: SQLAlchemy connection works! Result: {row[0]}")
            
    except Exception as e:
        print(f"❌ FAILED: SQLAlchemy connection failed")
        print(f"Error: {str(e)}")
        print()
    
    # Test 3: Connection without encryption
    print("TEST 3: Connection without encryption")
    print("-" * 40)
    
    try:
        conn_str_no_encrypt = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            f"Encrypt=no;"
            f"Connection Timeout=30;"
        )
        
        conn = pyodbc.connect(conn_str_no_encrypt)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print(f"✅ SUCCESS: Connection without encryption works! Result: {result[0]}")
        conn.close()
        
    except Exception as e:
        print(f"❌ FAILED: Connection without encryption failed")
        print(f"Error: {str(e)}")
        print()
    
    # Test 4: Check ODBC drivers
    print("TEST 4: Available ODBC drivers")
    print("-" * 40)
    
    try:
        drivers = pyodbc.drivers()
        print("Available ODBC drivers:")
        for driver in drivers:
            if 'SQL Server' in driver:
                print(f"  ✅ {driver}")
        
        if not any('SQL Server' in driver for driver in drivers):
            print("❌ No SQL Server ODBC drivers found!")
            
    except Exception as e:
        print(f"❌ Error checking drivers: {e}")

if __name__ == "__main__":
    test_sql_server_connection()