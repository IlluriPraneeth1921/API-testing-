import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export interface TestRow {
  testCaseId: string;
  httpMethod: string;
  endpoint: string;
  payload: Record<string, any>;
  expectedStatus: number;
  expectedFields: Record<string, any>;
  sqlTable?: string;
  sqlKeyCol?: string;
  description?: string;
}

export interface ExcelTestData {
  entityName: string;
  tfsId: string;
  rows: TestRow[];
}

const API_DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'API');

export function listAvailableExcels(): string[] {
  return fs.readdirSync(API_DATA_DIR)
    .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$') && !f.startsWith('x'));
}

export function parseEntityFromFilename(filename: string): { tfsId: string; entityName: string } {
  const base = path.basename(filename, '.xlsx');
  const match = base.match(/^(\d+)_(.+)$/);
  if (match) return { tfsId: match[1], entityName: match[2] };
  return { tfsId: '', entityName: base };
}

export function readExcelFile(filename: string): ExcelTestData {
  const filePath = path.join(API_DATA_DIR, filename);
  const workbook = XLSX.readFile(filePath);
  const { tfsId, entityName } = parseEntityFromFilename(filename);

  const rows: TestRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (!jsonData.length) continue;

    const headers = Object.keys(jsonData[0]).map(h => h.trim().toLowerCase());

    for (const row of jsonData) {
      const normalized: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[k.trim().toLowerCase()] = v;
      }

      const method = String(normalized['httpmethod'] || normalized['method'] || normalized['http method'] || 'POST').toUpperCase();
      const ep = String(normalized['endpoint'] || normalized['url'] || normalized['api endpoint'] || '');
      const status = Number(normalized['expectedstatus'] || normalized['expected status'] || normalized['statuscode'] || 200);
      const desc = String(normalized['description'] || normalized['test case'] || normalized['testcase'] || '');
      const tcId = String(normalized['testcaseid'] || normalized['tc id'] || normalized['id'] || `${sheetName}_${rows.length + 1}`);
      const sqlTbl = String(normalized['sqltable'] || normalized['sql table'] || normalized['table'] || '');
      const sqlKey = String(normalized['sqlkeycol'] || normalized['sql key'] || normalized['keycolumn'] || '');

      // Build payload from columns that aren't metadata
      const metaKeys = new Set([
        'httpmethod', 'method', 'http method', 'endpoint', 'url', 'api endpoint',
        'expectedstatus', 'expected status', 'statuscode', 'description', 'test case',
        'testcase', 'testcaseid', 'tc id', 'id', 'sqltable', 'sql table', 'table',
        'sqlkeycol', 'sql key', 'keycolumn',
      ]);

      const payload: Record<string, any> = {};
      const expected: Record<string, any> = {};

      for (const [k, v] of Object.entries(row)) {
        const key = k.trim();
        const lower = key.toLowerCase();
        if (metaKeys.has(lower) || v === '' || v === null || v === undefined) continue;

        if (lower.startsWith('expected_') || lower.startsWith('exp_')) {
          expected[key.replace(/^(expected_|exp_)/i, '')] = v;
        } else {
          payload[key] = v;
        }
      }

      if (ep || Object.keys(payload).length > 0) {
        rows.push({
          testCaseId: tcId,
          httpMethod: method,
          endpoint: ep,
          payload,
          expectedStatus: status,
          expectedFields: expected,
          sqlTable: sqlTbl || undefined,
          sqlKeyCol: sqlKey || undefined,
          description: desc || undefined,
        });
      }
    }
  }

  return { entityName, tfsId, rows };
}

export function buildNestedPayload(flat: Record<string, any>): any {
  const result: any = {};
  for (const [dotPath, value] of Object.entries(flat)) {
    if (value === '' || value === null || value === undefined) continue;
    const parts = dotPath.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrMatch) {
        const arrName = arrMatch[1];
        const idx = Number(arrMatch[2]);
        if (!current[arrName]) current[arrName] = [];
        while (current[arrName].length <= idx) current[arrName].push({});
        current = current[arrName][idx];
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
    const leaf = parts[parts.length - 1];
    current[leaf] = value;
  }
  return result;
}
