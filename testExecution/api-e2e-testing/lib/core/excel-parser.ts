/**
 * Excel Parser — reads any Katalon-style Excel and classifies sheets by header pattern.
 *
 * Top 8 patterns (covering ~87% of ~950 sheets):
 *   1. RequestBody + no UserMessage/StatusCode        → CreateHappy / UpdateHappy
 *   2. RequestBody + UserMessage (+ optional StatusCode) → CreateNegative / UpdateNegative
 *   3. RequestBody + StatusCode (no UserMessage)       → CreateHappy with status
 *   4. RequestBody + RequestUrl + StatusCode            → SubEndpointHappy
 *   5. RequestBody + RequestUrl + UserMessage + StatusCode → SubEndpointNegative
 *   6. RequestURL + RecordCount                        → SearchValidation
 *   7. Resource + PrimaryKey + StatusCode + UserMessage → ErrorCodeValidation
 *   8. PutRequestUrl + GetRequestUrl + ...             → ComboTest
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// ── Types ──

export type SheetType =
  | 'CreateHappy' | 'CreateNegative'
  | 'UpdateHappy' | 'UpdateNegative'
  | 'SubEndpointHappy' | 'SubEndpointNegative'
  | 'SearchValidation' | 'ErrorCodeValidation'
  | 'ComboTest' | 'AddRemoveTest'
  | 'Unknown';

export interface TestScenario {
  scenario: string;
  requestBody?: string;
  requestUrl?: string;
  logMessage?: string;
  userMessage?: string;
  statusCode?: number;
  recordCount?: string;
  resource?: string;
  primaryKey?: string;
  // Combo fields
  putRequestUrl?: string;
  putStatusCode?: number;
  getRequestUrl?: string;
  getStatusCode?: number;
  getRecordCount?: string;
  // AddRemove fields
  putRemoveRequestUrl?: string;
  putRemoveStatusCode?: number;
  deleteRemoveRequestUrl?: string;
  deleteRemoveStatusCode?: number;
  // Raw row for anything we missed
  raw: Record<string, any>;
}

export interface TestSheet {
  sheetName: string;
  sheetType: SheetType;
  scenarios: TestScenario[];
}

export interface TestSuite {
  filename: string;
  tfsId: string;
  entityName: string;
  sheets: TestSheet[];
}

// ── Constants ──

const API_DIR = path.resolve(__dirname, '..', '..', 'API-TestData');

function getApiDir(): string {
  if (fs.existsSync(API_DIR) && fs.readdirSync(API_DIR).some(f => f.endsWith('.xlsx'))) return API_DIR;
  return API_DIR;
}

// ── Public API ──

export function listExcelFiles(): string[] {
  return fs.readdirSync(getApiDir())
    .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$') && !f.startsWith('x'));
}

export function parseFilename(filename: string): { tfsId: string; entityName: string } {
  const base = path.basename(filename, '.xlsx');
  const m = base.match(/^(\d+)_(.+)$/);
  return m ? { tfsId: m[1], entityName: m[2] } : { tfsId: '', entityName: base };
}

export function parseExcel(filename: string): TestSuite {
  const filePath = path.join(getApiDir(), filename);
  const workbook = XLSX.readFile(filePath);
  const { tfsId, entityName } = parseFilename(filename);
  const sheets: TestSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: '' });
    if (!raw.length) continue;

    const headers = Object.keys(raw[0]);
    const hSet = new Set(headers.map(h => h.trim()));
    const sheetType = classifySheet(hSet, sheetName);
    if (sheetType === 'Unknown') continue;

    const scenarios = raw.map((row, i) => parseRow(row, i, sheetType));
    sheets.push({ sheetName, sheetType, scenarios });
  }

  return { filename, tfsId, entityName, sheets };
}

// ── Classification ──

function has(s: Set<string>, ...keys: string[]): boolean {
  return keys.every(k => s.has(k));
}

function hasAny(s: Set<string>, ...keys: string[]): boolean {
  return keys.some(k => s.has(k));
}

function classifySheet(h: Set<string>, sheetName: string): SheetType {
  const hasBody = hasAny(h, 'RequestBody', 'RequestBodyCreate');
  const hasUserMsg = hasAny(h, 'UserMessage');
  const hasStatus = hasAny(h, 'StatusCode');
  const hasReqUrl = hasAny(h, 'RequestUrl');
  const hasSearchUrl = hasAny(h, 'RequestURL');
  const hasRecordCount = hasAny(h, 'RecordCount');
  const hasResource = hasAny(h, 'Resource');
  const hasPrimaryKey = hasAny(h, 'PrimaryKey');
  const hasPutReqUrl = hasAny(h, 'PutRequestUrl');
  const hasGetReqUrl = hasAny(h, 'GetRequestUrl');
  const hasPutRemove = hasAny(h, 'PutRemoveRequestUrl');
  const hasDeleteRemove = hasAny(h, 'DeleteRemoveRequestUrl');

  const isUpdateSheet = /_002_/.test(sheetName);

  // Combo: PutRequestUrl + GetRequestUrl
  if (hasPutReqUrl && hasGetReqUrl) {
    if (hasPutRemove || hasDeleteRemove) return 'AddRemoveTest';
    return 'ComboTest';
  }

  // Error code: Resource + PrimaryKey + StatusCode
  if (hasResource && hasPrimaryKey && hasStatus && hasUserMsg) return 'ErrorCodeValidation';

  // Search: RequestURL + RecordCount (no body)
  if (hasSearchUrl && hasRecordCount && !hasBody) return 'SearchValidation';

  // Sub-endpoint: RequestBody + RequestUrl + StatusCode
  if (hasBody && hasReqUrl && hasStatus && hasUserMsg) return 'SubEndpointNegative';
  if (hasBody && hasReqUrl && hasStatus && !hasUserMsg) return 'SubEndpointHappy';

  // Standard POST/PUT with body
  if (hasBody && hasUserMsg) return isUpdateSheet ? 'UpdateNegative' : 'CreateNegative';
  if (hasBody && hasStatus && !hasUserMsg) return isUpdateSheet ? 'UpdateHappy' : 'CreateHappy';
  if (hasBody && !hasUserMsg && !hasStatus) return isUpdateSheet ? 'UpdateHappy' : 'CreateHappy';

  return 'Unknown';
}

// ── Row Parsing ──

function norm(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return String(row[k]);
  }
  return '';
}

function normNum(row: Record<string, any>, ...keys: string[]): number | undefined {
  const v = norm(row, ...keys);
  return v ? Number(v) : undefined;
}

function parseRow(row: Record<string, any>, idx: number, type: SheetType): TestScenario {
  return {
    scenario: norm(row, 'Scenario') || `Scenario${idx + 1}`,
    requestBody: norm(row, 'RequestBody', 'RequestBodyCreate'),
    requestUrl: norm(row, 'RequestUrl', 'RequestURL'),
    logMessage: norm(row, 'LogMessage', 'Log Message'),
    userMessage: norm(row, 'UserMessage') || undefined,
    statusCode: normNum(row, 'StatusCode'),
    recordCount: norm(row, 'RecordCount') || undefined,
    resource: norm(row, 'Resource') || undefined,
    primaryKey: norm(row, 'PrimaryKey') || undefined,
    putRequestUrl: norm(row, 'PutRequestUrl') || undefined,
    putStatusCode: normNum(row, 'PutStatusCode'),
    getRequestUrl: norm(row, 'GetRequestUrl') || undefined,
    getStatusCode: normNum(row, 'GetStatusCode'),
    getRecordCount: norm(row, 'GetRecordCount') || undefined,
    putRemoveRequestUrl: norm(row, 'PutRemoveRequestUrl') || undefined,
    putRemoveStatusCode: normNum(row, 'PutRemoveStatusCode'),
    deleteRemoveRequestUrl: norm(row, 'DeleteRemoveRequestUrl') || undefined,
    deleteRemoveStatusCode: normNum(row, 'DeleteRemoveStatusCode'),
    raw: row,
  };
}
