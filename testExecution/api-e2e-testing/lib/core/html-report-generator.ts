/**
 * HTML Report Generator — produces a standalone HTML dashboard from ScenarioResult[].
 *
 * Features:
 *   - Summary cards (total, passed, failed, pass rate, duration)
 *   - Module/file/sheet breakdown with pass/fail bars
 *   - Drill-down: file → sheet → scenario
 *   - Failed test details with expected vs actual
 *   - Filter: All / Passed / Failed
 *   - Dark theme, zero external dependencies, single file
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScenarioResult } from './e2e-report-generator';

interface FileSummary {
  file: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  sheets: SheetSummary[];
}

interface SheetSummary {
  sheet: string;
  type: string;
  total: number;
  passed: number;
  failed: number;
  scenarios: ScenarioResult[];
}

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pct(n: number, d: number): string {
  return d ? ((n / d) * 100).toFixed(1) : '0.0';
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

function buildTree(results: ScenarioResult[]): FileSummary[] {
  const fileMap = new Map<string, Map<string, ScenarioResult[]>>();

  for (const r of results) {
    const fileParts = r.sheet.match(/^(\d+)_/);
    const fileKey = (r as any).file || (fileParts ? fileParts[1] : 'Unknown');

    if (!fileMap.has(fileKey)) fileMap.set(fileKey, new Map());
    const sheetMap = fileMap.get(fileKey)!;
    const sheetKey = r.sheet;
    if (!sheetMap.has(sheetKey)) sheetMap.set(sheetKey, []);
    sheetMap.get(sheetKey)!.push(r);
  }

  const files: FileSummary[] = [];
  for (const [file, sheetMap] of fileMap) {
    const sheets: SheetSummary[] = [];
    let fTotal = 0, fPassed = 0, fFailed = 0, fDur = 0;

    for (const [sheet, scenarios] of sheetMap) {
      const p = scenarios.filter(s => s.passed).length;
      const f = scenarios.length - p;
      const dur = scenarios.reduce((a, s) => a + (s.durationMs || 0), 0);
      sheets.push({ sheet, type: scenarios[0]?.type || '', total: scenarios.length, passed: p, failed: f, scenarios });
      fTotal += scenarios.length;
      fPassed += p;
      fFailed += f;
      fDur += dur;
    }

    files.push({ file, total: fTotal, passed: fPassed, failed: fFailed, durationMs: fDur, sheets });
  }

  files.sort((a, b) => b.failed - a.failed || a.file.localeCompare(b.file));
  return files;
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    CreateHappy: '🟢', CreateNegative: '🔴', UpdateHappy: '🟡', UpdateNegative: '🟠',
    SubEndpointHappy: '🔵', SubEndpointNegative: '🟣', SearchValidation: '🔍',
    ErrorCodeValidation: '⚠️', ComboTest: '🔗', AddRemoveTest: '➕',
  };
  return icons[type] || '📋';
}

export function generateHtmlReport(
  results: ScenarioResult[],
  outDir: string,
  meta: { entity?: string; environment?: string; timestamp?: string; tfsId?: string } = {},
): string {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const totalDur = results.reduce((a, r) => a + (r.durationMs || 0), 0);
  const passRate = pct(passed, total);
  const files = buildTree(results);

  const entity = meta.entity || 'API E2E';
  const env = meta.environment || process.env.ENV_NAME || '';
  const ts = meta.timestamp || new Date().toISOString().slice(0, 19);

  // Count by type
  const byType: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    if (!byType[r.type]) byType[r.type] = { total: 0, passed: 0 };
    byType[r.type].total++;
    if (r.passed) byType[r.type].passed++;
  }

  const failedResults = results.filter(r => !r.passed);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(entity)} E2E Report — ${esc(env)} — ${esc(ts)}</title>
<style>
  :root {
    --bg: #0f1117; --surface: #1a1d27; --surface2: #242836; --border: #2d3348;
    --text: #e2e8f0; --text2: #94a3b8; --green: #22c55e; --red: #ef4444;
    --amber: #f59e0b; --blue: #3b82f6; --purple: #a855f7; --cyan: #06b6d4;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding: 24px; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 4px; }
  .subtitle { color: var(--text2); font-size: 0.85rem; margin-bottom: 24px; }

  /* Summary Cards */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
  .card .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); margin-bottom: 4px; }
  .card .value { font-size: 1.75rem; font-weight: 700; }
  .card .value.green { color: var(--green); }
  .card .value.red { color: var(--red); }
  .card .value.blue { color: var(--blue); }
  .card .value.amber { color: var(--amber); }

  /* Pass Rate Bar */
  .rate-bar { height: 8px; border-radius: 4px; background: var(--surface2); overflow: hidden; margin-top: 8px; }
  .rate-bar .fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .rate-bar .fill.green { background: var(--green); }
  .rate-bar .fill.amber { background: var(--amber); }
  .rate-bar .fill.red { background: var(--red); }

  /* Filter */
  .filters { display: flex; gap: 8px; margin-bottom: 20px; }
  .filters button { background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; }
  .filters button.active { background: var(--blue); color: #fff; border-color: var(--blue); }

  /* Type Breakdown */
  .type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 28px; }
  .type-chip { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; }
  .type-chip .name { color: var(--text2); }
  .type-chip .count { font-weight: 600; }

  /* File Sections */
  .file-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
  .file-header { padding: 14px 18px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
  .file-header:hover { background: var(--surface2); }
  .file-header .name { font-weight: 600; font-size: 0.95rem; }
  .file-header .stats { display: flex; gap: 16px; font-size: 0.8rem; color: var(--text2); }
  .file-header .stats .pass { color: var(--green); }
  .file-header .stats .fail { color: var(--red); }
  .file-body { display: none; border-top: 1px solid var(--border); }
  .file-body.open { display: block; }

  /* Sheet */
  .sheet-section { border-bottom: 1px solid var(--border); }
  .sheet-section:last-child { border-bottom: none; }
  .sheet-header { padding: 10px 18px 10px 32px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
  .sheet-header:hover { background: rgba(59,130,246,0.05); }
  .sheet-header .type-badge { background: var(--surface2); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; color: var(--cyan); }
  .sheet-body { display: none; }
  .sheet-body.open { display: block; }

  /* Scenario Table */
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { text-align: left; padding: 8px 12px; background: var(--surface2); color: var(--text2); font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; }
  td { padding: 8px 12px; border-top: 1px solid var(--border); vertical-align: top; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tr.pass td:first-child { border-left: 3px solid var(--green); }
  tr.fail td:first-child { border-left: 3px solid var(--red); }
  tr.fail { background: rgba(239,68,68,0.04); }
  td.status-pass { color: var(--green); font-weight: 600; }
  td.status-fail { color: var(--red); font-weight: 600; }

  /* Error detail */
  .error-detail { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin: 6px 12px 10px 44px; font-size: 0.78rem; color: var(--red); white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
  .error-detail .label { color: var(--text2); font-weight: 500; }

  /* Chevron */
  .chevron { transition: transform 0.2s; color: var(--text2); font-size: 0.8rem; }
  .chevron.open { transform: rotate(90deg); }

  @media (max-width: 700px) {
    body { padding: 12px; }
    .cards { grid-template-columns: repeat(2, 1fr); }
    td { max-width: 150px; }
  }
</style>
</head>
<body>

<h1>${esc(entity)} — E2E Test Report</h1>
<div class="subtitle">${esc(env)} &nbsp;|&nbsp; ${esc(ts)} &nbsp;|&nbsp; ${total} scenarios across ${files.length} file(s) &nbsp;|&nbsp; ${fmtDuration(totalDur)}</div>

<!-- Summary Cards -->
<div class="cards">
  <div class="card"><div class="label">Total Tests</div><div class="value blue">${total}</div></div>
  <div class="card"><div class="label">Passed</div><div class="value green">${passed}</div></div>
  <div class="card"><div class="label">Failed</div><div class="value ${failed > 0 ? 'red' : 'green'}">${failed}</div></div>
  <div class="card">
    <div class="label">Pass Rate</div>
    <div class="value ${parseFloat(passRate) >= 90 ? 'green' : parseFloat(passRate) >= 70 ? 'amber' : 'red'}">${passRate}%</div>
    <div class="rate-bar"><div class="fill ${parseFloat(passRate) >= 90 ? 'green' : parseFloat(passRate) >= 70 ? 'amber' : 'red'}" style="width:${passRate}%"></div></div>
  </div>
  <div class="card"><div class="label">Duration</div><div class="value" style="font-size:1.3rem">${fmtDuration(totalDur)}</div></div>
</div>

<!-- Type Breakdown -->
<div class="type-grid">
${Object.entries(byType).map(([type, c]) => {
  const p = pct(c.passed, c.total);
  const color = parseFloat(p) >= 90 ? 'var(--green)' : parseFloat(p) >= 70 ? 'var(--amber)' : 'var(--red)';
  return `  <div class="type-chip"><span class="name">${esc(type)}</span><span class="count" style="color:${color}">${c.passed}/${c.total}</span></div>`;
}).join('\n')}
</div>

<!-- Filters -->
<div class="filters">
  <button class="active" onclick="filterAll(this)">All (${total})</button>
  <button onclick="filterPass(this)">Passed (${passed})</button>
  <button onclick="filterFail(this)">Failed (${failed})</button>
</div>

<!-- File Sections -->
<div id="file-list">
${files.map((f, fi) => {
  const fp = pct(f.passed, f.total);
  const barColor = parseFloat(fp) >= 90 ? 'green' : parseFloat(fp) >= 70 ? 'amber' : 'red';
  return `
<div class="file-section" data-passed="${f.passed}" data-failed="${f.failed}">
  <div class="file-header" onclick="toggleFile(${fi})">
    <div>
      <span class="chevron" id="fc${fi}">&#9654;</span>
      <span class="name">${esc(f.file)}</span>
    </div>
    <div class="stats">
      <span class="pass">&#10003; ${f.passed}</span>
      <span class="fail">${f.failed > 0 ? '&#10007; ' + f.failed : ''}</span>
      <span>${fp}%</span>
      <span>${fmtDuration(f.durationMs)}</span>
    </div>
  </div>
  <div class="file-body" id="fb${fi}">
${f.sheets.map((sh, si) => {
  const sp = pct(sh.passed, sh.total);
  return `
    <div class="sheet-section">
      <div class="sheet-header" onclick="toggleSheet(${fi},${si})">
        <div>
          <span class="chevron" id="sc${fi}_${si}">&#9654;</span>
          ${esc(sh.sheet)} <span class="type-badge">${esc(sh.type)}</span>
        </div>
        <div class="stats">
          <span class="pass">&#10003; ${sh.passed}</span>
          <span class="fail">${sh.failed > 0 ? '&#10007; ' + sh.failed : ''}</span>
          <span>${sp}%</span>
        </div>
      </div>
      <div class="sheet-body" id="sb${fi}_${si}">
        <table>
          <thead><tr><th>Scenario</th><th>Method</th><th>Status</th><th>Message Match</th><th>Duration</th><th>Result</th></tr></thead>
          <tbody>
${sh.scenarios.map(sc => {
  const cls = sc.passed ? 'pass' : 'fail';
  const statusCls = sc.passed ? 'status-pass' : 'status-fail';
  const msgMatch = sc.messageMatch !== undefined ? (sc.messageMatch ? '&#10003;' : '&#10007;') : '';
  let errorBlock = '';
  if (!sc.passed && (sc.error || sc.expectedMessage || sc.actualMessage)) {
    const parts: string[] = [];
    if (sc.expectedStatus && sc.actualStatus && sc.expectedStatus !== sc.actualStatus)
      parts.push(`<span class="label">Status:</span> expected ${sc.expectedStatus}, got ${sc.actualStatus}`);
    if (sc.expectedMessage)
      parts.push(`<span class="label">Expected:</span> ${esc(sc.expectedMessage)}`);
    if (sc.actualMessage)
      parts.push(`<span class="label">Actual:</span> ${esc(sc.actualMessage)}`);
    if (sc.error)
      parts.push(`<span class="label">Error:</span> ${esc(sc.error)}`);
    errorBlock = `\n          <tr class="fail"><td colspan="6"><div class="error-detail">${parts.join('\n')}</div></td></tr>`;
  }
  return `          <tr class="${cls}"><td>${esc(sc.scenario)}</td><td>${esc(sc.method || '')}</td><td>${sc.actualStatus ?? ''}/${sc.expectedStatus ?? ''}</td><td>${msgMatch}</td><td>${fmtDuration(sc.durationMs || 0)}</td><td class="${statusCls}">${sc.passed ? 'PASS' : 'FAIL'}</td></tr>${errorBlock}`;
}).join('\n')}
          </tbody>
        </table>
      </div>
    </div>`;
}).join('\n')}
  </div>
</div>`;
}).join('\n')}
</div>

${failedResults.length > 0 ? `
<!-- Failed Summary -->
<h2 style="margin-top:32px;font-size:1.1rem;color:var(--red)">&#10007; Failed Tests (${failedResults.length})</h2>
<table style="margin-top:12px">
  <thead><tr><th>Sheet</th><th>Scenario</th><th>Type</th><th>Expected</th><th>Actual</th><th>Error</th></tr></thead>
  <tbody>
${failedResults.slice(0, 200).map(r => `    <tr class="fail"><td>${esc(r.sheet)}</td><td>${esc(r.scenario)}</td><td>${esc(r.type)}</td><td>${r.expectedStatus ?? ''}</td><td>${r.actualStatus ?? ''}</td><td title="${esc(r.error || r.actualMessage || '')}">${esc((r.error || r.actualMessage || '').slice(0, 120))}</td></tr>`).join('\n')}
  </tbody>
</table>
` : ''}

<script>
function toggleFile(i) {
  const b = document.getElementById('fb'+i);
  const c = document.getElementById('fc'+i);
  b.classList.toggle('open');
  c.classList.toggle('open');
}
function toggleSheet(fi, si) {
  const b = document.getElementById('sb'+fi+'_'+si);
  const c = document.getElementById('sc'+fi+'_'+si);
  b.classList.toggle('open');
  c.classList.toggle('open');
}
function setActive(btn) {
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function filterAll(btn) {
  setActive(btn);
  document.querySelectorAll('.file-section').forEach(el => el.style.display = '');
}
function filterPass(btn) {
  setActive(btn);
  document.querySelectorAll('.file-section').forEach(el => {
    el.style.display = parseInt(el.dataset.failed) === 0 ? '' : 'none';
  });
}
function filterFail(btn) {
  setActive(btn);
  document.querySelectorAll('.file-section').forEach(el => {
    el.style.display = parseInt(el.dataset.failed) > 0 ? '' : 'none';
  });
}
// Auto-expand files with failures
document.querySelectorAll('.file-section').forEach((el, i) => {
  if (parseInt(el.dataset.failed) > 0) toggleFile(i);
});
</script>
</body>
</html>`;

  const outPath = path.join(outDir, '06_report.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`  📄 HTML report: ${outPath}`);
  return outPath;
}
