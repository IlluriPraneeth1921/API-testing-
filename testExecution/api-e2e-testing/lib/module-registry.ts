import * as fs from 'fs';
import * as path from 'path';

export interface ModuleConfig {
  moduleName: string;
  sqlSchema: string;
  postRoute: string;
  getRoute: string;       // with {key} placeholder
  updateRoute?: string;   // with {key} placeholder
  deleteRoute?: string;
  sqlTable: string;
  sqlKeyCol: string;
  childTables?: { table: string; fkCol: string }[];
  prerequisiteKeys?: string[];  // e.g. ['caseKey', 'organizationKey']
}

// Auto-derive kebab-case route segment from PascalCase entity name
function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Known module configs (extend as needed)
const REGISTRY: Record<string, ModuleConfig> = {
  Organization: {
    moduleName: 'OrganizationModule', sqlSchema: 'OrganizationModule',
    postRoute: '/api/v1/organization-module/organization',
    getRoute: '/api/v1/organization-module/organization/{key}',
    updateRoute: '/api/v1/organization-module/organization/{key}',
    sqlTable: 'Organization', sqlKeyCol: 'OrganizationKey',
  },
  Location: {
    moduleName: 'OrganizationModule', sqlSchema: 'OrganizationModule',
    postRoute: '/api/v1/organization-module/location',
    getRoute: '/api/v1/organization-module/location/{key}',
    sqlTable: 'Location', sqlKeyCol: 'LocationKey',
    prerequisiteKeys: ['organizationKey'],
  },
  StaffMember: {
    moduleName: 'OrganizationModule', sqlSchema: 'OrganizationModule',
    postRoute: '/api/v1/organization-module/staff-member',
    getRoute: '/api/v1/organization-module/staff-member/{key}',
    sqlTable: 'StaffMember', sqlKeyCol: 'StaffMemberKey',
    prerequisiteKeys: ['organizationKey'],
  },
  Person: {
    moduleName: 'PersonModule', sqlSchema: 'PersonModule',
    postRoute: '/api/v1/person-module/person',
    getRoute: '/api/v1/person-module/person/{key}',
    updateRoute: '/api/v1/person-module/person/{key}',
    sqlTable: 'Person', sqlKeyCol: 'PersonKey',
  },
  IntakeReferral: {
    moduleName: 'IntakeReferralModule', sqlSchema: 'IntakeReferralModule',
    postRoute: '/api/v1/intake-referral-module/intake-referral',
    getRoute: '/api/v1/intake-referral-module/intake-referral/{key}',
    sqlTable: 'IntakeReferral', sqlKeyCol: 'IntakeReferralKey',
    prerequisiteKeys: ['caseKey'],
  },
  Guardianship: {
    moduleName: 'GuardianshipModule', sqlSchema: 'GuardianshipModule',
    postRoute: '/api/v1/guardianship-module/guardianship',
    getRoute: '/api/v1/guardianship-module/guardianship/{key}',
    sqlTable: 'Guardianship', sqlKeyCol: 'GuardianshipKey',
    childTables: [
      { table: 'GuardianshipAsset', fkCol: 'GuardianshipKey' },
      { table: 'GuardianshipBudget', fkCol: 'GuardianshipKey' },
      { table: 'GuardianshipPetitionLimitedToList', fkCol: 'GuardianshipKey' },
    ],
    prerequisiteKeys: ['caseKey'],
  },
  Appointment: {
    moduleName: 'AppointmentModule', sqlSchema: 'AppointmentModule',
    postRoute: '/api/v1/appointment-module/appointment',
    getRoute: '/api/v1/appointment-module/appointment/{key}',
    sqlTable: 'Appointment', sqlKeyCol: 'AppointmentKey',
    childTables: [{ table: 'AppointmentAttributes', fkCol: 'AppointmentKey' }],
  },
  BillOfRights: {
    moduleName: 'BillOfRightsModule', sqlSchema: 'BillOfRightsModule',
    postRoute: '/api/v1/bill-of-rights-module/bill-of-rights',
    getRoute: '/api/v1/bill-of-rights-module/bill-of-rights/{key}',
    sqlTable: 'BillOfRights', sqlKeyCol: 'BillOfRightsKey',
    prerequisiteKeys: ['caseKey'],
  },
  IncidentReport: {
    moduleName: 'IncidentModule', sqlSchema: 'IncidentModule',
    postRoute: '/api/v1/incident-module/incident-report',
    getRoute: '/api/v1/incident-module/incident-report/{key}',
    sqlTable: 'IncidentReport', sqlKeyCol: 'IncidentReportKey',
  },
  IncidentEvent: {
    moduleName: 'IncidentModule', sqlSchema: 'IncidentModule',
    postRoute: '/api/v1/incident-module/incident-event',
    getRoute: '/api/v1/incident-module/incident-event/{key}',
    sqlTable: 'IncidentEvent', sqlKeyCol: 'IncidentEventKey',
    prerequisiteKeys: ['incidentReportKey'],
  },
  Task: {
    moduleName: 'TaskModule', sqlSchema: 'TaskModule',
    postRoute: '/api/v1/task-module/task',
    getRoute: '/api/v1/task-module/task/{key}',
    sqlTable: 'Task', sqlKeyCol: 'TaskKey',
  },
  Program: {
    moduleName: 'ProgramModule', sqlSchema: 'ProgramModule',
    postRoute: '/api/v1/program-module/program',
    getRoute: '/api/v1/program-module/program/{key}',
    sqlTable: 'Program', sqlKeyCol: 'ProgramKey',
  },
  Case: {
    moduleName: 'CaseModule', sqlSchema: 'CaseModule',
    postRoute: '/api/v1/case-module',
    getRoute: '/api/v1/case-module/case/{key}',
    sqlTable: 'Case', sqlKeyCol: 'CaseKey',
  },
};

export function getModuleConfig(entityName: string): ModuleConfig | null {
  // Direct match
  if (REGISTRY[entityName]) return REGISTRY[entityName];

  // Fuzzy match: strip common suffixes/prefixes
  const cleaned = entityName
    .replace(/^(PersonMaintenance|PersonLocation|PersonStaffMember)/, '')
    .replace(/_.*$/, '')
    .replace(/New$/, '')
    .replace(/old$/i, '');

  if (REGISTRY[cleaned]) return REGISTRY[cleaned];

  // Try to auto-derive from entity name
  const kebab = toKebab(entityName);
  const moduleName = `${entityName}Module`;
  return {
    moduleName,
    sqlSchema: moduleName,
    postRoute: `/api/v1/${toKebab(moduleName)}/${kebab}`,
    getRoute: `/api/v1/${toKebab(moduleName)}/${kebab}/{key}`,
    sqlTable: entityName,
    sqlKeyCol: `${entityName}Key`,
  };
}

export function getAllRegisteredModules(): Record<string, ModuleConfig> {
  return { ...REGISTRY };
}

// Load from api_to_table_mapping.json if available
const MAPPING_PATH = path.resolve(__dirname, '..', '..', '..', 'SnowflakeSilverTable comp', 'api_to_table_mapping.json');

export function loadApiTableMapping(): any[] {
  if (!fs.existsSync(MAPPING_PATH)) return [];
  return JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'));
}

export function findRouteMapping(entityName: string): { postRoute?: string; getRoute?: string; tables: string[] } {
  const mappings = loadApiTableMapping();
  const kebab = toKebab(entityName);
  const relevant = mappings.filter((m: any) =>
    m.Route?.toLowerCase().includes(kebab) && m.HttpMethod
  );

  const post = relevant.find((m: any) => m.HttpMethod === 'POST' && m.MethodName?.startsWith('Create'));
  const get = relevant.find((m: any) => m.HttpMethod === 'GET' && m.MethodName?.startsWith('Get'));
  const tables = post?.Tables?.split(', ').map((t: string) => t.trim()).filter(Boolean) || [];

  return {
    postRoute: post?.Route,
    getRoute: get?.Route,
    tables,
  };
}
