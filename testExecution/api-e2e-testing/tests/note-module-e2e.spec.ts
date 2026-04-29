import { test, expect } from '@playwright/test';
import * as path from 'path';
import { loadEnvConfig } from '../lib/env-config';
import { ApiClient } from '../lib/api-client';
import { NoteSqlClient, NoteRefKeys } from '../lib/note-sql-client';
import { NoteReportGenerator, NoteSummaryRow } from '../lib/note-report-generator';
import { noteFlatten, noteCompareApiToSql, NoteCompareResult } from '../lib/note-field-matcher';
import { buildNoteConfigs, NoteConfig } from '../lib/note-payload-builders';

const { name: ENV_NAME, config: CFG } = loadEnvConfig();

const SKIP_POST = process.env.SKIP_POST === 'true';
const SKIP_SQL = process.env.SKIP_SQL === 'true';
const POST_USER = process.env.POST_USER;
const POST_PASSWORD = process.env.POST_PASSWORD;

function keyFrom(resp: any): string | null {
  if (typeof resp === 'string') return resp.trim();
  if (resp && typeof resp === 'object') {
    if (resp.model && typeof resp.model === 'string') return resp.model;
    for (const [k, v] of Object.entries(resp)) {
      if (k.toLowerCase().includes('key') && typeof v === 'string' && (v as string).length > 30) return v as string;
    }
  }
  return null;
}

test.describe('Note Module E2E', () => {
  let api: ApiClient;
  let sqlClient: NoteSqlClient;
  let report: NoteReportGenerator;
  let refs: NoteRefKeys = {
    org_key: null, loc_key: null, staff_key: null, program_key: null,
    case_key: null, guardianship_key: null, psr_key: null,
    person_contact_key: null, collateral_contact_key: null,
  };
  let configs: NoteConfig[] = [];
  const results: NoteSummaryRow[] = [];
  const allCmp: NoteCompareResult[] = [];

  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const outDir = path.join(__dirname, '..', 'output', `NoteModule_E2E_${ts}`);

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    api = new ApiClient(ctx, CFG);
    report = new NoteReportGenerator(outDir, ENV_NAME, CFG.BASE_URL);

    if (!SKIP_SQL) {
      sqlClient = new NoteSqlClient(CFG);
      try {
        await sqlClient.connectWithIntegratedAuth();
        refs = await sqlClient.fetchRefKeys();
        for (const [k, v] of Object.entries(refs)) {
          console.log(`  ${k}: ${v || 'NOT_FOUND'}`);
        }
      } catch (e: any) {
        console.log(`  SQL connect failed: ${e.message}`);
      }
    } else {
      refs = {
        org_key: '79559D51-03F2-4933-BA88-A96F00FB8F7E',
        loc_key: 'EDC2333F-0B6E-430D-956F-A96F00FBA012',
        staff_key: 'CF75F290-0DBD-4077-8F64-AB590114A722',
        program_key: '9F421E94-C03C-48FB-9407-ACA7015C197D',
        case_key: 'B47A50FD-D6A4-4DAB-9AE3-ABFE000459EF',
        guardianship_key: null, psr_key: null,
        person_contact_key: null, collateral_contact_key: null,
      };
    }

    configs = buildNoteConfigs(refs);
    console.log(`\n  NoteModule E2E [env: ${ENV_NAME}] — ${configs.length} note types configured`);
  });

  test.afterAll(async () => {
    if (sqlClient) await sqlClient.close().catch(() => {});
  });

  test('Step 1: POST all note types', async () => {
    if (SKIP_POST) { test.skip(); return; }

    for (const cfg of configs) {
      console.log(`\n[POST] ${cfg.name}...`);
      report.saveJson(`${cfg.name}_payload.json`, cfg.payload);
      const resp = await api.post(cfg.post_path, cfg.payload, POST_USER, POST_PASSWORD);

      if (resp.ok) {
        const noteKey = keyFrom(resp.data);
        report.saveJson(`${cfg.name}_post_response.json`, resp.data);
        (cfg as any)._key = noteKey;
        console.log(`  OK -> ${noteKey}`);

        if (cfg.put_after && noteKey) {
          const putPath = cfg.put_after.path_tpl.replace('{key}', noteKey);
          for (const putItem of cfg.put_after.payloads) {
            console.log(`[PUT]  ${cfg.name} (${putItem.label})...`);
            report.saveJson(`${cfg.name}_put_${putItem.label}_payload.json`, putItem.body);
            const putResp = await api.put(putPath, putItem.body, POST_USER, POST_PASSWORD);
            if (putResp.ok) {
              report.saveJson(`${cfg.name}_put_${putItem.label}_response.json`, putResp.data);
              console.log('  OK');
            } else {
              console.log(`  ${putItem.optional ? 'WARN' : 'FAIL'}: PUT failed`);
            }
          }
        }
      } else {
        console.log(`  FAILED`);
      }
    }
    const posted = configs.filter((c) => (c as any)._key);
    expect.soft(posted.length, 'At least one note POST should succeed').toBeGreaterThan(0);
  });

  test('Step 2: GET all note types', async () => {
    for (const cfg of configs) {
      let noteKey = (cfg as any)._key as string | null;

      if (!noteKey && SKIP_POST && sqlClient) {
        noteKey = await sqlClient.getLatestNoteKey(cfg.sql_table, cfg.sql_key_col);
        if (noteKey) {
          (cfg as any)._key = noteKey;
          console.log(`[SKIP] ${cfg.name} -> existing key: ${noteKey}`);
        }
      }

      if (!noteKey) {
        results.push({ name: cfg.name, post_ok: false, key: null, get_ok: false, sql_ok: false });
        continue;
      }

      console.log(`[GET]  ${cfg.name} (${noteKey.slice(0, 12)}...)...`);
      const getResp = await api.get(cfg.get_path_tpl.replace('{key}', noteKey));

      if (getResp.data) {
        (cfg as any)._get_data = getResp.data;
        report.saveJson(`${cfg.name}_get_response.json`, getResp.data);
        const flat = noteFlatten(getResp.data);
        const fieldCnt = Object.keys(flat).filter((k) => !['haserror', 'haswarning', '$type', 'responsemessages'].some((s) => k.toLowerCase().startsWith(s))).length;
        console.log(`  OK (${fieldCnt} fields)`);

        const caseNoteKey = getResp.data?.model?.caseNoteKey;
        if (caseNoteKey) {
          const cnResp = await api.get(`/api/v1/note-module/case-note/${caseNoteKey}`);
          if (cnResp.data) {
            report.saveJson(`${cfg.name}_casenote_get.json`, cnResp.data);
            (cfg as any)._casenote_data = cnResp.data;
            (cfg as any)._casenote_key = caseNoteKey;
            console.log(`[GET]  ${cfg.name}->CaseNote (${caseNoteKey.slice(0, 12)}...) -> OK`);
          }
        }
      } else {
        console.log(`  FAILED`);
      }
    }
  });

  test('Step 3: SQL Verification & Field Comparison', async () => {
    if (SKIP_SQL || !sqlClient) { test.skip(); return; }

    for (const cfg of configs) {
      const noteKey = (cfg as any)._key as string | null;
      const getData = (cfg as any)._get_data;
      if (!noteKey || !getData) {
        if (noteKey) results.push({ name: cfg.name, post_ok: !SKIP_POST, key: noteKey, get_ok: false, sql_ok: false });
        continue;
      }

      console.log(`[SQL]  ${cfg.name}...`);
      const { row: sqlRow } = await sqlClient.getRow('NoteModule', cfg.sql_table, cfg.sql_key_col, noteKey);
      if (!sqlRow) {
        console.log(`  NOT_FOUND in SQL`);
        allCmp.push({ Entity: cfg.name, API_Field: '*', SQL_Column: '', API_Value: '', SQL_Value: '', Match: 'NO_SQL_ROW' });
        results.push({ name: cfg.name, post_ok: !SKIP_POST, key: noteKey, get_ok: true, sql_ok: false });
        continue;
      }

      const caseNoteKeyVal = sqlRow.CaseNoteKey;
      if (caseNoteKeyVal) {
        const { row: cnRow } = await sqlClient.getRow('NoteModule', 'CaseNote', 'CaseNoteKey', caseNoteKeyVal);
        if (cnRow) { for (const [k, v] of Object.entries(cnRow)) { if (!(k in sqlRow)) sqlRow[k] = v; } }
      }

      for (const [childTbl, childFk] of cfg.sql_children || []) {
        const { rows: childRows } = await sqlClient.getChildRows('NoteModule', childTbl, childFk, noteKey);
        const apiArrayName = childTbl.replace(cfg.name, '');
        const arrayKey = apiArrayName ? apiArrayName[0].toLowerCase() + apiArrayName.slice(1) : '';
        for (let ci = 0; ci < childRows.length; ci++) {
          for (const [col, val] of Object.entries(childRows[ci])) {
            if (col !== childFk) sqlRow[`${arrayKey}[${ci}].${col}`] = val;
          }
        }
        if (childRows.length) console.log(`  Child ${childTbl}: ${childRows.length} rows`);
      }

      if (caseNoteKeyVal) {
        try {
          const { row: saRow } = await sqlClient.getRow('NoteModule', 'SafetyAssessment', 'CaseNoteKey', caseNoteKeyVal);
          if (saRow?.SafetyAssessmentKey) {
            for (const [saChild, saApi] of [['SafetyAssessmentObservedSafetyFactors', 'observedSafetyFactors'], ['SafetyAssessmentObservedVulnerabilityFactors', 'observedVulnerabilityFactors']] as const) {
              const { rows: saRows } = await sqlClient.getChildRows('NoteModule', saChild, 'SafetyAssessmentKey', saRow.SafetyAssessmentKey);
              for (let si = 0; si < saRows.length; si++) {
                for (const [col, val] of Object.entries(saRows[si])) {
                  if (col !== 'SafetyAssessmentKey') sqlRow[`${saApi}[${si}].${col}`] = val;
                }
              }
              if (saRows.length) console.log(`  Child ${saChild}: ${saRows.length} rows`);
            }
          }
        } catch { /* ignore */ }
      }

      for (const extra of cfg.sql_extra_lookups || []) {
        try {
          const { row: eRow } = await sqlClient.getRow('NoteModule', extra.table, extra.fk, noteKey);
          if (eRow) {
            const pfx = extra.prefix;
            for (const [ek, ev] of Object.entries(eRow)) { if (ek !== extra.fk) sqlRow[pfx ? `${pfx}.${ek}` : ek] = ev; }
            const epkVal = eRow[extra.table + 'Key'];
            for (const [childTbl, childFk, childApi] of extra.children || []) {
              if (epkVal) {
                const { rows: cRows } = await sqlClient.getChildRows('NoteModule', childTbl, childFk, epkVal);
                for (let ci = 0; ci < cRows.length; ci++) {
                  for (const [col, val] of Object.entries(cRows[ci])) {
                    if (col !== childFk) sqlRow[pfx ? `${pfx}.${childApi}[${ci}].${col}` : `${childApi}[${ci}].${col}`] = val;
                  }
                }
                if (cRows.length) console.log(`  Child ${childTbl}: ${cRows.length} rows`);
              }
            }
          }
        } catch { /* ignore */ }
      }

      const cmpRes = noteCompareApiToSql(noteFlatten(getData), sqlRow, cfg.name, noteFlatten(cfg.payload));
      const y = cmpRes.filter((r) => r.Match === 'YES').length;
      const n = cmpRes.filter((r) => r.Match === 'NO').length;
      const nc = cmpRes.filter((r) => r.Match === 'NO_SQL_COL').length;
      console.log(`  FOUND -> Match=${y} Mismatch=${n} NoCol=${nc}`);
      allCmp.push(...cmpRes);

      const cnData = (cfg as any)._casenote_data;
      const cnKey = (cfg as any)._casenote_key;
      if (cnData && cnKey) {
        const { row: cnSqlRow } = await sqlClient.getRow('NoteModule', 'CaseNote', 'CaseNoteKey', cnKey);
        if (cnSqlRow) {
          try {
            const { row: saRow } = await sqlClient.getRow('NoteModule', 'SafetyAssessment', 'CaseNoteKey', cnKey);
            if (saRow) {
              for (const [sk, sv] of Object.entries(saRow)) cnSqlRow[`SafetyAssessment${sk}`] = sv;
              if (saRow.SafetyAssessmentKey) {
                for (const [saChild, saApi] of [['SafetyAssessmentObservedSafetyFactors', 'observedSafetyFactors'], ['SafetyAssessmentObservedVulnerabilityFactors', 'observedVulnerabilityFactors']] as const) {
                  const { rows: saRows } = await sqlClient.getChildRows('NoteModule', saChild, 'SafetyAssessmentKey', saRow.SafetyAssessmentKey);
                  for (let si = 0; si < saRows.length; si++) {
                    for (const [col, val] of Object.entries(saRows[si])) {
                      if (col !== 'SafetyAssessmentKey') cnSqlRow[`safetyAssessment.${saApi}[${si}].${col}`] = val;
                    }
                  }
                }
              }
            }
          } catch { /* ignore */ }
          const cnCmp = noteCompareApiToSql(noteFlatten(cnData), cnSqlRow, `${cfg.name}->CaseNote`);
          console.log(`[SQL]  ${cfg.name}->CaseNote -> Match=${cnCmp.filter((r) => r.Match === 'YES').length} Mismatch=${cnCmp.filter((r) => r.Match === 'NO').length}`);
          allCmp.push(...cnCmp);
        }
      }

      results.push({ name: cfg.name, post_ok: !SKIP_POST, key: noteKey, get_ok: true, sql_ok: true });
    }

    for (const cfg of configs) {
      if (!results.find((r) => r.name === cfg.name)) {
        results.push({ name: cfg.name, post_ok: false, key: (cfg as any)._key || null, get_ok: !!(cfg as any)._get_data, sql_ok: false });
      }
    }
  });

  test('Step 4: Generate Reports', async () => {
    for (const cfg of configs) {
      if (!results.find((r) => r.name === cfg.name)) {
        results.push({ name: cfg.name, post_ok: !!(cfg as any)._key, key: (cfg as any)._key || null, get_ok: !!(cfg as any)._get_data, sql_ok: false });
      }
    }

    report.saveJson('00_keys.json', { Environment: ENV_NAME, Timestamp: ts, refs, notes: Object.fromEntries(results.map((r) => [r.name, r.key])) });
    report.writeSummary(results);
    if (allCmp.length) { report.writeFieldComparison(allCmp); report.writeGaps(allCmp); }
    report.writeGapAnalysisReport(results, allCmp);

    console.log('\n' + '='.repeat(70));
    console.log(`  ${'Note Type'.padEnd(40)} ${'POST'.padStart(5)} ${'GET'.padStart(5)} ${'SQL'.padStart(5)}`);
    console.log(`  ${'-'.repeat(40)} ${'-'.repeat(5)} ${'-'.repeat(5)} ${'-'.repeat(5)}`);
    for (const r of results) {
      console.log(`  ${r.name.padEnd(40)} ${(r.post_ok ? 'OK' : (SKIP_POST ? 'SKIP' : 'FAIL')).padStart(5)} ${(r.get_ok ? 'OK' : 'FAIL').padStart(5)} ${(r.sql_ok ? 'OK' : (SKIP_SQL ? 'SKIP' : 'FAIL')).padStart(5)}`);
    }
    if (allCmp.length) {
      const y = allCmp.filter((r) => r.Match === 'YES').length;
      const n = allCmp.filter((r) => r.Match === 'NO').length;
      console.log(`\n  Fields: ${y}/${allCmp.length} matched, ${n} mismatches`);
    }
    console.log(`  Output: ${outDir}`);
    console.log('='.repeat(70));

    const mismatches = allCmp.filter((r) => r.Match === 'NO');
    expect.soft(mismatches.length, `${mismatches.length} field value mismatches found`).toBe(0);
  });
});
