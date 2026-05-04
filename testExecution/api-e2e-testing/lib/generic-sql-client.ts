import * as sql from 'mssql/msnodesqlv8';
import { EnvConfig } from './env-config';

export class GenericSqlClient {
  private pool: sql.ConnectionPool | null = null;
  private cfg: EnvConfig;

  constructor(cfg: EnvConfig) { this.cfg = cfg; }

  async connect(): Promise<void> {
    const connStr =
      `Driver={ODBC Driver 17 for SQL Server};Server=${this.cfg.SQL_SERVER};` +
      `Database=${this.cfg.SQL_DATABASE};Trusted_Connection=yes;Connection Timeout=30;`;
    this.pool = await new sql.ConnectionPool({
      connectionString: connStr, driver: 'msnodesqlv8',
    } as any).connect();
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.close();
    this.pool = null;
  }

  async query(queryStr: string, params?: Record<string, any>): Promise<sql.IRecordSet<any>> {
    if (!this.pool) throw new Error('SQL not connected');
    const req = this.pool.request();
    if (params) for (const [k, v] of Object.entries(params)) req.input(k, v);
    const result = await req.query(queryStr);
    return result.recordset;
  }

  async getRow(schema: string, table: string, keyCol: string, keyVal: string): Promise<{ row: Record<string, any> | null; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT * FROM [${schema}].[${table}] WHERE [${keyCol}] = @key`, { key: keyVal }
      );
      if (!rows.length) return { row: null, columns: [] };
      return { row: rows[0], columns: Object.keys(rows[0]) };
    } catch { return { row: null, columns: [] }; }
  }

  async getAllRows(schema: string, table: string, keyCol: string, keyVal: string): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
    try {
      const rows = await this.query(
        `SELECT * FROM [${schema}].[${table}] WHERE [${keyCol}] = @key`, { key: keyVal }
      );
      return { rows: [...rows], columns: rows.length ? Object.keys(rows[0]) : [] };
    } catch { return { rows: [], columns: [] }; }
  }

  async getCount(schema: string, table: string, keyCol: string, keyVal: string): Promise<number> {
    try {
      const rows = await this.query(
        `SELECT COUNT(*) AS cnt FROM [${schema}].[${table}] WHERE [${keyCol}] = @key`, { key: keyVal }
      );
      return rows[0]?.cnt ?? 0;
    } catch { return 0; }
  }

  async getLatestKey(schema: string, table: string, keyCol: string): Promise<string | null> {
    try {
      const rows = await this.query(
        `SELECT TOP 1 [${keyCol}] FROM [${schema}].[${table}] ORDER BY EntityCreatedTimestamp DESC`
      );
      return rows[0]?.[keyCol] ? String(rows[0][keyCol]) : null;
    } catch { return null; }
  }
}
