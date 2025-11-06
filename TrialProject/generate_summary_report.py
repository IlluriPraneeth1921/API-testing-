#!/usr/bin/env python3
"""
Test Summary Report Generator
Creates a consolidated summary of all test reports
"""

import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime

def generate_summary_report():
    """Generate a comprehensive summary report"""
    
    reports_dir = "reports"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_file = os.path.join(reports_dir, f"test_summary_{timestamp}.html")
    
    # Find the latest JSON report
    json_files = [f for f in os.listdir(reports_dir) if f.endswith('.json')]
    if not json_files:
        print("No JSON reports found")
        return
    
    latest_json = max(json_files, key=lambda x: os.path.getctime(os.path.join(reports_dir, x)))
    json_path = os.path.join(reports_dir, latest_json)
    
    # Read JSON report
    with open(json_path, 'r') as f:
        report_data = json.load(f)
    
    # Generate HTML summary
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Test Suite Summary Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
            .summary {{ margin: 20px 0; }}
            .test-result {{ margin: 10px 0; padding: 10px; border-radius: 5px; }}
            .passed {{ background-color: #d4edda; border-left: 5px solid #28a745; }}
            .failed {{ background-color: #f8d7da; border-left: 5px solid #dc3545; }}
            .error {{ background-color: #fff3cd; border-left: 5px solid #ffc107; }}
            .stats {{ display: flex; gap: 20px; margin: 20px 0; }}
            .stat-box {{ padding: 15px; border-radius: 5px; text-align: center; min-width: 100px; }}
            .stat-passed {{ background-color: #28a745; color: white; }}
            .stat-failed {{ background-color: #dc3545; color: white; }}
            .stat-error {{ background-color: #ffc107; color: black; }}
            .stat-total {{ background-color: #007bff; color: white; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>API Test Suite Summary Report</h1>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>Report Source: {latest_json}</p>
        </div>
        
        <div class="stats">
            <div class="stat-box stat-total">
                <h3>{report_data['summary']['total']}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat-box stat-passed">
                <h3>{report_data['summary']['passed']}</h3>
                <p>Passed</p>
            </div>
            <div class="stat-box stat-failed">
                <h3>{report_data['summary']['failed']}</h3>
                <p>Failed</p>
            </div>
            <div class="stat-box stat-error">
                <h3>{report_data['summary'].get('error', 0)}</h3>
                <p>Errors</p>
            </div>
        </div>
        
        <div class="summary">
            <h2>Test Results Details</h2>
    """
    
    # Add test details
    for test in report_data.get('tests', []):
        outcome = test.get('outcome', 'unknown')
        test_name = test.get('nodeid', 'Unknown Test')
        
        css_class = 'passed' if outcome == 'passed' else 'failed' if outcome == 'failed' else 'error'
        
        html_content += f"""
            <div class="test-result {css_class}">
                <h4>{test_name}</h4>
                <p><strong>Status:</strong> {outcome.upper()}</p>
                <p><strong>Duration:</strong> {test.get('duration', 0):.2f}s</p>
        """
        
        if 'call' in test and 'longrepr' in test['call']:
            html_content += f"<p><strong>Error:</strong> {test['call']['longrepr'][:200]}...</p>"
        
        html_content += "</div>"
    
    html_content += """
        </div>
        
        <div class="summary">
            <h2>Available Reports</h2>
            <ul>
    """
    
    # List all available reports
    for file in os.listdir(reports_dir):
        if file.endswith(('.html', '.xml', '.json')):
            html_content += f"<li><a href='{file}'>{file}</a></li>"
    
    html_content += """
            </ul>
        </div>
    </body>
    </html>
    """
    
    # Write summary report
    with open(summary_file, 'w') as f:
        f.write(html_content)
    
    print(f"Summary report generated: {summary_file}")
    return summary_file

if __name__ == "__main__":
    generate_summary_report()