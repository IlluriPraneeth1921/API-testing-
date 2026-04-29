/**
 * Swagger Client — fetches live Swagger JSON per environment.
 *
 * Primary source for route discovery:
 *   - Entity name → API route + HTTP method (POST vs PUT for updates)
 *   - Auto-adapts when endpoints change
 *   - Per-environment (DevF1 Swagger may differ from F1)
 *   - Cached for the duration of the test run
 *
 * Swagger URL pattern:
 *   {BASE_URL}/api/v1/api-doc/assets/open-api/v1/swagger.core.json
 */

import * as https from 'https';
import * as http from 'http';

interface SwaggerPath {
  methods: string[];       // ['get', 'post', 'put', 'delete']
  tags: string[];
  parameters?: any[];
}

interface SwaggerRouteMatch {
  createRoute: string;
  createMethod: string;
  updateRoute?: string;
  updateMethod?: string;
  getRoute?: string;
  searchRoute?: string;
  deleteRoute?: string;
}

let _cache: Record<string, any> | null = null;
let _parsedPaths: Map<string, SwaggerPath> | null = null;

function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export async function fetchSwagger(baseUrl: string): Promise<Record<string, any> | null> {
  if (_cache) return _cache;

  const url = baseUrl.replace(/\/+$/, '') + '/api/v1/api-doc/assets/open-api/v1/swagger.core.json';
  console.log(`  📖 Fetching Swagger from ${url.split('/api/')[0]}/...`);

  try {
    const data = await new Promise<string>((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, { rejectUnauthorized: false, timeout: 30000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Swagger HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });

    _cache = JSON.parse(data);
    const pathCount = Object.keys(_cache!.paths || {}).length;
    console.log(`  📖 Swagger loaded: ${pathCount} paths`);
    return _cache;
  } catch (e: any) {
    console.log(`  ⚠ Swagger fetch failed: ${e.message} — will use static mapping`);
    return null;
  }
}

function getParsedPaths(swagger: Record<string, any>): Map<string, SwaggerPath> {
  if (_parsedPaths) return _parsedPaths;
  _parsedPaths = new Map();
  for (const [path, methods] of Object.entries(swagger.paths || {})) {
    const m = methods as Record<string, any>;
    _parsedPaths.set(path, {
      methods: Object.keys(m),
      tags: m[Object.keys(m)[0]]?.tags || [],
    });
  }
  return _parsedPaths;
}

/**
 * Find routes for an entity from Swagger.
 * Matches by kebab-case entity name in the path.
 */
export function findSwaggerRoutes(swagger: Record<string, any>, entityName: string): SwaggerRouteMatch | null {
  const paths = getParsedPaths(swagger);
  const kebab = toKebab(entityName);

  // Find the base create route: POST /api/v1/{module}/{entity}
  let createRoute: string | null = null;
  let createMethod = 'post';

  // Case-insensitive match: path ends with /kebab-entity (no {key} param)
  for (const [path, info] of paths) {
    if (path.toLowerCase().endsWith(`/${kebab}`) && info.methods.includes('post') && !path.includes('{')) {
      createRoute = path;
      break;
    }
  }

  if (!createRoute) {
    for (const [path, info] of paths) {
      const segments = path.split('/');
      const lastSegment = segments[segments.length - 1];
      if (lastSegment.toLowerCase() === kebab && info.methods.includes('post')) {
        createRoute = path;
        break;
      }
    }
  }

  if (!createRoute) return null;

  // Find direct {key} path: createRoute + /{someKey} (exactly one segment after)
  let updateRoute: string | undefined;
  let updateMethod: string | undefined;
  let getRoute: string | undefined;
  let deleteRoute: string | undefined;

  for (const [path, info] of paths) {
    if (!path.startsWith(createRoute + '/')) continue;
    const suffix = path.slice(createRoute.length + 1);
    if (!suffix.startsWith('{') || suffix.includes('/')) continue;
    // This is the direct /{key} path
    if (info.methods.includes('put') && !updateMethod) { updateRoute = path; updateMethod = 'PUT'; }
    if (info.methods.includes('post') && !updateMethod) { updateRoute = path; updateMethod = 'POST'; }
    if (info.methods.includes('get') && !getRoute) { getRoute = path; }
    if (info.methods.includes('delete') && !deleteRoute) { deleteRoute = path; }
  }
  // Some APIs have DELETE on the base path
  if (!deleteRoute) {
    const baseInfo = paths.get(createRoute);
    if (baseInfo?.methods.includes('delete')) deleteRoute = createRoute;
  }

  // Search/list route: GET on the base path
  let searchRoute: string | undefined;
  const baseInfo = paths.get(createRoute);
  if (baseInfo?.methods.includes('get')) searchRoute = createRoute;

  return {
    createRoute,
    createMethod,
    updateRoute,
    updateMethod,
    getRoute,
    searchRoute,
    deleteRoute,
  };
}

export function clearSwaggerCache(): void {
  _cache = null;
  _parsedPaths = null;
}

/**
 * Look up the correct write method (POST or PUT) for a given URL path.
 * Used by sub-endpoint tests where the Excel has a RequestUrl but no method.
 */
export function getWriteMethod(swagger: Record<string, any>, urlPath: string): 'POST' | 'PUT' {
  const paths = getParsedPaths(swagger);
  // Strip base URL if present, normalize
  const clean = urlPath.replace(/https?:\/\/[^/]+/, '').replace(/\?.*$/, '');

  // Try exact match first
  for (const [swaggerPath, info] of paths) {
    if (matchSwaggerPath(swaggerPath, clean)) {
      if (info.methods.includes('post')) return 'POST';
      if (info.methods.includes('put')) return 'PUT';
    }
  }
  return 'PUT'; // default fallback
}

/** Match a Swagger template path against a concrete URL path */
function matchSwaggerPath(template: string, concrete: string): boolean {
  const tParts = template.split('/');
  const cParts = concrete.split('/');
  if (tParts.length !== cParts.length) return false;
  for (let i = 0; i < tParts.length; i++) {
    if (tParts[i].startsWith('{')) continue; // wildcard
    if (tParts[i].toLowerCase() !== cParts[i].toLowerCase()) return false;
  }
  return true;
}
