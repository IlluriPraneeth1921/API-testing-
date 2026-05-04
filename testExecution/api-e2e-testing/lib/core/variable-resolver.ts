/**
 * Variable Resolver — resolves ${strXxxKey} placeholders in Excel test data.
 *
 * Tier 1: SQL lookup (top 15 keys cover 90%+ of files)
 * Tier 2: Static/generated values (dates, emails, names, etc.)
 * Tier 3: Runtime keys (entity's own key from POST response during the run)
 */

import { GenericSqlClient } from '../generic-sql-client';
import { EnvConfig } from '../env-config';
import * as fs from 'fs';
import * as path from 'path';

// ── Aggregate SQL config ──
const AGG_SQL_PATH = path.resolve(__dirname, '..', '..', 'config', 'aggregate-sql.json');
function loadAggregateSql(): Record<string, { query: string }> {
  if (!fs.existsSync(AGG_SQL_PATH)) return {};
  return JSON.parse(fs.readFileSync(AGG_SQL_PATH, 'utf-8'));
}

export interface ResolvedVars {
  [key: string]: string;
}

// ── Tier 1: SQL key lookups ──

const SQL_KEY_MAP: Record<string, { schema: string; table: string; keyCol: string; dependsOn?: { varName: string; fkCol: string } }> = {
  strCaseKey:                    { schema: 'CaseModule',              table: 'Case',                    keyCol: 'CaseKey' },
  strCaseActivityKey:             { schema: 'CaseActivityModule',     table: 'CaseActivityInstance',    keyCol: 'CaseActivityInstanceKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strPersonKey:                  { schema: 'PersonModule',            table: 'Person',                  keyCol: 'PersonKey' },
  strLocationKey:                { schema: 'OrganizationModule',      table: 'Location',                keyCol: 'LocationKey', dependsOn: { varName: 'strOrganizationKey', fkCol: 'OrganizationKey' } },
  strProgramKey:                 { schema: 'ProgramModule',           table: 'Program',                 keyCol: 'ProgramKey' },
  strProgramKey1:                { schema: 'ProgramModule',           table: 'Program',                 keyCol: 'ProgramKey' },
  strProgramKey2:                { schema: 'ProgramModule',           table: 'Program',                 keyCol: 'ProgramKey' },
  strStaffMemberKey:             { schema: 'OrganizationModule',      table: 'StaffMember',             keyCol: 'StaffMemberKey' },
  strOrganizationKey:            { schema: 'OrganizationModule',      table: 'Organization',            keyCol: 'OrganizationKey' },
  strSystemRoleKey:              { schema: 'SecurityModule',          table: 'SystemRole',              keyCol: 'SystemRoleKey' },
  strSystemRoleKey1:             { schema: 'SecurityModule',          table: 'SystemRole',              keyCol: 'SystemRoleKey' },
  strSystemRoleKey2:             { schema: 'SecurityModule',          table: 'SystemRole',              keyCol: 'SystemRoleKey' },
  strPersonContactKey:           { schema: 'PersonModule',            table: 'PersonContact',           keyCol: 'PersonContactKey' },
  strFileKey:                    { schema: 'FileModule',              table: 'File',                    keyCol: 'FileKey' },
  strServiceDefinitionKey:       { schema: 'ServiceDefinitionModule', table: 'ServiceDefinition',       keyCol: 'ServiceDefinitionKey' },
  strIncidentReportKey:          { schema: 'IncidentModule',          table: 'IncidentReport',          keyCol: 'IncidentReportKey' },
  strProtectiveServicesReportKey:{ schema: 'ProtectiveServicesModule',table: 'ProtectiveServicesReport', keyCol: 'ProtectiveServicesReportKey' },
  strGuardianshipKey:            { schema: 'GuardianshipModule',      table: 'Guardianship',            keyCol: 'GuardianshipKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strServiceAuthorizationKey:    { schema: 'ServiceAuthorizationModule', table: 'ServiceAuthorization', keyCol: 'ServiceAuthorizationKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strIntakeReferralKey:          { schema: 'IntakeReferralModule',    table: 'IntakeReferral',          keyCol: 'IntakeReferralKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strContactKey:                 { schema: 'OrganizationModule',      table: 'OrganizationPointOfContact', keyCol: 'OrganizationPointOfContactKey', dependsOn: { varName: 'strOrganizationKey', fkCol: 'OrganizationKey' } },
  strServiceAreaKey:             { schema: 'OrganizationModule',      table: 'ServiceArea',             keyCol: 'ServiceAreaKey', dependsOn: { varName: 'strOrganizationKey', fkCol: 'OrganizationKey' } },
  strUserAccountKey:             { schema: 'SecurityModule',          table: 'UserAccount',             keyCol: 'UserAccountKey' },
  strSystemAccountKey:           { schema: 'SecurityModule',          table: 'SystemAccount',           keyCol: 'SystemAccountKey' },
  strRegionKey:                  { schema: 'RegionModule',            table: 'Region',                  keyCol: 'RegionKey' },
};

// ── Tier 2: Generated values ──

function generateTier2(baseUrl: string, resource: string): ResolvedVars {
  const now = new Date();
  const ts = now.getTime();
  const isoToday = now.toISOString().split('T')[0];
  const futureDate = new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0];
  const rnd = Math.random().toString(36).slice(2, 8);

  return {
    // ── Endpoints & Resources ──
    strEndPoint: baseUrl.replace(/\/+$/, ''),
    strResource: resource,
    strInvalidKey: '00000000-0000-0000-0000-000000000000',

    // ── Names ──
    strName: `AutoTest_${rnd}`,
    strFullName: `AutoTest_${rnd}`,
    strShortName: `AT_${rnd}`,
    strFirstName: `TestFirst_${rnd}`,
    strLastName: `TestLast_${rnd}`,
    strMiddleName: `TestMiddle_${rnd}`,
    strDoingBusinessAsName: `AutoDBA_${rnd}`,
    strBusinessName: `AutoBiz_${rnd}`,
    strPointOfContactName: `AutoPOC_${rnd}`,

    // ── Emails ──
    strEmail: `auto_${ts}@test.com`,
    strEmail1: `auto1_${ts}@test.com`,
    strEmail2: `auto2_${ts}@test.com`,
    strEmailAddress: `auto_${ts}@test.com`,

    // ── Phones ──
    strPhoneNumber: '1 (555) 123-4567',
    strPhoneNumber1: '1 (555) 123-4567',
    strPhoneNumber2: '1 (555) 123-4568',
    strNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,

    // ── Dates ──
    strStartDate: `${isoToday}T00:00:00.000Z`,
    strEndDate: `${futureDate}T23:59:59.000Z`,
    strDate: `${isoToday}T12:00:00.000Z`,
    strTodayDate: isoToday,

    // ── Address ──
    strCity: 'TestCity',
    strCityName: 'TestCity',
    strFirstStreetAddress: '123 Test St',
    strSecondStreetAddress: '456 Test Ave',
    strStreetName: '123 Test St',
    strPostalCode: '12345',

    // ── Identifiers & Credentials ──
    strIdentifier: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    strIdentifier1: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    strIdentifier2: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    intCredentialNumber: `CRED_${rnd}`,
    intCredentialNumber1: `CRED1_${rnd}`,
    intCredentialNumber2: `CRED2_${rnd}`,
    strQualificationNumber: `QUAL_${rnd}`,

    // ── Text fields ──
    strTitle: `Title_${rnd}`,
    strDescription: `Automation test ${ts}`,
    strNote: `Automation test ${ts}`,

    // ── Organization search variables (vocabulary codes) ──
    strStatusDisplayName: 'Active',
    intStatusIdentifier: '4400001',
    intStatusCodeSystemIdentifier: '1',
    strIdentifierTypeDisplayName: 'NPI',
    intIdentifierTypeIdentifier: '1000005',
    intIdentifierCodeSystemTypeIdentifier: '1',

    // ── Contact search variables (must match SubEndpointHappy contact type) ──
    strTypeDisplayName: 'Director/Manager',
    intTypeIdentifier: '3100004',
    intTypeCodeSystemIdentifier: '1',

    // ── Service Area search variables (must match SubEndpointHappy service-area) ──
    strStateProvinceDisplayName: 'Missouri',
    intStateProvinceIdentifier: '800027',
    intStateProvinceCodeSystemIdentifier: '1',
    strCountyAreaDisplayName: 'Barnes County',
    intCountyAreaIdentifier: '901992',
    intCountyAreaCodeSystemIdentifier: '1',

    // ── Location search variables ──
    strLocationStatusDisplayName: 'Active',
    intLocationStatusIdentifier: '4400001',
    intLocationStatusCodeSystemIdentifier: '1',

    // ── Location-specific variables (lowercase prefix used in Excel) ──
    strstatusDisplayName: 'Active',
    strstatusIdentifier: '4400001',
    strstatusCodeSystemIdentifier: '1',
    strTypeIdentifier: '4200001',
    strTypeCodeSystemIdentifier: '1',
    strbusinessIdentifierDisplayName: 'NPI',
    strbusinessIdentifierIdentifier: '1000005',
    strbusinessIdentifierCodeSystemIdentifier: '1',
    strprimaryTypeDisplayName: 'Physical',
    strprimaryTypeIdentifier: '500003',
    strprimaryTypeCodeSystemIdentifier: '1',
    strspecialtyTypeDisplayName: 'Behavioral Health',
    strspecialtyTypeIdentifier: '42100001',
    strspecialtyTypeCodeSystemIdentifier: '1',
    strsubTypeDisplayName: 'Residential',
    strsubTypeIdentifier: '42000001',
    strsubTypeCodeSystemIdentifier: '1',
    strStateDisplayName: 'Alaska',
    strStateIdentifier: '800002',
    strStateCodeSystemIdentifier: '1',
    strCountyAreaIdentifier: '900069',
    strCountyAreaCodeSystemIdentifier: '1',

    // ── Program & Role keys (fallback if SQL unavailable) ──
    // Note: Do NOT set placeholder GUIDs here — they cause 400 errors.
    // These keys should be resolved via SQL or API lookup instead.
  };
}

// ── Main Resolver ──

export class VariableResolver {
  private cache: ResolvedVars = {};
  private sqlClient: GenericSqlClient | null = null;
  private cfg: EnvConfig;
  private tier2Cache: ResolvedVars | null = null;
  private searchSnapshot: ResolvedVars | null = null;

  constructor(cfg: EnvConfig) {
    this.cfg = cfg;
  }

  async init(skipSql = false): Promise<void> {
    if (!skipSql) {
      this.sqlClient = new GenericSqlClient(this.cfg);
      try {
        await this.sqlClient.connect();
      } catch (e: any) {
        console.log(`  ⚠ SQL connect failed: ${e.message} — will use generated values only`);
        this.sqlClient = null;
      }
    }
  }

  /** Run aggregate-specific SQL query from config/aggregate-sql.json */
  async resolveAggregateKeys(entityName: string): Promise<void> {
    if (!this.sqlClient) return;
    const aggSql = loadAggregateSql();
    const config = aggSql[entityName] || aggSql['_default'];
    if (!config?.query) return;

    try {
      console.log(`  🔍 Running aggregate SQL for ${entityName}...`);
      const rows = await this.sqlClient.query(config.query, {});
      if (rows.length > 0) {
        const row = rows[0];
        for (const [col, val] of Object.entries(row)) {
          if (val && String(val).length > 0) {
            // Only set if not already set (env_config context keys take priority)
            if (!this.cache[col]) {
              this.cache[col] = String(val);
              console.log(`  ✓ ${col} = ${String(val).slice(0, 12)}... (aggregate SQL)`);
            }
          }
        }
      }
      // Auto-fill base key from numbered variant (e.g. strProgramKey from strProgramKey1)
      this.backfillBaseKeys();
    } catch (e: any) {
      console.log(`  ⚠ Aggregate SQL failed for ${entityName}: ${e.message}`);
    }
  }

  /** If strXxxKey1 exists but strXxxKey doesn't, copy it over.
   *  Aggregate SQL often returns Key1/Key2 but not the base Key. */
  private backfillBaseKeys(): void {
    for (const [k, v] of Object.entries(this.cache)) {
      const m = k.match(/^(str\w+Key)1$/);
      if (m && !this.cache[m[1]]) {
        this.cache[m[1]] = v;
        console.log(`  ✓ ${m[1]} = ${v.slice(0, 12)}... (backfill from ${k})`);
      }
    }
  }

  async close(): Promise<void> {
    if (this.sqlClient) await this.sqlClient.close().catch(() => {});
  }

  /** Pre-resolve all Tier 1 SQL keys needed by this set of variables */
  async resolveNeededKeys(variableNames: Set<string>): Promise<void> {
    if (!this.sqlClient) return;

    // Resolve independent keys first, then dependent keys
    const independent: string[] = [];
    const dependent: string[] = [];
    for (const varName of variableNames) {
      const clean = varName.replace(/^\$\{/, '').replace(/\}$/, '');
      const mapping = SQL_KEY_MAP[clean];
      if (!mapping) continue;
      if (mapping.dependsOn) dependent.push(clean);
      else independent.push(clean);
    }

    // Phase 1: independent keys
    for (const clean of independent) {
      await this.resolveOneKey(clean);
    }
    // Phase 2: dependent keys (parent already resolved)
    for (const clean of dependent) {
      await this.resolveOneKey(clean);
    }
    // Phase 3: backfill base keys from numbered variants
    this.backfillBaseKeys();
  }

  private async resolveOneKey(clean: string): Promise<void> {
    if (this.cache[clean] || !this.sqlClient) return;
    const mapping = SQL_KEY_MAP[clean];
    if (!mapping) return;

    // For keys ending in 1/2 (e.g. strProgramKey1, strProgramKey2), get nth row
    const suffixMatch = clean.match(/(\d)$/);
    const rowOffset = suffixMatch ? parseInt(suffixMatch[1]) - 1 : 0;

    try {
      let key: string | null = null;

      if (mapping.dependsOn) {
        const parentVal = this.cache[mapping.dependsOn.varName];
        if (parentVal) {
          const rows = await this.sqlClient.query(
            `SELECT TOP ${rowOffset + 1} [${mapping.keyCol}] FROM [${mapping.schema}].[${mapping.table}] WHERE [${mapping.dependsOn.fkCol}] = @key ORDER BY EntityCreatedTimestamp DESC`,
            { key: parentVal }
          );
          key = rows[rowOffset]?.[mapping.keyCol] ? String(rows[rowOffset][mapping.keyCol]) : null;
        }
      }

      if (!key) {
        if (rowOffset > 0) {
          const rows = await this.sqlClient.query(
            `SELECT TOP ${rowOffset + 1} [${mapping.keyCol}] FROM [${mapping.schema}].[${mapping.table}] ORDER BY EntityCreatedTimestamp DESC`,
            {}
          );
          key = rows[rowOffset]?.[mapping.keyCol] ? String(rows[rowOffset][mapping.keyCol]) : null;
        } else {
          key = await this.sqlClient.getLatestKey(mapping.schema, mapping.table, mapping.keyCol);
        }
      }

      if (key) {
        this.cache[clean] = key;
        console.log(`  ✓ ${clean} = ${key.slice(0, 12)}...${mapping.dependsOn ? ' (linked)' : ''}${rowOffset > 0 ? ` (row ${rowOffset + 1})` : ''}`);
      }
    } catch (e: any) {
      console.log(`  ⚠ SQL lookup failed for ${clean}: ${e.message}`);
    }
  }

  /** Set a runtime key (e.g. entity's own key from POST response) */
  setKey(name: string, value: string): void {
    this.cache[name] = value;
  }

  /** Get all resolved variables */
  getAll(): ResolvedVars {
    return { ...this.cache };
  }

  /** Get or create cached Tier 2 values (generated once per resolver instance) */
  private getTier2(resource: string): ResolvedVars {
    if (!this.tier2Cache) {
      this.tier2Cache = generateTier2(this.cfg.BASE_URL, resource);
    }
    return this.tier2Cache;
  }

  /** Snapshot current randomized field values (called after first successful CreateHappy).
   *  Search scenarios will restore these so their filter values match the created data. */
  snapshotSearchFields(): void {
    const searchKeys = [
      'strName', 'strFullName', 'strShortName', 'strFirstName', 'strLastName',
      'strDoingBusinessAsName', 'strBusinessName', 'strPointOfContactName',
      'strEmail', 'strEmail1', 'strEmail2', 'strEmailAddress',
      'strIdentifier', 'strIdentifier1', 'strIdentifier2',
      'strTitle', 'strCity', 'strCityName',
      'strPhoneNumber', 'strPhoneNumber1', 'strPhoneNumber2',
      'strFirstStreetAddress', 'strStreetName', 'strPostalCode',
      'intCredentialNumber', 'intCredentialNumber1', 'intCredentialNumber2',
    ];
    this.searchSnapshot = {};
    for (const k of searchKeys) {
      if (this.cache[k]) this.searchSnapshot[k] = this.cache[k];
    }
  }

  /** Restore snapshotted search fields into cache (call before search scenarios). */
  restoreSearchFields(): void {
    if (!this.searchSnapshot) return;
    for (const [k, v] of Object.entries(this.searchSnapshot)) {
      this.cache[k] = v;
    }
  }

  /** Regenerate random values for name/description/note/address/email fields.
   *  Call before each happy-path scenario to avoid duplicate-name 400s. */
  randomizeFields(): void {
    const rnd = Math.random().toString(36).slice(2, 8);
    const ts = Date.now();
    const fields: Record<string, string> = {
      strName: `AutoTest_${rnd}`,
      strFullName: `AutoTest_${rnd}`,
      strShortName: `AT_${rnd}`,
      strFirstName: `TestFirst_${rnd}`,
      strLastName: `TestLast_${rnd}`,
      strMiddleName: `TestMiddle_${rnd}`,
      strDoingBusinessAsName: `AutoDBA_${rnd}`,
      strBusinessName: `AutoBiz_${rnd}`,
      strPointOfContactName: `AutoPOC_${rnd}`,
      strEmail: `auto_${ts}@test.com`,
      strEmail1: `auto1_${ts}@test.com`,
      strEmail2: `auto2_${ts}@test.com`,
      strEmailAddress: `auto_${ts}@test.com`,
      strIdentifier: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      strIdentifier1: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      strIdentifier2: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      intCredentialNumber: `CRED_${rnd}`,
      intCredentialNumber1: `CRED1_${rnd}`,
      intCredentialNumber2: `CRED2_${rnd}`,
      strTitle: `Title_${rnd}`,
      strDescription: `Automation test ${ts}`,
      strNote: `Automation note ${ts}`,
      strCity: `City_${rnd}`,
      strCityName: `City_${rnd}`,
      strFirstStreetAddress: `${Math.floor(Math.random() * 9000) + 1000} Test St`,
      strSecondStreetAddress: `Apt ${Math.floor(Math.random() * 900) + 100}`,
      strStreetName: `${Math.floor(Math.random() * 9000) + 1000} Test St`,
      strPostalCode: String(Math.floor(Math.random() * 90000) + 10000),
      strPhoneNumber: `1 (${String(Math.floor(200 + Math.random() * 800))}) ${String(Math.floor(200 + Math.random() * 800))}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      strPhoneNumber1: `1 (${String(Math.floor(200 + Math.random() * 800))}) ${String(Math.floor(200 + Math.random() * 800))}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      strPhoneNumber2: `1 (${String(Math.floor(200 + Math.random() * 800))}) ${String(Math.floor(200 + Math.random() * 800))}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      strNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
    };
    for (const [k, v] of Object.entries(fields)) this.cache[k] = v;
  }

  /** Resolve all ${strXxx} in a string */
  resolve(text: string, resource: string): string {
    const tier2 = this.getTier2(resource);
    return text.replace(/\$\{(\w+)\}/g, (match, varName) => {
      return this.cache[varName] ?? tier2[varName] ?? match;
    });
  }

  /** Parse a RequestBody JSON string, resolving variables */
  resolveBody(bodyStr: string, resource: string): any {
    if (!bodyStr || !bodyStr.trim()) return {};
    const resolved = this.resolve(bodyStr, resource);
    try {
      const obj = JSON.parse(resolved);
      return this.stripUnresolved(obj);
    } catch {
      console.log(`  ⚠ Failed to parse body: ${resolved.slice(0, 200)}`);
      return {};
    }
  }

  /** Fill required address fields for CreateHappy bodies.
   *  Call explicitly from runHappyPath only — not for negative/sub-endpoint tests. */
  fillRequiredAddressFields(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    const addressArrays = ['locationAddresses', 'organizationAddresses'];
    for (const arrName of addressArrays) {
      const arr = obj[arrName];
      if (!Array.isArray(arr)) continue;
      for (const addr of arr) {
        if (!addr || typeof addr !== 'object') continue;
        if (!addr.cityName) addr.cityName = this.cache.strCityName || this.cache.strCity || 'TestCity';
        if (!addr.firstStreetAddress) addr.firstStreetAddress = this.cache.strFirstStreetAddress || '123 Test St';
        if (!addr.postalCode) addr.postalCode = this.cache.strPostalCode || '12345';
        if (!addr.stateProvince) addr.stateProvince = { codeSystemIdentifier: '1', name: 'Alabama', code: '800001' };
        if (!addr.physicalAddressType) addr.physicalAddressType = { codeSystemIdentifier: '1', name: 'Physical', code: '500003' };
        // Remove country if it uses codeSystemIdentifier "3" (not available in all environments)
        if (addr.country?.codeSystemIdentifier === '3') delete addr.country;
      }
    }
  }

  /** Remove fields that still contain unresolved ${...} variables */
  private stripUnresolved(obj: any): any {
    if (typeof obj === 'string') {
      return obj.includes('${') ? undefined : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.stripUnresolved(item)).filter(item => item !== undefined);
    }
    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(obj)) {
        const val = this.stripUnresolved(v);
        if (val !== undefined) cleaned[k] = val;
      }
      return cleaned;
    }
    return obj;
  }

  /** Resolve a URL string — strips unresolved ${...} from query params */
  resolveUrl(urlStr: string, resource: string): string {
    let resolved = this.resolve(urlStr, resource);
    // If URL still has unresolved ${...} in query params, remove those params
    if (resolved.includes('${') && resolved.includes('?')) {
      const [base, query] = resolved.split('?', 2);
      const cleanParams = query.split('&')
        .filter(p => !p.includes('${'))
        .join('&');
      resolved = cleanParams ? `${base}?${cleanParams}` : base;
    }
    // If unresolved ${...} in path segments, replace with a valid placeholder GUID
    resolved = resolved.replace(/\$\{\w+\}/g, '00000000-0000-0000-0000-000000000001');
    // Fix swapped pagination params: pageSize=0&paginationToken=50 → pageSize=50&paginationToken=0
    resolved = resolved.replace(/pageSize=0&paginationToken=(\d+)/, 'pageSize=$1&paginationToken=0');
    // Fix leading & after ? (e.g. ?&pageSize=50 → ?pageSize=50)
    resolved = resolved.replace('?&', '?');
    return resolved;
  }
}

/** Scan text for all ${strXxx} variable names */
export function extractVariables(texts: string[]): Set<string> {
  const vars = new Set<string>();
  for (const t of texts) {
    const matches = t.matchAll(/\$\{(\w+)\}/g);
    for (const m of matches) vars.add(m[1]);
  }
  return vars;
}
