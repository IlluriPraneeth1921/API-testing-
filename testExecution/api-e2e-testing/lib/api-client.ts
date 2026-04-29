import { APIRequestContext } from '@playwright/test';
import { getAccessToken, fetchAccessToken, clearTokenCache } from './auth';
import { EnvConfig } from './env-config';

export interface ApiCallResult {
  ok: boolean;
  status: number;
  data: any;
}

export class ApiClient {
  private cfg: EnvConfig;
  private request: APIRequestContext;
  private cookie: string | null = null;
  /** Methods that should include the SaveUserContext cookie (default: PUT, DELETE) */
  private cookieMethods: Set<string> = new Set(['PUT', 'DELETE']);

  constructor(request: APIRequestContext, cfg: EnvConfig) {
    this.request = request;
    this.cfg = cfg;
  }

  setCookie(cookie: string | null): void {
    this.cookie = cookie;
  }

  /** Override which HTTP methods attach the cookie. Pass null to attach on ALL methods. */
  setCookieMethods(methods: string[] | null): void {
    this.cookieMethods = methods ? new Set(methods.map(m => m.toUpperCase())) : new Set();
  }

  private async headers(method?: string, overrideUser?: string, overridePass?: string): Promise<Record<string, string>> {
    const token = overrideUser
      ? await fetchAccessToken(this.cfg.AUTH_ENV, overrideUser, overridePass!)
      : await getAccessToken(this.cfg.AUTH_ENV, this.cfg.AUTH_USERNAME, this.cfg.AUTH_PASSWORD);
    const h: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const useCookie = this.cookie && method && this.cookieMethods.size > 0
      ? this.cookieMethods.has(method.toUpperCase())
      : !!this.cookie;
    if (useCookie && this.cookie) h['Cookie'] = this.cookie;
    return h;
  }

  private url(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = this.cfg.BASE_URL.replace(/\/+$/, '');
    return base + (path.startsWith('/') ? path : `/${path}`);
  }

  async call(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    opts?: { body?: any; okRequired?: boolean; postUser?: string; postPassword?: string }
  ): Promise<ApiCallResult> {
    const { body, okRequired = true, postUser, postPassword } = opts || {};
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let h = await this.headers(method, postUser, postPassword);
        const reqOpts: any = { headers: h, timeout: 30000 };
        if (body !== undefined) reqOpts.data = body;

        let resp: any;
        if (method === 'POST') resp = await this.request.post(this.url(path), reqOpts);
        else if (method === 'PUT') resp = await this.request.put(this.url(path), reqOpts);
        else if (method === 'DELETE') resp = await this.request.delete(this.url(path), reqOpts);
        else resp = await this.request.get(this.url(path), reqOpts);

        if (resp.status() === 401) {
          clearTokenCache();
          h = await this.headers(method, postUser, postPassword);
          reqOpts.headers = h;
          if (method === 'POST') resp = await this.request.post(this.url(path), reqOpts);
          else if (method === 'PUT') resp = await this.request.put(this.url(path), reqOpts);
          else if (method === 'DELETE') resp = await this.request.delete(this.url(path), reqOpts);
          else resp = await this.request.get(this.url(path), reqOpts);
        }

        const text = await resp.text();
        let data: any = {};
        try { data = text.trim() ? JSON.parse(text) : {}; } catch { data = text; }

        if (okRequired && !resp.ok()) {
          console.log(`  FAIL ${method} ${path} -> ${resp.status()}: ${String(text).slice(0, 500)}`);
          return { ok: false, status: resp.status(), data: null };
        }
        return { ok: resp.ok(), status: resp.status(), data };
      } catch (e: any) {
        if (e.message?.includes('timeout') || e.message?.includes('Timeout')) {
          console.log(`  TIMEOUT ${method} ${path} (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        console.log(`  ERROR ${method} ${path}: ${String(e.message).slice(0, 150)}`);
        return { ok: false, status: 0, data: null };
      }
    }
    return { ok: false, status: 0, data: null };
  }

  async post(path: string, body: any, postUser?: string, postPassword?: string) {
    return this.call('POST', path, { body, postUser, postPassword });
  }

  async put(path: string, body: any, postUser?: string, postPassword?: string) {
    return this.call('PUT', path, { body, postUser, postPassword });
  }

  async get(path: string) {
    return this.call('GET', path, { okRequired: false });
  }

  async delete(path: string) {
    return this.call('DELETE', path, { okRequired: false });
  }

  /** Generic call that accepts any method — used by the excel-driven spec */
  async send(method: string, path: string, body?: any): Promise<ApiCallResult> {
    const m = method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE';
    return this.call(m, path, { body, okRequired: false });
  }
}
