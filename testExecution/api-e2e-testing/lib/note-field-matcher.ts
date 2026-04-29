const LEAF_ALIASES: Record<string, string> = {
  code: 'Identifier', identifier: 'Identifier',
  name: 'DisplayName', displayName: 'DisplayName',
  extension: 'ExtensionNumber',
};

const SKIP_PREFIXES = ['pagingdata', 'totalcount', 'haserror', 'haswarning', '$type', 'responsemessages', '_modelinfo', 'items'];

export interface NoteCompareResult {
  Entity: string; API_Field: string; SQL_Column: string;
  API_Value: string; SQL_Value: string; Match: string;
}

type ColLookup = Map<string, [string, any]>;

function pascal(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function normalizeForCmp(a: any, s: any): [string, string] {
  const aStr = a != null ? String(a).trim() : '';
  const sStr = s != null ? String(s).trim() : '';
  if (!aStr || !sStr) return [aStr.toUpperCase(), sStr.toUpperCase()];

  const isoRe = /^\d{4}-\d{2}-\d{2}/;
  if (isoRe.test(aStr) && isoRe.test(sStr)) return [aStr.slice(0, 10), sStr.slice(0, 10)];

  const tsRe = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
  if (tsRe.test(aStr) && tsRe.test(sStr)) {
    const aN = aStr.replace('T', ' ').toUpperCase();
    const sN = sStr.replace('T', ' ').toUpperCase();
    const len = Math.min(aN.length, sN.length);
    return [aN.slice(0, len), sN.slice(0, len)];
  }

  const jsDateRe = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}/;
  const toIso = (v: string): string | null => {
    if (!jsDateRe.test(v)) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };
  const aIso = toIso(aStr), sIso = toIso(sStr);
  if (aIso || sIso) return [(aIso || aStr.slice(0, 10)).toUpperCase(), (sIso || sStr.slice(0, 10)).toUpperCase()];

  return [aStr.toUpperCase(), sStr.toUpperCase()];
}

function findSqlCol(leaf: string, apiPath: string, lc: ColLookup): [string | null, any] {
  const full = apiPath.replace(/\[\d+\]\.?/g, '.');
  const parts = full.split('.').filter((p) => p && !['model', 'pagingdata', '$type', 'items'].includes(p.toLowerCase()));

  if (parts.length > 2) {
    const prefix = parts[0];
    const innerParts = parts.slice(1);
    const innerCollapsed = innerParts.map(pascal).join('');
    const r = lc.get(`${prefix}.${innerCollapsed}`.toLowerCase());
    if (r) return r;
    if (LEAF_ALIASES[innerParts[innerParts.length - 1]]) {
      const aliased = innerParts.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[innerParts[innerParts.length - 1]];
      const r2 = lc.get(`${prefix}.${aliased}`.toLowerCase());
      if (r2) return r2;
    }
  }

  if (parts.length > 1) {
    const collapsed = parts.map(pascal).join('');
    const r = lc.get(collapsed.toLowerCase());
    if (r) return r;
    if (LEAF_ALIASES[parts[parts.length - 1]]) {
      const aliased = parts.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[parts[parts.length - 1]];
      const r2 = lc.get(aliased.toLowerCase());
      if (r2) return r2;
    }
    if (parts.length > 2) {
      const inner = parts.slice(1);
      const innerCollapsed = inner.map(pascal).join('');
      const r3 = lc.get(innerCollapsed.toLowerCase());
      if (r3) return r3;
      if (LEAF_ALIASES[inner[inner.length - 1]]) {
        const aliased = inner.slice(0, -1).map(pascal).join('') + LEAF_ALIASES[inner[inner.length - 1]];
        const r4 = lc.get(aliased.toLowerCase());
        if (r4) return r4;
      }
    }
  }

  const arrPath = apiPath.replace(/^model\./, '');
  const rArr = lc.get(arrPath.toLowerCase());
  if (rArr) return rArr;
  if (LEAF_ALIASES[leaf]) {
    const aliasedPath = arrPath.replace(/\.[^.]+$/, '.' + LEAF_ALIASES[leaf]);
    const r5 = lc.get(aliasedPath.toLowerCase());
    if (r5) return r5;
  }

  const exact = lc.get(leaf.toLowerCase());
  if (exact) return exact;
  const pc = lc.get(pascal(leaf).toLowerCase());
  if (pc) return pc;
  const alias = LEAF_ALIASES[leaf];
  if (alias) { const r = lc.get(alias.toLowerCase()); if (r) return r; }

  return [null, null];
}

export function noteFlatten(obj: any, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') Object.assign(out, noteFlatten(v, p));
      else out[p] = v;
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => Object.assign(out, noteFlatten(item, `${prefix}[${i}]`)));
  } else {
    if (prefix) out[prefix] = obj;
  }
  return out;
}

function str(v: any): string { return v != null ? String(v).slice(0, 200) : ''; }

export function noteCompareApiToSql(
  apiFlat: Record<string, any>, sqlRow: Record<string, any> | null, entity: string, postFlat?: Record<string, any>
): NoteCompareResult[] {
  if (!sqlRow) return [{ Entity: entity, API_Field: '*', SQL_Column: '', API_Value: '', SQL_Value: '', Match: 'NO_SQL_ROW' }];

  const lc: ColLookup = new Map();
  for (const [k, v] of Object.entries(sqlRow)) lc.set(k.toLowerCase(), [k, v]);

  const results: NoteCompareResult[] = [];
  const matchedSqlCols = new Set<string>();

  for (const [ap, av] of Object.entries(apiFlat)) {
    const leaf = ap.split('.').pop()!.replace(/\[\d+\]/g, '');
    if (SKIP_PREFIXES.some((sp) => leaf.toLowerCase().startsWith(sp))) continue;
    if (leaf.toLowerCase() === 'version') continue;

    const [sk, sv] = findSqlCol(leaf, ap, lc);
    if (sk) {
      matchedSqlCols.add(sk.toLowerCase());
      const [aCmp, sCmp] = normalizeForCmp(av, sv);
      results.push({ Entity: entity, API_Field: ap, SQL_Column: sk, API_Value: str(av), SQL_Value: str(sv), Match: aCmp === sCmp ? 'YES' : 'NO' });
    } else {
      results.push({ Entity: entity, API_Field: ap, SQL_Column: '', API_Value: str(av), SQL_Value: '', Match: 'NO_SQL_COL' });
    }
  }

  if (postFlat) {
    for (const [pp, pv] of Object.entries(postFlat)) {
      const leaf = pp.split('.').pop()!.replace(/\[\d+\]/g, '');
      if (SKIP_PREFIXES.some((sp) => leaf.toLowerCase().startsWith(sp))) continue;
      if (leaf.toLowerCase() === 'version') continue;
      const [sk, sv] = findSqlCol(leaf, pp, lc);
      if (sk && !matchedSqlCols.has(sk.toLowerCase())) {
        matchedSqlCols.add(sk.toLowerCase());
        const [pCmp, sCmp] = normalizeForCmp(pv, sv);
        let match: string;
        if (pCmp === sCmp) match = 'YES';
        else if (!sCmp || sv == null) match = 'NOT_PERSISTED';
        else match = 'NO';
        results.push({ Entity: entity, API_Field: `POST:${pp}`, SQL_Column: sk, API_Value: str(pv), SQL_Value: str(sv), Match: match });
      }
    }
  }

  return results;
}
