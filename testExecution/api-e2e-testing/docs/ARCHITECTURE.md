# API E2E Testing Framework — Architecture

## Problem Statement

We have **170 Excel files** in `API/` with **~1,100 sheets** containing test scenarios for every API module. Each Excel has:
- POST happy path scenarios (multiple payload variations)
- POST/PUT negative scenarios (missing fields → expected error messages)
- GET search/filter scenarios (query params → expected record counts)
- GET/PUT/DELETE error code scenarios (invalid keys/URLs → expected status + error messages)
- Combo scenarios (PUT then GET to verify)

**Key constraints:**
- Excel test data must NOT change when domain changes
- Framework must auto-discover routes, prerequisite keys, and domain models
- Negative tests must validate **exact error messages**, not just status codes
- Some modules have no prerequisites (self-contained), some need keys from SQL

---

## Folder Structure

```
tests/api-e2e-testing/
├── config/
│   ├── env_config.json              # Environment configs (DevF1, F1, F5, etc.)
│   └── route-registry.json          # Auto-generated: entity → route mapping (from swagger/domain)
│
├── lib/
│   ├── core/
│   │   ├── api-client.ts            # HTTP client (GET/POST/PUT/DELETE) with retry + auth
│   │   ├── auth.ts                  # Cognito token management (cached, multi-env)
│   │   └── env-config.ts            # Environment loader
│   │
│   ├── data/
│   │   ├── excel-parser.ts          # Parse Katalon Excel → typed TestSuite
│   │   ├── variable-resolver.ts     # Resolve ${strXxxKey} → real values (SQL + generated)
│   │   └── domain-model-loader.ts   # Load POST/GET models from API Domain and Model/
│   │
│   ├── db/
│   │   └── sql-client.ts            # SQL Server client (prerequisite key lookup)
│   │
│   ├── discovery/
│   │   ├── route-discoverer.ts      # Auto-derive routes from entity name + swagger
│   │   └── prerequisite-resolver.ts # Determine what keys an entity needs + fetch from SQL
│   │
│   ├── validation/
│   │   ├── response-validator.ts    # Validate status, UserMessage, RecordCount
│   │   └── field-matcher.ts         # GET vs SQL field comparison (existing)
│   │
│   └── reporting/
│       ├── report-generator.ts      # CSV + JSON output per run
│       └── html-report.ts           # Standalone HTML summary report
│
├── tests/
│   └── excel-driven-e2e.spec.ts     # THE single spec — runs any Excel file
│
├── fixtures/                         # Fallback payloads (when Excel has no happy path)
│   ├── Organization.json
│   ├── Location.json
│   └── StaffMember.json
│
├── output/                           # Run results (timestamped folders)
│   └── {Entity}_E2E_{timestamp}/
│       ├── 00_keys.json
│       ├── 01_create_results.csv
│       ├── 02_negative_results.csv
│       ├── 03_search_results.csv
│       ├── 04_error_code_results.csv
│       ├── 05_combo_results.csv
│       └── 06_summary_report.html
│
├── docs/
│   └── ARCHITECTURE.md              # This file
│
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

---

## Data Flow

```
                    ┌─────────────────────────────────┐
                    │   API/609768_Appointment.xlsx    │
                    │   (170 Excel files, untouched)   │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │       excel-parser.ts            │
                    │  Reads sheets, classifies by     │
                    │  header pattern into TestSuite   │
                    └──────────────┬──────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
   ┌──────────▼─────────┐  ┌──────▼──────────┐  ┌──────▼──────────────┐
   │ variable-resolver   │  │ route-discoverer│  │ prerequisite-resolver│
   │                     │  │                 │  │                      │
   │ ${strCaseKey} →     │  │ "Appointment" → │  │ Appointment needs    │
   │  SQL lookup or      │  │  /api/v1/       │  │  strCaseKey →        │
   │  generate value     │  │  appointment-   │  │  fetch from SQL      │
   │                     │  │  module/        │  │  (no POST needed)    │
   │ ${strInvalidKey} →  │  │  appointment    │  │                      │
   │  bad GUID           │  │                 │  │ strFileKey →          │
   │                     │  │ Also reads from │  │  POST /file first    │
   │ ${strEmail} →       │  │ domain models   │  │  (if no SQL row)     │
   │  random@test.com    │  │ for field shape │  │                      │
   └──────────┬──────────┘  └──────┬──────────┘  └──────┬───────────────┘
              │                    │                     │
              └────────────────────┼─────────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │    excel-driven-e2e.spec.ts      │
                    │                                  │
                    │  For each sheet in the Excel:    │
                    │                                  │
                    │  001_TC001 → test.describe(      │
                    │    "POST Happy Path", () => {    │
                    │      for each row:               │
                    │        test(scenario, async => { │
                    │          parse JSON body          │
                    │          resolve variables        │
                    │          POST → assert 200       │
                    │          extract key              │
                    │        })                        │
                    │    })                            │
                    │                                  │
                    │  001_TC002 → test.describe(      │
                    │    "POST Negative", () => {      │
                    │      for each row:               │
                    │        test(scenario, async => { │
                    │          POST → assert StatusCode│
                    │          assert body contains    │
                    │            EXACT UserMessage     │
                    │        })                        │
                    │    })                            │
                    │                                  │
                    │  003_TC001 → test.describe(      │
                    │    "GET Search", () => {         │
                    │      for each row:               │
                    │        test(scenario, async => { │
                    │          GET url → assert 200    │
                    │          assert record count     │
                    │        })                        │
                    │    })                            │
                    │                                  │
                    │  003_TC002 → test.describe(      │
                    │    "GET Error Codes", () => {    │
                    │      for each row:               │
                    │        test(scenario, async => { │
                    │          GET invalid url          │
                    │          assert StatusCode       │
                    │          assert EXACT UserMessage│
                    │        })                        │
                    │    })                            │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │      response-validator.ts       │
                    │                                  │
                    │  validateStatus(resp, expected)  │
                    │  validateUserMessage(resp, msg)  │
                    │    → splits "msg1;msg2" and      │
                    │      checks each is present      │
                    │  validateRecordCount(resp, expr) │
                    │    → "Greater Than or Equals     │
                    │       to 1" → resp.length >= 1   │
                    │    → "0" → resp.length === 0     │
                    │    → "5" → resp.length === 5     │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │       report-generator.ts        │
                    │  Per-scenario pass/fail CSV      │
                    │  + HTML summary with counts      │
                    └─────────────────────────────────┘
```

---

## Sheet Classification Logic (excel-parser.ts)

The parser classifies each sheet by its **header pattern**, not by sheet name:

| Headers Present | Classification | HTTP Method | Assertion |
|---|---|---|---|
| `RequestBody` + NO `UserMessage` + NO `StatusCode` (or StatusCode=200) | **CreateHappy** | POST | status=200, extract key |
| `RequestBody` + `UserMessage` + `StatusCode` (≠200) | **CreateNegative** | POST | status=StatusCode, body contains UserMessage |
| `RequestBody` + `LogMessage` + `StatusCode`=200 (sheet `_002_*`) | **UpdateHappy** | PUT | status=200 |
| `RequestBody` + `UserMessage` + `StatusCode` (sheet `_002_*`) | **UpdateNegative** | PUT | status=StatusCode, body contains UserMessage |
| `RequestURL` + `RecordCount` | **SearchValidation** | GET | status=200, validate count |
| `Resource` + `PrimaryKey` + `StatusCode` + `UserMessage` | **ErrorCodeValidation** | GET/DELETE | status=StatusCode, body contains UserMessage |
| `PutRequestUrl` + `GetRequestUrl` + `PutStatusCode` + `GetStatusCode` | **ComboTest** | PUT then GET | both statuses match, GetRecordCount matches |
| `PutRequestUrl` + `PutRemoveRequestUrl` | **AddRemoveTest** | PUT add, PUT remove | both succeed |
| `RequestBody` + `RequestUrl` + `StatusCode` (newer pattern) | **SubEndpointHappy** | PUT to sub-url | status=StatusCode |
| `RequestBody` + `RequestUrl` + `UserMessage` + `StatusCode` | **SubEndpointNegative** | PUT to sub-url | status=StatusCode, body contains UserMessage |

---

## Variable Resolution Strategy (variable-resolver.ts)

### Tier 1: SQL Lookup (no creation needed)
These are the top 10 keys used across 90% of files. Fetch the **latest existing record** from SQL:

| Variable | SQL Query | Used By |
|---|---|---|
| `strCaseKey` | `SELECT TOP 1 CaseKey FROM CaseModule.Case ORDER BY EntityCreatedTimestamp DESC` | 61 files |
| `strPersonKey` | `SELECT TOP 1 PersonKey FROM PersonModule.Person ORDER BY EntityCreatedTimestamp DESC` | 50 files |
| `strLocationKey` | `SELECT TOP 1 LocationKey FROM OrganizationModule.Location ORDER BY EntityCreatedTimestamp DESC` | 35 files |
| `strProgramKey` | `SELECT TOP 1 ProgramKey FROM ProgramModule.Program ORDER BY EntityCreatedTimestamp DESC` | 31 files |
| `strStaffMemberKey` | `SELECT TOP 1 StaffMemberKey FROM OrganizationModule.StaffMember ORDER BY EntityCreatedTimestamp DESC` | 27 files |
| `strOrganizationKey` | `SELECT TOP 1 OrganizationKey FROM OrganizationModule.Organization ORDER BY EntityCreatedTimestamp DESC` | 19 files |
| `strSystemRoleKey` | `SELECT TOP 1 SystemRoleKey FROM SecurityModule.SystemRole ORDER BY EntityCreatedTimestamp DESC` | 14 files |
| `strPersonContactKey` | `SELECT TOP 1 PersonContactKey FROM PersonModule.PersonContact ORDER BY EntityCreatedTimestamp DESC` | 13 files |
| `strFileKey` | `SELECT TOP 1 FileKey FROM FileModule.File ORDER BY EntityCreatedTimestamp DESC` | 13 files |
| `strServiceDefinitionKey` | `SELECT TOP 1 ServiceDefinitionKey FROM ServiceDefinitionModule.ServiceDefinition ORDER BY ...` | 11 files |

### Tier 2: Static/Generated Values
| Variable Pattern | Resolution |
|---|---|
| `strInvalidKey` | `00000000-0000-0000-0000-000000000000` |
| `strEndPoint` | `BASE_URL` from env_config |
| `strResource` | Auto-derived from entity name (e.g. `Appointment` → `api/v1/appointment-module/appointment`) |
| `strEmail`, `strEmail1` | `auto_{timestamp}@test.com` |
| `strName`, `strFullName`, `strShortName` | `AutoTest_{random}` |
| `strFirstName`, `strLastName` | `TestFirst_{random}`, `TestLast_{random}` |
| `strStartDate`, `strEndDate` | Today, Today+365 |
| `strTodayDate` | Today ISO |
| `strPhoneNumber`, `strNumber` | `5551234567` |
| `strDescription`, `strNote` | `Automation test {timestamp}` |
| `strBusinessName` | `AutoBiz_{random}` |
| `strCity`, `strCityName` | `TestCity` |
| `strFirstStreetAddress` | `123 Test St` |
| `strIdentifier` | `AUTO_{random}` |

### Tier 3: Created-During-Run Keys
Keys that are created by the happy path POST in the same Excel and used by subsequent sheets:
| Variable | Source |
|---|---|
| `strAppointmentKey` | Extracted from 001_TC001 POST response |
| `strGuardianshipKey` | Extracted from 001_TC001 POST response |
| `strLocationTypeKey` | Extracted from sub-endpoint POST response |
| etc. | The entity's own key from its own POST |

### Tier 4: Domain Model Auto-Discovery
When a variable is not in Tier 1-3, the framework:
1. Reads `API Domain and Model/AllModules_ApiModels_20260414/{Module}/{Entity}_POST.json`
2. Finds the field shape (string, GUID, vocab code object, date, boolean)
3. Generates an appropriate value

---

## Route Discovery Strategy (route-discoverer.ts)

**Zero hardcoding.** Routes are derived from 3 sources in priority order:

### Source 1: Excel `RequestUrl` column
Newer files (727xxx+) have explicit `RequestUrl` per row. Use as-is after variable substitution.

### Source 2: `api_to_table_mapping.json`
Already exists in `SnowflakeSilverTable comp/`. Maps entity → route → SQL tables.

### Source 3: Convention-based derivation
```
Entity: "Appointment"
Module: "AppointmentModule"  (entity + "Module")
Route:  /api/v1/appointment-module/appointment  (kebab-case)
```

### Source 4: Domain Model folder structure
```
API Domain and Model/AllModules_ApiModels_20260414/AppointmentModule/Appointment_POST.json
→ Module = AppointmentModule, Entity = Appointment
```

---

## Response Validation (response-validator.ts)

### Status Code Validation
```typescript
// Excel has StatusCode column
expect(response.status).toBe(expectedStatus);
```

### UserMessage Validation (EXACT match)
The Excel `UserMessage` column contains the **exact error messages** the API returns, semicolon-separated:
```
"The Subject field is required."
"The BusinessProfile field is required.;The OrganizationKey field is required."
"Location not found."
```

Validation logic:
```typescript
function validateUserMessage(responseBody: any, expectedMessages: string): void {
  // API returns responseMessages array or direct message
  const actualMessages = extractMessages(responseBody);
  
  // Split expected by semicolon
  const expected = expectedMessages.split(';').map(m => m.trim()).filter(Boolean);
  
  for (const msg of expected) {
    expect(actualMessages).toContain(msg);
  }
}

function extractMessages(body: any): string[] {
  // Pattern 1: body.responseMessages[].userMessage
  if (body?.responseMessages) {
    return body.responseMessages.map((rm: any) => rm.userMessage || rm.message || '');
  }
  // Pattern 2: body.message
  if (body?.message) return [body.message];
  // Pattern 3: body.errors (validation)
  if (body?.errors) {
    return Object.values(body.errors).flat().map(String);
  }
  return [JSON.stringify(body)];
}
```

### RecordCount Validation
The Excel `RecordCount` column has expressions:
```
"Greater Than or Equals to 1"  →  expect(count).toBeGreaterThanOrEqual(1)
"1"                            →  expect(count).toBe(1)
"0"                            →  expect(count).toBe(0)
```

Validation logic:
```typescript
function validateRecordCount(responseBody: any, expected: string): void {
  const items = responseBody?.model?.items || responseBody?.items || 
                (Array.isArray(responseBody?.model) ? responseBody.model : []);
  const count = items.length;
  const totalCount = responseBody?.model?.pagingData?.totalCount ?? 
                     responseBody?.pagingData?.totalCount ?? count;
  
  if (expected.toLowerCase().includes('greater than or equals to')) {
    const num = parseInt(expected.match(/\d+/)?.[0] || '1');
    expect(totalCount).toBeGreaterThanOrEqual(num);
  } else {
    expect(totalCount).toBe(parseInt(expected));
  }
}
```

---

## Self-Healing: Domain Model Auto-Discovery (domain-model-loader.ts)

When the domain changes (new fields added), the framework auto-adapts:

```
API Domain and Model/
  AllModules_ApiModels_20260414/
    AppointmentModule/
      Appointment_POST.json    ← POST payload shape (all fields with sample values)
      Appointment_GET.json     ← GET response shape (what to expect back)
```

The loader:
1. Reads `{Entity}_POST.json` to know the **full field shape**
2. When Excel payload has `${strXxxKey}` for a field that's a GUID in the model → resolve as GUID
3. When Excel payload has a field that's a vocab code object in the model → resolve with proper `{code, name, codeSystemIdentifier}` shape
4. When a **new field** is added to the domain model but not in the Excel → the framework still works because it only sends what the Excel specifies
5. When validating GET responses → uses the GET model to know which fields to expect

---

## Module Registry (config/module-registry.json)

Auto-generated mapping of **45 modules → aggregates → Excel files → sheets**.
This is the single source of truth for what to run.

```json
{
  "AppointmentModule": {
    "aggregates": {
      "Appointment": ["609768_Appointment.xlsx"]
    }
  },
  "AttachmentModule": {
    "aggregates": {
      "AttachmentAccess": ["609770_AttachmentAccess.xlsx"],
      "CaseAttachment": ["609771_CaseAttachment.xlsx"],
      "GuardianshipAttachment": ["609772_GuardianshipAttachment.xlsx"],
      "OrganizationAttachment": ["609775_OrganizationAttachment.xlsx"],
      "ProtectiveServicesReportAttachment": ["609776_ProtectiveServicesReportAttachment.xlsx"],
      "SystemAttachment": ["609778_SystemAttachment.xlsx"]
    }
  },
  "OrganizationModule": {
    "aggregates": {
      "Organization": ["728300_Organization.xlsx", "613460_OrganizationCustomFormInstance.xlsx", "..."],
      "Location": ["727573_Location.xlsx", "612015_LocationExternal_LocationAssignment.xlsx", "..."],
      "StaffMember": ["727911_StaffMember.xlsx", "613501_StaffMemberLocationAssignment.xlsx", "..."],
      "StaffDelegation": ["729123_StaffDelegation.xlsx"],
      "PaymentSuspension": ["923178_PaymentSuspension.xlsx"]
    }
  }
  // ... 45 modules total
}
```

Generated by `lib/discovery/registry-builder.ts` which scans `API/` folder + `API Domain and Model/manifest.json`.

---

## 5 Execution Modes

### Mode 1: Single Excel File
Run one specific Excel file (all its sheets).

```bash
# By filename
EXCEL=609768_Appointment.xlsx npx playwright test excel-driven-e2e

# By TFS ID
TFS=609768 npx playwright test excel-driven-e2e
```

**What happens:**
```
609768_Appointment.xlsx
  ├── 609768_001_TC001 (8 rows)  → test.describe("POST Happy Path")
  │     ├── test("Scenario1 — Schema with only minimum required fields")
  │     ├── test("Scenario2 — Schema with minimum required fields and CaseActivityKeyReference")
  │     └── ... (8 tests)
  ├── 609768_001_TC002 (39 rows) → test.describe("POST Negative")
  │     ├── test("Scenario1 — Missing Mandatory Fields - Subject")
  │     │     → POST → assert status=400 → assert "The Subject field is required."
  │     └── ... (39 tests)
  ├── 609768_002_TC001 (8 rows)  → test.describe("PUT Happy Path")
  ├── 609768_002_TC002 (35 rows) → test.describe("PUT Negative")
  └── 609768_003_TC001 (17 rows) → test.describe("GET Search")
        ├── test("Scenario1 — Person Key Search")
        │     → GET ?personKey=xxx → assert count >= 1
        └── ... (17 tests)

Total: 107 tests from 1 Excel file
```

---

### Mode 2: Single Aggregate
Run all Excel files for one aggregate (e.g. all Location-related files).

```bash
# By aggregate name
AGGREGATE=Location npx playwright test excel-driven-e2e

# Resolves to:
#   727573_Location.xlsx (18 sheets)
#   612015_LocationExternal_LocationAssignment.xlsx (6 sheets)
#   612017_LocationExternal_StaffMemberAssignment.xlsx (6 sheets)
#   609773_LocationAttachment.xlsx (6 sheets)
```

**What happens:**
```
test.describe("Location Aggregate")
  ├── test.describe("727573_Location.xlsx")
  │     ├── test.describe("POST Happy Path") — 8 scenarios
  │     ├── test.describe("POST Negative") — 20 scenarios
  │     ├── test.describe("Sub: Contact Happy") — 2 scenarios
  │     ├── test.describe("Sub: Contact Negative") — 6 scenarios
  │     ├── test.describe("Sub: ServiceArea Happy") — 1 scenario
  │     ├── ... (18 sheets total)
  │     └── test.describe("GET Search") — 34 scenarios
  ├── test.describe("612015_LocationExternal_LocationAssignment.xlsx")
  │     └── ... (6 sheets)
  └── test.describe("609773_LocationAttachment.xlsx")
        └── ... (6 sheets)
```

---

### Mode 3: Single Module
Run all aggregates in a module (e.g. entire OrganizationModule).

```bash
# By module name
MODULE=OrganizationModule npx playwright test excel-driven-e2e

# Resolves to 5 aggregates, 17 Excel files, 112 sheets:
#   Organization (6 files) → 728300, 613460, 613466, 613467, 613472, 613476
#   Location (4 files)     → 727573, 612015, 612017, 609773
#   StaffMember (4 files)  → 727911, 609777, 613501, 729124
#   StaffDelegation (1)    → 729123
#   PaymentSuspension (1)  → 923178
```

**What happens:**
```
test.describe("OrganizationModule")
  ├── test.describe("Organization Aggregate")
  │     ├── test.describe("728300_Organization.xlsx") — all sheets
  │     ├── test.describe("613460_OrganizationCustomFormInstance.xlsx")
  │     └── ...
  ├── test.describe("Location Aggregate")
  │     ├── test.describe("727573_Location.xlsx")
  │     └── ...
  ├── test.describe("StaffMember Aggregate")
  │     └── ...
  ├── test.describe("StaffDelegation Aggregate")
  │     └── 729123_StaffDelegation.xlsx
  └── test.describe("PaymentSuspension Aggregate")
        └── 923178_PaymentSuspension.xlsx
```

---

### Mode 4: Multiple Modules (Selective Regression)
Run specific modules together.

```bash
# Comma-separated modules
MODULE=OrganizationModule,NoteModule,SecurityModule npx playwright test excel-driven-e2e

# Or by tag (predefined groups in config)
SUITE=core npx playwright test excel-driven-e2e
# core = OrganizationModule + PersonModule + CaseModule + SecurityModule

SUITE=clinical npx playwright test excel-driven-e2e
# clinical = NoteModule + HealthInformationModule + CrisisModule + GuardianshipModule
```

**Suite definitions** in `config/suites.json`:
```json
{
  "core": ["OrganizationModule", "PersonModule", "CaseModule", "SecurityModule"],
  "clinical": ["NoteModule", "HealthInformationModule", "CrisisModule", "GuardianshipModule", "PersonCenteredPlanModule"],
  "financial": ["RateModule", "ServiceAuthorizationModule", "ServiceDefinitionModule", "ContractModule"],
  "protective": ["ProtectiveServicesModule", "GuardianshipModule", "SafetyDevicePacketModule"],
  "program": ["ProgramModule", "ProgramEnrollmentModule", "ProgramApplicationModule", "WaitlistModule"],
  "communication": ["NotificationModule", "MessageModule", "LetterModule"],
  "smoke": ["OrganizationModule", "PersonModule", "NoteModule"]
}
```

---

### Mode 5: Full Regression (All Modules)
Run everything — all 45 modules, 170 files, ~1100 sheets.

```bash
# Full regression
npx playwright test excel-driven-e2e

# Full regression with parallel workers
npx playwright test excel-driven-e2e --workers=4

# Full regression, specific environment
ENV_NAME=F1 npx playwright test excel-driven-e2e
```

**What happens:**
```
test.describe("Full API Regression")
  ├── test.describe("AppointmentModule")
  │     └── test.describe("Appointment") → 609768_Appointment.xlsx (107 tests)
  ├── test.describe("AttachmentModule")
  │     ├── test.describe("AttachmentAccess") → 609770 (35 tests)
  │     ├── test.describe("CaseAttachment") → 609771
  │     └── ... (6 aggregates)
  ├── test.describe("OrganizationModule")
  │     ├── test.describe("Organization") → 6 files
  │     ├── test.describe("Location") → 4 files
  │     └── ... (5 aggregates, 17 files, 112 sheets)
  └── ... (45 modules total)
```

---

## Execution Resolution Logic

```typescript
// In excel-driven-e2e.spec.ts — top-level resolution

function resolveExcelFiles(): { module: string; aggregate: string; file: string }[] {
  const registry = loadModuleRegistry();  // config/module-registry.json
  const suites = loadSuites();            // config/suites.json

  // Mode 1: Single Excel file
  if (process.env.EXCEL) {
    return [findFileInRegistry(registry, process.env.EXCEL)];
  }
  if (process.env.TFS) {
    return [findByTfsId(registry, process.env.TFS)];
  }

  // Mode 2: Single Aggregate
  if (process.env.AGGREGATE) {
    return getAllFilesForAggregate(registry, process.env.AGGREGATE);
  }

  // Mode 3: Single Module
  if (process.env.MODULE && !process.env.MODULE.includes(',')) {
    return getAllFilesForModule(registry, process.env.MODULE);
  }

  // Mode 4: Multiple Modules or Suite
  if (process.env.MODULE && process.env.MODULE.includes(',')) {
    const modules = process.env.MODULE.split(',');
    return modules.flatMap(m => getAllFilesForModule(registry, m.trim()));
  }
  if (process.env.SUITE) {
    const modules = suites[process.env.SUITE] || [];
    return modules.flatMap(m => getAllFilesForModule(registry, m));
  }

  // Mode 5: Full Regression (no filter)
  return getAllFiles(registry);
}
```

---

## Test Hierarchy (Playwright Structure)

```
test.describe("API E2E Regression")                          ← top level
  └── test.describe("OrganizationModule")                    ← module
        └── test.describe("Location")                        ← aggregate
              └── test.describe("727573_Location.xlsx")       ← excel file
                    ├── test.describe("001_TC001 POST Happy")← sheet type
                    │     ├── test("Scenario1")              ← individual scenario
                    │     ├── test("Scenario2")
                    │     └── test("Scenario8")
                    ├── test.describe("001_TC002 POST Negative")
                    │     ├── test("Scenario1 — Missing BusinessProfile")
                    │     │     → POST {} → assert 400
                    │     │     → assert body contains "The BusinessProfile field is required."
                    │     │     → assert body contains "The OrganizationKey field is required."
                    │     └── test("Scenario2 — Missing FullName")
                    │           → POST {businessProfile:{},orgKey:xxx} → assert 400
                    │           → assert body contains "The FullName field is required."
                    ├── test.describe("002_TC001 Sub: Contact Happy")
                    ├── test.describe("002_TC002 Sub: Contact Negative")
                    ├── test.describe("002_TC003 Sub: Contact Combo")
                    │     └── test("Scenario1")
                    │           → PUT /location/{key}/contact → assert 200
                    │           → GET /location/{key}/contacts?isPrimary=true → assert 200
                    │           → assert count = 1
                    └── test.describe("007_TC001 GET Search")
                          ├── test("Scenario1 — Search with ShortName")
                          │     → GET /locations?shortName=xxx → assert count = 1
                          └── test("Scenario34")
```

---

## Filtering Options (Cross-cutting)

These work with ANY execution mode:

```bash
# Skip POST happy path (only run negative + search + error tests)
SKIP_HAPPY=true MODULE=NoteModule npx playwright test excel-driven-e2e

# Skip SQL prerequisite lookup (use generated values only)
SKIP_SQL=true AGGREGATE=Appointment npx playwright test excel-driven-e2e

# Only run negative tests
TEST_TYPE=negative EXCEL=609768_Appointment.xlsx npx playwright test excel-driven-e2e

# Only run search tests
TEST_TYPE=search MODULE=OrganizationModule npx playwright test excel-driven-e2e

# Only run error code tests
TEST_TYPE=error MODULE=AttachmentModule npx playwright test excel-driven-e2e

# Use existing entity key (skip POST, go straight to PUT/GET/search)
ENTITY_KEY=abc-123 EXCEL=609768_Appointment.xlsx npx playwright test excel-driven-e2e

# Specific environment
ENV_NAME=F1 SUITE=core npx playwright test excel-driven-e2e

# Limit scenarios per sheet (for quick smoke)
MAX_SCENARIOS=3 npx playwright test excel-driven-e2e
```

---

## package.json Scripts

```json
{
  "scripts": {
    "test": "npx playwright test excel-driven-e2e",
    "test:file": "cross-env npx playwright test excel-driven-e2e",
    "test:aggregate": "cross-env npx playwright test excel-driven-e2e",
    "test:module": "cross-env npx playwright test excel-driven-e2e",
    "test:suite": "cross-env npx playwright test excel-driven-e2e",
    "test:regression": "npx playwright test excel-driven-e2e",
    "test:smoke": "cross-env SUITE=smoke MAX_SCENARIOS=2 npx playwright test excel-driven-e2e",
    "test:core": "cross-env SUITE=core npx playwright test excel-driven-e2e",
    "test:clinical": "cross-env SUITE=clinical npx playwright test excel-driven-e2e",
    "test:negative-only": "cross-env TEST_TYPE=negative npx playwright test excel-driven-e2e",
    "test:search-only": "cross-env TEST_TYPE=search npx playwright test excel-driven-e2e",
    "test:devf1": "cross-env ENV_NAME=DevF1 npx playwright test excel-driven-e2e",
    "test:f1": "cross-env ENV_NAME=F1 npx playwright test excel-driven-e2e",
    "test:f5": "cross-env ENV_NAME=F5 npx playwright test excel-driven-e2e",
    "registry:build": "npx ts-node lib/discovery/registry-builder.ts"
  }
}
```

---

## Test Output Per Run

Output folder structure adapts to execution mode:

### Single File Run
```
output/Appointment_E2E_2026-04-22T1430/
├── 00_keys.json                    # All resolved variables + entity keys
├── 01_create_results.csv           # POST happy: Scenario, Status, Key, Pass/Fail
├── 02_negative_results.csv         # Negative: Scenario, ExpectedStatus, ActualStatus,
│                                   #   ExpectedMessage, ActualMessage, MessageMatch, Pass/Fail
├── 03_search_results.csv           # Search: Scenario, URL, ExpectedCount, ActualCount, Pass/Fail
├── 04_error_code_results.csv       # Errors: Scenario, URL, ExpectedStatus, ActualStatus,
│                                   #   ExpectedMessage, ActualMessage, MessageMatch, Pass/Fail
├── 05_combo_results.csv            # Combo: Scenario, PutStatus, GetStatus, GetCount, Pass/Fail
└── 06_summary.json                 # { total, passed, failed, byType: { create, negative, ... } }
```

### Module / Suite / Regression Run
```
output/Regression_F1_2026-04-22T1430/
├── 00_run_config.json              # What was run: mode, modules, env, timestamp
├── OrganizationModule/
│   ├── Organization/
│   │   ├── 728300_Organization/
│   │   │   ├── 01_create_results.csv
│   │   │   ├── 02_negative_results.csv
│   │   │   └── ...
│   │   └── 613460_OrganizationCustomFormInstance/
│   │       └── ...
│   ├── Location/
│   │   ├── 727573_Location/
│   │   └── ...
│   └── module_summary.json         # Module-level pass/fail counts
├── NoteModule/
│   └── ...
├── regression_summary.json         # Overall: modules, aggregates, files, sheets,
│                                   #   total tests, passed, failed, by module
└── regression_report.html          # Standalone HTML dashboard:
                                    #   Module cards with pass/fail bars
                                    #   Drill-down to aggregate → file → scenario
                                    #   Failed test details with expected vs actual
```

### Regression HTML Report Structure
```
┌─────────────────────────────────────────────────────────┐
│  API E2E Regression Report — F1 — 2026-04-22           │
│  Total: 4,200 tests | ✅ 3,800 passed | ❌ 400 failed  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ OrganizationModule ──────── 95% ████████████░ ──┐  │
│  │  Organization    98% ██████████░  (120/122)      │  │
│  │  Location        92% █████████░░  (180/196)      │  │
│  │  StaffMember     94% █████████░░  (85/90)        │  │
│  │  StaffDelegation 100% ███████████ (12/12)        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ NoteModule ──────────────── 88% ████████░░░ ──┐   │
│  │  GeneralNote     100% ███████████ (30/30)       │   │
│  │  CrisisContact   75% ███████░░░░ (24/32)        │   │
│  │  ▼ Failed: Scenario3 POST Negative              │   │
│  │    Expected: 400 "The CaseKey field is required"│   │
│  │    Actual:   400 "CaseKey is required"           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ PersonModule ────────────── 97% ██████████░ ──┐   │
│  │  ...                                            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Strategy

Playwright's `--workers` flag controls parallelism. The spec generates tests per file,
so Playwright can distribute files across workers:

```bash
# 4 workers — each worker gets a subset of Excel files
npx playwright test excel-driven-e2e --workers=4

# Shard across CI agents (e.g. 3 agents)
npx playwright test excel-driven-e2e --shard=1/3
npx playwright test excel-driven-e2e --shard=2/3
npx playwright test excel-driven-e2e --shard=3/3
```

**Dependency handling**: Each Excel file's happy path POST runs first (serial within file),
then negative/search/error tests can run in any order. The spec uses `test.describe.serial`
for the happy path block and regular `test.describe` for the rest.

```typescript
// Within each Excel file:
test.describe.serial(`${file} — Setup`, () => {
  // 001_TC001 POST Happy Path — must run first to get entity key
  test('Scenario1 — POST with minimal fields', ...);
});

test.describe(`${file} — POST Negative`, () => {
  // 001_TC002 — can run in parallel with other describe blocks
  test('Scenario1 — Missing Subject', ...);
});

test.describe(`${file} — GET Search`, () => {
  // 003_TC001 — can run in parallel
  test('Scenario1 — Person Key Search', ...);
});
```

---

## Prompt for Extending the Framework

Save this as `.amazonq/prompts/api_e2e_extend.md`:

```markdown
# API E2E Framework Extension Prompt

## Context
I have a Playwright + TypeScript API E2E framework at `tests/api-e2e-testing/`.
It reads Excel test data from `API/` folder and runs all scenarios per entity.

## Architecture
- `lib/data/excel-parser.ts` — parses Katalon Excel sheets by header pattern
- `lib/data/variable-resolver.ts` — resolves ${strXxxKey} variables from SQL or generates values
- `lib/discovery/route-discoverer.ts` — auto-derives API routes from entity name
- `lib/discovery/prerequisite-resolver.ts` — determines + fetches prerequisite keys
- `lib/data/domain-model-loader.ts` — reads API Domain and Model/ JSON for field shapes
- `lib/validation/response-validator.ts` — validates status, UserMessage (exact), RecordCount
- `tests/excel-driven-e2e.spec.ts` — the single spec that runs any Excel file

## Data Sources
- `API/{tfsId}_{Entity}.xlsx` — 170 Excel files with test scenarios
- `API Domain and Model/AllModules_ApiModels_20260414/{Module}/{Entity}_POST.json` — POST payload shapes
- `API Domain and Model/AllModules_ApiModels_20260414/{Module}/{Entity}_GET.json` — GET response shapes
- `API Domain and Model/AllModules_DomainSamples_20260414/{Module}/{Entity}_FullAggregate.json` — full domain samples
- `SnowflakeSilverTable comp/api_to_table_mapping.json` — route → SQL table mapping
- `config/env_config.json` — environment configs

## Excel Sheet Patterns
- `_001_TC001` — POST happy path (Scenario, RequestBody, LogMessage)
- `_001_TC002` — POST negative (Scenario, RequestBody, LogMessage, UserMessage, StatusCode)
- `_002_TC001` — PUT happy path
- `_002_TC002` — PUT negative
- `_003_TC001` — GET search (Scenario, RequestURL, RecordCount, LogMessage)
- `_003_TC002` — GET/DELETE error codes (Resource, PrimaryKey, StatusCode, UserMessage)
- `_xxx_TC003` — Combo tests (PutRequestUrl, GetRequestUrl, PutStatusCode, GetStatusCode, GetRecordCount)

## Variable Resolution
- Tier 1: SQL lookup for common keys (strCaseKey, strPersonKey, strLocationKey, etc.)
- Tier 2: Static/generated values (strInvalidKey, strEmail, strName, strStartDate, etc.)
- Tier 3: Keys created during the run (entity's own key from POST response)
- Tier 4: Domain model auto-discovery for unknown fields

## When extending:
1. To add a new entity: just add its Excel file to API/ — framework auto-discovers it
2. To add a new prerequisite key: add SQL query to variable-resolver.ts Tier 1 map
3. To add a new sheet pattern: add header detection in excel-parser.ts
4. To add a new validation type: extend response-validator.ts
5. Domain changes: framework reads from API Domain and Model/ — no code changes needed
```

---

## Implementation Priority

### Phase 1: Core Engine (covers 80% of scenarios)
1. `excel-parser.ts` — parse all sheet types
2. `variable-resolver.ts` — Tier 1 (SQL) + Tier 2 (generated)
3. `response-validator.ts` — status + UserMessage + RecordCount
4. `excel-driven-e2e.spec.ts` — run CreateHappy, CreateNegative, SearchValidation, ErrorCodeValidation
5. `report-generator.ts` — CSV output per test type

### Phase 2: Advanced Scenarios
6. `route-discoverer.ts` — auto-derive from swagger + domain models
7. `prerequisite-resolver.ts` — smart prerequisite chain
8. ComboTest + AddRemoveTest support
9. SubEndpoint support (newer 727xxx+ files with RequestUrl per row)
10. `domain-model-loader.ts` — field shape auto-discovery

### Phase 3: Reporting + CI
11. `html-report.ts` — standalone HTML summary
12. Playwright HTML report integration
13. Azure Pipeline YAML for CI runs
14. Parallel execution (multiple entities at once)

---

## Architecture Decision: Single Spec vs Individual Aggregate Specs

### Option A: Single `excel-driven-e2e.spec.ts` (CHOSEN ✅)
One spec dynamically generates all tests from any Excel file. Uses env vars (`EXCEL=`, `MODULE=`, `AGGREGATE=`) to control scope. All 170 files, 1,100 sheets, ~4,200 tests flow through one entry point.

### Option B: Individual spec per module/aggregate (REJECTED ❌)
Separate `org-module-e2e.spec.ts`, `note-module-e2e.spec.ts`, etc. — each with hardcoded endpoints, SQL tables, and payload builders.

### Why Single Spec Wins

| Factor | Single Spec | Individual per Aggregate |
|---|---|---|
| 170 Excel files | 1 spec handles all | 50+ spec files needed |
| Maintenance | Change parser once, all entities benefit | Fix same bug in 50 files |
| New entity | Drop Excel in `API/`, done | Write new spec, new builder, new SQL map |
| Negative/Search tests | Auto-classified from Excel headers | Must hand-code each assertion |
| Time to cover all 170 | Days (build framework once) | Months (each module is custom) |
| Consistency | Same validation logic everywhere | Each spec may validate differently |
| Onboarding | Learn 1 framework | Learn 50 different spec patterns |

### Coexistence Strategy
Keep existing `org-module-e2e.spec.ts` and `note-module-e2e.spec.ts` for **deep SQL field-level comparison** (they have 200+ lines of hardcoded GET→SQL matching). The single spec covers **breadth** (negative, search, error code tests across all 170 files), while existing specs cover **depth** for critical modules.

---

## Build Time Estimates

### Phase 1: Core Engine (~21–26 hours / 3–4 working days)

| Component | What's Needed | Estimate |
|---|---|---|
| `excel-parser.ts` | Parse sheets by header pattern (10 types), return typed TestSuite | 4–5 hours |
| `variable-resolver.ts` | Tier 1 SQL (10 queries), Tier 2 static generators | 3–4 hours |
| `response-validator.ts` | Status + UserMessage (exact, semicolon-split) + RecordCount | 2 hours |
| `excel-driven-e2e.spec.ts` | Dynamic test generation from parsed sheets, 5 execution modes | 4–5 hours |
| `report-generator.ts` | CSV output per test type (create, negative, search, error, combo) | 2–3 hours |
| `route-discoverer.ts` | Convention-based route derivation + `api_to_table_mapping.json` | 2–3 hours |
| Config files | `module-registry.json`, `suites.json`, `env_config.json` updates | 1–2 hours |
| Integration testing | Run against 3–5 Excel files (Appointment, Location, Organization), fix edge cases | 3–4 hours |

### Phase 2: Advanced Scenarios (+2–3 working days)

| Component | Estimate |
|---|---|
| `prerequisite-resolver.ts` — smart prerequisite chain | 3–4 hours |
| ComboTest + AddRemoveTest support | 3–4 hours |
| SubEndpoint support (newer 727xxx+ files with `RequestUrl` per row) | 2–3 hours |
| `domain-model-loader.ts` — field shape auto-discovery from POST/GET JSON | 3–4 hours |
| Tier 3 + Tier 4 variable resolution | 2–3 hours |
| Edge case testing across 20+ Excel files | 3–4 hours |

### Phase 3: Reporting + CI (+1–2 working days)

| Component | Estimate |
|---|---|
| `html-report.ts` — standalone HTML dashboard with module cards, drill-down, failed test details | 4–5 hours |
| Azure Pipeline YAML for CI runs (shard config, artifact publishing) | 2–3 hours |
| Parallel execution tuning + `test.describe.serial` for happy path dependencies | 2–3 hours |

### Total: ~6–9 working days for full framework

---

## Runtime Estimates (Test Execution Time)

### Per API Call Timing
- Typical happy path POST/PUT: **200–500ms**
- Negative test (validation error): **100–200ms**
- GET search/filter: **200–300ms**
- GET/DELETE error code (invalid key): **100–200ms**
- Auth token fetch: **1–2 seconds** (cached after first call, refreshed every 55 min)
- SQL prerequisite lookup: **100–300ms** per query (10 queries = ~2 sec total)
- Request timeout: **30 seconds** max, 3 retries with 3-second backoff

### Single Excel File (~107 tests, e.g. Appointment)

| Phase | Tests | Avg per test | Time |
|---|---|---|---|
| Variable resolution (SQL lookups) | ~10 queries | 300ms | ~3 sec |
| POST Happy Path (001_TC001) | 8 scenarios | 500ms | ~4 sec |
| POST Negative (001_TC002) | 39 scenarios | 200ms | ~8 sec |
| PUT Happy + Negative (002_TC001 + 002_TC002) | 43 scenarios | 300ms | ~13 sec |
| GET Search (003_TC001) | 17 scenarios | 300ms | ~5 sec |
| Report generation | — | — | ~1 sec |
| **Total** | **107 tests** | | **~35 seconds** |

### Aggregate / Module / Suite / Full Regression

| Scope | Files | Tests | Workers=1 | Workers=4 | Workers=8 |
|---|---|---|---|---|---|
| Single Excel file | 1 | ~107 | ~35 sec | ~35 sec | ~35 sec |
| Single Aggregate (e.g. Location, 4 files) | 4 | ~250 | ~1.5 min | ~45 sec | ~45 sec |
| Single Module (e.g. OrganizationModule, 17 files) | 17 | ~600 | ~5 min | ~2 min | ~1.5 min |
| Suite: `core` (4 modules) | ~50 | ~1,200 | ~15 min | ~5 min | ~3 min |
| Suite: `smoke` (3 modules, MAX_SCENARIOS=2) | ~30 | ~180 | ~2 min | ~1 min | ~45 sec |
| Full Regression (all 45 modules) | 170 | ~4,200 | ~70 min | ~20 min | ~12 min |
| Full Regression (3 CI agents, sharded) | 170 | ~4,200 | — | — | **~7 min** |

### What Slows It Down
- **SQL prerequisite lookups** — first-time resolution ~3–5 sec per file (cached after first file in same worker)
- **POST happy path** — slowest calls (500ms–1s each, server creates records + writes to DB)
- **401 retry** — adds 3–5 sec when token expires mid-run (clears cache, re-authenticates)
- **Timeout retries** — 30s + 3s backoff per retry (rare, happens under server load)

### What's Fast
- **Negative tests** — server rejects quickly, no DB write (100–200ms)
- **GET error codes** — invalid key lookups return immediately (100ms)
- **Search tests** — simple GET with query params, indexed lookups (200–300ms)
- **Cached auth** — token reused for 55 min, no re-auth overhead per request

### Quick Reference Commands

| What you run | Command | Expected Time |
|---|---|---|
| Quick smoke | `SUITE=smoke MAX_SCENARIOS=2 npx playwright test` | ~2 min |
| One entity | `EXCEL=609768_Appointment.xlsx npx playwright test` | ~35 sec |
| One module | `MODULE=OrganizationModule npx playwright test` | ~5 min |
| Core regression | `SUITE=core npx playwright test --workers=4` | ~5 min |
| Full regression | `npx playwright test --workers=4` | ~20 min |
| Full regression (CI) | 3 agents × `--shard=N/3 --workers=4` | ~7 min |
