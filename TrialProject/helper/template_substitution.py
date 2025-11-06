#!/usr/bin/env python3
"""
Template Substitution Helper
Handles variable substitution in test data similar to Katalon's variable binding

Purpose: Replace template variables like ${variableName} with actual values
"""

import re
import logging
from typing import Dict, Any, Union

logger = logging.getLogger(__name__)

class TemplateSubstitution:
    """Helper class for template variable substitution"""
    
    @staticmethod
    def substitute_variables(template: Union[str, dict], variables: Dict[str, Any]) -> Union[str, dict]:
        """
        Replace template variables with actual values
        
        Args:
            template: String or dict containing template variables like ${variableName}
            variables: Dictionary of variable names and their values
            
        Returns:
            Template with variables substituted
        """
        if isinstance(template, dict):
            return TemplateSubstitution._substitute_dict(template, variables)
        elif isinstance(template, str):
            return TemplateSubstitution._substitute_string(template, variables)
        else:
            return template
    
    @staticmethod
    def _substitute_string(template: str, variables: Dict[str, Any]) -> str:
        """Substitute variables in a string"""
        logger.debug(f"Substituting variables in string: {template[:100]}...")
        
        # Pattern to match ${variableName}
        pattern = r'\$\{([^}]+)\}'
        
        def replace_match(match):
            var_name = match.group(1)
            if var_name in variables:
                value = variables[var_name]
                logger.debug(f"Replacing ${{{var_name}}} with {value}")
                return str(value)
            else:
                logger.warning(f"Variable ${{{var_name}}} not found in substitution map")
                return match.group(0)  # Return original if not found
        
        result = re.sub(pattern, replace_match, template)
        logger.debug(f"Substitution result: {result[:100]}...")
        return result
    
    @staticmethod
    def _substitute_dict(template: dict, variables: Dict[str, Any]) -> dict:
        """Recursively substitute variables in a dictionary"""
        logger.debug("Substituting variables in dictionary")
        
        result = {}
        for key, value in template.items():
            if isinstance(value, str):
                result[key] = TemplateSubstitution._substitute_string(value, variables)
            elif isinstance(value, dict):
                result[key] = TemplateSubstitution._substitute_dict(value, variables)
            elif isinstance(value, list):
                result[key] = TemplateSubstitution._substitute_list(value, variables)
            else:
                result[key] = value
        
        return result
    
    @staticmethod
    def _substitute_list(template: list, variables: Dict[str, Any]) -> list:
        """Substitute variables in a list"""
        result = []
        for item in template:
            if isinstance(item, str):
                result.append(TemplateSubstitution._substitute_string(item, variables))
            elif isinstance(item, dict):
                result.append(TemplateSubstitution._substitute_dict(item, variables))
            elif isinstance(item, list):
                result.append(TemplateSubstitution._substitute_list(item, variables))
            else:
                result.append(item)
        
        return result
    
    @staticmethod
    def create_variable_map(**kwargs) -> Dict[str, Any]:
        """
        Create a variable map for substitution
        
        Args:
            **kwargs: Variable names and values
            
        Returns:
            Dictionary mapping variable names to values
        """
        logger.info(f"Creating variable map with {len(kwargs)} variables")
        for key, value in kwargs.items():
            logger.debug(f"Variable: {key} = {value}")
        
        return kwargs

# Convenience functions
def substitute_template(template: Union[str, dict], **variables) -> Union[str, dict]:
    """
    Convenience function for template substitution
    
    Args:
        template: Template string or dict with variables
        **variables: Variable names and values
        
    Returns:
        Template with variables substituted
    """
    return TemplateSubstitution.substitute_variables(template, variables)

def substitute_json_template(json_template: str, **variables) -> str:
    """
    Substitute variables in JSON template string
    
    Args:
        json_template: JSON string with template variables
        **variables: Variable names and values
        
    Returns:
        JSON string with variables substituted
    """
    import json
    
    # First substitute in the raw string
    substituted_string = TemplateSubstitution.substitute_variables(json_template, variables)
    
    # Validate it's still valid JSON
    try:
        json.loads(substituted_string)
        return substituted_string
    except json.JSONDecodeError as e:
        logger.error(f"Template substitution resulted in invalid JSON: {e}")
        raise ValueError(f"Invalid JSON after substitution: {e}")