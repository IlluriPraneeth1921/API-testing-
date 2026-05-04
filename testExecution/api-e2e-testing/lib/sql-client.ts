import * as sql from 'mssql/msnodesqlv8';
import { EnvConfig } from './env-config';

export class SqlClient {
  private pool: sql.ConnectionPool | null = null;
  private cfg: EnvConfig;

  constructor(cfg: EnvConfig) {
    this.cfg = cfg;
  }

  async connect(): Promise<void> {
    this.pool = await new sql.ConnectionPool({
      server: this.cfg.SQL_SERVER,
      database: this.cfg.SQL_DATABASE,
      options: { encrypt: true, trustServerCertificate: true },
      authentication: { type: 'default', options: { userName: '', password: '' } },
      connectionTimeout: 30000,
    } as any).connect();
  }

  async connectWithIntegratedAuth(): Promise<void> {
    const connStr =
      `Driver={ODBC Driver 17 for SQL Server};Server=${this.cfg.SQL_SERVER};` +
      `Database=${this.cfg.SQL_DATABASE};Trusted_Connection=yes;Connection Timeout=30;`;
    this.pool = await new sql.ConnectionPool({
      connectionString: connStr,
      driver: 'msnodesqlv8',
    } as any).connect();
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.close();
    this.pool = null;
  }

  async query(queryStr: string, params?: Record<string, any>): Promise<sql.IRecordSet<any>> {
    if (!this.pool) throw new Error('SQL not connected');
    const req = this.pool.request();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        req.input(k, v);
      }
    }
    const result = await req.query(queryStr);
    return result.recordset;
  }

  async getRow(table: string, keyCol: string, keyVal: string): Promise<{ row: Record<string, any> | null; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT * FROM [OrganizationModule].[${table}] WHERE [${keyCol}] = @key`,
        { key: keyVal }
      );
      if (!rows.length) return { row: null, columns: rows.columns ? Object.keys(rows.columns) : [] };
      const columns = Object.keys(rows[0]);
      return { row: rows[0], columns };
    } catch {
      return { row: null, columns: [] };
    }
  }

  async getAllRows(table: string, keyCol: string, keyVal: string): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT * FROM [OrganizationModule].[${table}] WHERE [${keyCol}] = @key`,
        { key: keyVal }
      );
      const columns = rows.length ? Object.keys(rows[0]) : [];
      return { rows: [...rows], columns };
    } catch {
      return { rows: [], columns: [] };
    }
  }

  async getCount(table: string, keyCol: string, keyVal: string): Promise<number> {
    try {
      const rows = await this.query(
        `SELECT COUNT(*) AS cnt FROM [OrganizationModule].[${table}] WHERE [${keyCol}] = @key`,
        { key: keyVal }
      );
      return rows[0]?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  async getEnrichedPrograms(table: string, fkCol: string, fkVal: string): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT sp.ProgramKey, p.Description, p.DisplayName, p.WellKnownName,
                p.TotalSlotCount, p.StatusDisplayName, p.StatusIdentifier,
                p.StatusCodeSystemIdentifier,
                sp.EffectiveDateRangeStartDate, sp.EffectiveDateRangeEndDate
         FROM [OrganizationModule].[${table}] sp
         LEFT JOIN [ProgramModule].[Program] p ON sp.ProgramKey = p.ProgramKey
         WHERE sp.[${fkCol}] = @key`,
        { key: fkVal }
      );
      const columns = rows.length ? Object.keys(rows[0]) : [];
      return { rows: [...rows], columns };
    } catch {
      return { rows: [], columns: [] };
    }
  }

  async getEnrichedRoles(table: string, fkCol: string, fkVal: string): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT sr2.SystemRoleKey, sr.Description, sr.Name,
                sr.SystemRoleTypeEnum AS SystemRoleType
         FROM [OrganizationModule].[${table}] sr2
         LEFT JOIN [SecurityModule].[SystemRole] sr ON sr2.SystemRoleKey = sr.SystemRoleKey
         WHERE sr2.[${fkCol}] = @key`,
        { key: fkVal }
      );
      const columns = rows.length ? Object.keys(rows[0]) : [];
      return { rows: [...rows], columns };
    } catch {
      return { rows: [], columns: [] };
    }
  }

  async fetchRefKeys(): Promise<{ programKeys: string[]; orgRoleKeys: string[]; locRoleKeys: string[] }> {
    const refs = { programKeys: [] as string[], orgRoleKeys: [] as string[], locRoleKeys: [] as string[] };
    try {
      const p = await this.query('SELECT TOP 2 ProgramKey FROM [ProgramModule].[Program] WHERE ProgramKey IS NOT NULL');
      refs.programKeys = p.map((r: any) => String(r.ProgramKey));
    } catch { /* ignore */ }
    try {
      const r = await this.query(
        "SELECT TOP 2 SystemRoleKey FROM [SecurityModule].[SystemRole] WHERE SystemRoleKey IS NOT NULL AND SystemRoleLevel = 'Organization'"
      );
      refs.orgRoleKeys = r.map((row: any) => String(row.SystemRoleKey));
    } catch {
      try {
        const r = await this.query('SELECT TOP 2 SystemRoleKey FROM [SecurityModule].[SystemRole] WHERE SystemRoleKey IS NOT NULL');
        refs.orgRoleKeys = r.map((row: any) => String(row.SystemRoleKey));
      } catch { /* ignore */ }
    }
    try {
      const r = await this.query(
        "SELECT TOP 2 SystemRoleKey FROM [SecurityModule].[SystemRole] WHERE SystemRoleKey IS NOT NULL AND SystemRoleLevel = 'Location'"
      );
      refs.locRoleKeys = r.map((row: any) => String(row.SystemRoleKey));
    } catch { /* ignore */ }
    if (!refs.locRoleKeys.length) {
      try {
        const r = await this.query(
          'SELECT TOP 2 SystemRoleKey FROM [OrganizationModule].[LocationSupportedRoles] WHERE SystemRoleKey IS NOT NULL'
        );
        refs.locRoleKeys = Array.from(new Set(r.map((row: any) => String(row.SystemRoleKey))));
      } catch { /* ignore */ }
    }
    return refs;
  }

  async fetchLatestKeys(orgKey?: string): Promise<{ orgKey?: string; locKey?: string; staffKey?: string }> {
    const keys: { orgKey?: string; locKey?: string; staffKey?: string } = {};
    try {
      if (!orgKey) {
        const r = await this.query(
          'SELECT TOP 1 OrganizationKey FROM [OrganizationModule].[Organization] ORDER BY EntityCreatedTimestamp DESC'
        );
        keys.orgKey = r[0]?.OrganizationKey ? String(r[0].OrganizationKey) : undefined;
      } else {
        keys.orgKey = orgKey;
      }
      if (keys.orgKey) {
        const l = await this.query(
          'SELECT TOP 1 LocationKey FROM [OrganizationModule].[Location] WHERE OrganizationKey=@key ORDER BY EntityCreatedTimestamp DESC',
          { key: keys.orgKey }
        );
        keys.locKey = l[0]?.LocationKey ? String(l[0].LocationKey) : undefined;
        const s = await this.query(
          'SELECT TOP 1 StaffMemberKey FROM [OrganizationModule].[StaffMember] WHERE OrganizationKey=@key ORDER BY EntityCreatedTimestamp DESC',
          { key: keys.orgKey }
        );
        keys.staffKey = s[0]?.StaffMemberKey ? String(s[0].StaffMemberKey) : undefined;
      }
    } catch { /* ignore */ }
    return keys;
  }
}
