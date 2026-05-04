import { getRunTimestamp } from "./timestamp";
import { env } from "@src/config/env";
import * as fs from "fs";

interface TestData {
  scenarios: ScenarioData[];
  startTime: Date;
  endTime?: Date;
}

interface ScenarioData {
  feature: string;
  name: string;
  status: string;
  duration: number;
  steps: StepData[];
  error?: string;
}

interface StepData {
  name: string;
  status: string;
  duration: number;
  error?: string;
  screenshotPath?: string;
}

let testData: TestData = {
  scenarios: [],
  startTime: new Date()
};

export function recordScenario(feature: string, name: string, status: string, duration: number, steps: StepData[], error?: string) {
  testData.scenarios.push({ feature, name, status, duration, steps, error });
}

export async function generateReport() {
  testData.endTime = new Date();
  
  const timestamp = getRunTimestamp();
  const reportsDir = "reports";
  const folders = fs.readdirSync(reportsDir)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/))
    .sort()
    .reverse();
  
  const reportPath = folders.length > 0 ? `reports/${folders[0]}` : `reports/${timestamp}`;
  
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const totalScenarios = testData.scenarios.length;
  const passedScenarios = testData.scenarios.filter(s => s.status === "passed").length;
  const failedScenarios = testData.scenarios.filter(s => s.status === "failed").length;
  const totalDuration = testData.scenarios.reduce((sum, s) => sum + s.duration, 0);
  const passRate = totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : "0";

  const html = `<!DOCTYPE html>
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
    .results { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-top: 20px; }
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
    .env-info { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .env-info h3 { color: #667eea; margin-bottom: 15px; }
    .env-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
    .env-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
    .env-item strong { color: #666; display: block; font-size: 12px; margin-bottom: 5px; }
    .env-item span { color: #333; font-size: 14px; }
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
    <div class="env-info">
      <h3>📋 Environment Details</h3>
      <div class="env-grid">
        <div class="env-item">
          <strong>Base URL</strong>
          <span>${env.baseUrl}</span>
        </div>
        <div class="env-item">
          <strong>Browser</strong>
          <span>${env.browser || 'chromium'}</span>
        </div>
        <div class="env-item">
          <strong>Execution Mode</strong>
          <span>${env.headless ? 'Headless' : 'Headed'}</span>
        </div>
        <div class="env-item">
          <strong>Organization</strong>
          <span>${env.organization}</span>
        </div>
        <div class="env-item">
          <strong>Location</strong>
          <span>${env.location}</span>
        </div>
        <div class="env-item">
          <strong>Staff Member</strong>
          <span>${env.staffMember}</span>
        </div>
        <div class="env-item">
          <strong>Start Time</strong>
          <span>${testData.startTime.toLocaleTimeString()}</span>
        </div>
        <div class="env-item">
          <strong>End Time</strong>
          <span>${testData.endTime?.toLocaleTimeString()}</span>
        </div>
        <div class="env-item">
          <strong>Total Duration</strong>
          <span>${(totalDuration / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>

    <div class="summary">
      <div class="card">
        <h3>Total Tests</h3>
        <div class="value">${totalScenarios}</div>
      </div>
      <div class="card passed">
        <h3>Passed</h3>
        <div class="value">${passedScenarios}</div>
      </div>
      <div class="card failed">
        <h3>Failed</h3>
        <div class="value">${failedScenarios}</div>
      </div>
      <div class="card rate">
        <h3>Pass Rate</h3>
        <div class="value">${passRate}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
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
          ${testData.scenarios.map((s, idx) => `
            <tr class="scenario-row" onclick="toggleSteps(${idx})">
              <td>${s.feature}</td>
              <td>
                ${s.name}
                <span class="toggle-icon" id="icon-${idx}">▼</span>
              </td>
              <td><span class="status ${s.status}">${s.status}</span></td>
              <td>${s.steps.length}</td>
              <td class="duration">${(s.duration / 1000).toFixed(2)}s</td>
            </tr>
            <tr class="steps-detail" id="steps-${idx}">
              <td colspan="5">
                <table class="steps-table">
                  ${s.steps.map(step => `
                    <tr>
                      <td class="step-name">${step.name}</td>
                      <td class="step-status"><span class="status ${step.status}">${step.status}</span></td>
                      <td class="step-duration">${(step.duration / 1000).toFixed(2)}s</td>
                    </tr>
                    ${step.error ? `<tr><td colspan="3"><div class="error">${step.error.substring(0, 500)}</div></td></tr>` : ""}
                    ${step.screenshotPath && fs.existsSync(step.screenshotPath) ? `
                    <tr><td colspan="3">
                      <div style="padding:8px;">
                        <div style="font-size:11px;color:#999;margin-bottom:4px;">📸 Failure Screenshot</div>
                        <img src="data:image/png;base64,${fs.readFileSync(step.screenshotPath).toString('base64')}" 
                             style="max-width:100%;border:1px solid #e0e0e0;border-radius:4px;cursor:zoom-in;"
                             onclick="this.style.maxWidth=this.style.maxWidth==='100%'?'none':'100%'" />
                      </div>
                    </td></tr>` : ""}
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

  const reportFile = `${reportPath}/test-report.html`;
  fs.writeFileSync(reportFile, html);
  
  console.log(`\n✅ Test Report: ${reportFile}`);
  console.log(`✅ Screenshots: ${reportPath}/screenshots\n`);
  
  const { exec } = require("child_process");
  exec(`start "" "${reportFile}"`);
}
