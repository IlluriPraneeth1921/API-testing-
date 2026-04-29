# Phase 3: Reporting + CI — What Was Built

> HTML dashboard, Azure Pipelines, parallel execution. Built 2026-04-24.

[← Phase 1: Core Engine](PHASE1_IMPLEMENTED.md) · [← Phase 2: Advanced](PHASE2_IMPLEMENTED.md)

---

## Files Created

| File | Purpose |
|---|---|
| `lib/core/html-report-generator.ts` | Standalone HTML dashboard — zero external dependencies |
| `azure-pipelines.yml` | CI pipeline with shard support, environment selection, artifact publishing |

## Files Modified

| File | Change |
|---|---|
| `lib/core/e2e-report-generator.ts` | Wired HTML report generation + `meta` param for entity/env/timestamp |
| `tests/excel-driven-e2e.spec.ts` | Passes metadata to report generator |
| `playwright.config.ts` | `WORKERS` env var, JUnit reporter in CI (`TF_BUILD`), `fullyParallel: false` |
| `package.json` | 4 new scripts: `test:excel:regression`, `test:excel:parallel`, `test:excel:shard`, `report` |

---

## HTML Report (html-report-generator.ts)

Auto-generated as `06_report.html` in every run's output folder. Dark theme, zero dependencies, single file.

### Features

- **Summary cards**: Total, Passed, Failed, Pass Rate (color-coded bar: green ≥90%, amber ≥70%, red <70%), Duration
- **Type breakdown grid**: Pass/fail counts per test type (CreateHappy, CreateNegative, UpdateHappy, etc.)
- **Filter buttons**: All / Passed / Failed — toggles file visibility
- **Drill-down**: File → Sheet (with type badge) → Scenario table
  - Columns: Scenario, Method, Status (actual/expected), Message Match, Duration, Result
  - Failed rows: red left border + expandable error detail block
- **Error details**: Shows expected vs actual status, expected vs actual message, error text
- **Failed summary table**: Bottom section listing all failures for quick triage (capped at 200)
- **Auto-expand**: Files with failures are expanded on page load

### Output Location

```
output/{Entity}_E2E_{timestamp}/
├── 00_all_results.csv
├── 00_keys.json
├── 00_summary.json
├── 01_create_results.csv
├── 02_negative_results.csv
├── 01b_update_results.csv
├── 02b_update_negative_results.csv
├── 01c_subendpoint_results.csv
├── 02c_subendpoint_negative_results.csv
├── 03_search_results.csv
├── 04_error_code_results.csv
├── 05_combo_results.csv
├── 05b_add_remove_results.csv
└── 06_report.html          ← HTML dashboard
```

---

## Azure Pipelines (azure-pipelines.yml)

### Parameters

| Parameter | Type | Default | Options |
|---|---|---|---|
| `environment` | string | DevF1 | DevF1, F1, F5 |
| `excel` | string | (blank = all) | Any Excel filename |
| `module` | string | (blank = all) | Any module name |
| `testType` | string | (blank = all) | happy, negative, search, error, combo |
| `maxScenarios` | number | 0 (= all) | Any number |
| `skipSql` | boolean | false | true/false |
| `workers` | number | 1 | Playwright workers per agent |
| `shardTotal` | number | 1 | Number of parallel agents (up to 8) |

### Pipeline Steps (per shard)

1. Install Node.js 20.x
2. `npm ci` — install dependencies
3. `npx playwright install --with-deps` — install browsers
4. Run tests with env vars from parameters + `--shard=N/M`
5. Publish JUnit XML to Azure DevOps test tab (`PublishTestResults@2`)
6. Publish CSV + HTML reports as pipeline artifact
7. Publish Playwright HTML report as pipeline artifact

### Shard Support

```bash
# 3 parallel agents
npx playwright test excel-driven-e2e --shard=1/3
npx playwright test excel-driven-e2e --shard=2/3
npx playwright test excel-driven-e2e --shard=3/3
```

Artifacts published per shard: `e2e-results-shard-{N}`, `playwright-report-shard-{N}`.

---

## Playwright Config (playwright.config.ts)

```typescript
const isCI = !!process.env.TF_BUILD || !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 5 * 60 * 1000,
  retries: 0,
  workers: parseInt(process.env.WORKERS || '1'),
  fullyParallel: false,  // serial within each file
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ...(isCI ? [['junit', { outputFile: 'test-results/junit-results.xml' }]] : []),
  ],
});
```

Key decisions:
- `fullyParallel: false` — preserves serial CreateHappy → downstream order within each file
- `WORKERS` env var — override from CLI or pipeline parameter
- JUnit reporter only in CI — detected via `TF_BUILD` (Azure DevOps) or `CI` env var

---

## npm Scripts

| Script | Command | Use Case |
|---|---|---|
| `test:excel` | `npx playwright test excel-driven-e2e` | Run all Excel files |
| `test:excel:file` | `npx playwright test excel-driven-e2e` | With `EXCEL=` env var |
| `test:excel:smoke` | `MAX_SCENARIOS=2 npx playwright test excel-driven-e2e` | Quick smoke (2 per sheet) |
| `test:excel:negative` | `TEST_TYPE=negative npx playwright test excel-driven-e2e` | Negatives only |
| `test:excel:search` | `TEST_TYPE=search npx playwright test excel-driven-e2e` | Searches only |
| `test:excel:nosql` | `SKIP_SQL=true npx playwright test excel-driven-e2e` | No SQL lookups |
| `test:excel:regression` | `npx playwright test excel-driven-e2e` | Full regression |
| `test:excel:parallel` | `WORKERS=4 npx playwright test excel-driven-e2e` | 4 parallel workers |
| `test:excel:shard` | `npx playwright test excel-driven-e2e` | With `--shard=N/M` |
| `report` | `npx playwright show-report playwright-report` | Open Playwright HTML report |

---

## Quick Reference

| What | Command | Time |
|---|---|---|
| One file, smoke | `set EXCEL=609768_Appointment.xlsx&& set MAX_SCENARIOS=3&& npm run test:excel` | ~30s |
| One file, full | `set EXCEL=609768_Appointment.xlsx&& npm run test:excel` | ~56s |
| All files, 4 workers | `npm run test:excel:parallel` | ~20 min |
| All files, 3 shards | `npx playwright test excel-driven-e2e --shard=1/3` (×3 agents) | ~7 min |
| View report | `npm run report` | — |

---

## What's NOT Built (Phase 3 Remaining)

| Planned | Status | Notes |
|---|---|---|
| Module-level HTML report with drill-down (regression_report.html) | ❌ Not built | Current report is per-file; module grouping needs `module-registry.json` (Phase 2) |
| Nested output folders per module/aggregate | ❌ Not built | Output is flat per entity — `output/{Entity}_E2E_{ts}/` |
| `suites.json` predefined groups | ❌ Not built | SUITE env var not implemented |

---

## Verified Results

**DevF1 Appointment run (107 scenarios)**:
- 108/108 Playwright passed, 99/107 real passes (92.5%), 56 seconds
- HTML report generated at `output/Appointment_E2E_2026-04-24T1000/06_report.html`
- Summary cards, type breakdown, drill-down, failed details all rendering correctly
