#!/usr/bin/env python3
"""
Node Executor Helper
Migrated from Katalon NodeExecutor.groovy

Purpose: Execute Node.js scripts from Python tests, primarily for AWS Cognito authentication
"""

import os
import sys
import subprocess
import logging
from typing import Optional

# Configure logging
logger = logging.getLogger(__name__)

class NodeExecutor:
    """Helper class to execute Node.js scripts from Python tests"""
    
    def __init__(self, project_root: str = None):
        """Initialize NodeExecutor with project root path"""
        if project_root is None:
            # Get project root from current file location
            self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        else:
            self.project_root = project_root
        
        logger.info(f"🔧 NodeExecutor initialized with project root: {self.project_root}")
    
    def run_node_program(self, script_relative_path: str, args: str = "") -> Optional[str]:
        """
        Execute a Node.js script with arguments
        
        Args:
            script_relative_path (str): Relative path to the Node.js script from Include/scripts/node/
            args (str): Command line arguments to pass to the script
            
        Returns:
            str: Output from the Node.js script, or None if execution failed
        """
        try:
            logger.info(f"🚀 Executing Node.js script: {script_relative_path}")
            logger.info(f"📝 Arguments: {args}")
            
            # Build script path
            script_path = os.path.join(self.project_root, "Include", "scripts", "node", script_relative_path)
            
            # Normalize path for Windows
            script_path = os.path.normpath(script_path)
            
            logger.info(f"📂 Full script path: {script_path}")
            
            # Check if script exists
            if not os.path.exists(script_path):
                logger.error(f"❌ Script not found: {script_path}")
                return None
            
            # Build command
            if args.strip():
                command = f"node \"{script_path}\" {args}"
            else:
                command = f"node \"{script_path}\""
            
            logger.info(f"⚡ Executing command: {command}")
            
            # Execute the command
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=self.project_root
            )
            
            # Get output
            stdout, stderr = process.communicate()
            exit_code = process.returncode
            
            if exit_code == 0:
                logger.info("✅ Node.js program executed successfully")
                logger.debug(f"Output: {stdout.strip()}")
                return stdout.strip()
            else:
                logger.error(f"❌ Node.js execution failed with exit code: {exit_code}")
                if stderr:
                    logger.error(f"Error output: {stderr.strip()}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Exception during Node.js execution: {str(e)}")
            return None
    
    def get_access_token(self, environment: str, username: str, password: str) -> Optional[str]:
        """
        Get AWS Cognito access token using Node.js script
        
        Args:
            environment (str): Environment name (QC, F1, F2, etc.)
            username (str): Username for authentication
            password (str): Password for authentication
            
        Returns:
            str: Access token or None if failed
        """
        logger.info(f"🔐 Getting access token for environment: {environment}")
        logger.info(f"👤 Username: {username}")
        
        # Execute GetAccessToken.js script
        args = f"{environment} {username} {password}"
        result = self.run_node_program("access-token/GetAccessToken.js", args)
        
        if result:
            # Extract access token from output
            lines = result.split('\n')
            for line in lines:
                if line.startswith('Access Token:'):
                    token = line.replace('Access Token:', '').strip()
                    logger.info("✅ Access token retrieved successfully")
                    return token
            
            logger.warning("⚠️ Access token not found in output")
            return result  # Return full output if token format is different
        
        return None

# Convenience function for backward compatibility
def run_node_program(script_relative_path: str, args: str = "") -> Optional[str]:
    """
    Convenience function to run Node.js program
    Maintains compatibility with original Katalon keyword usage
    """
    executor = NodeExecutor()
    return executor.run_node_program(script_relative_path, args)