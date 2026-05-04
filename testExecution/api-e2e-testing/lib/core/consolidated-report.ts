/**
 * Consolidated Regression Report Generator
 * Reads all output/<Entity>_E2E_<ts>/ folders and builds one HTML dashboard.
 *
 * Usage:
 *   npx ts-node lib/core/consolidated-report.ts
 *   npx ts-node lib/core/consolidated-report.ts 2026-04-27T1431
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');

interface EntitySummary {
  entity: string;
  tfsId: string;
  environment: string;
  timestamp: string;
  route: string;
  total: number;
  passed: number;
  failed: number;
  passRate: string;
  byType: Record<string, { total: number; passed: number; failed: number }>;
  folder: string;
}

function loadSummaries(filterTs?: string): EntitySummary[] {
  const dirs = fs.readdirSync(OUTPUT_DIR).filter(d => {
    const full = path.join(OUTPUT_DIR, d);
    if (!fs.statSync(full).isDirectory()) return false;
    if (!d.includes('_E2E_')) return false;
    if (filterTs && !d.includes(filterTs)) return false;
    return fs.existsSync(path.join(full, '00_summary.json'));
  });

  const summaries: EntitySummary[] = [];
  for (const dir of dirs) {
    try {
      const summaryPath = path.join(OUTPUT_DIR, dir, '00_summary.json');
      const keysPath = path.join(OUTPUT_DIR, dir, '00_keys.json');
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      const keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath, 'utf-8')) : {};

      const match = dir.match(/^(.+)_E2E_(.+)$/);
      const entity = match ? match[1] : dir;
      const ts = match ? match[2] : '';

      summaries.push({
        entity,
        tfsId: keys.tfsId || '',
        environment: keys.environment || '',
        timestamp: ts,
        route: keys.route || '',
        total: summary.total || 0,
        passed: summary.passed || 0,
        failed: summary.failed || 0,
        passRate: summary.passRate || '0%',
        byType: summary.byType || {},
        folder: dir,
      });
    } catch { /* skip broken */ }
  }

  summaries.sort((a, b) => a.entity.localeCompare(b.entity));
  return summaries;
}

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateConsolidatedHtml(summaries: EntitySummary[]): string {
  const totalTests = summaries.reduce((a, s) => a + s.total, 0);
  const totalPassed = summaries.reduce((a, s) => a + s.passed, 0);
  const totalFailed = summaries.reduce((a, s) => a + s.failed, 0);
  const overallRate = totalTests ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
  const totalEntities = summaries.length;
  const fullPass = summaries.filter(s => s.failed === 0).length;
  const env = summaries[0]?.environment || 'Unknown';
  const ts = summaries[0]?.timestamp || '';

  // Aggregate by type across all entities
  const globalByType: Record<string, { total: number; passed: number; failed: number }> = {};
  for (const s of summaries) {
    for (const [type, c] of Object.entries(s.byType)) {
      if (!globalByType[type]) globalByType[type] = { total: 0, passed: 0, failed: 0 };
      globalByType[type].total += c.total;
      globalByType[type].passed += c.passed;
      globalByType[type].failed += c.failed;
    }
  }

  // Group entities by status
  const failedEntities = summaries.filter(s => s.failed > 0).sort((a, b) => b.failed - a.failed);
  const passedEntities = summaries.filter(s => s.failed === 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Consolidated Regression Report — ${esc(env)} — ${esc(ts)}</title>
<style>
  :root {
    --bg: #0f1117; --surface: #1a1d27; --surface2: #242836; --border: #2d3348;
    --text: #e2e8f0; --text2: #94a3b8; --green: #22c55e; --red: #ef4444;
    --amber: #f59e0b; --blue: #3b82f6; --purple: #a855f7; --cyan: #06b6d4;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding: 24px; }
  h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 1.1rem; font-weight: 600; margin: 28px 0 12px; }
  .subtitle { color: var(--text2); font-size: 0.85rem; margin-bottom: 24px; }
  .env-badge { background: var(--blue); color: #fff; padding: 3px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 28px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
  .card .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); margin-bottom: 4px; }
  .card .value { font-size: 1.75rem; font-weight: 700; }
  .card .value.green { color: var(--green); }
  .card .value.red { color: var(--red); }
  .card .value.blue { color: var(--blue); }
  .card .value.amber { color: var(--amber); }
  .card .value.purple { color: var(--purple); }
  .rate-bar { height: 8px; border-radius: 4px; background: var(--surface2); overflow: hidden; margin-top: 8px; }
  .rate-bar .fill { height: 100%; border-radius: 4px; }

  .type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 28px; }
  .type-chip { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; }
  .type-chip .name { color: var(--text2); }
  .type-chip .count { font-weight: 600; }

  .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filters button { background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.78rem; }
  .filters button.active { background: var(--blue); color: #fff; border-color: var(--blue); }

  .search-box { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; width: 300px; margin-bottom: 16px; }
  .search-box::placeholder { color: var(--text2); }

  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { text-align: left; padding: 10px 12px; background: var(--surface2); color: var(--text2); font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; cursor: pointer; user-select: none; }
  th:hover { color: var(--cyan); }
  td { padding: 10px 12px; border-top: 1px solid var(--border); }
  tr:hover { background: var(--surface2); }
  tr.row-fail { background: rgba(239,68,68,0.04); }
  .status-pass { color: var(--green); font-weight: 600; }
  .status-fail { color: var(--red); font-weight: 600; }
  .rate-cell { font-weight: 600; }
  .rate-green { color: var(--green); }
  .rate-amber { color: var(--amber); }
  .rate-red { color: var(--red); }
  .link { color: var(--cyan); text-decoration: none; }
  .link:hover { text-decoration: underline; }
  .mini-bar { display: inline-block; width: 80px; height: 6px; background: var(--surface2); border-radius: 3px; vertical-align: middle; margin-left: 8px; overflow: hidden; }
  .mini-bar .fill { height: 100%; border-radius: 3px; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--text2); font-size: 0.75rem; }
</style>
</head>
<body>

<h1>📊 Consolidated Regression Report</h1>
<div class="subtitle">
  <span class="env-badge">${esc(env)}</span> &nbsp;
  ${esc(ts)} &nbsp;|&nbsp; ${totalEntities} entities &nbsp;|&nbsp; ${totalTests} total scenarios
</div>

<!-- Summary Cards -->
<div class="cards">
  <div class="card"><div class="label">Entities</div><div class="value purple">${totalEntities}</div></div>
  <div class="card"><div class="label">Total Tests</div><div class="value blue">${totalTests}</div></div>
  <div class="card"><div class="label">Passed</div><div class="value green">${totalPassed}</div></div>
  <div class="card"><div class="label">Failed</div><div class="value ${totalFailed > 0 ? 'red' : 'green'}">${totalFailed}</div></div>
  <div class="card"><div class="label">100% Pass</div><div class="value green">${fullPass}/${totalEntities}</div></div>
  <div class="card">
    <div class="label">Overall Pass Rate</div>
    <div class="value ${parseFloat(overallRate) >= 90 ? 'green' : parseFloat(overallRate) >= 70 ? 'amber' : 'red'}">${overallRate}%</div>
    <div class="rate-bar"><div class="fill" style="width:${overallRate}%;background:${parseFloat(overallRate) >= 90 ? 'var(--green)' : parseFloat(overallRate) >= 70 ? 'var(--amber)' : 'var(--red)'}"></div></div>
  </div>
</div>

<!-- Type Breakdown -->
<h2>Test Type Breakdown</h2>
<div class="type-grid">
${Object.entries(globalByType).map(([type, c]) => {
    const p = c.total ? ((c.passed / c.total) * 100).toFixed(1) : '0.0';
    const color = parseFloat(p) >= 90 ? 'var(--green)' : parseFloat(p) >= 70 ? 'var(--amber)' : 'var(--red)';
    return `  <div class="type-chip"><span class="name">${esc(type)}</span><span class="count" style="color:${color}">${c.passed}/${c.total} (${p}%)</span></div>`;
  }).join('\n')}
</div>

<!-- Search + Filters -->
<input type="text" class="search-box" id="searchBox" placeholder="🔍 Search entity name..." oninput="filterTable()">
<div class="filters">
  <button class="active" onclick="setFilter('all',this)">All (${totalEntities})</button>
  <button onclick="setFilter('pass',this)">100% Pass (${fullPass})</button>
  <button onclick="setFilter('fail',this)">Has Failures (${failedEntities.length})</button>
</div>

<!-- Entity Table -->
<table id="entityTable">
  <thead>
    <tr>
      <th onclick="sortTable(0)">#</th>
      <th onclick="sortTable(1)">TFS ID</th>
      <th onclick="sortTable(2)">Entity</th>
      <th onclick="sortTable(3)">Total</th>
      <th onclick="sortTable(4)">Passed</th>
      <th onclick="sortTable(5)">Failed</th>
      <th onclick="sortTable(6)">Pass Rate</th>
      <th>Types</th>
      <th>Report</th>
    </tr>
  </thead>
  <tbody>
${summaries.map((s, i) => {
    const rate = parseFloat(s.passRate);
    const rateClass = rate >= 90 ? 'rate-green' : rate >= 70 ? 'rate-amber' : 'rate-red';
    const barColor = rate >= 90 ? 'var(--green)' : rate >= 70 ? 'var(--amber)' : 'var(--red)';
    const rowClass = s.failed > 0 ? 'row-fail' : '';
    const types = Object.entries(s.byType).map(([t, c]) => {
      const tp = c.total ? ((c.passed / c.total) * 100).toFixed(0) : '0';
      const tc = parseFloat(tp) >= 90 ? 'var(--green)' : parseFloat(tp) >= 70 ? 'var(--amber)' : 'var(--red)';
      return `<span style="color:${tc};font-size:0.7rem" title="${t}: ${c.passed}/${c.total}">${t.replace(/([a-z])([A-Z])/g, '$1 $2').slice(0, 8)}:${c.passed}/${c.total}</span>`;
    }).join(' &nbsp; ');

    return `    <tr class="${rowClass}" data-entity="${esc(s.entity.toLowerCase())}" data-failed="${s.failed}">
      <td>${i + 1}</td>
      <td>${esc(s.tfsId)}</td>
      <td><strong>${esc(s.entity)}</strong></td>
      <td>${s.total}</td>
      <td class="status-pass">${s.passed}</td>
      <td class="${s.failed > 0 ? 'status-fail' : ''}">${s.failed}</td>
      <td><span class="rate-cell ${rateClass}">${s.passRate}</span><span class="mini-bar"><span class="fill" style="width:${rate}%;background:${barColor}"></span></span></td>
      <td>${types}</td>
      <td><a class="link" href="${s.folder}/06_report.html" target="_blank">Open</a></td>
    </tr>`;
  }).join('\n')}
  </tbody>
</table>

<div class="footer">
  Generated: ${new Date().toISOString()} &nbsp;|&nbsp; Environment: ${esc(env)} &nbsp;|&nbsp; Run: ${esc(ts)}
</div>

<script>
let currentFilter = 'all';

function filterTable() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  document.querySelectorAll('#entityTable tbody tr').forEach(tr => {
    const entity = tr.dataset.entity || '';
    const failed = parseInt(tr.dataset.failed || '0');
    let show = entity.includes(q);
    if (currentFilter === 'pass') show = show && failed === 0;
    if (currentFilter === 'fail') show = show && failed > 0;
    tr.style.display = show ? '' : 'none';
  });
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterTable();
}

let sortCol = -1, sortAsc = true;
function sortTable(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  const tbody = document.querySelector('#entityTable tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a, b) => {
    let av = a.children[col].textContent.trim();
    let bv = b.children[col].textContent.trim();
    const an = parseFloat(av.replace('%', ''));
    const bn = parseFloat(bv.replace('%', ''));
    if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  rows.forEach(r => tbody.appendChild(r));
}
</script>
</body>
</html>`;
}

// ── Main ──
const filterTs = process.argv[2];
const summaries = loadSummaries(filterTs);

if (summaries.length === 0) {
  console.log('No output folders found.' + (filterTs ? ` Filter: ${filterTs}` : ''));
  process.exit(1);
}

const html = generateConsolidatedHtml(summaries);
const outPath = path.join(OUTPUT_DIR, 'consolidated-report.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`\n✅ Consolidated report: ${outPath}`);
console.log(`   ${summaries.length} entities | ${summaries.reduce((a, s) => a + s.total, 0)} tests | Env: ${summaries[0]?.environment}`);
