import * as fs from 'fs';
import * as path from 'path';

export interface EnvConfig {
  BASE_URL: string;
  AUTH_ENV: string;
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
  SQL_SERVER: string;
  SQL_DATABASE: string;
  CONTEXT_ORG_KEY?: string;
  CONTEXT_LOC_KEY?: string;
  CONTEXT_STAFF_KEY?: string;
}

export interface ResolvedEnv {
  name: string;
  config: EnvConfig;
}

const CONFIG_PATH = path.join(__dirname, '..', 'env_config.json');

export function loadEnvConfig(envName?: string): ResolvedEnv {
  const all: Record<string, EnvConfig> = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const name = envName || process.env.ENV_NAME || Object.keys(all)[0];
  if (!all[name]) {
    throw new Error(`Environment '${name}' not in env_config.json. Available: ${Object.keys(all).join(', ')}`);
  }
  const cfg = all[name];
  return {
    name,
    config: {
      BASE_URL: process.env.SANITY_BASE_URL || cfg.BASE_URL,
      AUTH_ENV: process.env.SANITY_AUTH_ENV || cfg.AUTH_ENV,
      AUTH_USERNAME: process.env.SANITY_AUTH_USERNAME || cfg.AUTH_USERNAME,
      AUTH_PASSWORD: process.env.SANITY_AUTH_PASSWORD || cfg.AUTH_PASSWORD,
      SQL_SERVER: process.env.SANITY_SQL_SERVER || cfg.SQL_SERVER,
      SQL_DATABASE: process.env.SANITY_SQL_DATABASE || cfg.SQL_DATABASE,
      CONTEXT_ORG_KEY: cfg.CONTEXT_ORG_KEY,
      CONTEXT_LOC_KEY: cfg.CONTEXT_LOC_KEY,
      CONTEXT_STAFF_KEY: cfg.CONTEXT_STAFF_KEY,
    },
  };
}
