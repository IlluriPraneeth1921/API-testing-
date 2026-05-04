import * as fs from 'fs';
import * as path from 'path';
import { NoteCompareResult } from './note-field-matcher';

export interface NoteSummaryRow { name: string; post_ok: boolean; key: string | null; get_ok: boolean; sql_ok: boolean; }

function csvLine(vals: string[]): string {
  return vals.map((v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

function writeCsv(filePath: string, headers: string[], rows: Record<string, any>[]): void {
  const lines = [csvLine(headers), ...rows.map((r) => csvLine(headers.map((h) => r[h] ?? '')))];
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

export class NoteReportGenerator {
  private outDir: string;
  private envName: string;
  private baseUrl: string;

  constructor(outDir: string, envName: string, baseUrl: string) {
    this.outDir = outDir;
    this.envName = envName;
    this.baseUrl = baseUrl;
    fs.mkdirSync(outDir, { recursive: true });
  }

  saveJson(name: string, data: any): void {
    fs.writeFileSync(path.join(this.outDir, name), JSON.stringify(data, null, 2), 'utf-8');
  }

  writeSummary(rows: NoteSummaryRow[]): void {
    writeCsv(path.join(this.outDir, '01_summary.csv'), ['name', 'post_ok', 'key', 'get_ok', 'sql_ok'], rows);
  }

  writeFieldComparison(rows: NoteCompareResult[]): void {
    writeCsv(path.join(this.outDir, '02_get_vs_sql.csv'), ['Entity', 'API_Field', 'SQL_Column', 'API_Value', 'SQL_Value', 'Match'], rows);
  }

  writeGaps(rows: NoteCompareResult[]): void {
    const gaps = rows.filter((r) => !['YES', 'NOT_PERSISTED'].includes(r.Match));
    if (gaps.length) {
      writeCsv(path.join(this.outDir, '03_gaps.csv'), ['Entity', 'API_Field', 'SQL_Column', 'API_Value', 'SQL_Value', 'Match'], gaps);
    }
  }

  writeGapAnalysisReport(results: NoteSummaryRow[], cmpRes: NoteCompareResult[]): void {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const total = cmpRes.length;
    const y = cmpRes.filter((r) => r.Match === 'YES').length;
    const n = cmpRes.filter((r) => r.Match === 'NO').length;
    const nc = cmpRes.filter((r) => r.Match === 'NO_SQL_COL').length;
    const np = cmpRes.filter((r) => r.Match === 'NOT_PERSISTED').length;
    const pct = total ? `${((y / total) * 100).toFixed(1)}%` : 'N/A';

    const md: string[] = [];
    md.push(`# NoteModule Gap Analysis - ${ts}\n`);
    md.push(`**Environment:** ${this.envName} | **Base URL:** ${this.baseUrl}\n\n---\n`);
    md.push('\n## Executive Summary\n');
    md.push('| Metric | Value | Status |\n|--------|-------|--------|\n');
    md.push(`| Notes Tested | ${results.length} | |\n`);
    md.push(`| POST OK | ${results.filter((r) => r.post_ok).length}/${results.length} | ${results.every((r) => r.post_ok) ? '✅' : '❌'} |\n`);
    md.push(`| GET OK | ${results.filter((r) => r.get_ok).length}/${results.length} | ${results.every((r) => r.get_ok) ? '✅' : '❌'} |\n`);
    md.push(`| SQL OK | ${results.filter((r) => r.sql_ok).length}/${results.length} | ${results.every((r) => r.sql_ok) ? '✅' : '⚠️'} |\n`);
    md.push(`| Fields Matched | ${y}/${total} (${pct}) | ${n === 0 ? '✅' : '❌'} |\n`);
    md.push(`| Value Mismatches | ${n} | ${n === 0 ? '✅' : '❌'} |\n`);
    md.push(`| No SQL Column | ${nc} | ℹ️ |\n`);
    md.push(`| Not Persisted | ${np} | ℹ️ |\n`);

    md.push('\n## Note-Level Results\n');
    md.push('| Note Type | POST | GET | SQL | Match | Mismatch | NoCol | Key |\n');
    md.push('|-----------|------|-----|-----|-------|----------|-------|-----|\n');
    for (const r of results) {
      const eCmp = cmpRes.filter((c) => c.Entity === r.name || c.Entity === `${r.name}->CaseNote`);
      const ey = eCmp.filter((c) => c.Match === 'YES').length;
      const en = eCmp.filter((c) => c.Match === 'NO').length;
      const enc = eCmp.filter((c) => c.Match === 'NO_SQL_COL').length;
      md.push(`| ${r.name} | ${r.post_ok ? '✅' : '❌'} | ${r.get_ok ? '✅' : '❌'} | ${r.sql_ok ? '✅' : '❌'} | ${ey} | ${en} | ${enc} | \`${(r.key || '').slice(0, 12)}...\` |\n`);
    }

    const mismatches = cmpRes.filter((r) => r.Match === 'NO');
    if (mismatches.length) {
      md.push('\n## ❌ Value Mismatches\n');
      md.push('| Entity | API Field | SQL Column | API Value | SQL Value |\n');
      md.push('|--------|-----------|------------|-----------|----------|\n');
      for (const r of mismatches) md.push(`| ${r.Entity} | \`${r.API_Field}\` | ${r.SQL_Column} | ${r.API_Value.slice(0, 50)} | ${r.SQL_Value.slice(0, 50)} |\n`);
    }

    md.push(`\n---\n\n*Generated: ${ts} | Environment: ${this.envName}*\n`);
    fs.writeFileSync(path.join(this.outDir, '04_gap_analysis_report.md'), md.join(''), 'utf-8');
  }
}
