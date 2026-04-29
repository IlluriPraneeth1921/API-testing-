/**
 * Module Config — single source of truth for any API module.
 * Domain change? Edit the config. Zero engine changes.
 */

export interface VocabCode {
  code: string;
  name: string;
  codeSystemIdentifier?: string;
}

export function cc(code: string, name: string, cs = '1'): VocabCode {
  return { code, name, codeSystemIdentifier: cs };
}

/** One entity within a module (e.g. Organization has Org, Location, Staff) */
export interface EntityConfig {
  name: string;
  postPath: string;
  getPathTpl: string;                          // use {key} placeholder
  putPathTpl?: string;
  sqlSchema: string;
  sqlTable: string;
  sqlKeyCol: string;
  sqlChildren?: { table: string; fkCol: string }[];
  /** Extra SQL lookups (joined tables, enrichment) */
  sqlExtraLookups?: {
    table: string; fk: string; prefix: string;
    children?: { table: string; fkCol: string; apiName: string }[];
  }[];
  /** FK fields this entity needs from a parent entity */
  dependsOn?: string[];
  /** Build payload — receives resolved ref keys */
  buildPayload: (refs: Record<string, string>) => any;
  /** Optional PUT operations after POST */
  putAfter?: (key: string, refs: Record<string, string>) => {
    path: string;
    payloads: { label: string; body: any; optional?: boolean }[];
  };
  /** GET sub-endpoints to also fetch (e.g. /addresses, /phones) */
  getChildren?: { label: string; pathTpl: string; sqlTable: string; sqlFkCol: string }[];
  /** Skip child arrays during parent-level field comparison */
  skipChildArraysInCompare?: boolean;
}

/** Top-level module definition */
export interface ModuleConfig {
  name: string;
  /** Ordered list — engine processes them in sequence, resolving keys */
  entities: EntityConfig[];
  /** SQL queries to fetch prerequisite reference keys */
  fetchRefs?: (query: (q: string) => Promise<any>) => Promise<Record<string, string>>;
}
