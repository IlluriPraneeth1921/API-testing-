import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { extractVariables, getGeneratedVariableNames, getKnownSqlVariableNames } from './variable-resolver';
import { listExcelFiles, parseExcel, parseFilename, type TestSuite } from './excel-parser';
import { resolveRoute } from './route-resolver';

type VariableSource = 'sql' | 'generated' | 'runtime-key' | 'unknown';

interface FileAudit {
  file: string;
  tfsId: string;
  entityName: string;
  moduleSegment: string;
  allVariables: string[];
  searchVariables: string[];
  variablesBySource: Record<VariableSource, string[]>;
}

interface AuditSummary {
  fileCount: number;
  distinctVariableCount: number;
  searchVariableCount: number;
  unknownVariableCount: number;
  runtimeKeyCount: number;
  unknownVariables: string[];
  runtimeKeyVariables: string[];
}

const API_DIR = path.resolve(__dirname, '..', '..', 'API-TestData');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'excel-variable-audit.json');

const SQL_VARIABLES = new Set(getKnownSqlVariableNames());
const GENERATED_VARIABLES = new Set(getGeneratedVariableNames());

function classifyVariable(varName: string): VariableSource {
  if (SQL_VARIABLES.has(varName)) return 'sql';
  if (GENERATED_VARIABLES.has(varName)) return 'generated';
  if (/key\d*$/i.test(varName)) return 'runtime-key';
  return 'unknown';
}

function getModuleSegment(entityName: string): string {
  const route = resolveRoute(entityName);
  const segments = route.postRoute.split('/').filter(Boolean);
  return segments[2] || '';
}

function collectVariablesFromValue(value: unknown, variables: Set<string>): void {
  if (typeof value !== 'string' || !value.includes('${')) return;
  for (const varName of extractVariables([value])) {
    variables.add(varName);
  }
}

function extractWorkbookVariables(filename: string): string[] {
  const workbook = XLSX.readFile(path.join(API_DIR, filename));
  const variables = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    for (const row of rows) {
      for (const value of Object.values(row)) {
        collectVariablesFromValue(value, variables);
      }
    }
  }

  return [...variables].sort();
}

function collectSearchVariables(suite: TestSuite): string[] {
  const searchTexts = suite.sheets
    .filter(sheet => sheet.sheetType === 'SearchValidation')
    .flatMap(sheet => sheet.scenarios.map(sc => sc.requestUrl || ''));

  return [...extractVariables(searchTexts)].sort();
}

function buildSourceBuckets(variableNames: string[]): Record<VariableSource, string[]> {
  const buckets: Record<VariableSource, string[]> = {
    sql: [],
    generated: [],
    'runtime-key': [],
    unknown: [],
  };

  for (const varName of variableNames) {
    buckets[classifyVariable(varName)].push(varName);
  }

  return buckets;
}

function createFileAudit(filename: string): FileAudit {
  const { tfsId, entityName } = parseFilename(filename);
  const suite = parseExcel(filename);
  const allVariables = extractWorkbookVariables(filename);
  const searchVariables = collectSearchVariables(suite);

  return {
    file: filename,
    tfsId,
    entityName,
    moduleSegment: getModuleSegment(entityName),
    allVariables,
    searchVariables,
    variablesBySource: buildSourceBuckets(allVariables),
  };
}

function distinctValues(items: string[][]): string[] {
  return [...new Set(items.flat())].sort();
}

function buildSummary(files: FileAudit[]): AuditSummary {
  const allVariables = distinctValues(files.map(file => file.allVariables));
  const searchVariables = distinctValues(files.map(file => file.searchVariables));
  const unknownVariables = distinctValues(files.map(file => file.variablesBySource.unknown));
  const runtimeKeyVariables = distinctValues(files.map(file => file.variablesBySource['runtime-key']));

  return {
    fileCount: files.length,
    distinctVariableCount: allVariables.length,
    searchVariableCount: searchVariables.length,
    unknownVariableCount: unknownVariables.length,
    runtimeKeyCount: runtimeKeyVariables.length,
    unknownVariables,
    runtimeKeyVariables,
  };
}

function main(): void {
  const files = listExcelFiles();
  const audits = files.map(createFileAudit);
  const summary = buildSummary(audits);

  const report = {
    generatedAt: new Date().toISOString(),
    apiDir: API_DIR,
    knownSqlVariables: [...SQL_VARIABLES].sort(),
    generatedVariables: [...GENERATED_VARIABLES].sort(),
    summary,
    files: audits,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`[audit] scanned ${summary.fileCount} Excel file(s)`);
  console.log(`[audit] distinct variables: ${summary.distinctVariableCount}`);
  console.log(`[audit] search variables: ${summary.searchVariableCount}`);
  console.log(`[audit] runtime-only key variables: ${summary.runtimeKeyCount}`);
  console.log(`[audit] unknown variables: ${summary.unknownVariableCount}`);
  console.log(`[audit] wrote ${OUTPUT_FILE}`);
}

main();
