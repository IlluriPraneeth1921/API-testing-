import pyodbc
import json

def test_sql_connectivity():
    """Test SQL Server connectivity with Windows authentication"""
    
    # Load config
    with open('config/api_profile.json', 'r') as f:
        config = json.load(f)
    
    db_config = config['environments']['api_f1']['database']
    
    # Connection string for Windows authentication
    conn_str = f"""
    DRIVER={{ODBC Driver 17 for SQL Server}};
    SERVER={db_config['server_name']};
    DATABASE={db_config['database_name']};
    Trusted_Connection=yes;
    """
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT 1 as test_connection")
        result = cursor.fetchone()
        
        print("[SUCCESS] SQL Server connection successful")
        print(f"[SUCCESS] Connected to: {db_config['database_name']}")
        print(f"[SUCCESS] Test query result: {result[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"[FAILED] Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_sql_connectivity()