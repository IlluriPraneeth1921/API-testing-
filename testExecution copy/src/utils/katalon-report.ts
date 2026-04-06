import { getRunTimestamp } from "./timestamp";
import * as fs from "fs";
import * as path from "path";

interface TestResult {
  feature: string;
  scenario: string;
  status: string;
  duration: number;
  steps: StepDetail[];
  failedSteps: number;
  error?: string;
}

interface StepDetail {
  name: string;
  status: string;
  duration: number;
  error?: string;
}

export async function generateKatalonReport() {
  const jsonPath = "reports/cucumber-report.json";

  console.log("[KATALON] Starting report generation...");
  console.log("[KATALON] Looking for JSON at:", jsonPath);

  if (!fs.existsSync(jsonPath)) {
    console.log("[KATALON] ❌ No JSON report found at:", jsonPath);
    return;
  }

  const fileContent = fs.readFileSync(jsonPath, "utf8").trim();
  const fileSize = fs.statSync(jsonPath).size;
  console.log(`[KATALON] JSON file size: ${fileSize} bytes`);
  
  if (!fileContent || fileSize === 0) {
    console.log("[KATALON] ❌ JSON report is empty");
    console.log("[KATALON] This usually means Cucumber didn't write the report.");
    console.log("[KATALON] Skipping report generation.");
    return;
  }

  console.log("[KATALON] ✅ JSON report found, parsing...");
  const jsonData = JSON.parse(fileContent);
  
  if (!jsonData || jsonData.length === 0) {
    console.log("[KATALON] ❌ JSON data is empty or invalid");
    return;
  }
  
  // Find the latest timestamped folder (where screenshots are)
  const reportsDir = "reports";
  const folders = fs.readdirSync(reportsDir)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/))
    .sort()
    .reverse();
  
  const reportPath = folders.length > 0 ? `reports/${folders[0]}` : `reports/${getRunTimestamp()}`;
  console.log("[KATALON] Using report directory:", reportPath);

  if (!fs.existsSync(reportPath)) {
    console.log("[KATALON] Creating report directory:", reportPath);
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const results = parseTestResults(jsonData);
  const summary = calculateSummary(results);
  
  console.log("[KATALON] Generating HTML report...");
  console.log(`[KATALON] Found ${results.length} scenarios`);
  const html = generateHTML(results, summary, reportPath.split("/")[1]);
  
  const reportFile = `${reportPath}/katalon-report.html`;
  fs.writeFileSync(reportFile, html);
  
  console.log(`\n✅ Katalon Report: ${reportFile}`);
  console.log(`✅ Screenshots: ${reportPath}/screenshots\n`);
  
  // Open in browser
  const { exec } = require("child_process");
  exec(`start "" "${reportFile}"`);
}

function parseTestResults(jsonData: any[]): TestResult[] {
  const results: TestResult[] = [];

  jsonData.forEach((feature) => {
    feature.elements?.forEach((scenario: any) => {
      const steps = scenario.steps || [];
      const stepDetails: StepDetail[] = steps.map((s: any) => ({
        name: `${s.keyword}${s.name}`,
        status: s.result?.status || "unknown",
        duration: (s.result?.duration || 0) / 1000000000,
        error: s.result?.error_message
      }));
      
      const failedSteps = stepDetails.filter(s => s.status === "failed").length;
      const duration = stepDetails.reduce((sum, s) => sum + s.duration, 0);
      const status = failedSteps > 0 ? "failed" : "passed";
      
      const failedStep = stepDetails.find(s => s.status === "failed");

      results.push({
        feature: feature.name,
        scenario: scenario.name,
        status,
        duration,
        steps: stepDetails,
        failedSteps,
        error: failedStep?.error
      });
    });
  });

  return results;
}

function calculateSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : "0";

  return { total, passed, failed, totalDuration, passRate };
}

function generateHTML(results: TestResult[], summary: any, timestamp: string): string {
  const statusColor = (status: string) => status === "passed" ? "#4caf50" : "#f44336";
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Execution Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card h3 { color: #666; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .card .value { font-size: 36px; font-weight: bold; color: #333; }
    .card.passed .value { color: #4caf50; }
    .card.failed .value { color: #f44336; }
    .card.rate .value { color: #2196f3; }
    .results { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
    .results h2 { padding: 20px; background: #fafafa; border-bottom: 2px solid #e0e0e0; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 15px; text-align: left; font-weight: 600; color: #666; font-size: 13px; text-transform: uppercase; }
    td { padding: 15px; border-bottom: 1px solid #f0f0f0; }
    tr:hover { background: #fafafa; }
    .status { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status.passed { background: #e8f5e9; color: #4caf50; }
    .status.failed { background: #ffebee; color: #f44336; }
    .status.skipped { background: #fff3e0; color: #ff9800; }
    .duration { color: #666; font-size: 14px; }
    .error { color: #f44336; font-size: 12px; margin-top: 5px; font-family: monospace; background: #fff3f3; padding: 8px; border-radius: 4px; white-space: pre-wrap; }
    .feature-name { color: #2196f3; font-weight: 500; }
    .progress-bar { height: 8px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin-top: 10px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s; }
    .scenario-row { cursor: pointer; }
    .scenario-row td { font-weight: 500; }
    .steps-detail { display: none; background: #fafafa; }
    .steps-detail.show { display: table-row; }
    .steps-detail td { padding: 0; }
    .steps-table { width: 100%; margin: 10px 0; background: white; }
    .steps-table td { padding: 10px 15px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .steps-table .step-name { color: #333; }
    .steps-table .step-status { width: 100px; text-align: center; }
    .steps-table .step-duration { width: 100px; text-align: right; color: #999; }
    .toggle-icon { float: right; transition: transform 0.3s; }
    .toggle-icon.open { transform: rotate(180deg); }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>🎯 Test Execution Report</h1>
      <p>Generated on ${new Date().toLocaleString()} | Run ID: ${timestamp}</p>
    </div>
  </div>
  
  <div class="container">
    <div class="summary">
      <div class="card">
        <h3>Total Tests</h3>
        <div class="value">${summary.total}</div>
      </div>
      <div class="card passed">
        <h3>Passed</h3>
        <div class="value">${summary.passed}</div>
      </div>
      <div class="card failed">
        <h3>Failed</h3>
        <div class="value">${summary.failed}</div>
      </div>
      <div class="card rate">
        <h3>Pass Rate</h3>
        <div class="value">${summary.passRate}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${summary.passRate}%"></div>
        </div>
      </div>
      <div class="card">
        <h3>Duration</h3>
        <div class="value">${summary.totalDuration.toFixed(2)}s</div>
      </div>
    </div>

    <div class="results">
      <h2>📋 Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Scenario</th>
            <th>Status</th>
            <th>Steps</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${results.map((r, idx) => `
            <tr class="scenario-row" onclick="toggleSteps(${idx})">
              <td><span class="feature-name">${r.feature}</span></td>
              <td>
                ${r.scenario}
                <span class="toggle-icon" id="icon-${idx}">▼</span>
              </td>
              <td><span class="status ${r.status}">${r.status}</span></td>
              <td>${r.steps.length} ${r.failedSteps > 0 ? `<span style="color: #f44336;">(${r.failedSteps} failed)</span>` : ""}</td>
              <td class="duration">${r.duration.toFixed(2)}s</td>
            </tr>
            <tr class="steps-detail" id="steps-${idx}">
              <td colspan="5">
                <table class="steps-table">
                  ${r.steps.map(step => `
                    <tr>
                      <td class="step-name">${escapeHtml(step.name)}</td>
                      <td class="step-status"><span class="status ${step.status}">${step.status}</span></td>
                      <td class="step-duration">${step.duration.toFixed(2)}s</td>
                    </tr>
                    ${step.error ? `<tr><td colspan="3"><div class="error">${escapeHtml(step.error.substring(0, 500))}</div></td></tr>` : ""}
                  `).join("")}
                </table>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    function toggleSteps(idx) {
      const stepsRow = document.getElementById('steps-' + idx);
      const icon = document.getElementById('icon-' + idx);
      if (stepsRow.classList.contains('show')) {
        stepsRow.classList.remove('show');
        icon.classList.remove('open');
      } else {
        stepsRow.classList.add('show');
        icon.classList.add('open');
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (require.main === module) {
  generateKatalonReport();
}
