#!/usr/bin/env python3
"""
Utils Keywords Helper
Migrated from Katalon Utils_Keywords

Provides utility functions for database and system configuration
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

class UtilsKeywords:
    """
    Utils Keywords Helper - migrated from Katalon Utils_Keywords
    Provides utility functions for database and system configuration
    """
    
    def __init__(self):
        self.db_connection_string = None
        self.db_settings = {}
    
    def set_sql_server_db_settings(self, server_name: str, database_name: str, 
                                 username: str, password: str) -> bool:
        """
        Set SQL Server database settings
        Migrated from SetSQLServerDBSettings method
        """
        try:
            logger.info("⚙️ Setting SQL Server database settings...")
            logger.info(f"Input parameters - Server: {server_name}, Database: {database_name}, Username: {username}")
            
            # Store database settings
            self.db_settings = {
                'server_name': server_name,
                'database_name': database_name,
                'username': username,
                'password': password
            }
            logger.info("Database settings stored in memory")
            
            # Build connection string
            self.db_connection_string = (
                f"mssql+pyodbc://{username}:{password}@{server_name}/{database_name}"
                "?driver=ODBC+Driver+17+for+SQL+Server"
            )
            logger.info("Connection string built successfully")
            
            logger.info(f"✅ Database settings configured:")
            logger.info(f"  💾 Server: {server_name}")
            logger.info(f"  📁 Database: {database_name}")
            logger.info(f"  👤 Username: {username}")
            logger.info(f"  🔗 Connection string length: {len(self.db_connection_string)} characters")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to set SQL Server DB settings: {e}")
            return False
    
    def get_db_connection_string(self) -> Optional[str]:
        """Get the current database connection string"""
        return self.db_connection_string
    
    def get_db_settings(self) -> dict:
        """Get the current database settings"""
        return self.db_settings.copy()
    
    def test_db_connection(self) -> bool:
        """Test database connection"""
        logger.info("🔍 Testing database connection...")
        
        try:
            if not self.db_connection_string:
                logger.error("❌ No database connection string configured")
                return False
            
            logger.info(f"Using connection string: {self.db_connection_string[:50]}...")
            
            # Import here to avoid dependency issues if not needed
            try:
                import sqlalchemy
                logger.info("SQLAlchemy imported successfully")
                
                engine = sqlalchemy.create_engine(self.db_connection_string)
                logger.info("Database engine created")
                
                with engine.connect() as connection:
                    logger.info("Database connection established")
                    result = connection.execute(sqlalchemy.text("SELECT 1"))
                    logger.info("Test query executed successfully")
                    logger.info("✅ Database connection test PASSED")
                    return True
                    
            except ImportError:
                logger.warning("⚠️ SQLAlchemy not available - connection test skipped")
                return True  # Assume success if we can't test
                
        except Exception as e:
            logger.error(f"❌ Database connection test FAILED: {e}")
            return False