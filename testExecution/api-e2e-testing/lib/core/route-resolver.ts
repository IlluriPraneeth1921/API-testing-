/**
 * Route Resolver — maps entity name → API route.
 *
 * Priority:
 *   1. Live Swagger JSON (per environment, auto-adapts)
 *   2. Static overrides from config/route-registry.json
 *   3. api_to_table_mapping.json (fallback)
 *   4. Convention: PascalCase → kebab-case (EntityModule/entity)
 */

import * as fs from 'fs';
import * as path from 'path';
import { findSwaggerRoutes } from './swagger-client';

interface RouteInfo {
  postRoute: string;
  getRoute: string;
  searchRoute: string;
  resource: string;
  updateMethod: 'POST' | 'PUT';  // Some APIs use POST for updates, some use PUT
  updateRoute: string;
}

// ── Helpers ──

function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ── Static Registry ──

const REGISTRY_PATH = path.resolve(__dirname, '..', '..', 'config', 'route-registry.json');

function findFile(primary: string, ...alternates: string[]): string {
  if (fs.existsSync(primary)) return primary;
  for (const alt of alternates) { if (fs.existsSync(alt)) return alt; }
  return primary;
}

function loadStaticRegistry(): Record<string, any> {
  const p = findFile(REGISTRY_PATH, path.resolve(__dirname, '..', '..', '..', 'config', 'route-registry.json'));
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// ── api_to_table_mapping.json ──

const MAPPING_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'SnowflakeSilverTable comp', 'api_to_table_mapping.json');
let _mappingCache: any[] | null = null;

function loadMapping(): any[] {
  if (_mappingCache) return _mappingCache;
  const p = findFile(MAPPING_PATH, path.resolve(__dirname, '..', '..', '..', '..', '..', 'SnowflakeSilverTable comp', 'api_to_table_mapping.json'));
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
  _mappingCache = JSON.parse(raw);
  return _mappingCache!;
}

function findInMapping(entityName: string): { postRoute?: string; getRoute?: string; updateMethod?: string; updateRoute?: string } {
  const mappings = loadMapping();
  const kebab = toKebab(entityName);

  const post = mappings.find((m: any) =>
    m.HttpMethod === 'POST' &&
    m.MethodName?.startsWith('Create') &&
    m.Route?.toLowerCase().endsWith(`/${kebab}`)
  );

  const get = mappings.find((m: any) =>
    m.HttpMethod === 'GET' &&
    m.MethodName?.startsWith('Get') &&
    m.Route?.toLowerCase().includes(`/${kebab}/`) &&
    m.Route?.includes('{')
  );

  // Find Update route — could be POST or PUT
  const update = mappings.find((m: any) =>
    m.MethodName?.startsWith('Update') &&
    m.Route?.toLowerCase().includes(`/${kebab}`) &&
    m.Route?.includes('{')
  );

  return {
    postRoute: post?.Route,
    getRoute: get?.Route,
    updateMethod: update?.HttpMethod,
    updateRoute: update?.Route,
  };
}

// ── Swagger cache (set from spec beforeAll) ──

let _swaggerJson: Record<string, any> | null = null;

export function setSwaggerJson(swagger: Record<string, any> | null): void {
  _swaggerJson = swagger;
}

// ── Main Resolver ──

export function resolveRoute(entityName: string): RouteInfo {
  // 1. Live Swagger (primary — auto-adapts per environment)
  if (_swaggerJson) {
    const sw = findSwaggerRoutes(_swaggerJson, entityName);
    if (sw) {
      return {
        postRoute: sw.createRoute,
        getRoute: sw.getRoute || sw.createRoute + '/{key}',
        searchRoute: sw.searchRoute || sw.createRoute,
        resource: stripBase(sw.createRoute),
        updateMethod: (sw.updateMethod as 'POST' | 'PUT') || 'PUT',
        updateRoute: sw.updateRoute || sw.createRoute + '/{key}',
      };
    }
  }

  // 2. Static registry (edge cases)
  const registry = loadStaticRegistry();
  if (registry[entityName]) {
    const r = registry[entityName];
    return {
      postRoute: r.postRoute,
      getRoute: r.getRoute || r.postRoute + '/{key}',
      searchRoute: r.searchRoute || r.postRoute + 's',
      resource: stripBase(r.postRoute),
      updateMethod: r.updateMethod || 'PUT',
      updateRoute: r.updateRoute || r.postRoute + '/{key}',
    };
  }

  // 2. api_to_table_mapping.json
  const mapped = findInMapping(entityName);
  if (mapped.postRoute) {
    return {
      postRoute: mapped.postRoute,
      getRoute: mapped.getRoute || mapped.postRoute + '/{key}',
      searchRoute: mapped.postRoute + 's',
      resource: stripBase(mapped.postRoute),
      updateMethod: (mapped.updateMethod as 'POST' | 'PUT') || 'PUT',
      updateRoute: mapped.updateRoute || mapped.postRoute + '/{key}',
    };
  }

  // 3. Convention fallback
  const kebab = toKebab(entityName);
  const moduleName = guessModule(entityName);
  const moduleKebab = toKebab(moduleName);
  const postRoute = `/api/v1/${moduleKebab}/${kebab}`;

  return {
    postRoute,
    getRoute: `${postRoute}/{key}`,
    searchRoute: `${postRoute}s`,
    resource: stripBase(postRoute),
    updateMethod: 'PUT',
    updateRoute: `${postRoute}/{key}`,
  };
}

function stripBase(route: string): string {
  // Remove leading /api/v1/ to get the "resource" segment
  return route.replace(/^\//, '');
}

function guessModule(entityName: string): string {
  // Common patterns where module ≠ entity + "Module"
  const KNOWN_MODULES: Record<string, string> = {
    Location: 'OrganizationModule',
    StaffMember: 'OrganizationModule',
    StaffDelegation: 'OrganizationModule',
    StaffMemberLocationAssignment: 'OrganizationModule',
    PaymentSuspension: 'OrganizationModule',
    OrganizationAccess: 'OrganizationModule',
    PersonAccess: 'PersonModule',
    PersonContact: 'PersonModule',
    PersonLink: 'PersonModule',
    PersonHistory: 'PersonModule',
    PersonLocation_Assignment: 'PersonModule',
    PersonStaffMember_Assignment: 'PersonModule',
    PersonLocationAssignment: 'PersonModule',
    PersonLocationAssignmentDefinition: 'PersonModule',
    PersonStaffMemberAssignmentDefinition: 'PersonModule',
    PersonCostShare: 'PersonModule',
    PersonEmployment: 'PersonModule',
    Case: 'CaseModule',
    CaseActivityInstance: 'CaseModule',
    CaseCustomFormInstance: 'CaseModule',
    CaseLetterInstance: 'CaseModule',
    SystemAccount: 'SecurityModule',
    SystemRole: 'SecurityModule',
    SystemPermission: 'SecurityModule',
    UserAccount: 'SecurityModule',
    UserContext: 'SecurityModule',
    UserPreference: 'SecurityModule',
    GeneralNote: 'NoteModule',
    CaseNote: 'NoteModule',
    LocationNote: 'NoteModule',
    OrganizationNote: 'NoteModule',
    CrisisContactNote: 'NoteModule',
    CrisisResidentialNote: 'NoteModule',
    GuardianshipNote: 'NoteModule',
    ProtectiveServicesReportNote: 'NoteModule',
    ProviderExplorationAndDiscoveryNote: 'NoteModule',
    ScratchpadNote: 'NoteModule',
    TargetedCaseManagementNote: 'NoteModule',
    IncidentReport: 'IncidentModule',
    IncidentEvent: 'IncidentModule',
    ProgramEnrollment: 'ProgramEnrollmentModule',
    ProgramApplication: 'ProgramApplicationModule',
    ProgramDischarge: 'ProgramDischargeModule',
    ProgramConfiguration: 'ProgramModule',
  };

  if (KNOWN_MODULES[entityName]) return KNOWN_MODULES[entityName];

  // Default: EntityModule
  return `${entityName}Module`;
}

const NULL_GUID = '00000000-0000-0000-0000-000000000000';
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract the entity key name from a POST response (rejects null GUID) */
export function extractEntityKey(responseData: any, entityName: string): string | null {
  if (!responseData) return null;

  const isValid = (v: any): v is string => typeof v === 'string' && GUID_RE.test(v) && v !== NULL_GUID;

  // Direct key field: entityNameKey (e.g. appointmentKey)
  const expectedKey = entityName.charAt(0).toLowerCase() + entityName.slice(1) + 'Key';
  if (isValid(responseData[expectedKey])) return responseData[expectedKey];

  // model.entityNameKey
  if (isValid(responseData.model?.[expectedKey])) return responseData.model[expectedKey];

  // Generic: any field ending in "Key" that's a GUID
  for (const [k, v] of Object.entries(responseData)) {
    if (k.toLowerCase().endsWith('key') && isValid(v)) return v;
  }
  if (responseData.model && typeof responseData.model === 'object') {
    for (const [k, v] of Object.entries(responseData.model)) {
      if (k.toLowerCase().endsWith('key') && isValid(v)) return v as string;
    }
  }

  // model is a string (some APIs return just the key)
  if (isValid(responseData.model)) return responseData.model;

  return null;
}
