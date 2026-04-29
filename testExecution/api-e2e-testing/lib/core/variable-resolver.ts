/**
 * Variable Resolver — resolves ${strXxxKey} placeholders in Excel test data.
 *
 * Tier 1: SQL lookup (top 15 keys cover 90%+ of files)
 * Tier 2: Static/generated values (dates, emails, names, etc.)
 * Tier 3: Runtime keys (entity's own key from POST response during the run)
 */

import { GenericSqlClient } from '../generic-sql-client';
import { EnvConfig } from '../env-config';

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
  strStaffMemberKey:             { schema: 'OrganizationModule',      table: 'StaffMember',             keyCol: 'StaffMemberKey' },
  strOrganizationKey:            { schema: 'OrganizationModule',      table: 'Organization',            keyCol: 'OrganizationKey' },
  strSystemRoleKey:              { schema: 'SecurityModule',          table: 'SystemRole',              keyCol: 'SystemRoleKey' },
  strPersonContactKey:           { schema: 'PersonModule',            table: 'PersonContact',           keyCol: 'PersonContactKey' },
  strFileKey:                    { schema: 'FileModule',              table: 'File',                    keyCol: 'FileKey' },
  strServiceDefinitionKey:       { schema: 'ServiceDefinitionModule', table: 'ServiceDefinition',       keyCol: 'ServiceDefinitionKey' },
  strIncidentReportKey:          { schema: 'IncidentModule',          table: 'IncidentReport',          keyCol: 'IncidentReportKey' },
  strProtectiveServicesReportKey:{ schema: 'ProtectiveServicesModule',table: 'ProtectiveServicesReport', keyCol: 'ProtectiveServicesReportKey' },
  strGuardianshipKey:            { schema: 'GuardianshipModule',      table: 'Guardianship',            keyCol: 'GuardianshipKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strServiceAuthorizationKey:    { schema: 'ServiceAuthorizationModule', table: 'ServiceAuthorization', keyCol: 'ServiceAuthorizationKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
  strIntakeReferralKey:          { schema: 'IntakeReferralModule',    table: 'IntakeReferral',          keyCol: 'IntakeReferralKey', dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' } },
};

// ── Tier 2: Generated values ──

function generateTier2(baseUrl: string, resource: string): ResolvedVars {
  const now = new Date();
  const ts = now.getTime();
  const isoToday = now.toISOString().split('T')[0];
  const futureDate = new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0];
  const rnd = Math.random().toString(36).slice(2, 8);

  return {
    strEndPoint: baseUrl.replace(/\/+$/, ''),
    strResource: resource,
    strInvalidKey: '00000000-0000-0000-0000-000000000000',
    strEmail: `auto_${ts}@test.com`,
    strEmail1: `auto2_${ts}@test.com`,
    strName: `AutoTest_${rnd}`,
    strFullName: `AutoTest_${rnd}`,
    strShortName: `AT_${rnd}`,
    strFirstName: `TestFirst_${rnd}`,
    strLastName: `TestLast_${rnd}`,
    strStartDate: `${isoToday}T00:00:00.000Z`,
    strEndDate: `${futureDate}T23:59:59.000Z`,
    strDate: `${isoToday}T12:00:00.000Z`,
    strTodayDate: isoToday,
    strPhoneNumber: '5551234567',
    strNumber: '5551234567',
    strDescription: `Automation test ${ts}`,
    strNote: `Automation test ${ts}`,
    strBusinessName: `AutoBiz_${rnd}`,
    strCity: 'TestCity',
    strCityName: 'TestCity',
    strFirstStreetAddress: '123 Test St',
    strIdentifier: `AUTO_${rnd}`,
    strTitle: `Title_${rnd}`,
  };
}

// ── Main Resolver ──

export class VariableResolver {
  private cache: ResolvedVars = {};
  private sqlClient: GenericSqlClient | null = null;
  private cfg: EnvConfig;

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
  }

  private async resolveOneKey(clean: string): Promise<void> {
    if (this.cache[clean] || !this.sqlClient) return;
    const mapping = SQL_KEY_MAP[clean];
    if (!mapping) return;

    try {
      let key: string | null = null;

      if (mapping.dependsOn) {
        // Linked lookup: WHERE fkCol = parent key value
        const parentVal = this.cache[mapping.dependsOn.varName];
        if (parentVal) {
          const rows = await this.sqlClient.query(
            `SELECT TOP 1 [${mapping.keyCol}] FROM [${mapping.schema}].[${mapping.table}] WHERE [${mapping.dependsOn.fkCol}] = @key ORDER BY EntityCreatedTimestamp DESC`,
            { key: parentVal }
          );
          key = rows[0]?.[mapping.keyCol] ? String(rows[0][mapping.keyCol]) : null;
        }
      }

      // Fallback: latest row (no parent filter)
      if (!key) {
        key = await this.sqlClient.getLatestKey(mapping.schema, mapping.table, mapping.keyCol);
      }

      if (key) {
        this.cache[clean] = key;
        console.log(`  ✓ ${clean} = ${key.slice(0, 12)}...${mapping.dependsOn ? ' (linked)' : ''}`);
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

  /** Resolve all ${strXxx} in a string */
  resolve(text: string, resource: string): string {
    const tier2 = generateTier2(this.cfg.BASE_URL, resource);
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

  /** Resolve a URL string */
  resolveUrl(urlStr: string, resource: string): string {
    return this.resolve(urlStr, resource);
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
