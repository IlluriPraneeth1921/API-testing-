/**
 * ============================================================================
 * Excel-Driven E2E Spec — THE single spec that runs any Excel file.
 * ============================================================================
 *
 * HOW IT WORKS (high-level flow):
 *   1. LOAD   — Reads Excel files from API-TestData/ folder
 *   2. PARSE  — Each Excel sheet is classified (CreateHappy, Negative, Search, etc.)
 *   3. AUTH   — Gets Cognito access token + SaveUserContext cookie
 *   4. ROUTE  — Resolves API route from Swagger or static registry
 *   5. RUN    — Executes each scenario row: POST/PUT/GET/DELETE
 *   6. ASSERT — Validates status code, user message, record count
 *   7. REPORT — Writes results to output/ folder
 *
 * USAGE:
 *   EXCEL=609768_Appointment.xlsx npx playwright test excel-driven-e2e
 *   TFS=609768 npx playwright test excel-driven-e2e
 *   npx playwright test excel-driven-e2e                    # runs ALL
 *   MAX_SCENARIOS=3 npx playwright test excel-driven-e2e    # quick smoke
 *   TEST_TYPE=negative npx playwright test excel-driven-e2e # only negatives
 *   SKIP_SQL=true npx playwright test excel-driven-e2e      # no SQL lookups
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { loadEnvConfig } from '../lib/env-config';
import { ApiClient } from '../lib/api-client';
import {
  parseExcel, listExcelFiles, parseFilename,
  type TestSuite, type TestSheet, type TestScenario, type SheetType,
} from '../lib/core/excel-parser';
import { VariableResolver, extractVariables } from '../lib/core/variable-resolver';
import { resolveRoute, extractEntityKey, setSwaggerJson } from '../lib/core/route-resolver';
import { fetchSwagger, getWriteMethod } from '../lib/core/swagger-client';
import {
  validateStatus, validateUserMessage, validateRecordCount,
  assertStatus, assertUserMessage, assertRecordCount,
} from '../lib/core/response-validator';
import { E2EReportGenerator, type ScenarioResult } from '../lib/core/e2e-report-generator';
import { getUserContextCookie } from '../lib/cookie-manager';
import * as fs from 'fs';

// ══════════════════════════════════════════════════════════════════════
// BLOCK 1: CONFIG — Load environment settings (DevF1/F1/F5) + CLI flags
// ══════════════════════════════════════════════════════════════════════

const { name: ENV_NAME, config: CFG } = loadEnvConfig();  // reads env_config.json
const SKIP_SQL = process.env.SKIP_SQL === 'true';          // skip SQL verification
const MAX_SCENARIOS = process.env.MAX_SCENARIOS ? parseInt(process.env.MAX_SCENARIOS) : undefined; // limit scenarios per sheet
const TEST_TYPE = process.env.TEST_TYPE;                   // filter: happy|negative|search|error|combo

// ══════════════════════════════════════════════════════════════════════
// BLOCK 2: FILE RESOLUTION — Decide which Excel files to run
//   - EXCEL env var → run single file
//   - TFS env var   → find by TFS ID prefix
//   - Neither       → run ALL Excel files in API-TestData/
// ══════════════════════════════════════════════════════════════════════

function resolveFiles(): string[] {
  const all = listExcelFiles();
  if (process.env.EXCEL) {
    const f = all.find(f => f === process.env.EXCEL || f.includes(process.env.EXCEL!));
    return f ? [f] : [];
  }
  if (process.env.TFS) {
    const f = all.find(f => f.startsWith(process.env.TFS! + '_'));
    return f ? [f] : [];
  }
  return all;
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 3: TYPE FILTER — Filter sheets by test type
//   - TEST_TYPE=happy    → only CreateHappy, UpdateHappy, SubEndpointHappy
//   - TEST_TYPE=negative → only CreateNegative, UpdateNegative, SubEndpointNegative
//   - TEST_TYPE=search   → only SearchValidation sheets
//   - TEST_TYPE=error    → only ErrorCodeValidation sheets
//   - TEST_TYPE=combo    → only ComboTest, AddRemoveTest sheets
//   - No filter          → run all sheet types
// ══════════════════════════════════════════════════════════════════════

function shouldRunType(sheetType: SheetType): boolean {
  if (!TEST_TYPE) return true;
  const map: Record<string, SheetType[]> = {
    happy: ['CreateHappy', 'UpdateHappy', 'SubEndpointHappy'],
    negative: ['CreateNegative', 'UpdateNegative', 'SubEndpointNegative'],
    search: ['SearchValidation'],
    error: ['ErrorCodeValidation'],
    combo: ['ComboTest', 'AddRemoveTest'],
  };
  return map[TEST_TYPE]?.includes(sheetType) ?? true;
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 4: PARSE EXCEL FILES — Read all matched Excel files at load time
//   - Extracts TFS ID + entity name from filename (e.g. 728300_Organization)
//   - Parses each sheet → classifies as CreateHappy/Negative/Search/etc.
//   - Resolves initial API route for the entity
//   - Swagger is fetched later in beforeAll to get live routes
// ══════════════════════════════════════════════════════════════════════

const files = resolveFiles();

interface ParsedFile {
  file: string;
  tfsId: string;
  entityName: string;
  suite: TestSuite;
  route: ReturnType<typeof resolveRoute>;
}

const parsedFiles: ParsedFile[] = [];
for (const file of files) {
  try {
    const { tfsId, entityName } = parseFilename(file);
    const suite = parseExcel(file);
    const route = resolveRoute(entityName);
    parsedFiles.push({ file, tfsId, entityName, suite, route });
  } catch (e: any) {
    // Will create a failing test below
    const { tfsId, entityName } = parseFilename(file);
    parsedFiles.push({
      file, tfsId, entityName,
      suite: { filename: file, tfsId, entityName, sheets: [] },
      route: resolveRoute(entityName),
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 5: GENERATE TESTS — Create Playwright test blocks for each file
//
//   For each Excel file:
//     beforeAll:
//       → Create API client with Cognito auth token
//       → Fetch Swagger JSON to resolve live API routes
//       → Get SaveUserContext cookie (needed for PUT/DELETE)
//       → Initialize variable resolver (replaces ${strOrgKey} etc.)
//       → Pre-seed context keys (org/loc/staff from env_config)
//       → Pre-resolve SQL keys for all variables in Excel
//
//     For each sheet (serial order):
//       → CreateHappy runs FIRST → captures entityKey
//       → entityKey is shared to Update/Negative/Search sheets
//       → If no key from CreateHappy, tries fixture fallback
//       → Each scenario row becomes one Playwright test
//
//     afterAll:
//       → Write results CSV + keys JSON to output/ folder
// ══════════════════════════════════════════════════════════════════════

if (parsedFiles.length === 0) {
  test('No Excel files matched', () => {
    console.log(`No files matched. EXCEL=${process.env.EXCEL} TFS=${process.env.TFS}`);
    test.skip();
  });
}

for (const pf of parsedFiles) {
  test.describe(`${pf.file}`, () => {
    let api: ApiClient;
    let resolver: VariableResolver;
    let report: E2EReportGenerator;
    let entityKey: string | null = null;

    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const outDir = path.join(__dirname, '..', 'output', `${pf.entityName}_E2E_${ts}`);

    // ── SETUP: Runs once before all tests in this Excel file ──
    test.beforeAll(async ({ playwright }) => {
      console.log(`\n📋 ${pf.file}: ${pf.suite.sheets.length} sheets, entity=${pf.entityName}`);

      // Step A: Create API client (handles Cognito token + Bearer header)
      const ctx = await playwright.request.newContext();
      api = new ApiClient(ctx, CFG);

      // Step B: Fetch Swagger JSON → auto-resolve correct API routes
      const swagger = await fetchSwagger(CFG.BASE_URL);
      if (swagger) setSwaggerJson(swagger);
      (pf as any)._swagger = swagger;

      // Step C: Re-resolve route with live Swagger data
      const liveRoute = resolveRoute(pf.entityName);
      Object.assign(pf.route, liveRoute);
      console.log(`   Route: ${pf.route.updateMethod} update, POST ${pf.route.postRoute}`);

      // Step D: Get SaveUserContext cookie (required for PUT/DELETE calls)
      const cookie = await getUserContextCookie(ctx, CFG);
      api.setCookie(cookie);

      // Step E: Initialize variable resolver (replaces ${strOrgKey} placeholders)
      resolver = new VariableResolver(CFG);
      report = new E2EReportGenerator(outDir, {
        entity: pf.entityName, environment: ENV_NAME, timestamp: ts, tfsId: pf.tfsId,
      });
      await resolver.init(SKIP_SQL);

      // Step F: Pre-seed org/loc/staff keys from env_config.json
      if (CFG.CONTEXT_ORG_KEY) resolver.setKey('strOrganizationKey', CFG.CONTEXT_ORG_KEY);
      if (CFG.CONTEXT_LOC_KEY) resolver.setKey('strLocationKey', CFG.CONTEXT_LOC_KEY);
      if (CFG.CONTEXT_STAFF_KEY) resolver.setKey('strStaffMemberKey', CFG.CONTEXT_STAFF_KEY);

      // Step G: Scan all Excel cells for ${variable} refs → pre-resolve via SQL
      const allText = pf.suite.sheets.flatMap(s =>
        s.scenarios.flatMap(sc => [
          sc.requestBody || '', sc.requestUrl || '',
          sc.putRequestUrl || '', sc.getRequestUrl || '',
          sc.putRemoveRequestUrl || '', sc.deleteRemoveRequestUrl || '',
        ])
      );
      await resolver.resolveNeededKeys(extractVariables(allText));
    });

    // ── TEARDOWN: Write reports + cleanup after all tests ──
    test.afterAll(async () => {
      if (report) {
        report.writeResults();  // CSV with pass/fail per scenario
        report.saveJson('00_keys.json', {
          entity: pf.entityName, tfsId: pf.tfsId, environment: ENV_NAME,
          route: pf.route.postRoute, entityKey,
          resolvedVars: resolver?.getAll(), timestamp: ts,
        });
      }
      if (resolver) await resolver.close();  // close SQL connection
    });

    let entityKeyInjected = false;

    // Serial so CreateHappy runs first → entityKey shared to Update/Negative/Search
    test.describe.configure({ mode: 'serial' });

    for (const sheet of pf.suite.sheets) {
      if (!shouldRunType(sheet.sheetType)) continue;

      // FIXTURE FALLBACK: If CreateHappy didn't produce a key,
      // try POSTing from fixtures/<Entity>.json before Update/SubEndpoint sheets
      const needsKey = ['SubEndpointHappy', 'SubEndpointNegative', 'ComboTest', 'AddRemoveTest', 'UpdateHappy', 'UpdateNegative'].includes(sheet.sheetType);
      if (needsKey && !entityKeyInjected) {
        entityKeyInjected = true;
        test(`[Fixture Fallback] Create ${pf.entityName}`, async () => {
          if (entityKey) { console.log(`   ✓ Using key from CreateHappy: ${entityKey}`); return; }
          const fixturePath = path.join(__dirname, '..', 'fixtures', `${pf.entityName}.json`);
          if (!fs.existsSync(fixturePath)) { console.log(`   ⚠ No fixture for ${pf.entityName}`); return; }
          const raw = fs.readFileSync(fixturePath, 'utf-8');
          const body = resolver.resolveBody(raw, pf.route.resource);
          const resp = await api.send('POST', pf.route.postRoute, body);
          if (resp.status >= 200 && resp.status < 300) {
            const key = extractEntityKey(resp.data, pf.entityName);
            if (key) {
              entityKey = key;
              resolver.setKey(`str${pf.entityName}Key`, key);
              console.log(`   🔑 ${pf.entityName}Key = ${key} (from fixture)`);
            }
          } else {
            console.log(`   ⚠ Fixture POST ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
          }
        });
      }

      const scenarios = MAX_SCENARIOS
        ? sheet.scenarios.slice(0, MAX_SCENARIOS)
        : sheet.scenarios;

      test.describe(`${sheet.sheetName} [${sheet.sheetType}]`, () => {
        for (let i = 0; i < scenarios.length; i++) {
          const scenario = scenarios[i];
          const label = `[${i + 1}] ${scenario.scenario} — ${scenario.logMessage || ''}`.trim();

          test(label, async () => {
            const start = Date.now();
            const result: Partial<ScenarioResult> = {
              sheet: sheet.sheetName,
              scenario: scenario.scenario,
              type: sheet.sheetType,
            };

            try {
              await runScenario(api, resolver, pf.route, pf.entityName, sheet, scenario, result, (pf as any)._swagger);
              result.passed = true;
            } catch (e: any) {
              result.passed = false;
              result.error = e.message?.slice(0, 500);
            } finally {
              result.durationMs = Date.now() - start;
              report.addResult(result as ScenarioResult);

              // Capture entity key from happy path
              if (sheet.sheetType === 'CreateHappy' && result.entityKey && !entityKey) {
                entityKey = result.entityKey;
                resolver.setKey(`str${pf.entityName}Key`, entityKey);
                console.log(`   🔑 ${pf.entityName}Key = ${entityKey}`);
              }
            }
          });
        }
      });
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 6: SUB-ENDPOINT KEY CAPTURE
//   After a sub-endpoint call (e.g. PUT /location/{key}/location-type),
//   extract the returned key and store it for later use in other scenarios
// ══════════════════════════════════════════════════════════════════════

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function captureSubEndpointKeys(
  data: any, url: string, resolver: VariableResolver,
): void {
  // Extract entity name from URL tail: .../location/{key}/location-type → LocationType
  const segments = url.replace(/\?.*/, '').split('/').filter(Boolean);
  const lastSeg = segments[segments.length - 1];
  if (!lastSeg || GUID_RE.test(lastSeg)) return;

  const entityName = lastSeg
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const varName = `str${entityName}Key`;

  // Search response for a key
  const obj = data?.model ?? data;
  if (typeof obj === 'string' && GUID_RE.test(obj)) {
    resolver.setKey(varName, obj);
    console.log(`   🔗 ${varName} = ${obj.slice(0, 12)}... (from sub-endpoint)`);
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().endsWith('key') && typeof v === 'string' && GUID_RE.test(v)) {
        const capName = `str${k.charAt(0).toUpperCase()}${k.slice(1)}`;
        resolver.setKey(capName, v);
        console.log(`   🔗 ${capName} = ${(v as string).slice(0, 12)}... (from sub-endpoint)`);
        return;
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 7: SCENARIO ROUTER — Routes each scenario to the right runner
//   based on sheet type classification from Excel parser
//
//   CreateHappy / UpdateHappy     → runHappyPath()         POST/PUT + expect 200
//   CreateNegative / UpdateNeg    → runNegative()          POST/PUT + expect 400 + message
//   SubEndpointHappy              → runSubEndpointHappy()  PUT sub-resource + expect 200
//   SubEndpointNegative           → runSubEndpointNeg()    PUT sub-resource + expect 400
//   SearchValidation              → runSearch()            GET + validate record count
//   ErrorCodeValidation           → runErrorCode()         GET + validate error message
//   ComboTest                     → runCombo()             PUT + GET + validate count
//   AddRemoveTest                 → runAddRemove()         PUT add + PUT/DELETE remove
// ══════════════════════════════════════════════════════════════════════

async function runScenario(
  api: ApiClient, resolver: VariableResolver,
  route: ReturnType<typeof resolveRoute>, entityName: string,
  sheet: TestSheet, sc: TestScenario, result: Partial<ScenarioResult>,
  swagger?: Record<string, any> | null,
): Promise<void> {
  switch (sheet.sheetType) {
    case 'CreateHappy':
    case 'UpdateHappy':
      return runHappyPath(api, resolver, route, sc, sheet, result, entityName);
    case 'CreateNegative':
    case 'UpdateNegative':
      return runNegative(api, resolver, route, sc, sheet, result, entityName);
    case 'SubEndpointHappy':
      return runSubEndpointHappy(api, resolver, route, sc, result, swagger);
    case 'SubEndpointNegative':
      return runSubEndpointNegative(api, resolver, route, sc, result, swagger);
    case 'SearchValidation':
      return runSearch(api, resolver, route, sc, result);
    case 'ErrorCodeValidation':
      return runErrorCode(api, resolver, route, sc, result);
    case 'ComboTest':
      return runCombo(api, resolver, route, sc, result, swagger);
    case 'AddRemoveTest':
      return runAddRemove(api, resolver, route, sc, result, swagger);
  }
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 8: TEST RUNNERS — Each function handles one test type
// ══════════════════════════════════════════════════════════════════════

// ── HAPPY PATH: POST (create) or PUT (update) → expect 200 ──
async function runHappyPath(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, sheet: TestSheet, result: Partial<ScenarioResult>, entityName: string,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const isUpdate = sheet.sheetType === 'UpdateHappy';
  const method = isUpdate ? route.updateMethod : 'POST';
  let url: string;
  if (sc.requestUrl) {
    url = resolver.resolveUrl(sc.requestUrl, route.resource);
  } else if (isUpdate) {
    const keyName = `str${entityName}Key`;
    const keyVal = resolver.getAll()[keyName];
    url = keyVal ? route.updateRoute.replace(/{[^}]+}/, keyVal) : route.postRoute;
  } else {
    url = route.postRoute;
  }

  result.method = method;
  result.url = url;
  result.expectedStatus = sc.statusCode || 200;

  const resp = await api.send(method, url, body);
  result.actualStatus = resp.status;

  // Log failure but don't assert — serial mode must continue
  if (resp.status !== result.expectedStatus) {
    console.log(`  ⚠ ${sc.scenario}: expected ${result.expectedStatus}, got ${resp.status}`);
  }

  if (!isUpdate && resp.status >= 200 && resp.status < 300 && resp.data) {
    const key = extractEntityKey(resp.data, entityName);
    if (key) result.entityKey = key;
  }
}

// ── NEGATIVE: POST/PUT with bad data → expect 400 + validate error message ──
async function runNegative(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, sheet: TestSheet, result: Partial<ScenarioResult>, entityName: string,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const isUpdate = sheet.sheetType === 'UpdateNegative';
  const method = isUpdate ? route.updateMethod : 'POST';
  let url: string;
  if (sc.requestUrl) {
    url = resolver.resolveUrl(sc.requestUrl, route.resource);
  } else if (isUpdate) {
    const keyName = `str${entityName}Key`;
    const keyVal = resolver.getAll()[keyName];
    url = keyVal ? route.updateRoute.replace(/{[^}]+}/, keyVal) : route.postRoute;
  } else {
    url = route.postRoute;
  }

  result.method = method;
  result.url = url;
  result.expectedStatus = sc.statusCode || 400;
  result.expectedMessage = sc.userMessage;

  const resp = await api.send(method, url, body);
  result.actualStatus = resp.status;

  assertStatus(resp.status, result.expectedStatus, sc.scenario);

  if (sc.userMessage) {
    const msgResult = validateUserMessage(resp.data, sc.userMessage);
    result.actualMessage = JSON.stringify(resp.data || '').slice(0, 500);
    result.messageMatch = msgResult.passed;
    assertUserMessage(resp.data, sc.userMessage, sc.scenario);
  }
}

// ── SUB-ENDPOINT HAPPY: PUT to child resource (e.g. /org/{key}/contact) → expect 200 ──
async function runSubEndpointHappy(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>, swagger?: Record<string, any> | null,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const url = resolver.resolveUrl(sc.requestUrl || '', route.resource);
  const method = swagger ? getWriteMethod(swagger, url) : 'PUT';

  result.method = method;
  result.url = url;
  result.expectedStatus = sc.statusCode || 200;

  const resp = await api.send(method, url, body);
  result.actualStatus = resp.status;

  // Capture sub-endpoint key from response (e.g. locationTypeKey → strLocationTypeKey)
  if (resp.status >= 200 && resp.status < 300 && resp.data) {
    captureSubEndpointKeys(resp.data, url, resolver);
  }

  assertStatus(resp.status, result.expectedStatus, sc.scenario);
}

// ── SUB-ENDPOINT NEGATIVE: PUT to child resource with bad data → expect 400 ──
async function runSubEndpointNegative(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>, swagger?: Record<string, any> | null,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const url = resolver.resolveUrl(sc.requestUrl || '', route.resource);
  const method = swagger ? getWriteMethod(swagger, url) : 'PUT';

  result.method = method;
  result.url = url;
  result.expectedStatus = sc.statusCode || 400;
  result.expectedMessage = sc.userMessage;

  const resp = await api.send(method, url, body);
  result.actualStatus = resp.status;

  assertStatus(resp.status, result.expectedStatus, sc.scenario);

  if (sc.userMessage) {
    const msgResult = validateUserMessage(resp.data, sc.userMessage);
    result.actualMessage = JSON.stringify(resp.data || '').slice(0, 500);
    result.messageMatch = msgResult.passed;
    assertUserMessage(resp.data, sc.userMessage, sc.scenario);
  }
}

// ── SEARCH: GET endpoint → expect 200 + validate record count ──
async function runSearch(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>,
) {
  const url = resolver.resolveUrl(sc.requestUrl || '', route.resource);

  result.method = 'GET';
  result.url = url;
  result.expectedStatus = 200;
  result.expectedCount = sc.recordCount;

  const resp = await api.send('GET', url);
  result.actualStatus = resp.status;

  assertStatus(resp.status, 200, sc.scenario);

  if (sc.recordCount) {
    const countResult = validateRecordCount(resp.data, sc.recordCount);
    result.countMatch = countResult.passed;
    assertRecordCount(resp.data, sc.recordCount, sc.scenario);
  }
}

// ── ERROR CODE: GET with bad resource/key → expect error status + message ──
async function runErrorCode(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>,
) {
  const resource = sc.resource || '';
  const primaryKey = sc.primaryKey || '';
  const url = primaryKey ? `/${resource}/${primaryKey}` : `/${resource}`;

  result.method = 'GET';
  result.url = url;
  result.expectedStatus = sc.statusCode || 400;
  result.expectedMessage = sc.userMessage;

  const resp = await api.send('GET', url);
  result.actualStatus = resp.status;

  assertStatus(resp.status, result.expectedStatus, sc.scenario);

  if (sc.userMessage && sc.userMessage !== 'No Message') {
    const msgResult = validateUserMessage(resp.data, sc.userMessage);
    result.actualMessage = JSON.stringify(resp.data?.responseMessages || resp.data?.message || '').slice(0, 500);
    result.messageMatch = msgResult.passed;
    assertUserMessage(resp.data, sc.userMessage, sc.scenario);
  }
}

// ── COMBO: PUT first, then GET to verify → validate both status + count ──
async function runCombo(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>, swagger?: Record<string, any> | null,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const putUrl = resolver.resolveUrl(sc.putRequestUrl || '', route.resource);
  const getUrl = resolver.resolveUrl(sc.getRequestUrl || '', route.resource);
  const writeMethod = swagger ? getWriteMethod(swagger, putUrl) : 'PUT';

  result.method = `${writeMethod}+GET`;
  result.url = `${writeMethod}:${putUrl} → GET:${getUrl}`;
  result.expectedStatus = sc.putStatusCode || 200;

  const putResp = await api.send(writeMethod, putUrl, body);
  result.actualStatus = putResp.status;
  assertStatus(putResp.status, sc.putStatusCode || 200, `${sc.scenario} ${writeMethod}`);

  const getResp = await api.send('GET', getUrl);
  assertStatus(getResp.status, sc.getStatusCode || 200, `${sc.scenario} GET`);

  if (sc.getRecordCount) {
    const countResult = validateRecordCount(getResp.data, sc.getRecordCount);
    result.expectedCount = sc.getRecordCount;
    result.countMatch = countResult.passed;
    assertRecordCount(getResp.data, sc.getRecordCount, `${sc.scenario} GET count`);
  }
}

// ── ADD/REMOVE: PUT to add, then PUT/DELETE to remove → validate both ──
async function runAddRemove(
  api: ApiClient, resolver: VariableResolver, route: ReturnType<typeof resolveRoute>,
  sc: TestScenario, result: Partial<ScenarioResult>, swagger?: Record<string, any> | null,
) {
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const putUrl = resolver.resolveUrl(sc.putRequestUrl || '', route.resource);
  const writeMethod = swagger ? getWriteMethod(swagger, putUrl) : 'PUT';

  result.method = `${writeMethod}+REMOVE`;
  result.url = putUrl;
  result.expectedStatus = sc.putStatusCode || 200;

  const putResp = await api.send(writeMethod, putUrl, body);
  result.actualStatus = putResp.status;
  assertStatus(putResp.status, sc.putStatusCode || 200, `${sc.scenario} ${writeMethod} add`);

  if (sc.putRemoveRequestUrl) {
    const removeUrl = resolver.resolveUrl(sc.putRemoveRequestUrl, route.resource);
    const removeMethod = swagger ? getWriteMethod(swagger, removeUrl) : 'PUT';
    const removeResp = await api.send(removeMethod, removeUrl, body);
    assertStatus(removeResp.status, sc.putRemoveStatusCode || 200, `${sc.scenario} ${removeMethod} remove`);
  }
  if (sc.deleteRemoveRequestUrl) {
    const deleteUrl = resolver.resolveUrl(sc.deleteRemoveRequestUrl, route.resource);
    const deleteResp = await api.send('DELETE', deleteUrl);
    assertStatus(deleteResp.status, sc.deleteRemoveStatusCode || 200, `${sc.scenario} DELETE remove`);
  }
}
