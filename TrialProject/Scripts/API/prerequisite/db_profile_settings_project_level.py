#!/usr/bin/env python3
"""
DB Profile Settings Project Level
Migrated from Katalon Script: DB_ProfileSettings_ProjectLevel

Purpose: Set SQL Server database settings for project-level configuration
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

import logging
from helper.utils_keywords import UtilsKeywords
from config.global_variables import GlobalVars

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_db_profile_settings():
    """
    Set SQL Server database settings for project-level configuration
    Equivalent to Katalon CustomKeywords.'com.Utils.Utils_Keywords.SetSQLServerDBSettings'
    """
    try:
        logger.info("=== Setting up DB Profile Settings - Project Level ===")
        
        # Load configuration
        GlobalVars.load_config(environment="standard")
        
        # Get database configuration
        db_server_name = GlobalVars.G_DB_SERVER_NAME
        db_name = GlobalVars.G_DB_NAME
        db_username = GlobalVars.G_DB_USERNAME
        db_password = GlobalVars.G_DB_PASSWORD
        
        logger.info(f"DB Server: {db_server_name}")
        logger.info(f"DB Name: {db_name}")
        logger.info(f"DB Username: {db_username}")
        
        # Set SQL Server DB settings using Utils Keywords
        utils = UtilsKeywords()
        utils.set_sql_server_db_settings(
            server_name=db_server_name,
            database_name=db_name,
            username=db_username,
            password=db_password
        )
        
        logger.info("✅ DB Profile Settings configured successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to setup DB Profile Settings: {str(e)}")
        raise

def main():
    """Main execution function"""
    setup_db_profile_settings()

if __name__ == "__main__":
    main()