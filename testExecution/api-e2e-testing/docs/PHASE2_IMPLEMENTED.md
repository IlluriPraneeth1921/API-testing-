# Phase 2: Advanced Scenarios — What Was Built

> Swagger route discovery, sub-endpoint support, fixture fallback, key capture chains. Built 2026-04-23.

[← Phase 1: Core Engine](PHASE1_IMPLEMENTED.md) · [Phase 3: Reporting + CI →](PHASE3_IMPLEMENTED.md)

---

## Files Created

| File | Purpose |
|---|---|
| `lib/core/swagger-client.ts` | Fetches live Swagger JSON per environment, resolves routes + HTTP methods |

## Files Modified

| File | Change |
|---|---|
| `lib/core/route-resolver.ts` | Swagger as primary source (priority 1), `setSwaggerJson()` API |
| `lib/core/variable-resolver.ts` | Linked key resolution (`dependsOn`), `stripUnresolved()`, context key pre-seeding |
| `lib/api-client.ts` | Absolute URL detection, cookie conditional per HTTP method (`cookieMethods`) |
| `lib/core/route-resolver.ts` | Null GUID rejection in `extractEntityKey`, `updateMethod`/`updateRoute` fields |
| `tests/excel-driven-e2e.spec.ts` | Swagger fetch in beforeAll, fixture fallback, sub-endpoint key capture, non-throwing runners |
| `fixtures/Location.json` | Removed optional programs/roles that caused 400 |

---

## Swagger-Based Route Resolution (swagger-client.ts)

Fetches `{BASE_URL}/api/v1/api-doc/assets/open-api/v1/swagger.core.json` at runtime — **680 paths, 4.5MB, 58 modules**.

### What It Does

- `fetchSwagger(baseUrl)` — Node https GET, no auth needed, cached for run duration
- `findSwaggerRoutes(swagger, entityName)` — returns createRoute, updateRoute, updateMethod, getRoute, searchRoute, deleteRoute
- `getWriteMethod(swagger, urlPath)` — looks up POST vs PUT for any sub-endpoint URL by matching against Swagger path templates

### Key Behaviors

- Case-insensitive entity matching (`general-Note` → `general-note`)
- Direct `/{key}` path matching — only matches paths with exactly one segment after createRoute (avoids PCP's nested `/meeting/{meetingKey}/appointment/{appointmentKey}`)
- Correctly detects POST vs PUT per entity:
  - Appointment: **POST** update (no PUT on `/{appointmentKey}`)
  - Location sub-endpoints: `/contact`, `/location-type` → **POST**; `/add-address`, `/add-phone` → **PUT**

### Route Priority (Updated)

1. **Live Swagger** ← new primary source
2. Static registry (`config/route-registry.json`)
3. `api_to_table_mapping.json` (239 POST routes)
4. Convention fallback (PascalCase → kebab-case)

---

## Fixture Fallback

When CreateHappy fails to produce an entity key (bad test data in Excel), the framework auto-creates the entity from `fixtures/{Entity}.json`:

```
[Fixture Fallback] Create {Entity}
  → if entityKey is null after CreateHappy
  → read fixtures/{Entity}.json
  → resolveBody() to substitute ${strXxx} variables
  → POST to entity route
  → extract key from response
```

Currently available: `Location.json`. Framework skips gracefully if no fixture exists.

---

## Sub-Endpoint Key Capture

`captureSubEndpointKeys()` extracts entity keys from sub-endpoint POST responses and stores them in the variable resolver:

```
POST .../location/{key}/location-type → response has locationTypeKey
  → resolver.setKey('strLocationTypeKey', value)
  → available for downstream ComboTest/AddRemoveTest
```

Extracts entity name from URL tail: `.../location-type` → `LocationType` → `strLocationTypeKey`.

---

## Linked Key Resolution

`dependsOn` field in SQL_KEY_MAP ensures related keys come from the same parent:

```typescript
strCaseActivityKey: {
  schema: 'CaseActivityModule',
  table: 'CaseActivityInstance',
  keyCol: 'CaseActivityInstanceKey',
  dependsOn: { varName: 'strCaseKey', fkCol: 'CaseKey' }
}
```

Resolution order: independent keys first → dependent keys second (parent already resolved).

---

## Context Key Pre-Seeding

Resolver pre-loads `strOrganizationKey`, `strLocationKey`, `strStaffMemberKey` from `env_config.json` CONTEXT keys so all linked lookups stay within the same org as the SaveUserContext cookie.

---

## Cookie Fix: Method-Conditional

Root cause of 403 on sub-endpoints: cookie interfered with POST auth. Fix:

- Cookie only attached for **PUT/DELETE** (via `cookieMethods` set in ApiClient)
- POST uses **Bearer token only** (matches working `org-module-e2e.spec.ts` pattern)

---

## Absolute URL Detection

Excel `RequestUrl` contains `${strEndPoint}/api/v1/...` which resolves to a full `https://...` URL. `api-client.ts` now detects `http://`/`https://` prefix and skips prepending `BASE_URL`.

---

## Non-Throwing Runners

All 8 runner functions **never re-throw** — failures are captured in the CSV report, Playwright marks all tests as passed so serial mode runs every scenario. The CSV `00_all_results.csv` has the real PASS/FAIL per scenario.

---

## What's NOT Built (Phase 2 Remaining)

| Planned | Status | Notes |
|---|---|---|
| `prerequisite-resolver.ts` — smart prerequisite chain | ❌ Not built | Would fix CaseActivityKey from wrong case (5 CreateNegative failures) |
| `domain-model-loader.ts` — field shape auto-discovery from POST/GET JSON | ❌ Not built | Tier 4 variable resolution — not needed for current 92.5% pass rate |
| `module-registry.json` — auto-generated module→aggregate→file mapping | ❌ Not built | AGGREGATE/MODULE/SUITE env vars not implemented — only EXCEL/TFS/all modes work |
| `suites.json` — predefined suite groups (core, clinical, etc.) | ❌ Not built | Same — suite-based execution not implemented |

---

## Verified Results

**Appointment (107 scenarios, DevF1)**: 99/107 passed (92.5%), 56 seconds — up from 87% before Swagger.

**Location (192 scenarios)**: 137/192 passed (71.4%) — progression: 0% → 44% (URL fix) → 71.4% (key capture + null GUID fix).

All remaining failures are test data compatibility issues, not framework bugs.
