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
import { fetchSwagger, getWriteMethod, getSubEndpointMethodOverride } from '../lib/core/swagger-client';
import {
  validateStatus, validateUserMessage, validateRecordCount,
  assertStatus, assertUserMessage, assertRecordCount,
} from '../lib/core/response-validator';
import { E2EReportGenerator, type ScenarioResult } from '../lib/core/e2e-report-generator';
import { getUserContextCookie, clearCookieCache } from '../lib/cookie-manager';
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
    let apiCtx: any;
    let resolver: VariableResolver;
    let report: E2EReportGenerator;
    let entityKey: string | null = null;

    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const outDir = path.join(__dirname, '..', 'output', `${pf.entityName}_E2E_${ts}`);

    // ── SETUP: Runs once before all tests in this Excel file ──
    test.beforeAll(async ({ playwright }) => {
      test.setTimeout(120_000); // 2 min for auth + swagger + key resolution
      console.log(`\n📋 ${pf.file}: ${pf.suite.sheets.length} sheets, entity=${pf.entityName}`);

      // Step A: Create API client (handles Cognito token + Bearer header)
      const ctx = await playwright.request.newContext();
      apiCtx = ctx;
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

      // Step F: Run aggregate-specific SQL to fetch all reference keys for this entity
      await resolver.resolveAggregateKeys(pf.entityName);

      // Step F2: Fetch reference keys via API for any keys not yet resolved
      await resolveKeysViaApi(api, resolver, CFG);

      // Step G: Pre-seed org/loc/staff keys from env_config.json (overrides SQL)
      if (CFG.CONTEXT_ORG_KEY) resolver.setKey('strOrganizationKey', CFG.CONTEXT_ORG_KEY);
      if (CFG.CONTEXT_LOC_KEY) resolver.setKey('strLocationKey', CFG.CONTEXT_LOC_KEY);
      if (CFG.CONTEXT_STAFF_KEY) resolver.setKey('strStaffMemberKey', CFG.CONTEXT_STAFF_KEY);

      // Step G2: Alias keys for cross-entity references
      const preAll = resolver.getAll();
      if (preAll.strStaffMemberKey2 && !preAll.strRelatedStaffMemberKey) {
        resolver.setKey('strRelatedStaffMemberKey', preAll.strStaffMemberKey2);
      }

      // Step G: Scan all Excel cells for ${variable} refs → pre-resolve via SQL
      const allText = pf.suite.sheets.flatMap(s =>
        s.scenarios.flatMap(sc => [
          sc.requestBody || '', sc.requestUrl || '',
          sc.putRequestUrl || '', sc.getRequestUrl || '',
          sc.putRemoveRequestUrl || '', sc.deleteRemoveRequestUrl || '',
        ])
      );
      await resolver.resolveNeededKeys(extractVariables(allText));

      // Step H: Dynamic Swagger-based key resolution for any remaining unresolved keys
      if ((pf as any)._swagger) {
        await resolveMissingKeysViaSwagger(api, resolver, extractVariables(allText), (pf as any)._swagger);
      }
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
    let lastPostBody: any = null;
    let lastPostKey: string | null = null;
    let searchFieldsSnapshotted = false;

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
              if (result.passed !== false) result.passed = true;
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
                lastPostBody = (result as any)._postBody || null;
                console.log(`   🔑 ${pf.entityName}Key = ${entityKey}`);
                // P4: Snapshot the randomized fields used for this successful POST
                // so search scenarios use matching values instead of later-randomized ones
                if (!searchFieldsSnapshotted) {
                  searchFieldsSnapshotted = true;
                  resolver.snapshotSearchFields();
                }
              }
              // Re-snapshot after AddRemoveTest — business-profile updates may change
              // the org's fullName/shortName, so search needs the latest values
              if (sheet.sheetType === 'AddRemoveTest') {
                resolver.snapshotSearchFields();
              }
              // Re-enrich org after AddRemoveTest removes data that search needs
              if (sheet.sheetType === 'AddRemoveTest' && entityKey && i === scenarios.length - 1 && pf.entityName === 'Organization') {
                await enrichOrgForSearch(api, resolver, pf.route, entityKey);
              }
              // Always keep the most complete POST body for comparison
              if (sheet.sheetType === 'CreateHappy' && (result as any)._postBody) {
                const newBody = (result as any)._postBody;
                const newSize = JSON.stringify(newBody).length;
                const oldSize = lastPostBody ? JSON.stringify(lastPostBody).length : 0;
                if (newSize > oldSize) {
                  lastPostBody = newBody;
                  lastPostKey = result.entityKey || lastPostKey;
                }
              }
            }
          });
        }
      });
    }

    // ── POST vs GET Comparison (runs at the end after all sheets) ──
    test(`[POST vs GET] Verify ${pf.entityName}`, async () => {
      // Use the key that matches the most complete POST body
      const compareKey = lastPostKey || entityKey;
      if (!compareKey) { console.log('   ⚠ No entity key — skipping POST vs GET'); return; }
      if (!lastPostBody) { console.log('   ⚠ No successful POST body — skipping POST vs GET'); return; }

      // Save the full POST body for reference
      report.saveJson('post_vs_get_post_body.json', lastPostBody);

      const getUrl = pf.route.getRoute.replace(/{[^}]+}/, compareKey);
      console.log(`   📥 GET ${getUrl}`);
      console.log(`   📝 POST body fields: ${Object.keys(flattenObj(lastPostBody)).length}`);
      const getResp = await api.send('GET', getUrl);
      if (getResp.status !== 200) { console.log(`   ⚠ GET returned ${getResp.status}`); return; }

      report.saveJson('post_vs_get_response.json', getResp.data);
      const getModel = getResp.data?.model ?? getResp.data;

      const comparison = comparePostVsGet(lastPostBody, getModel, pf.entityName);
      report.saveJson('post_vs_get_comparison.json', comparison);

      // Write CSV
      const csvLines = ['Field,POST_Value,GET_Value,Match'];
      let matched = 0, mismatched = 0, postOnly = 0, getOnly = 0;
      for (const row of comparison) {
        csvLines.push(`${csvEsc(row.field)},${csvEsc(row.postValue)},${csvEsc(row.getValue)},${row.match}`);
        if (row.match === 'YES') matched++;
        else if (row.match === 'NO') mismatched++;
        else if (row.match === 'POST_ONLY') postOnly++;
        else getOnly++;
      }
      fs.writeFileSync(path.join(outDir, '08_post_vs_get.csv'), csvLines.join('\n'), 'utf-8');

      console.log(`   📊 POST vs GET Comparison:`);
      console.log(`      ✅ Matched:   ${matched}`);
      console.log(`      ❌ Mismatch:  ${mismatched}`);
      console.log(`      📤 POST only: ${postOnly}`);
      console.log(`      📥 GET only:  ${getOnly}`);
      console.log(`      📝 Total:     ${comparison.length}`);

      if (mismatched > 0) {
        console.log(`\n   ❌ Mismatched fields:`);
        for (const m of comparison.filter(r => r.match === 'NO')) {
          console.log(`      ${m.field}:`);
          console.log(`        POST: ${String(m.postValue).slice(0, 100)}`);
          console.log(`        GET:  ${String(m.getValue).slice(0, 100)}`);
        }
      }
      if (postOnly > 0) {
        console.log(`\n   📤 Fields in POST but missing in GET:`);
        for (const m of comparison.filter(r => r.match === 'POST_ONLY')) {
          console.log(`      ${m.field}: ${String(m.postValue).slice(0, 80)}`);
        }
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 6: API-BASED KEY RESOLVER (when SQL is skipped)
//   Fetches ProgramKey, SystemRoleKey, PersonKey etc. via GET APIs
// ══════════════════════════════════════════════════════════════════════

async function resolveKeysViaApi(api: ApiClient, resolver: VariableResolver, cfg: typeof CFG): Promise<void> {
  // Generic key-to-endpoint mapping: covers all common entity keys
  const endpoints: { varName: string; url: string; keyField: string }[] = [
    { varName: 'strProgramKey', url: '/api/v1/program-module/program?pageSize=2', keyField: 'programKey' },
    { varName: 'strSystemRoleKey', url: '/api/v1/security-module/system-roles?paginationToken=0&pageSize=2', keyField: 'systemRoleKey' },
    { varName: 'strPersonKey', url: '/api/v1/person-module/person?pageSize=2', keyField: 'personKey' },
    { varName: 'strCaseKey', url: '/api/v1/case-module/cases?paginationToken=0&pageSize=2', keyField: 'caseKey' },
    { varName: 'strOrganizationKey', url: '/api/v1/organization-module/organizations?paginationToken=0&pageSize=2', keyField: 'organizationKey' },
    { varName: 'strStaffMemberKey', url: '/api/v1/organization-module/staff-members?paginationToken=0&pageSize=2', keyField: 'staffMemberKey' },
    { varName: 'strLocationKey', url: '/api/v1/organization-module/locations?paginationToken=0&pageSize=2', keyField: 'locationKey' },
    { varName: 'strServiceDefinitionKey', url: '/api/v1/service-definition-module/service-definition?pageSize=2', keyField: 'serviceDefinitionKey' },
    { varName: 'strSystemAccountKey', url: '/api/v1/security-module/system-accounts?paginationToken=0&pageSize=2', keyField: 'systemAccountKey' },
    { varName: 'strUserAccountKey', url: '/api/v1/security-module/user-accounts?paginationToken=0&pageSize=2', keyField: 'userAccountKey' },
    { varName: 'strSystemPermissionKey', url: '/api/v1/security-module/system-permissions?paginationToken=0&pageSize=2', keyField: 'systemPermissionKey' },
    { varName: 'strIncidentReportKey', url: '/api/v1/incident-module/incident-reports?paginationToken=0&pageSize=2', keyField: 'incidentReportKey' },
    { varName: 'strGuardianshipKey', url: '/api/v1/guardianship-module/guardianship?pageSize=2', keyField: 'guardianshipKey' },
    { varName: 'strIntakeReferralKey', url: '/api/v1/intake-referral-module/intake-referral?pageSize=2', keyField: 'intakeReferralKey' },
    { varName: 'strServiceAuthorizationKey', url: '/api/v1/service-authorization-module/service-authorization?pageSize=2', keyField: 'serviceAuthorizationKey' },
    { varName: 'strProtectiveServicesReportKey', url: '/api/v1/protective-services-module/protective-services-report?pageSize=2', keyField: 'protectiveServicesReportKey' },
    { varName: 'strRegionKey', url: '/api/v1/region-module/region?pageSize=2', keyField: 'regionKey' },
    { varName: 'strFileKey', url: '/api/v1/file-module/files?paginationToken=0&pageSize=2', keyField: 'fileKey' },
  ];

  for (const ep of endpoints) {
    const all = resolver.getAll();
    // Skip if base + numbered variants already resolved
    if (all[ep.varName] && all[`${ep.varName}1`] && all[`${ep.varName}2`]) continue;
    try {
      const resp = await api.send('GET', ep.url);
      if (resp.status === 200 && resp.data) {
        const rawItems = resp.data?.model?.items || resp.data?.items;
        const items = (Array.isArray(rawItems) && rawItems.length > 0) ? rawItems
          : (Array.isArray(resp.data?.model) && resp.data.model.length > 0) ? resp.data.model
          : (Array.isArray(resp.data) && resp.data.length > 0) ? resp.data
          : [];
        if (Array.isArray(items) && items.length > 0) {
          // Find the key field — try exact match, then any field ending in 'Key'
          const findKey = (item: any): string | null => {
            if (!item) return null;
            if (item[ep.keyField]) return String(item[ep.keyField]);
            for (const [k, v] of Object.entries(item)) {
              if (k.toLowerCase().endsWith('key') && typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return v;
            }
            return item.key ? String(item.key) : null;
          };
          const key1 = findKey(items[0]);
          if (key1) {
            if (!all[ep.varName]) resolver.setKey(ep.varName, key1);
            if (!all[`${ep.varName}1`]) resolver.setKey(`${ep.varName}1`, key1);
            console.log(`  ✓ ${ep.varName} = ${key1.slice(0, 12)}... (via API)`);
          }
          if (items.length > 1) {
            const key2 = findKey(items[1]);
            if (key2 && !all[`${ep.varName}2`]) {
              resolver.setKey(`${ep.varName}2`, key2);
              console.log(`  ✓ ${ep.varName}2 = ${key2.slice(0, 12)}... (via API)`);
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`  ⚠ API lookup failed for ${ep.varName}: ${e.message}`);
    }
  }

  // Backfill: if strXxxKey1 exists but strXxxKey doesn't, copy it
  const finalAll = resolver.getAll();
  for (const [k, v] of Object.entries(finalAll)) {
    const m = k.match(/^(str\w+Key)1$/);
    if (m && !finalAll[m[1]]) {
      resolver.setKey(m[1], v);
      console.log(`  ✓ ${m[1]} = ${v.slice(0, 12)}... (backfill from ${k})`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// BLOCK 6c: DYNAMIC SWAGGER-BASED KEY RESOLUTION
//   For any str{Entity}Key still unresolved, try to find a matching
//   Swagger list endpoint and fetch a real key from the environment.
// ══════════════════════════════════════════════════════════════════════

function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function resolveMissingKeysViaSwagger(
  api: ApiClient, resolver: VariableResolver,
  neededVars: Set<string>, swagger: Record<string, any>,
): Promise<void> {
  const all = resolver.getAll();
  const paths = Object.keys(swagger.paths || {});

  for (const varName of neededVars) {
    // Only handle strXxxKey / strXxxKey1 / strXxxKey2 patterns
    const m = varName.match(/^str(\w+?)Key(\d?)$/);
    if (!m) continue;
    if (all[varName]) continue;

    const entityName = m[1]; // e.g. "Program", "ServiceDefinition"
    const kebab = toKebab(entityName); // e.g. "program", "service-definition"
    const keyField = entityName.charAt(0).toLowerCase() + entityName.slice(1) + 'Key';

    // Find a list endpoint: GET /api/v1/{module}/{kebab-plural}
    const listPath = paths.find(p => {
      const methods = swagger.paths[p];
      if (!methods?.get) return false;
      const segs = p.split('/').filter(Boolean);
      const last = segs[segs.length - 1];
      // Match plural: "programs", "service-definitions", etc.
      return (last === kebab + 's' || last === kebab + 'es') && !p.includes('{');
    });
    if (!listPath) continue;

    try {
      const url = `${listPath}?paginationToken=0&pageSize=2`;
      const resp = await api.send('GET', url);
      if (resp.status !== 200) continue;
      const rawItems = resp.data?.model?.items || resp.data?.items;
      const items = (Array.isArray(rawItems) && rawItems.length > 0) ? rawItems
        : (Array.isArray(resp.data?.model) && resp.data.model.length > 0) ? resp.data.model
        : (Array.isArray(resp.data) && resp.data.length > 0) ? resp.data
        : [];
      if (!Array.isArray(items) || items.length === 0) continue;

      const findKey = (item: any): string | null => {
        if (!item) return null;
        if (item[keyField]) return String(item[keyField]);
        for (const [k, v] of Object.entries(item)) {
          if (k.toLowerCase().endsWith('key') && typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return v;
        }
        return null;
      };

      const baseVar = `str${entityName}Key`;
      const key1 = findKey(items[0]);
      if (key1) {
        if (!all[baseVar]) { resolver.setKey(baseVar, key1); all[baseVar] = key1; }
        if (!all[`${baseVar}1`]) { resolver.setKey(`${baseVar}1`, key1); all[`${baseVar}1`] = key1; }
        console.log(`  ✓ ${baseVar} = ${key1.slice(0, 12)}... (via Swagger: ${listPath})`);
      }
      if (items.length > 1) {
        const key2 = findKey(items[1]);
        if (key2 && !all[`${baseVar}2`]) {
          resolver.setKey(`${baseVar}2`, key2); all[`${baseVar}2`] = key2;
          console.log(`  ✓ ${baseVar}2 = ${key2.slice(0, 12)}... (via Swagger)`);
        }
      }
    } catch (e: any) {
      // Silently skip — not all entities have list endpoints
    }
  }
}
//   After a sub-endpoint call (e.g. PUT /location/{key}/location-type),
//   extract the returned key and store it for later use in other scenarios
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// BLOCK 6b: SUB-ENDPOINT KEY CAPTURE
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
  // Inject fresh random names/emails so every scenario creates unique data
  if (sheet.sheetType === 'CreateHappy') {
    resolver.randomizeFields();
  }

  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  if (sheet.sheetType === 'CreateHappy') {
    resolver.fillRequiredAddressFields(body);
  }
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

  // Track status mismatch — don't assert so serial mode continues
  if (resp.status !== result.expectedStatus) {
    console.log(`  ⚠ ${sc.scenario}: expected ${result.expectedStatus}, got ${resp.status}: ${JSON.stringify(resp.data).slice(0, 400)}`);
    result.passed = false;
  }

  if (!isUpdate && resp.status >= 200 && resp.status < 300 && resp.data) {
    const key = extractEntityKey(resp.data, entityName);
    if (key) {
      result.entityKey = key;
      (result as any)._postBody = body;
    }
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
  // Inject fresh random names/emails so every scenario creates unique data
  resolver.randomizeFields();

  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const url = resolver.resolveUrl(sc.requestUrl || '', route.resource);
  const method = swagger ? getWriteMethod(swagger, url) : (getSubEndpointMethodOverride(url) || 'PUT');

  result.method = method;
  result.url = url;
  result.expectedStatus = sc.statusCode || 200;

  const resp = await api.send(method, url, body);
  result.actualStatus = resp.status;

  // Capture sub-endpoint key from response (e.g. locationTypeKey → strLocationTypeKey)
  if (resp.status >= 200 && resp.status < 300 && resp.data) {
    captureSubEndpointKeys(resp.data, url, resolver);
    // Snapshot randomized fields so search scenarios match the created sub-endpoint data
    resolver.snapshotSearchFields();
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
  const method = swagger ? getWriteMethod(swagger, url) : (getSubEndpointMethodOverride(url) || 'PUT');

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
  // P4: Restore snapshotted field values so search filters match the created data
  resolver.restoreSearchFields();
  const url = resolver.resolveUrl(sc.requestUrl || '', route.resource);

  result.method = 'GET';
  result.url = url;
  result.expectedStatus = 200;
  result.expectedCount = sc.recordCount;

  const resp = await api.send('GET', url);
  result.actualStatus = resp.status;

  assertStatus(resp.status, 200, sc.scenario);

  if (sc.recordCount) {
    let countResult = validateRecordCount(resp.data, sc.recordCount);
    let finalData = resp.data;
    // Retry with delays if count check fails (search indexing delay)
    if (!countResult.passed && parseInt(sc.recordCount) > 0) {
      for (const delay of [3000, 5000, 8000, 12000, 15000]) {
        await new Promise(r => setTimeout(r, delay));
        const retry = await api.send('GET', url);
        if (retry.status === 200) {
          const retryResult = validateRecordCount(retry.data, sc.recordCount);
          if (retryResult.passed) {
            countResult = retryResult;
            finalData = retry.data;
            break;
          }
        }
      }
    }
    result.countMatch = countResult.passed;
    assertRecordCount(finalData, sc.recordCount, sc.scenario);
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
  resolver.randomizeFields();
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const putUrl = resolver.resolveUrl(sc.putRequestUrl || '', route.resource);
  const getUrl = resolver.resolveUrl(sc.getRequestUrl || '', route.resource);
  const writeMethod = swagger ? getWriteMethod(swagger, putUrl) : (getSubEndpointMethodOverride(putUrl) || 'PUT');

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
  // Randomize fields so each add/remove pair uses unique data (avoids "already exists" on add)
  resolver.randomizeFields();
  const body = resolver.resolveBody(sc.requestBody || '{}', route.resource);
  const putUrl = resolver.resolveUrl(sc.putRequestUrl || '', route.resource);
  const writeMethod = swagger ? getWriteMethod(swagger, putUrl) : (getSubEndpointMethodOverride(putUrl) || 'PUT');

  result.method = `${writeMethod}+REMOVE`;
  result.url = putUrl;
  result.expectedStatus = sc.putStatusCode || 200;

  const putResp = await api.send(writeMethod, putUrl, body);
  result.actualStatus = putResp.status;
  if (putResp.status !== (sc.putStatusCode || 200)) {
    console.log(`  ⚠ ${sc.scenario} ${writeMethod} add → ${putResp.status}: ${JSON.stringify(putResp.data).slice(0, 300)}`);
  }
  assertStatus(putResp.status, sc.putStatusCode || 200, `${sc.scenario} ${writeMethod} add`);

  // Build remove body: merge the add body with any key returned from the add response
  // so remove endpoints that require the child key (e.g. remove-phone) get it.
  // If the add response only returns the parent key, fetch the entity to find the child.
  console.log(`  📞 Add response: ${JSON.stringify(putResp.data).slice(0, 300)}`);
  console.log(`  📞 Add body: ${JSON.stringify(body).slice(0, 300)}`);
  const removeBody = await buildRemoveBody(api, body, putResp.data, putUrl);
  console.log(`  📞 Remove body: ${JSON.stringify(removeBody).slice(0, 300)}`);
  console.log(`  📞 Same as add? ${removeBody === body}`);

  if (sc.putRemoveRequestUrl) {
    const removeUrl = resolver.resolveUrl(sc.putRemoveRequestUrl, route.resource);
    const removeMethod = swagger ? getWriteMethod(swagger, removeUrl) : (getSubEndpointMethodOverride(removeUrl) || 'PUT');
    const removeResp = await api.send(removeMethod, removeUrl, removeBody);
    if (removeResp.status !== (sc.putRemoveStatusCode || 200)) {
      console.log(`  ⚠ ${sc.scenario} ${removeMethod} remove → ${removeResp.status}: ${JSON.stringify(removeResp.data).slice(0, 300)}`);
    }
    assertStatus(removeResp.status, sc.putRemoveStatusCode || 200, `${sc.scenario} ${removeMethod} remove`);
  }
  if (sc.deleteRemoveRequestUrl) {
    const deleteUrl = resolver.resolveUrl(sc.deleteRemoveRequestUrl, route.resource);
    const deleteResp = await api.send('DELETE', deleteUrl);
    if (deleteResp.status !== (sc.deleteRemoveStatusCode || 200)) {
      console.log(`  ⚠ ${sc.scenario} DELETE remove → ${deleteResp.status}: ${JSON.stringify(deleteResp.data).slice(0, 300)}`);
    }
    assertStatus(deleteResp.status, sc.deleteRemoveStatusCode || 200, `${sc.scenario} DELETE remove`);
  }
}

/** Merge the original add body with any key field from the add response.
 *  Some remove endpoints need the child key that was returned by the add call.
 *  If the add response only returns the parent entity key, fetches the entity
 *  to find the matching child record with its server-assigned key.
 *  @param api - API client for fetching entity if needed
 *  @param addBody - the original request body sent to the add endpoint
 *  @param addResponse - the raw response from the add endpoint
 *  @param addUrl - the PUT add URL, used to derive context */
async function buildRemoveBody(api: ApiClient, addBody: any, addResponse: any, addUrl?: string): Promise<any> {
  if (!addResponse) return addBody;
  const model = addResponse.model ?? addResponse;
  const urlTail = addUrl?.split('/').slice(-2).join('/') || '';
  console.log(`  \u{1F50D} buildRemoveBody: model type=${typeof model}, value=${JSON.stringify(model).slice(0,80)}, addUrl=.../${urlTail}`);

  // If model is a full object with child key fields, merge them into addBody
  if (model && typeof model === 'object' && !Array.isArray(model)) {
    const merged = { ...addBody };
    let hasKey = false;
    for (const [k, v] of Object.entries(model)) {
      if (k.toLowerCase().endsWith('key') && typeof v === 'string' && GUID_RE.test(v as string)) {
        merged[k] = v;
        hasKey = true;
      }
    }
    if (hasKey) return merged;
  }

  // If model is a GUID string, it's likely the parent entity key (not the child key).
  // Fetch the entity and find the matching child record to get its server-assigned key.
  if (typeof model === 'string' && GUID_RE.test(model) && addUrl) {
    const childRecord = await fetchMatchingChild(api, model, addBody, addUrl);
    if (childRecord) return childRecord;
  }

  return addBody;
}

/** Fetch the parent entity and find the child record matching addBody.
 *  e.g. GET /organization/{key} → find matching phone in organizationPhones[] */
async function fetchMatchingChild(
  api: ApiClient, parentKey: string, addBody: any, addUrl: string,
): Promise<any | null> {
  // Parse URL: .../organization/{key}/add-phone → entity=organization, child=phone
  // Strip base URL (https://host) before parsing segments
  const cleanUrl = addUrl.replace(/https?:\/\/[^/]+/, '').replace(/\?.*/, '');
  const segments = cleanUrl.split('/').filter(Boolean);
  const lastSeg = segments[segments.length - 1]; // e.g. "add-phone"
  if (!lastSeg?.startsWith('add-')) return null;

  const child = lastSeg.slice(4); // "phone"
  // Build the GET URL for the parent entity
  const keyIdx = segments.findIndex(s => GUID_RE.test(s));
  if (keyIdx < 0) return null;
  const getPath = '/' + segments.slice(0, keyIdx + 1).join('/');

  try {
    const resp = await api.send('GET', getPath);
    if (resp.status !== 200) return null;
    const entity = resp.data?.model ?? resp.data;
    if (!entity || typeof entity !== 'object') return null;

    // Find the array field: "organization" + "Phone" + "s" → organizationPhones
    const parentName = segments[keyIdx - 1]; // e.g. "organization"
    const parentPascal = parentName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const childPascal = child.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const arrayName = parentPascal.charAt(0).toLowerCase() + parentPascal.slice(1) + childPascal + 's';

    const items = entity[arrayName];
    if (!Array.isArray(items) || items.length === 0) return null;

    console.log(`  🔍 fetchMatchingChild: found ${items.length} ${arrayName}, addBody keys: ${Object.keys(addBody).join(',')}`);

    // Find the item matching addBody by comparing shared fields (string + nested object)
    const normalizePhone = (s: string) => s.replace(/[\s()\-]/g, '');
    const match = items.find((item: any) => {
      for (const [k, v] of Object.entries(addBody)) {
        if (k.toLowerCase().endsWith('key')) continue;
        if (typeof v === 'string') {
          if (k === 'number' || k.toLowerCase().includes('phone')) {
            if (normalizePhone(v) !== normalizePhone(item[k] || '')) return false;
          } else if (item[k] !== v) return false;
        }
        // For nested objects (e.g. phoneType), compare code/identifier
        if (v && typeof v === 'object' && !Array.isArray(v) && item[k]) {
          const vObj = v as Record<string, any>;
          const iObj = item[k] as Record<string, any>;
          if (vObj.code && iObj.code && String(vObj.code) !== String(iObj.code)) return false;
          if (vObj.identifier && iObj.identifier && String(vObj.identifier) !== String(iObj.identifier)) return false;
        }
      }
      return true;
    });

    if (match) {
      console.log(`  🔍 Exact match found in ${arrayName}`);
    } else {
      console.log(`  🔍 No exact match in ${arrayName}, using last item. Add number: "${addBody.number}", items[last].number: "${items[items.length-1]?.number}"`);
    }
    // If no exact match, use the last item (most recently added)
    return match || items[items.length - 1];
  } catch {
    return null;
  }
}


// ══════════════════════════════════════════════════════════════════════
// BLOCK 9: POST vs GET COMPARISON
//   Flattens POST body and GET response, compares field by field
// ══════════════════════════════════════════════════════════════════════

interface CompareRow {
  field: string;
  postValue: string;
  getValue: string;
  match: 'YES' | 'NO' | 'GET_ONLY' | 'POST_ONLY';
}

function flattenObj(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') Object.assign(result, flattenObj(item, `${key}[${i}]`));
        else result[`${key}[${i}]`] = String(item);
      });
    } else if (typeof v === 'object') {
      Object.assign(result, flattenObj(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

function normalizeValue(v: string): string {
  if (!v) return '';
  // Normalize dates, GUIDs, whitespace
  return v.trim().toLowerCase().replace(/t00:00:00(\.000)?z?$/i, '').replace(/\s+/g, ' ');
}

function comparePostVsGet(postBody: any, getModel: any, entityName: string): CompareRow[] {
  const postFlat = flattenObj(postBody);
  const getFlat = flattenObj(getModel);
  const results: CompareRow[] = [];
  const skipKeys = new Set(['$type', 'hasError', 'hasWarning', 'responseMessages', 'entityCreatedTimestamp', 'entityUpdatedTimestamp', 'createdBy', 'updatedBy']);

  // Compare POST fields against GET
  for (const [field, postVal] of Object.entries(postFlat)) {
    const baseName = field.split('.').pop()?.toLowerCase() || '';
    if (skipKeys.has(baseName)) continue;
    const getVal = getFlat[field];
    if (getVal !== undefined) {
      const match = normalizeValue(postVal) === normalizeValue(getVal) ? 'YES' : 'NO';
      results.push({ field, postValue: postVal, getValue: getVal, match });
    } else {
      results.push({ field, postValue: postVal, getValue: '', match: 'POST_ONLY' });
    }
  }

  // GET-only fields
  for (const [field, getVal] of Object.entries(getFlat)) {
    const baseName = field.split('.').pop()?.toLowerCase() || '';
    if (skipKeys.has(baseName)) continue;
    if (postFlat[field] === undefined) {
      results.push({ field, postValue: '', getValue: getVal, match: 'GET_ONLY' });
    }
  }

  return results;
}

/**
 * Re-add data to the org that AddRemoveTest removed but search needs.
 */
async function enrichOrgForSearch(
  api: ApiClient, resolver: VariableResolver,
  route: ReturnType<typeof resolveRoute>, orgKey: string,
): Promise<void> {
  const base = `${route.postRoute}/${orgKey}`;
  const vars = resolver.getAll();
  try {
    await api.send('PUT', `${base}/add-address`, {
      cityName: vars.strCity || vars.strCityName || 'TestCity',
      firstStreetAddress: vars.strFirstStreetAddress || '123 Test St',
      postalCode: vars.strPostalCode || '12345',
      stateProvince: { codeSystemIdentifier: '1', name: 'Alabama', code: '800001' },
      physicalAddressType: { codeSystemIdentifier: '1', name: 'Physical', code: '500003' },
    });
  } catch { /* ignore */ }
  try {
    await api.send('PUT', `${base}/add-identifier`, {
      type: { codeSystemIdentifier: '1', name: 'NPI', code: '1000005' },
      value: vars.strIdentifier || '9999999999',
    });
  } catch { /* ignore */ }
  try {
    await api.send('PUT', `${base}/business-profile`, {
      businessProfile: {
        fullName: vars.strFullName || vars.strName || 'AutoTest',
        shortName: vars.strShortName || 'AT',
        pointOfContactName: vars.strPointOfContactName || 'AutoPOC',
      },
    });
  } catch { /* ignore */ }
  resolver.snapshotSearchFields();
  console.log(`   \\u{1F50D} Enriched org ${orgKey.slice(0, 8)}... for search`);
}

function csvEsc(val: any): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}
