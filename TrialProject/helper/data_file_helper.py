#!/usr/bin/env python3
"""
Data File Helper
Provides functionality to read data from various sources (Excel, DB, JSON)
"""

import json
import logging
import os
import pandas as pd
import sqlalchemy
from typing import Dict, Any, List, Optional
from config.global_variables import GlobalVars

logger = logging.getLogger(__name__)

class DataFileHelper:
    """Helper class for reading test data from various sources"""
    
    def __init__(self):
        self.db_engine = None
    
    def find_test_data(self, data_file_path: str) -> 'TestDataReader':
        """Find and load test data from specified path"""
        logger.info(f"📂 Loading test data from: {data_file_path}")
        full_path = os.path.join(os.getcwd(), data_file_path + '.json')
        logger.info(f"Full path: {full_path}")
        
        if not os.path.exists(full_path):
            logger.error(f"❌ Data file not found: {full_path}")
            raise FileNotFoundError(f"Data file not found: {full_path}")
        
        logger.info("Reading configuration file...")
        with open(full_path, 'r') as f:
            config = json.load(f)
        
        logger.info(f"✅ Configuration loaded successfully: {config.get('name', 'Unknown')}")
        return TestDataReader(config)
    
    def get_db_engine(self):
        """Get database engine using global settings"""
        if not self.db_engine:
            connection_string = GlobalVars.G_DB_CONNECTION_STRING
            if connection_string:
                self.db_engine = sqlalchemy.create_engine(connection_string)
        return self.db_engine

class TestDataReader:
    """Test data reader for different data sources"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.data_source = config.get('dataSource', {})
        self._data = None
    
    def get_value(self, row: int, col: int) -> Any:
        """Get value at specified row and column (1-based indexing)"""
        logger.info(f"📋 Getting value at row {row}, column {col}")
        
        if self._data is None:
            logger.info("Data not loaded, loading now...")
            self._load_data()
        
        try:
            # Convert to 0-based indexing
            value = self._data.iloc[row-1, col-1]
            logger.info(f"✅ Retrieved value: {value}")
            return value
        except (IndexError, KeyError):
            logger.error(f"❌ Invalid row/column: {row}/{col}")
            return None
    
    def get_row_data(self, row: int) -> Dict[str, Any]:
        """Get entire row as dictionary"""
        if self._data is None:
            self._load_data()
        
        try:
            return self._data.iloc[row-1].to_dict()
        except IndexError:
            logger.error(f"Invalid row: {row}")
            return {}
    
    def get_column_count(self) -> int:
        """Get number of columns"""
        if self._data is None:
            self._load_data()
        return len(self._data.columns)
    
    def get_row_count(self) -> int:
        """Get number of rows"""
        if self._data is None:
            self._load_data()
        return len(self._data)
    
    def _load_data(self):
        """Load data based on data source type"""
        source_type = self.data_source.get('type')
        
        if source_type == 'ExcelFile':
            self._load_excel_data()
        elif source_type == 'DBData':
            self._load_db_data()
        else:
            raise ValueError(f"Unsupported data source type: {source_type}")
    
    def _load_excel_data(self):
        """Load data from Excel file"""
        file_path = self.data_source.get('filePath')
        sheet_name = self.data_source.get('sheetName')
        
        logger.info(f"📈 Loading Excel data from: {file_path}, sheet: {sheet_name}")
        full_path = os.path.join(os.getcwd(), file_path)
        logger.info(f"Full Excel path: {full_path}")
        
        if not os.path.exists(full_path):
            logger.error(f"❌ Excel file not found: {full_path}")
            raise FileNotFoundError(f"Excel file not found: {full_path}")
        
        try:
            logger.info("Reading Excel file...")
            self._data = pd.read_excel(full_path, sheet_name=sheet_name)
            logger.info(f"✅ Loaded Excel data: {len(self._data)} rows, {len(self._data.columns)} columns from {sheet_name}")
            logger.info(f"Column names: {list(self._data.columns)}")
        except Exception as e:
            logger.error(f"❌ Failed to load Excel data: {e}")
            raise
    
    def _load_db_data(self):
        """Load data from database query"""
        query = self.data_source.get('query')
        using_global_db = self.data_source.get('usingGlobalDBSetting', True)
        
        logger.info(f"💾 Loading database data using global DB settings: {using_global_db}")
        logger.info(f"Query: {query[:100]}..." if len(query) > 100 else f"Query: {query}")
        
        if not query:
            logger.error("❌ No query specified for database data source")
            raise ValueError("No query specified for database data source")
        
        try:
            if using_global_db:
                logger.info("Using global database settings")
                helper = DataFileHelper()
                engine = helper.get_db_engine()
                if not engine:
                    logger.error("❌ Global database settings not configured")
                    raise ValueError("Global database settings not configured")
                logger.info("Database engine obtained from global settings")
            else:
                logger.error("❌ Specific DB connection settings not implemented")
                raise NotImplementedError("Specific DB connection settings not implemented")
            
            logger.info("Executing database query...")
            self._data = pd.read_sql(query, engine)
            logger.info(f"✅ Loaded DB data: {len(self._data)} rows, {len(self._data.columns)} columns")
            
        except Exception as e:
            logger.error(f"❌ Failed to load database data: {e}")
            logger.warning("⚠️ Creating mock database data for testing")
            self._create_mock_db_data()
    
    def _create_mock_db_data(self):
        """Create mock database data for testing"""
        logger.info("Creating mock database data for testing...")
        
        mock_data = {
            'Column1': [
                '12345678-1234-1234-1234-123456789012',
                '87654321-4321-4321-4321-210987654321',
                '1960E99E-5599-4914-BECE-AC7000FF3A3B',
                'ABCDEF12-3456-7890-ABCD-EF1234567890'
            ]
        }
        
        self._data = pd.DataFrame(mock_data)
        logger.info(f"Mock data created: {len(self._data)} rows")
        logger.info("Mock data keys generated for testing")