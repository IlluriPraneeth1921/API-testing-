import * as sql from 'mssql/msnodesqlv8';
import { EnvConfig } from './env-config';

export interface NoteRefKeys {
  org_key: string | null;
  loc_key: string | null;
  staff_key: string | null;
  program_key: string | null;
  case_key: string | null;
  guardianship_key: string | null;
  psr_key: string | null;
  person_contact_key: string | null;
  collateral_contact_key: string | null;
}

export class NoteSqlClient {
  private pool: sql.ConnectionPool | null = null;
  private cfg: EnvConfig;

  constructor(cfg: EnvConfig) { this.cfg = cfg; }

  async connectWithIntegratedAuth(): Promise<void> {
    const connStr =
      `Driver={ODBC Driver 17 for SQL Server};Server=${this.cfg.SQL_SERVER};` +
      `Database=${this.cfg.SQL_DATABASE};Trusted_Connection=yes;Connection Timeout=30;`;
    this.pool = await new sql.ConnectionPool({ connectionString: connStr, driver: 'msnodesqlv8' } as any).connect();
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.close();
    this.pool = null;
  }

  private async queryRows(q: string, params?: Record<string, any>): Promise<sql.IRecordSet<any>> {
    if (!this.pool) throw new Error('SQL not connected');
    const req = this.pool.request();
    if (params) for (const [k, v] of Object.entries(params)) req.input(k, v);
    return (await req.query(q)).recordset;
  }

  private async queryOne(q: string, params?: Record<string, any>): Promise<Record<string, any> | null> {
    const rows = await this.queryRows(q, params);
    return rows.length ? rows[0] : null;
  }

  async fetchRefKeys(): Promise<NoteRefKeys> {
    const refs: NoteRefKeys = {
      org_key: null, loc_key: null, staff_key: null, program_key: null,
      case_key: null, guardianship_key: null, psr_key: null,
      person_contact_key: null, collateral_contact_key: null,
    };
    const safe = async (q: string, col: string): Promise<string | null> => {
      try { const r = await this.queryOne(q); return r ? String(r[col]) : null; } catch { return null; }
    };

    refs.org_key = await safe('SELECT TOP 1 OrganizationKey FROM [OrganizationModule].[Organization]', 'OrganizationKey');
    refs.loc_key = await safe('SELECT TOP 1 LocationKey FROM [OrganizationModule].[Location]', 'LocationKey');
    refs.staff_key = await safe('SELECT TOP 1 StaffMemberKey FROM [OrganizationModule].[StaffMember]', 'StaffMemberKey');
    refs.program_key = await safe('SELECT TOP 1 ProgramKey FROM [ProgramModule].[Program] WHERE ProgramKey IS NOT NULL', 'ProgramKey');
    refs.case_key = await safe('SELECT TOP 1 CaseKey FROM [CaseModule].[Case] WHERE CaseKey IS NOT NULL', 'CaseKey');
    refs.guardianship_key = await safe('SELECT TOP 1 GuardianshipKey FROM [GuardianshipModule].[Guardianship]', 'GuardianshipKey');
    refs.psr_key = await safe('SELECT TOP 1 ProtectiveServicesReportKey FROM [ProtectiveServicesModule].[ProtectiveServicesReport]', 'ProtectiveServicesReportKey');

    refs.person_contact_key = await safe(
      'SELECT TOP 1 ContactPersonContactKeyReference FROM [NoteModule].[GuardianshipNote] WHERE ContactPersonContactKeyReference IS NOT NULL',
      'ContactPersonContactKeyReference'
    );
    if (!refs.person_contact_key) {
      refs.person_contact_key = await safe(
        'SELECT TOP 1 ContactPersonContactKeyReference FROM [NoteModule].[ProtectiveServicesReportNote] WHERE ContactPersonContactKeyReference IS NOT NULL',
        'ContactPersonContactKeyReference'
      );
    }

    if (refs.case_key) {
      refs.collateral_contact_key = await safe(
        `SELECT TOP 1 pc.PersonContactKey FROM [PersonModule].[PersonContact] pc
         INNER JOIN [CaseModule].[Case] c ON c.PersonKey = pc.PersonKey
         WHERE c.CaseKey = '${refs.case_key}'`,
        'PersonContactKey'
      );
    }
    return refs;
  }

  async getRow(schema: string, table: string, keyCol: string, keyVal: string): Promise<{ row: Record<string, any> | null; columns: string[] }> {
    try {
      const rows = await this.queryRows(`SELECT * FROM [${schema}].[${table}] WHERE [${keyCol}] = @key`, { key: keyVal });
      if (!rows.length) return { row: null, columns: [] };
      return { row: rows[0], columns: Object.keys(rows[0]) };
    } catch { return { row: null, columns: [] }; }
  }

  async getChildRows(schema: string, table: string, fkCol: string, fkVal: string): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    try {
      const rows = await this.queryRows(`SELECT * FROM [${schema}].[${table}] WHERE [${fkCol}] = @key`, { key: fkVal });
      return { rows: [...rows], columns: rows.length ? Object.keys(rows[0]) : [] };
    } catch { return { rows: [], columns: [] }; }
  }

  async getLatestNoteKey(table: string, keyCol: string): Promise<string | null> {
    try {
      const r = await this.queryOne(`SELECT TOP 1 [${keyCol}] FROM [NoteModule].[${table}] ORDER BY EntityCreatedTimestamp DESC`);
      return r ? String(r[keyCol]) : null;
    } catch { return null; }
  }
}
