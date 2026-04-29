// Ports the Python _find_sql_col, _normalize_for_cmp, cmp_api_sql logic

const PARENT_CHILD_KEYS = new Set([
  'addresses', 'phones', 'emailAddresses', 'credentials', 'identifiers',
  'organizationTypes', 'businessTypes', 'contacts', 'supportedPrograms',
  'supportedRoles', 'serviceAreas', 'specialties', 'types',
  'organizationAddresses', 'organizationPhones', 'organizationEmailAddresses',
  'organizationCredentials', 'organizationIdentifiers', 'organizationBusinessTypes',
  'organizationSupportedPrograms', 'organizationSupportedRoles',
  'organizationPointOfContacts',
  'locationAddresses', 'locationPhones', 'locationEmailAddresses',
  'locationIdentifiers', 'locationCredentials', 'locationSupportedPrograms',
  'locationSupportedRoles', 'locationServiceAreas', 'locationSpecialties',
  'locationTypes',
  'staffMemberEmailAddresses', 'staffMemberPhones', 'staffMemberIdentifiers',
  'staffMemberCredentials', 'staffMemberLanguages',
]);

const LEAF_ALIASES: Record<string, string> = { code: 'Identifier', name: 'DisplayName' };

const DIRECT_LEAF_MAP: Record<string, string> = {
  email: 'EmailAddress', emailaddress: 'EmailAddressAddress',
  number: 'PhoneNumber', extension: 'PhoneExtensionNumber',
  startdate: 'EffectiveDateRangeStartDate', enddate: 'EffectiveDateRangeEndDate',
  name: 'DisplayName', code: 'Identifier',
};

const SKIP_PREFIXES = ['pagingdata', 'totalcount', 'haserror', 'haswarning', '$type', 'responsemessages'];

export interface CompareResult {
  Entity: string; API_Field: string; SQL_Column: string;
  API_Value: string; SQL_Value: string; Match: string;
}

type ColLookup = Map<string, [string, any]>;

function pascal(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function normalizeForCmp(a: any, s: any): [string, string] {
  const aStr = a != null ? String(a).trim() : '';
  const sStr = s != null ? String(s).trim() : '';
  if (!aStr || !sStr) return [aStr.toUpperCase(), sStr.toUpperCase()];

  // Handle JS Date.toString() format: "Fri Apr 03 2026 15:12:14 GMT+0530 (India Standard Time)"
  const jsDateRe = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}/;
  const toIsoFromJsDate = (s: string): string | null => {
    if (!jsDateRe.test(s)) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace('Z', '');
  };
  const aFromJs = toIsoFromJsDate(aStr);
  const sFromJs = toIsoFromJsDate(sStr);
  const aNorm = aFromJs || aStr;
  const sNorm = sFromJs || sStr;
  if (aFromJs || sFromJs) {
    // Both are dates now — compare as ISO date-only
    const aIso2 = aNorm.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const sIso2 = sNorm.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (aIso2 && sIso2) return [aNorm.slice(0, 10), sNorm.slice(0, 10)];
    // Timestamps: truncate to shorter
    const tsRe2 = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
    if (tsRe2.test(aNorm) && tsRe2.test(sNorm)) {
      const a2 = aNorm.replace('T', ' ').toUpperCase();
      const s2 = sNorm.replace('T', ' ').toUpperCase();
      const len = Math.min(a2.length, s2.length);
      return [a2.slice(0, len), s2.slice(0, len)];
    }
  }

  const isoRe = /^(\d{4})-(\d{2})-(\d{2})/;
  const usRe = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const aIso = aStr.match(isoRe), sUs = sStr.match(usRe);
  if (aIso && sUs) return [`${aIso[1]}-${aIso[2]}-${aIso[3]}`, `${sUs[3]}-${sUs[1].padStart(2, '0')}-${sUs[2].padStart(2, '0')}`];
  const sIso = sStr.match(isoRe), aUs = aStr.match(usRe);
  if (sIso && aUs) return [`${aUs[3]}-${aUs[1].padStart(2, '0')}-${aUs[2].padStart(2, '0')}`, `${sIso[1]}-${sIso[2]}-${sIso[3]}`];
  if (aIso && sIso) return [aStr.slice(0, 10), sStr.slice(0, 10)];

  const tsRe = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
  if (tsRe.test(aStr) && tsRe.test(sStr)) {
    const aN = aStr.replace('T', ' ').toUpperCase();
    const sN = sStr.replace('T', ' ').toUpperCase();
    const len = Math.min(aN.length, sN.length);
    return [aN.slice(0, len), sN.slice(0, len)];
  }
  return [aStr.toUpperCase(), sStr.toUpperCase()];
}

// Path segment replacements: API nesting name -> SQL column prefix
const PATH_SEGMENT_MAP: Record<string, string> = {
  staffmembername: 'Name',
  name: 'Name',
  provenance: 'Provenance',
  provenancetype: 'ProvenanceType',
};

function findSqlCol(leaf: string, apiPath: string, lc: ColLookup, lcNoUnd: ColLookup): [string | null, any] {
  // 0. Direct leaf map
  const direct = DIRECT_LEAF_MAP[leaf.toLowerCase()];
  if (direct) { const r = lc.get(direct.toLowerCase()); if (r) return r; }
  // 1. Exact
  const exact = lc.get(leaf.toLowerCase()); if (exact) return exact;
  // 2. PascalCase
  const pc = lc.get(pascal(leaf).toLowerCase()); if (pc) return pc;
  // 3. Collapsed path (with segment remapping)
  const full = apiPath.replace(/\[\d+\]\.?/g, '.');
  let parts = full.split('.').filter((p) => p && !p.toLowerCase().startsWith('model') && !p.toLowerCase().startsWith('pagingdata'));
  // Remap known path segments
  parts = parts.map((p) => PATH_SEGMENT_MAP[p.toLowerCase()] || p);
  if (parts.length > 1) {
    const collapsed = parts.map(pascal).join('');
    const r = lc.get(collapsed.toLowerCase()); if (r) return r;
    const r2 = lcNoUnd.get(collapsed.toLowerCase().replace(/_/g, '')); if (r2) return r2;
  }
  // 4. Collapsed + alias
  if (parts.length > 1 && LEAF_ALIASES[parts[parts.length - 1]]) {
    const aliased = parts.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[parts[parts.length - 1]];
    const r = lc.get(aliased.toLowerCase()); if (r) return r;
  }
  // 5. Collapsed + direct leaf map
  if (parts.length > 1) {
    const mapped = DIRECT_LEAF_MAP[parts[parts.length - 1].toLowerCase()];
    if (mapped) {
      const prefix = parts.slice(0, -1).map(pascal).join('');
      const r = lc.get((prefix + mapped).toLowerCase()); if (r) return r;
    }
  }
  // 6. PhysicalAddress prefix on collapsed
  if (parts.length >= 1) {
    const wp = 'PhysicalAddress' + parts.map(pascal).join('');
    const r = lc.get(wp.toLowerCase()); if (r) return r;
  }
  // 7. PhysicalAddress prefix on leaf
  const prefixed = 'PhysicalAddress' + pascal(leaf);
  const r7 = lc.get(prefixed.toLowerCase()); if (r7) return r7;
  // 8. PhysicalAddress prefix + alias
  if (parts.length > 1 && LEAF_ALIASES[parts[parts.length - 1]]) {
    const aliased = 'PhysicalAddress' + parts.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[parts[parts.length - 1]];
    const r = lc.get(aliased.toLowerCase()); if (r) return r;
  }
  // 9. Entity-specific prefixes
  for (const pfx of ['Organization', 'Location', 'StaffMember', 'Phone', 'EffectiveDateRange']) {
    const candidate = pfx + parts.map(pascal).join('');
    const r = lc.get(candidate.toLowerCase()); if (r) return r;
    if (parts.length > 0 && LEAF_ALIASES[parts[parts.length - 1]]) {
      const ca = pfx + parts.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[parts[parts.length - 1]];
      const ra = lc.get(ca.toLowerCase()); if (ra) return ra;
    }
  }
  // 10. Strip known prefixes
  for (const strip of ['physicalAddressType', 'organizationPhoneType', 'phoneType']) {
    if (leaf.toLowerCase().startsWith(strip.toLowerCase()) && leaf.length > strip.length) {
      const short = pascal(leaf.slice(strip.length));
      const r = lc.get(short.toLowerCase()); if (r) return r;
      const r2 = lc.get(('type' + short).toLowerCase()); if (r2) return r2;
    }
  }
  return [null, null];
}

function buildLookups(sqlRow: Record<string, any>): { lc: ColLookup; lcNoUnd: ColLookup } {
  const lc: ColLookup = new Map();
  const lcNoUnd: ColLookup = new Map();
  for (const [k, v] of Object.entries(sqlRow)) {
    const lower = k.toLowerCase();
    lc.set(lower, [k, v]);
    lcNoUnd.set(lower.replace(/_/g, ''), [k, v]);
  }
  return { lc, lcNoUnd };
}

export function flatten(obj: any, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') Object.assign(out, flatten(v, p));
      else out[p] = v;
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => Object.assign(out, flatten(item, `${prefix}[${i}]`)));
  } else {
    if (prefix) out[prefix] = obj;
  }
  return out;
}

export function compareApiToSql(
  apiFlat: Record<string, any>, sqlRow: Record<string, any> | null, entity: string, skipChildArrays = false
): CompareResult[] {
  if (!sqlRow) return [{ Entity: entity, API_Field: '*', SQL_Column: '', API_Value: '', SQL_Value: '', Match: 'NO_SQL_ROW' }];
  const { lc, lcNoUnd } = buildLookups(sqlRow);
  const results: CompareResult[] = [];

  for (const [ap, av] of Object.entries(apiFlat)) {
    const leaf = ap.split('.').pop()!.replace(/\[\d+\]/g, '');
    if (SKIP_PREFIXES.some((sp) => leaf.toLowerCase().startsWith(sp))) continue;
    if (skipChildArrays) {
      const afterModel = ap.replace(/^model\./, '');
      const topKey = afterModel.split('.')[0].split('[')[0];
      if (PARENT_CHILD_KEYS.has(topKey)) continue;
    }
    const [sk, sv] = findSqlCol(leaf, ap, lc, lcNoUnd);
    const [aCmp, sCmp] = normalizeForCmp(av, sv);
    const match = aCmp === sCmp ? 'YES' : (!sk ? 'NO_SQL_COL' : 'NO');
    results.push({
      Entity: entity, API_Field: ap, SQL_Column: sk || '',
      API_Value: String(av ?? '').trim().slice(0, 200),
      SQL_Value: String(sv ?? '').trim().slice(0, 200),
      Match: match,
    });
  }
  return results;
}

export function scoreSqlRow(apiFlat: Record<string, any>, sqlRow: Record<string, any>): number {
  const { lc, lcNoUnd } = buildLookups(sqlRow);
  let score = 0;
  const highValueFields = ['key', 'value', 'number', 'email', 'address', 'city', 'credential'];
  for (const [ap, av] of Object.entries(apiFlat)) {
    if (av == null) continue;
    const leaf = ap.split('.').pop()!.replace(/\[\d+\]/g, '');
    const [sk, sv] = findSqlCol(leaf, ap, lc, lcNoUnd);
    if (sk != null && sv != null) {
      const [aCmp, sCmp] = normalizeForCmp(av, sv);
      if (aCmp === sCmp) {
        score += highValueFields.some((x) => leaf.toLowerCase().includes(x)) ? 5 : 1;
      }
    }
  }
  return score;
}
