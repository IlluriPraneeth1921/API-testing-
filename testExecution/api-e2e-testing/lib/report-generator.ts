import * as fs from 'fs';
import * as path from 'path';
import { CompareResult } from './field-matcher';

interface SqlVerifyRow { Entity: string; Table: string; Key: string; Rows: number; Cols: number; Status: string; }
interface GetSummaryRow { Endpoint: string; Status: string; Items: number; }
interface GapRow { Section: string; Entity: string; Field: string; API_Value: string; SQL_Value: string; Status: string; Gap_Type: string; Notes: string; }

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

export class ReportGenerator {
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

  writeGetSummary(rows: GetSummaryRow[]): void {
    writeCsv(path.join(this.outDir, '04_get_summary.csv'), ['Endpoint', 'Status', 'Items'], rows);
  }

  writeSqlVerify(rows: SqlVerifyRow[]): void {
    writeCsv(path.join(this.outDir, '05_sql_verify.csv'), ['Entity', 'Table', 'Key', 'Rows', 'Cols', 'Status'], rows);
  }

  writeFieldComparison(rows: CompareResult[]): void {
    writeCsv(path.join(this.outDir, '06_get_vs_sql.csv'), ['Entity', 'API_Field', 'SQL_Column', 'API_Value', 'SQL_Value', 'Match'], rows);
  }

  writeGapAnalysis(
    keys: { orgKey?: string; locKey?: string; staffKey?: string },
    getSummary: GetSummaryRow[], sqlRes: SqlVerifyRow[], cmpRes: CompareResult[],
    getSqlMap: Record<string, [string, string, string]>, totalEndpoints: number
  ): void {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const entityStats: Record<string, { Total: number; Match: number; Mismatch: number; NoCol: number; NoRow: number }> = {};
    for (const r of cmpRes) {
      const ent = r.Entity.split('[')[0];
      if (!entityStats[ent]) entityStats[ent] = { Total: 0, Match: 0, Mismatch: 0, NoCol: 0, NoRow: 0 };
      entityStats[ent].Total++;
      if (r.Match === 'YES') entityStats[ent].Match++;
      else if (r.Match === 'NO') entityStats[ent].Mismatch++;
      else if (r.Match === 'NO_SQL_COL') entityStats[ent].NoCol++;
      else if (r.Match === 'NO_SQL_ROW') entityStats[ent].NoRow++;
    }

    const totalFields = cmpRes.length;
    const totalMatch = cmpRes.filter((r) => r.Match === 'YES').length;
    const totalMismatch = cmpRes.filter((r) => r.Match === 'NO').length;
    const totalNocol = cmpRes.filter((r) => r.Match === 'NO_SQL_COL').length;
    const totalNorow = cmpRes.filter((r) => r.Match === 'NO_SQL_ROW').length;
    const sqlFound = sqlRes.filter((r) => r.Status === 'FOUND').length;
    const getOk = getSummary.filter((g) => g.Status === 'OK').length;

    // CSV
    const gapRows: GapRow[] = [];
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'Environment', API_Value: this.envName, SQL_Value: this.baseUrl, Status: '', Gap_Type: '', Notes: '' });
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'OrganizationKey', API_Value: keys.orgKey || '', SQL_Value: '', Status: '', Gap_Type: '', Notes: '' });
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'LocationKey', API_Value: keys.locKey || '', SQL_Value: '', Status: '', Gap_Type: '', Notes: '' });
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'StaffMemberKey', API_Value: keys.staffKey || '', SQL_Value: '', Status: '', Gap_Type: '', Notes: '' });
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'GETs_OK', API_Value: `${getOk}/${totalEndpoints}`, SQL_Value: '', Status: getOk === totalEndpoints ? 'PASS' : 'FAIL', Gap_Type: '', Notes: '' });
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'SQL_Tables_With_Data', API_Value: `${sqlFound}/${sqlRes.length}`, SQL_Value: '', Status: sqlFound === sqlRes.length ? 'PASS' : 'GAP', Gap_Type: '', Notes: `${sqlRes.length - sqlFound} tables missing data` });
    const pctStr = totalFields ? `${((totalMatch / totalFields) * 100).toFixed(1)}%` : 'N/A';
    gapRows.push({ Section: 'EXECUTIVE_SUMMARY', Entity: '', Field: 'Fields_Matched', API_Value: `${totalMatch}/${totalFields}`, SQL_Value: pctStr, Status: totalMismatch === 0 ? 'PASS' : 'FAIL', Gap_Type: '', Notes: `Mismatch=${totalMismatch} NoCol=${totalNocol} NoRow=${totalNorow}` });

    for (const [ent, st] of Object.entries(entityStats)) {
      const pct = st.Total ? `${((st.Match / st.Total) * 100).toFixed(0)}%` : 'N/A';
      const status = st.Mismatch === 0 && st.NoRow === 0 ? 'PASS' : st.NoRow > 0 ? 'GAP' : 'MISMATCH';
      const notes: string[] = [];
      if (st.NoCol > 0) notes.push(`${st.NoCol} API-enriched fields not in SQL`);
      if (st.NoRow > 0) notes.push('No SQL data found');
      gapRows.push({ Section: 'ENTITY_SUMMARY', Entity: ent, Field: `${st.Match}/${st.Total} (${pct})`, API_Value: `Match=${st.Match}`, SQL_Value: `Mismatch=${st.Mismatch} NoCol=${st.NoCol}`, Status: status, Gap_Type: '', Notes: notes.join('; ') });
    }

    for (const r of sqlRes) {
      gapRows.push({ Section: 'SQL_VERIFICATION', Entity: r.Entity, Field: r.Table, API_Value: `${r.Rows} rows`, SQL_Value: `${r.Cols} cols`, Status: r.Status, Gap_Type: r.Status === 'NOT_FOUND' ? 'MISSING_DATA' : '', Notes: r.Status === 'NOT_FOUND' ? 'Data not found in SQL' : '' });
    }

    for (const r of cmpRes) {
      if (r.Match === 'YES') {
        gapRows.push({ Section: 'MATCHED_FIELDS', Entity: r.Entity, Field: r.API_Field, API_Value: r.API_Value.slice(0, 200), SQL_Value: r.SQL_Value.slice(0, 200), Status: 'YES', Gap_Type: '', Notes: `SQL Column: ${r.SQL_Column}` });
      } else {
        let gapType = r.Match, notes = '';
        if (r.Match === 'NO') { gapType = 'VALUE_MISMATCH'; notes = `API=${r.API_Value.slice(0, 80)} vs SQL=${r.SQL_Value.slice(0, 80)}`; }
        else if (r.Match === 'NO_SQL_COL') { gapType = 'API_ENRICHED_FIELD'; notes = `API returns '${r.API_Field}' but no matching SQL column found`; }
        else if (r.Match === 'NO_SQL_ROW') { gapType = 'MISSING_SQL_DATA'; notes = 'No SQL row found for this entity'; }
        gapRows.push({ Section: 'FIELD_GAPS', Entity: r.Entity, Field: r.API_Field, API_Value: r.API_Value.slice(0, 200), SQL_Value: r.SQL_Value.slice(0, 200), Status: r.Match, Gap_Type: gapType, Notes: notes });
      }
    }

    writeCsv(path.join(this.outDir, '07_gap_analysis.csv'), ['Section', 'Entity', 'Field', 'API_Value', 'SQL_Value', 'Status', 'Gap_Type', 'Notes'], gapRows);

    // Markdown
    const md: string[] = [];
    md.push(`# OrganizationModule Gap Analysis - ${ts}\n`);
    md.push('## Test Records\n');
    md.push('| Aggregate | Key |\n|-----------|-----|\n');
    md.push(`| Organization | \`${keys.orgKey}\` |\n| Location | \`${keys.locKey}\` |\n| StaffMember | \`${keys.staffKey}\` |\n`);
    md.push(`\n**Environment:** ${this.envName} | **Base URL:** ${this.baseUrl}\n\n---\n`);
    md.push('\n## Executive Summary\n');
    md.push('| Metric | Value | Status |\n|--------|-------|--------|\n');
    md.push(`| API Endpoints | ${getOk}/${totalEndpoints} OK | ${getOk === totalEndpoints ? '✅' : '❌'} |\n`);
    md.push(`| SQL Tables with Data | ${sqlFound}/${sqlRes.length} | ${sqlFound === sqlRes.length ? '✅' : '⚠️ ' + (sqlRes.length - sqlFound) + ' missing'} |\n`);
    md.push(`| Fields Matched | ${totalMatch}/${totalFields} (${pctStr}) | ${totalMismatch === 0 ? '✅' : '❌'} |\n`);
    md.push(`| Value Mismatches | ${totalMismatch} | ${totalMismatch === 0 ? '✅ None' : '❌'} |\n`);
    md.push(`| API-Enriched (no SQL col) | ${totalNocol} | ℹ️ Expected |\n`);
    md.push(`| Missing SQL Rows | ${totalNorow} | ${totalNorow === 0 ? '✅ None' : '⚠️'} |\n`);

    md.push('\n## Entity-Level Results\n');
    md.push('| Entity | SQL Table | Match | Mismatch | No SQL Col | No SQL Row | Status |\n');
    md.push('|--------|-----------|-------|----------|------------|------------|--------|\n');
    for (const [ent, st] of Object.entries(entityStats)) {
      const status = st.Mismatch === 0 && st.NoRow === 0 ? '✅ PASS' : st.NoRow > 0 ? '⚠️ GAP' : '❌ MISMATCH';
      const tbl = getSqlMap[ent]?.[0] || '';
      md.push(`| ${ent} | ${tbl} | ${st.Match} | ${st.Mismatch} | ${st.NoCol} | ${st.NoRow} | ${status} |\n`);
    }

    const notFound = sqlRes.filter((r) => r.Status === 'NOT_FOUND');
    if (notFound.length) {
      md.push('\n## ⚠️ SQL Tables Missing Data\n');
      md.push('| Entity | Table | Columns | Issue |\n|--------|-------|---------|-------|\n');
      for (const r of notFound) md.push(`| ${r.Entity} | ${r.Table} | ${r.Cols} | No rows found for key \`${r.Key.slice(0, 12)}...\` |\n`);
    }

    const nocolFields = cmpRes.filter((r) => r.Match === 'NO_SQL_COL');
    if (nocolFields.length) {
      md.push('\n## ℹ️ API-Enriched Fields (Not in SQL)\n');
      md.push('| Entity | API Field | API Value |\n|--------|-----------|----------|\n');
      for (const r of nocolFields) md.push(`| ${r.Entity} | \`${r.API_Field}\` | ${r.API_Value.slice(0, 60)} |\n`);
    }

    md.push('\n## Detailed Field Comparison\n');
    let currentEnt = '';
    for (const r of cmpRes) {
      const entBase = r.Entity.split('[')[0];
      if (entBase !== currentEnt) {
        currentEnt = entBase;
        const st = entityStats[currentEnt] || {};
        const icon = (st as any).Mismatch === 0 && (st as any).NoRow === 0 ? '✅' : '❌';
        md.push(`\n### ${icon} ${currentEnt}\n\n| Field | SQL Column | API Value | SQL Value | Match |\n|-------|------------|-----------|-----------|-------|\n`);
      }
      const mIcon = r.Match === 'YES' ? '✅' : r.Match === 'NO' ? '❌' : '⚠️';
      md.push(`| \`${r.API_Field}\` | ${r.SQL_Column} | ${r.API_Value.slice(0, 50)} | ${r.SQL_Value.slice(0, 50)} | ${mIcon} ${r.Match} |\n`);
    }
    md.push(`\n---\n\n*Generated: ${ts} | Environment: ${this.envName}*\n`);

    fs.writeFileSync(path.join(this.outDir, '07_gap_analysis_report.md'), md.join(''), 'utf-8');
  }
}
