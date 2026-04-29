import { test, expect } from '@playwright/test';
import * as path from 'path';
import { loadEnvConfig } from '../lib/env-config';
import { ApiClient } from '../lib/api-client';
import { SqlClient } from '../lib/sql-client';
import { ReportGenerator } from '../lib/report-generator';
import { flatten, compareApiToSql, scoreSqlRow, CompareResult } from '../lib/field-matcher';
import * as builders from '../lib/payload-builders';
import type { RefKeys } from '../lib/payload-builders';

const { name: ENV_NAME, config: CFG } = loadEnvConfig();

// CLI overrides via env vars
const SKIP_POST = process.env.SKIP_POST === 'true';
const SKIP_SQL = process.env.SKIP_SQL === 'true';
const POST_USER = process.env.POST_USER;
const POST_PASSWORD = process.env.POST_PASSWORD;

function keyFrom(resp: any, ...names: string[]): string | null {
  if (typeof resp === 'string') return resp.trim();
  if (resp && typeof resp === 'object') {
    for (const n of names) { if (resp[n]) return resp[n]; }
    if (resp.model && typeof resp.model === 'string') return resp.model;
    for (const [k, v] of Object.entries(resp)) {
      if (k.toLowerCase().includes('key') && typeof v === 'string') return v;
    }
  }
  return null;
}

test.describe('Organization Module E2E', () => {
  let api: ApiClient;
  let sqlClient: SqlClient;
  let report: ReportGenerator;
  let orgKey: string | null = process.env.ORG_KEY || null;
  let locKey: string | null = process.env.LOC_KEY || null;
  let staffKey: string | null = process.env.STAFF_KEY || null;
  let refs: RefKeys = { programKeys: [], orgRoleKeys: [], locRoleKeys: [] };
  const gets: Record<string, any> = {};
  const getSummary: { Endpoint: string; Status: string; Items: number }[] = [];
  const sqlRes: { Entity: string; Table: string; Key: string; Rows: number; Cols: number; Status: string }[] = [];
  const cmpRes: CompareResult[] = [];
  const getSqlMap: Record<string, [string, string, string]> = {};

  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const outDir = path.join(__dirname, '..', 'output', `OrgModule_E2E_${ts}`);

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    api = new ApiClient(ctx, CFG);
    report = new ReportGenerator(outDir, ENV_NAME, CFG.BASE_URL);

    if (!SKIP_SQL) {
      sqlClient = new SqlClient(CFG);
      try {
        await sqlClient.connectWithIntegratedAuth();
        refs = await sqlClient.fetchRefKeys();
        console.log(`  Refs: Programs=${refs.programKeys.length}, OrgRoles=${refs.orgRoleKeys.length}, LocRoles=${refs.locRoleKeys.length}`);
        if (SKIP_POST && !(orgKey && locKey && staffKey)) {
          const latest = await sqlClient.fetchLatestKeys(orgKey || undefined);
          orgKey = orgKey || latest.orgKey || null;
          locKey = locKey || latest.locKey || null;
          staffKey = staffKey || latest.staffKey || null;
          console.log(`  Existing keys: Org=${orgKey} Loc=${locKey} Staff=${staffKey}`);
        }
      } catch (e: any) {
        console.log(`  SQL connect failed: ${e.message}`);
      }
    }
  });

  test.afterAll(async () => {
    if (sqlClient) await sqlClient.close().catch(() => {});
  });

  test('Step 1: POST Organization', async () => {
    if (orgKey) { console.log(`  Existing Org: ${orgKey}`); return; }
    const payload = builders.buildOrganization(refs);
    report.saveJson('01_org_payload.json', payload);
    const resp = await api.post('/api/v1/organization-module/organization', payload, POST_USER, POST_PASSWORD);
    expect(resp.ok, `Org POST failed: ${resp.status}`).toBeTruthy();
    orgKey = keyFrom(resp.data, 'organizationKey', 'key');
    report.saveJson('01_org_response.json', resp.data);
    console.log(`  organizationKey = ${orgKey}`);
    expect(orgKey).toBeTruthy();
  });

  test('Step 1b: POST Org Contact', async () => {
    if (!orgKey || SKIP_POST) { test.skip(); return; }
    const payload = builders.buildOrgContact(refs);
    report.saveJson('01b_contact_payload.json', payload);
    const resp = await api.post(`/api/v1/organization-module/organization/${orgKey}/contact`, payload, POST_USER, POST_PASSWORD);
    report.saveJson('01b_contact_response.json', resp.data);
    expect.soft(resp.ok, 'Org Contact POST').toBeTruthy();
  });

  test('Step 1c: POST Org Service Area', async () => {
    if (!orgKey || SKIP_POST) { test.skip(); return; }
    const payload = builders.buildServiceArea();
    report.saveJson('01c_svcarea_payload.json', payload);
    const resp = await api.post(`/api/v1/organization-module/organization/${orgKey}/service-area`, payload, POST_USER, POST_PASSWORD);
    report.saveJson('01c_svcarea_response.json', resp.data);
    expect.soft(resp.ok, 'Org Service Area POST').toBeTruthy();
  });

  test('Step 2: POST Location', async () => {
    if (locKey) { console.log(`  Existing Loc: ${locKey}`); return; }
    if (!orgKey) { test.skip(); return; }
    const payload = builders.buildLocation(orgKey, refs);
    report.saveJson('02_loc_payload.json', payload);
    const resp = await api.post('/api/v1/organization-module/location', payload, POST_USER, POST_PASSWORD);
    expect.soft(resp.ok, 'Location POST').toBeTruthy();
    if (resp.ok) {
      locKey = keyFrom(resp.data, 'locationKey', 'key');
      report.saveJson('02_loc_response.json', resp.data);
      console.log(`  locationKey = ${locKey}`);
    }
  });

  test('Step 2b: POST Location Children', async () => {
    if (!locKey || SKIP_POST) { test.skip(); return; }
    const base = `/api/v1/organization-module/location/${locKey}`;

    const contact = await api.post(`${base}/contact`, builders.buildLocContact(refs), POST_USER, POST_PASSWORD);
    expect.soft(contact.ok, 'Loc Contact').toBeTruthy();

    const locType = await api.post(`${base}/location-type`, builders.buildLocType(), POST_USER, POST_PASSWORD);
    expect.soft(locType.ok, 'Loc Type').toBeTruthy();

    const svcArea = await api.post(`${base}/service-area`, builders.buildLocServiceArea(), POST_USER, POST_PASSWORD);
    expect.soft(svcArea.ok, 'Loc Service Area').toBeTruthy();

    const spec = await api.post(`${base}/specialty`, builders.buildLocSpecialty(), POST_USER, POST_PASSWORD);
    expect.soft(spec.ok, 'Loc Specialty').toBeTruthy();
  });

  test('Step 3: POST StaffMember', async () => {
    if (staffKey) { console.log(`  Existing Staff: ${staffKey}`); return; }
    if (!orgKey) { test.skip(); return; }
    const payload = builders.buildStaffMember(orgKey);
    report.saveJson('03_staff_payload.json', payload);
    const resp = await api.post('/api/v1/organization-module/staff-member', payload, POST_USER, POST_PASSWORD);
    expect.soft(resp.ok, 'Staff POST').toBeTruthy();
    if (resp.ok) {
      staffKey = keyFrom(resp.data, 'staffMemberKey', 'key');
      report.saveJson('03_staff_response.json', resp.data);
      console.log(`  staffMemberKey = ${staffKey}`);
    }
  });

  test('Step 3b: POST Staff Children', async () => {
    if (!staffKey || SKIP_POST) { test.skip(); return; }
    const base = `/api/v1/organization-module/staff-member/${staffKey}`;

    const addr = await api.post(`${base}/address`, builders.buildStaffAddress(), POST_USER, POST_PASSWORD);
    expect.soft(addr.ok, 'Staff Address').toBeTruthy();

    if (locKey) {
      const assign = await api.post(
        '/api/v1/organization-module/staff-member-location-assignment',
        builders.buildStaffLocAssignment(locKey, staffKey),
        POST_USER, POST_PASSWORD
      );
      expect.soft(assign.ok, 'Staff Loc Assignment').toBeTruthy();
    }
  });

  test('Step 4: GET all endpoints', async () => {
    const eps: [string, string][] = [];
    if (orgKey) {
      const b = `/api/v1/organization-module/organization/${orgKey}`;
      eps.push(['Org', b], ['Org_Addr', `${b}/addresses`], ['Org_Cred', `${b}/credentials`],
        ['Org_Email', `${b}/emails`], ['Org_Ident', `${b}/identifiers`],
        ['Org_Types', `${b}/organization-types`], ['Org_Phone', `${b}/phones`],
        ['Org_Contact', `${b}/contacts`], ['Org_Prog', `${b}/supported-programs`],
        ['Org_Role', `${b}/supported-roles`]);
    }
    if (locKey) {
      const b = `/api/v1/organization-module/location/${locKey}`;
      eps.push(['Loc', b], ['Loc_Addr', `${b}/addresses`], ['Loc_Email', `${b}/emails`],
        ['Loc_Ident', `${b}/identifiers`], ['Loc_Phone', `${b}/phones`],
        ['Loc_Contact', `${b}/contacts`], ['Loc_LocType', `${b}/location-types`],
        ['Loc_SvcArea', `${b}/service-areas`], ['Loc_Spec', `${b}/specialties`],
        ['Loc_Prog', `${b}/supported-programs`], ['Loc_Role', `${b}/supported-roles`]);
    }
    if (staffKey) {
      const b = `/api/v1/organization-module/staff-member/${staffKey}`;
      eps.push(['Staff', b], ['Staff_Addr', `${b}/addresses`], ['Staff_Cred', `${b}/credentials`],
        ['Staff_Email', `${b}/emails`], ['Staff_Ident', `${b}/identifiers`],
        ['Staff_Lang', `${b}/languages`], ['Staff_LocAsgn', `${b}/location-assignment-types`],
        ['Staff_Phone', `${b}/phones`], ['Staff_Rel', `${b}/staff-member-relationships`]);
    }

    for (const [label, ep] of eps) {
      const r = await api.get(ep);
      gets[label] = r.data;
      report.saveJson(`04_${label.replace(/[^\w]/g, '_')}.json`, r.data);
      const cnt = Array.isArray(r.data) ? r.data.length : (r.data && typeof r.data === 'object' ? 1 : 0);
      const st = r.data ? 'OK' : 'FAIL';
      getSummary.push({ Endpoint: label, Status: st, Items: cnt });
      console.log(`  ${label.padEnd(20)} -> ${st.padEnd(4)} (${cnt} items)`);
    }
    report.writeGetSummary(getSummary);
    expect.soft(getSummary.filter((g) => g.Status === 'OK').length).toBeGreaterThan(0);
  });

  test('Step 5: SQL Verification', async () => {
    if (SKIP_SQL || !sqlClient) { test.skip(); return; }

    const checks: [string, string, string, string][] = [];
    if (orgKey) {
      checks.push(
        ['Org', 'Organization', 'OrganizationKey', orgKey],
        ['OrgAddr', 'OrganizationAddresses', 'OrganizationKey', orgKey],
        ['OrgBizType', 'OrganizationBusinessTypes', 'OrganizationKey', orgKey],
        ['OrgCred', 'OrganizationCredentials', 'OrganizationKey', orgKey],
        ['OrgEmail', 'OrganizationEmailAddresses', 'OrganizationKey', orgKey],
        ['OrgIdent', 'OrganizationIdentifiers', 'OrganizationKey', orgKey],
        ['OrgPhone', 'OrganizationPhones', 'OrganizationKey', orgKey],
        ['OrgType', 'OrganizationOrganizationTypes', 'OrganizationKey', orgKey],
        ['OrgProg', 'OrganizationSupportedPrograms', 'OrganizationKey', orgKey],
        ['OrgRole', 'OrganizationSupportedRoles', 'OrganizationKey', orgKey],
        ['OrgPOC', 'OrganizationPointOfContact', 'OrganizationKey', orgKey],
        ['OrgSvcArea', 'ServiceArea', 'OrganizationKey', orgKey],
      );
    }
    if (locKey) {
      checks.push(
        ['Loc', 'Location', 'LocationKey', locKey],
        ['LocAddr', 'LocationAddresses', 'LocationKey', locKey],
        ['LocEmail', 'LocationEmailAddresses', 'LocationKey', locKey],
        ['LocIdent', 'LocationIdentifiers', 'LocationKey', locKey],
        ['LocPhone', 'LocationPhones', 'LocationKey', locKey],
        ['LocCred', 'LocationCredentials', 'LocationKey', locKey],
        ['LocProg', 'LocationSupportedPrograms', 'LocationKey', locKey],
        ['LocRole', 'LocationSupportedRoles', 'LocationKey', locKey],
      );
    }
    if (staffKey) {
      checks.push(
        ['Staff', 'StaffMember', 'StaffMemberKey', staffKey],
        ['StaffAddr', 'StaffMemberAddress', 'StaffMemberKey', staffKey],
        ['StaffLocAs', 'StaffMemberLocationAssignment', 'StaffMemberKey', staffKey],
      );
    }

    for (const [label, tbl, kcol, kval] of checks) {
      const { row, columns } = await sqlClient.getRow(tbl, kcol, kval);
      const cnt = row ? await sqlClient.getCount(tbl, kcol, kval) : 0;
      const st = row ? 'FOUND' : 'NOT_FOUND';
      sqlRes.push({ Entity: label, Table: tbl, Key: kval, Rows: cnt, Cols: columns.length, Status: st });
      console.log(`  ${label.padEnd(12)} ${tbl.padEnd(45)} -> ${st.padEnd(10)} (${cnt} rows, ${columns.length} cols)`);
    }
    report.writeSqlVerify(sqlRes);
  });

  test('Step 6: GET vs SQL field comparison', async () => {
    if (SKIP_SQL || !sqlClient) { test.skip(); return; }

    if (orgKey) {
      Object.assign(getSqlMap, {
        Org: ['Organization', 'OrganizationKey', orgKey],
        Org_Addr: ['OrganizationAddresses', 'OrganizationKey', orgKey],
        Org_Cred: ['OrganizationCredentials', 'OrganizationKey', orgKey],
        Org_Email: ['OrganizationEmailAddresses', 'OrganizationKey', orgKey],
        Org_Ident: ['OrganizationIdentifiers', 'OrganizationKey', orgKey],
        Org_Types: ['OrganizationOrganizationTypes', 'OrganizationKey', orgKey],
        Org_Phone: ['OrganizationPhones', 'OrganizationKey', orgKey],
        Org_Prog: ['OrganizationSupportedPrograms', 'OrganizationKey', orgKey],
        Org_Role: ['OrganizationSupportedRoles', 'OrganizationKey', orgKey],
      });
    }
    if (locKey) {
      Object.assign(getSqlMap, {
        Loc: ['Location', 'LocationKey', locKey],
        Loc_Addr: ['LocationAddresses', 'LocationKey', locKey],
        Loc_Email: ['LocationEmailAddresses', 'LocationKey', locKey],
        Loc_Ident: ['LocationIdentifiers', 'LocationKey', locKey],
        Loc_Phone: ['LocationPhones', 'LocationKey', locKey],
        Loc_Prog: ['LocationSupportedPrograms', 'LocationKey', locKey],
        Loc_Role: ['LocationSupportedRoles', 'LocationKey', locKey],
      });
    }
    if (staffKey) {
      Object.assign(getSqlMap, {
        Staff: ['StaffMember', 'StaffMemberKey', staffKey],
        Staff_Addr: ['StaffMemberAddress', 'StaffMemberKey', staffKey],
      });
    }

    for (const [gl, [tbl, kc, kv]] of Object.entries(getSqlMap)) {
      if (!kv) continue;
      const apiData = gets[gl];
      if (apiData == null) continue;

      // Fetch SQL rows (with enrichment for programs/roles)
      let sqlResult: { rows: Record<string, any>[]; columns: string[] };
      if (tbl.includes('SupportedPrograms')) sqlResult = await sqlClient.getEnrichedPrograms(tbl, kc, kv);
      else if (tbl.includes('SupportedRoles')) sqlResult = await sqlClient.getEnrichedRoles(tbl, kc, kv);
      else sqlResult = await sqlClient.getAllRows(tbl, kc, kv);

      let { rows: sqlRows } = sqlResult;

      // Normalize API items
      let apiItems: any[];
      if (apiData && typeof apiData === 'object' && !Array.isArray(apiData)) {
        if (apiData.model && Array.isArray(apiData.model)) apiItems = apiData.model;
        else if (apiData.model && typeof apiData.model === 'object') apiItems = [apiData];
        else apiItems = apiData ? [apiData] : [];
      } else if (Array.isArray(apiData)) {
        apiItems = apiData;
      } else continue;

      if (!apiItems.length && !sqlRows.length) continue;

      for (let ai = 0; ai < apiItems.length; ai++) {
        const flat = flatten(apiItems[ai]);
        const label = apiItems.length > 1 ? `${gl}[${ai}]` : gl;

        if (!sqlRows.length) {
          cmpRes.push({ Entity: label, API_Field: '*', SQL_Column: '', API_Value: '', SQL_Value: '', Match: 'NO_SQL_ROW' });
          continue;
        }

        // Pick best matching SQL row
        let bestIdx = 0, bestScore = -1;
        sqlRows.forEach((sr, si) => {
          const score = scoreSqlRow(flat, sr);
          if (score > bestScore) { bestScore = score; bestIdx = si; }
        });

        const isParent = ['Org', 'Loc', 'Staff'].includes(gl);
        cmpRes.push(...compareApiToSql(flat, sqlRows[bestIdx], label, isParent));
        if (sqlRows.length > 1) sqlRows.splice(bestIdx, 1);
      }

      const y = cmpRes.filter((r) => r.Entity.startsWith(gl) && r.Match === 'YES').length;
      const n = cmpRes.filter((r) => r.Entity.startsWith(gl) && r.Match === 'NO').length;
      const nc = cmpRes.filter((r) => r.Entity.startsWith(gl) && r.Match === 'NO_SQL_COL').length;
      const nr = cmpRes.filter((r) => r.Entity.startsWith(gl) && r.Match === 'NO_SQL_ROW').length;
      if (y + n + nc + nr > 0) {
        console.log(`  ${gl.padEnd(15)} ${tbl.padEnd(40)} Match=${y} Mismatch=${n} NoCol=${nc} NoRow=${nr}`);
      }
    }

    report.writeFieldComparison(cmpRes);
  });

  test('Step 7: Generate Gap Analysis Report', async () => {
    report.saveJson('00_keys.json', {
      OrganizationKey: orgKey, LocationKey: locKey, StaffMemberKey: staffKey,
      Environment: ENV_NAME, BaseURL: CFG.BASE_URL, Timestamp: ts,
    });

    const totalEndpoints = getSummary.length;
    report.writeGapAnalysis({ orgKey: orgKey || undefined, locKey: locKey || undefined, staffKey: staffKey || undefined }, getSummary, sqlRes, cmpRes, getSqlMap, totalEndpoints);

    // Summary
    const getOk = getSummary.filter((g) => g.Status === 'OK').length;
    const sqlFound = sqlRes.filter((r) => r.Status === 'FOUND').length;
    const matched = cmpRes.filter((r) => r.Match === 'YES').length;
    console.log('\n' + '='.repeat(70));
    console.log(`  Org   : ${orgKey}`);
    console.log(`  Loc   : ${locKey}`);
    console.log(`  Staff : ${staffKey}`);
    console.log(`  GETs  : ${getOk}/${totalEndpoints} OK`);
    if (sqlRes.length) console.log(`  SQL   : ${sqlFound}/${sqlRes.length} tables have data`);
    if (cmpRes.length) console.log(`  Fields: ${matched}/${cmpRes.length} matched`);
    console.log(`  Output: ${outDir}`);
    console.log('='.repeat(70));

    // Soft assert: no value mismatches
    const mismatches = cmpRes.filter((r) => r.Match === 'NO');
    expect.soft(mismatches.length, `${mismatches.length} field value mismatches found`).toBe(0);
  });
});
