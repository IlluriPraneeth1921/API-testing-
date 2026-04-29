# Phase 1: Core Engine — What Was Built

> Covers 80% of scenarios. Built 2026-04-23.

[Phase 2: Advanced →](PHASE2_IMPLEMENTED.md) · [Phase 3: Reporting + CI →](PHASE3_IMPLEMENTED.md)

---

## Files Created

| File | Purpose |
|---|---|
| `lib/core/excel-parser.ts` | Parses any Katalon Excel, classifies sheets into 10 types by header pattern |
| `lib/core/variable-resolver.ts` | 3-tier `${strXxx}` resolution: SQL → generated → runtime keys |
| `lib/core/response-validator.ts` | Validates status codes, UserMessage (exact, semicolon-split), RecordCount |
| `lib/core/route-resolver.ts` | Maps entity → API route via 4 sources (Swagger → registry → mapping → convention) |
| `lib/core/e2e-report-generator.ts` | CSV output per test type + all-results CSV + summary JSON |
| `config/route-registry.json` | Static route overrides for edge cases (Case, ProfilePicture) |
| `tests/excel-driven-e2e.spec.ts` | THE single spec — runs any Excel file, 8 runner functions |
| `lib/cookie-manager.ts` | SaveUserContext cookie via Playwright APIRequestContext, cached 55 min |

## Files Modified

| File | Change |
|---|---|
| `lib/api-client.ts` | Added DELETE + generic `send()` method, `setCookie()`, cookie conditional per HTTP method, absolute URL detection |
| `lib/env-config.ts` | Added `CONTEXT_ORG_KEY`, `CONTEXT_LOC_KEY`, `CONTEXT_STAFF_KEY` to interface |
| `env_config.json` | Added context keys for DevF1 |
| `package.json` | 6 new npm scripts (`test:excel`, `test:excel:file`, etc.) |

---

## Sheet Classification (excel-parser.ts)

Classifies by **header pattern**, not sheet name. 10 types detected:

| Headers Present | Type | Method | Assertion |
|---|---|---|---|
| `RequestBody` + no `UserMessage`/`StatusCode` | **CreateHappy** | POST | status=200, extract key |
| `RequestBody` + `UserMessage` + `StatusCode` (≠200) | **CreateNegative** | POST | exact status + exact message |
| `RequestBody` + `LogMessage` (sheet `_002_*`) | **UpdateHappy** | POST/PUT | status=200 |
| `RequestBody` + `UserMessage` (sheet `_002_*`) | **UpdateNegative** | POST/PUT | exact status + exact message |
| `RequestBody` + `RequestUrl` + `StatusCode` | **SubEndpointHappy** | POST/PUT | status match |
| `RequestBody` + `RequestUrl` + `UserMessage` + `StatusCode` | **SubEndpointNegative** | POST/PUT | status + message |
| `RequestURL` + `RecordCount` | **SearchValidation** | GET | count validation |
| `Resource` + `PrimaryKey` + `StatusCode` + `UserMessage` | **ErrorCodeValidation** | GET | status + message |
| `PutRequestUrl` + `GetRequestUrl` | **ComboTest** | PUT→GET | both statuses + count |
| `PutRequestUrl` + `PutRemoveRequestUrl` | **AddRemoveTest** | PUT add→PUT/DELETE remove | both succeed |

**Verified**: 170 files parsed, 961 sheets classified, 7,915 scenarios extracted — zero parse errors.

---

## Variable Resolution (variable-resolver.ts)

### Tier 1: SQL Lookup (15 keys)

Linked key resolution via `dependsOn` — e.g. `strCaseActivityKey` fetched from same case as `strCaseKey`.

| Variable | Table | Linked To |
|---|---|---|
| `strCaseKey` | CaseModule.Case | — |
| `strCaseActivityKey` | CaseActivityModule.CaseActivityInstance | strCaseKey |
| `strPersonKey` | PersonModule.Person | — |
| `strLocationKey` | OrganizationModule.Location | strOrganizationKey |
| `strProgramKey` | ProgramModule.Program | — |
| `strStaffMemberKey` | OrganizationModule.StaffMember | — |
| `strOrganizationKey` | OrganizationModule.Organization | — |
| `strSystemRoleKey` | SecurityModule.SystemRole | — |
| `strPersonContactKey` | PersonModule.PersonContact | — |
| `strFileKey` | FileModule.File | — |
| `strServiceDefinitionKey` | ServiceDefinitionModule.ServiceDefinition | — |
| `strIncidentReportKey` | IncidentModule.IncidentReport | — |
| `strProtectiveServicesReportKey` | ProtectiveServicesModule.ProtectiveServicesReport | — |
| `strGuardianshipKey` | GuardianshipModule.Guardianship | strCaseKey |
| `strServiceAuthorizationKey` | ServiceAuthorizationModule.ServiceAuthorization | strCaseKey |

### Tier 2: Generated Values (22 patterns)

`strEndPoint`, `strResource`, `strInvalidKey`, `strEmail`, `strName`, `strFirstName`, `strLastName`, `strStartDate`, `strEndDate`, `strPhoneNumber`, `strDescription`, `strIdentifier`, etc.

### Tier 3: Runtime Keys

Entity's own key extracted from POST response during the run. Sub-endpoint keys captured from sub-endpoint POST responses (e.g. `strLocationTypeKey`, `strContactKey`).

### Unresolved Variable Stripping

`stripUnresolved()` recursively removes fields/array items that still contain `${...}` after resolution — prevents literal strings like `"${strSystemRoleKey}"` from being sent as GUIDs.

---

## Response Validation (response-validator.ts)

### Status Code
Exact match: `expect(actual).toBe(expected)`

### UserMessage (5 extraction patterns)
1. `body.responseMessages[].userMessage || .value || .message`
2. `body.model.responseMessages[].userMessage || .value || .message`
3. `body.message` (single string)
4. `body.errors` (validation errors object)
5. `body.title` (ASP.NET problem details)

Semicolon-split: `"msg1;msg2"` → checks each is present in response. Fuzzy: `a === msg || a.includes(msg) || msg.includes(a)`.

### RecordCount
- `"Greater Than or Equals to 1"` → `count >= 1`
- `"Greater Than 0"` → `count > 0`
- `"5"` → `count === 5`

Extracts from: `model.items` + `pagingData.totalCount`, `model` array, `items` array, body array.

---

## Route Resolution (route-resolver.ts)

4-source priority:

1. **Live Swagger** — fetched at runtime, auto-adapts per environment
2. **Static registry** — `config/route-registry.json` for edge cases
3. **api_to_table_mapping.json** — 239 POST routes from existing mapping
4. **Convention** — PascalCase → kebab-case (`Appointment` → `/api/v1/appointment-module/appointment`)

Includes `extractEntityKey()` — extracts entity key from POST response, rejects null GUID `00000000-...`.

---

## Cookie Manager (cookie-manager.ts)

- POSTs to `/view/Core/SecurityModule/Security/SaveUserContext` with Bearer token + org/loc/staff context
- Captures `set-cookie` from `resp.headersArray()`, strips metadata (`Path=/; HttpOnly`)
- Cached 55 min
- Cookie only attached for PUT/DELETE (not POST — POST uses Bearer only)

---

## Spec Architecture (excel-driven-e2e.spec.ts)

```
For each Excel file:
  test.describe(filename)
    beforeAll: fetch Swagger, get cookie, init resolver, pre-resolve SQL keys
    test.describe.configure({ mode: 'serial' })

    For each sheet:
      [Fixture Fallback] — if entityKey null after CreateHappy, POST from fixtures/*.json
      test.describe(sheetName [sheetType])
        For each scenario:
          test(label) → route to type-specific runner → capture result → never re-throw
```

8 runner functions: `runHappyPath`, `runNegative`, `runSubEndpointHappy`, `runSubEndpointNegative`, `runSearch`, `runErrorCode`, `runCombo`, `runAddRemove`.

---

## Verified Results

**Appointment (107 scenarios, DevF1)**: 99/107 passed (92.5%), 56 seconds.

| Type | Result |
|---|---|
| CreateHappy | 8/8 ✅ |
| CreateNegative | 34/39 (5 = data issue) |
| UpdateHappy | 8/8 ✅ |
| UpdateNegative | 35/35 ✅ |
| SearchValidation | 14/17 (3 = env data mismatch) |

**Location (192 scenarios)**: 137/192 passed (71.4%) — sub-endpoints + combo + add-remove all working.
