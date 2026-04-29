/**
 * E2E Report Generator — writes per-test-type CSV results + summary JSON.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateHtmlReport } from './html-report-generator';

function csvEscape(val: any): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(filePath: string, headers: string[], rows: Record<string, any>[]): void {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(',')),
  ];
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

export interface ScenarioResult {
  sheet: string;
  scenario: string;
  type: string;
  method: string;
  url: string;
  expectedStatus: number;
  actualStatus: number;
  expectedMessage?: string;
  actualMessage?: string;
  messageMatch?: boolean;
  expectedCount?: string;
  actualCount?: number;
  countMatch?: boolean;
  entityKey?: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export class E2EReportGenerator {
  private outDir: string;
  private results: ScenarioResult[] = [];
  private meta: { entity?: string; environment?: string; timestamp?: string; tfsId?: string } = {};

  constructor(outDir: string, meta?: { entity?: string; environment?: string; timestamp?: string; tfsId?: string }) {
    this.outDir = outDir;
    this.meta = meta || {};
    fs.mkdirSync(outDir, { recursive: true });
  }

  addResult(r: ScenarioResult): void {
    this.results.push(r);
  }

  saveJson(name: string, data: any): void {
    fs.writeFileSync(path.join(this.outDir, name), JSON.stringify(data, null, 2), 'utf-8');
  }

  writeResults(): void {
    const headers = [
      'Sheet', 'Scenario', 'Type', 'Method', 'URL',
      'ExpectedStatus', 'ActualStatus',
      'ExpectedMessage', 'ActualMessage', 'MessageMatch',
      'ExpectedCount', 'ActualCount', 'CountMatch',
      'EntityKey', 'Passed', 'Error', 'DurationMs',
    ];

    const byType: Record<string, ScenarioResult[]> = {};
    for (const r of this.results) {
      const t = r.type;
      if (!byType[t]) byType[t] = [];
      byType[t].push(r);
    }

    // Per-type CSVs
    const typeFiles: Record<string, string> = {
      CreateHappy: '01_create_results.csv',
      CreateNegative: '02_negative_results.csv',
      UpdateHappy: '01b_update_results.csv',
      UpdateNegative: '02b_update_negative_results.csv',
      SubEndpointHappy: '01c_subendpoint_results.csv',
      SubEndpointNegative: '02c_subendpoint_negative_results.csv',
      SearchValidation: '03_search_results.csv',
      ErrorCodeValidation: '04_error_code_results.csv',
      ComboTest: '05_combo_results.csv',
      AddRemoveTest: '05b_add_remove_results.csv',
    };

    for (const [type, rows] of Object.entries(byType)) {
      const fname = typeFiles[type] || `06_${type.toLowerCase()}_results.csv`;
      writeCsv(path.join(this.outDir, fname), headers, rows.map(r => ({
        Sheet: r.sheet, Scenario: r.scenario, Type: r.type, Method: r.method, URL: r.url,
        ExpectedStatus: r.expectedStatus, ActualStatus: r.actualStatus,
        ExpectedMessage: r.expectedMessage || '', ActualMessage: r.actualMessage || '',
        MessageMatch: r.messageMatch ?? '', ExpectedCount: r.expectedCount || '',
        ActualCount: r.actualCount ?? '', CountMatch: r.countMatch ?? '',
        EntityKey: r.entityKey || '', Passed: r.passed ? 'PASS' : 'FAIL',
        Error: r.error || '', DurationMs: r.durationMs,
      })));
    }

    // All results CSV
    writeCsv(path.join(this.outDir, '00_all_results.csv'), headers, this.results.map(r => ({
      Sheet: r.sheet, Scenario: r.scenario, Type: r.type, Method: r.method, URL: r.url,
      ExpectedStatus: r.expectedStatus, ActualStatus: r.actualStatus,
      ExpectedMessage: r.expectedMessage || '', ActualMessage: r.actualMessage || '',
      MessageMatch: r.messageMatch ?? '', ExpectedCount: r.expectedCount || '',
      ActualCount: r.actualCount ?? '', CountMatch: r.countMatch ?? '',
      EntityKey: r.entityKey || '', Passed: r.passed ? 'PASS' : 'FAIL',
      Error: r.error || '', DurationMs: r.durationMs,
    })));

    // Summary JSON
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const byTypeCount: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const [type, rows] of Object.entries(byType)) {
      const p = rows.filter(r => r.passed).length;
      byTypeCount[type] = { total: rows.length, passed: p, failed: rows.length - p };
    }

    this.saveJson('00_summary.json', {
      total, passed, failed,
      passRate: total ? `${((passed / total) * 100).toFixed(1)}%` : 'N/A',
      byType: byTypeCount,
      timestamp: new Date().toISOString(),
    });

    console.log(`\n  📊 Results: ${passed}/${total} passed (${failed} failed)`);
    for (const [type, c] of Object.entries(byTypeCount)) {
      const icon = c.failed === 0 ? '✅' : '❌';
      console.log(`     ${icon} ${type}: ${c.passed}/${c.total}`);
    }
    console.log(`  📁 Output: ${this.outDir}`);

    // Generate HTML report
    generateHtmlReport(this.results, this.outDir, this.meta);
  }

  getResults(): ScenarioResult[] {
    return [...this.results];
  }
}
