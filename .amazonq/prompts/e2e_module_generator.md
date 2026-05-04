# E2E Module Verification Script Generator

You are generating a Python E2E verification script that follows the **exact architecture** of the existing `org_module_e2e_verify.py` and `note_module_e2e_verify.py` scripts in `SnowflakeSilverTable comp/`.

---

## What This Prompt Does

Given a module's API endpoints, SQL tables, Snowflake tables, and POST payloads, generate a complete `{module}_module_e2e_verify.py` script that:

1. **POSTs** entities via API (parent + child entities)
2. **GETs** all endpoints and saves responses
3. **Verifies** data in SQL Server (field-level comparison: GET vs SQL)
4. **Verifies** data in Snowflake Landing Table + Dynamic Tables
5. **Compares** SQL vs Snowflake field-by-field
6. **Domain 4-Way Verification** — checks every Domain model field exists in GET API, SQL, and Snowflake
7. **Generates** CSV reports, Markdown gap analysis, and Excel workbook

---

## Required Inputs (User Must Provide)

### 1. Module Name
```
Module: {MODULE_NAME}
SQL Schema: {SQL_SCHEMA}  (e.g., IncidentManagementModule, CaseModule, NoteModule)
Snowflake Schema: {SNOW_SCHEMA}  (e.g., INCIDENT_MANAGEMENT_MODULE)
```

### 2. API Endpoints
```
POST endpoints:
  - /api/v1/{module-path}/entity  (creates parent)
  - /api/v1/{module-path}/entity/{key}/child  (creates child, if any)
  - PUT /api/v1/{module-path}/entity/{key}/sub-entity  (updates, if any)

GET endpoints:
  - /api/v1/{module-path}/entity/{key}  (parent)
  - /api/v1/{module-path}/entity/{key}/children  (child list, if any)
```

### 3. POST Payload JSON
Provide either:
- A `.txt` template file (like `OrganizationJson.txt`, `StaffJson.txt`)
- Raw JSON from Swagger/Postman
- Inline JSON in the chat

### 4. SQL Tables to Verify
```
| Label | Table | Key Column | FK Column (if child) |
|-------|-------|------------|---------------------|
| Parent | EntityName | EntityNameKey | - |
| Child1 | EntityChild | EntityChildKey | EntityNameKey |
```
Or say: **"discover from schema"**

### 5. Snowflake Dynamic Tables
```
| Label | Table | Key Column |
|-------|-------|------------|
| Parent | ENTITY_NAME | ENTITY_NAME_KEY |
| Child1 | ENTITY_CHILD | ENTITY_NAME_KEY |
```
Or say: **"discover from Snowflake"**

### 6. Prerequisites (Foreign Keys)
List which existing keys the POST payload needs:
```
- caseKey (from CaseModule.Case)
- personKey (from PersonModule.Person)
- locationKey (from OrganizationModule.Location)
- staffMemberKey (from OrganizationModule.StaffMember)
- programKey (from ProgramModule.Program)
- guardianshipKey (from GuardianshipModule.Guardianship)
- protectiveServicesReportKey (from ProtectiveServicesModule.ProtectiveServicesReport)
```

### 7. Domain Model JSON Files (for 4-Way Verification)
Provide the path to the domain model JSON folder:
```
Domain folder: SnowflakeSilverTable comp/{ModuleName}/
```
This folder should contain `{Entity}_FullAggregate.json` files (e.g., `Person_FullAggregate.json`).
These are the domain model definitions that define the **source of truth** for all fields an entity should have.

Also provide the **domain entity mapping** — which domain file maps to which root entity and children:
```
Domain entity map:
  {Entity}_FullAggregate.json:
    root: (GET_label, SQL_table, SNOW_table, key_variable)
    children:
      {childArrayName}: (GET_label, SQL_table, SNOW_table)
```
Or say: **"discover from domain folder"** and the script will auto-detect.

Example (from OrganizationModule):
```python
'Organization_FullAggregate.json': {
    'root': ('Org', 'Organization', 'ORGANIZATION', org_key),
    'children': {
        'addresses':        ('Org_Addr',    'OrganizationAddresses',       'ORGANIZATION_ADDRESSES'),
        'phones':           ('Org_Phone',   'OrganizationPhones',          'ORGANIZATION_PHONES'),
        'emailAddresses':   ('Org_Email',   'OrganizationEmailAddresses',  'ORGANIZATION_EMAIL_ADDRESSES'),
        'identifiers':      ('Org_Ident',   'OrganizationIdentifiers',     'ORGANIZATION_IDENTIFIERS'),
        'credentials':      ('Org_Cred',    'OrganizationCredentials',     'ORGANIZATION_CREDENTIALS'),
        'supportedPrograms':('Org_Prog',    'OrganizationSupportedPrograms','ORGANIZATION_SUPPORTED_PROGRAMS'),
    },
}
```

---

## Architecture Rules (MUST Follow)

### File Location
- Script goes in: `SnowflakeSilverTable comp/{module}_module_e2e_verify.py`
- Payload templates go in: `SnowflakeSilverTable comp/{Entity}Json.txt`

### Config & Auth (REUSE EXACTLY)
- Load env from `env_config.json` using `load_env_config()` pattern
- Token via Node.js `GetAccessToken.js` at `C:\Whitelisted\playwright-qa\Interrai Scripts\access-tokken\GetAccessToken.js`
- Cookie-based auth via `SaveUserContext` POST (if module requires it — org module uses it, note module does not)
- SQL Server via `pyodbc` with `ODBC Driver 17 for SQL Server`, Trusted_Connection
- Snowflake via `snowflake.connector` with creds from `env_config.json` or hardcoded env-to-db map

### CLI Arguments (STANDARD SET)
```python
p.add_argument('--env', type=str, default=None)
p.add_argument('--skip-post', action='store_true')
p.add_argument('--skip-sql', action='store_true')
p.add_argument('--post-user', type=str, default=None)
p.add_argument('--post-password', type=str, default=None)
p.add_argument('--parallel', type=int, default=6)
p.add_argument('--wait-snow', type=int, nargs='?', const=15, default=0)
p.add_argument('--skip-domain', action='store_true', help='Skip Domain 4-Way verification')
# Add --{entity}-key for each parent entity (e.g., --case-key, --incident-key)
```

### Script Flow (NUMBERED STEPS)
```
[0] Fetch reference keys from SQL (prerequisites)
[1] POST parent entity → save payload + response JSON
[1b..1n] POST/PUT child entities → save each
[2] POST second parent (if applicable) → save
[2b..2n] POST/PUT its children → save
[N] GET all parent + child endpoints (parallel ThreadPoolExecutor)
[N+1] SQL Verification — SELECT * from each table, count rows
[N+2] GET vs SQL field-level comparison (flatten API → match SQL columns)
[N+3] Snowflake Landing Table check (LANDING_MODULE.BLUE_COMPASS_AGGREGATE_SNAPSHOT_EVENT)
[N+4] Snowflake Dynamic Table row count verification
[N+5] SQL vs Snowflake field-level comparison
[N+6] Domain Model 4-Way Verification (Domain ↔ GET API ↔ SQL ↔ Snowflake)
[N+7] Reports: CSV + Markdown + Excel
```

### Field Comparison Logic (REUSE)
- `flatten(obj, pfx="")` — recursively flatten nested JSON to dot-notation paths
- `_normalize_for_cmp(a, s)` — normalize dates (ISO vs US format), timestamps, case
- `_find_sql_col(leaf, ap, lc, lc_nound)` — multi-strategy column matching:
  1. Direct leaf match
  2. PascalCase leaf
  3. Collapsed path (e.g., `externalStatus.code` → `ExternalStatusIdentifier`)
  4. Code→Identifier, Name→DisplayName aliases
  5. PhysicalAddress prefix variants
  6. Entity-specific prefix variants
- `cmp_api_sql(api_flat, sql_data, entity)` — compare all API fields against SQL row
- Best-row matching: score each SQL row against API item, pick highest match

### Snowflake Column Matching
- PascalCase → SNAKE_CASE conversion
- `Identifier` → `CODE`, `DisplayName` → `NAME` aliases
- Explicit alias map for known divergences (EMAIL_ADDRESS, PHONE_NUMBER, etc.)

### Domain 4-Way Verification (REUSE from org_module_e2e_verify.py [5d])

This step loads `{Entity}_FullAggregate.json` domain model files and checks whether each domain field exists in:
1. **Domain** — the field is defined in the domain JSON (always YES, since we iterate domain fields)
2. **GET API** — the field appears in the GET response
3. **SQL Server** — a matching column exists in the SQL table (via INFORMATION_SCHEMA.COLUMNS)
4. **Snowflake** — a matching column exists in the Snowflake dynamic table (via DESCRIBE TABLE)

#### Domain Folder Location
```
DOMAIN_DIR = os.path.join(SCRIPT_DIR, '{ModuleName}')
```
Fallback: `os.path.join(SCRIPT_DIR, 'AllModules_Domain_*', '{ModuleName}')` if the module folder is nested.

#### Domain Entity Map Config
Define a `domain_entity_map` dict that maps each `_FullAggregate.json` file to:
- `root`: `(GET_label, SQL_table, SNOW_table, key_variable)` — the parent entity
- `children`: `{api_array_name: (GET_label, SQL_table, SNOW_table)}` — child arrays in the domain JSON

#### Key Functions (REUSE EXACTLY from org_module_e2e_verify.py)

```python
def flatten_domain(obj, pfx=""):
    """Flatten domain JSON to list of dot-notation field paths.
    Unlike flatten(), this returns paths only (no values) and
    collapses arrays to [] notation (e.g., addresses[].cityName)."""
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{pfx}.{k}" if pfx else k
            if isinstance(v, dict):
                if v: out.extend(flatten_domain(v, p))
            elif isinstance(v, list):
                if v: out.extend(flatten_domain(v[0], f"{p}[]"))
            else:
                out.append(p)
    return out
```

```python
def match_sql_col(domain_field, sql_cols_set):
    """Match a domain field path to a SQL column name.
    Strategies:
    1. Collapsed PascalCase (e.g., physicalAddress.cityName → PhysicalAddressCityName)
    2. code→Identifier, name→DisplayName aliases
    3. PhysicalAddress/Phone/EffectiveDateRange prefix variants
    4. Leaf-only match
    5. Entity-specific prefixes (NotificationPreference, StaffMemberName, etc.)
    """
```

```python
def match_snow_col(domain_field, snow_cols_set):
    """Match a domain field path to a Snowflake column name.
    Strategies:
    1. PascalCase → SNAKE_CASE conversion
    2. Strip PhysicalAddress_ prefix
    3. _IDENTIFIER → _CODE, _DISPLAY_NAME → _NAME aliases
    4. Leaf-only SNAKE_CASE match
    5. Suffix match against all snow columns
    6. Entity-specific prefixes (NOTIFICATION_PREFERENCE_, STAFF_MEMBER_NAME_, EMPLOYMENT_PROFILE_)
    """
```

```python
def match_api_field(domain_field, api_keys_set):
    """Check if a domain field appears in the flattened GET API response keys.
    Strategies:
    1. Exact leaf match in any API key
    2. Last 2 parts tail match
    3. Last 3 parts tail match
    """
```

#### SQL & Snowflake Column Caching
Fetch all columns upfront for performance:
```python
# SQL: fetch all columns for the module schema
sql_cols_cache = {}  # {table_name: set(column_names)}
cur.execute("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = '{SQL_SCHEMA}' ORDER BY TABLE_NAME, ORDINAL_POSITION")
for row in cur.fetchall():
    sql_cols_cache.setdefault(row[0], set()).add(row[1])

# Snowflake: fetch all columns for the module schema
snow_cols_cache = {}  # {table_name: set(column_names)}
scur.execute('SHOW TABLES IN SCHEMA {SNOW_SCHEMA}')
for st in [r[1] for r in scur.fetchall()]:
    scur.execute(f'DESCRIBE TABLE {SNOW_SCHEMA}."{st}"')
    snow_cols_cache[st] = set(r[0] for r in scur.fetchall())
```

#### API Fields Cache
```python
# Build from GET responses already fetched
api_fields_cache = {}  # {GET_label: set(flattened_api_keys)}
for label, data in gets.items():
    if data:
        api_fields_cache[label] = set(flatten(data).keys())
```

#### Output
For each domain field, produce a row:
```python
{
    'Entity': entity_name,       # e.g., 'Person', 'Organization'
    'Section': section,          # 'Root' or child array name (e.g., 'addresses')
    'Domain_Field': df,          # dot-notation path from domain JSON
    'In_GET_API': 'YES'/'NO',   # found in GET API response
    'In_SQL': 'YES'/'NO',       # matching SQL column found
    'SQL_Column': col_name,      # actual SQL column name matched (or '')
    'In_Snowflake': 'YES'/'NO', # matching Snowflake column found
    'Snow_Column': col_name,     # actual Snowflake column name matched (or '')
}
```

#### Console Output
```
[5d] Domain Model Verification (Domain <-> GET API <-> SQL <-> Snowflake)...
  Person                         Domain=45  API=38  SQL=42  Snow=40
  TOTAL                          Domain=45  API=38  SQL=42  Snow=40
```

### Report Outputs
```
{Module}_E2E_{timestamp}/
├── 00_keys.json                    # All entity keys created
├── 01_{entity}_payload.json        # POST payloads
├── 01_{entity}_response.json       # POST responses
├── 0N_{label}.json                 # GET responses (one per endpoint)
├── 0N_get_summary.csv              # GET endpoint status
├── 0N_sql_verify.csv               # SQL table row counts
├── 0N_landing_verify.csv           # Snowflake landing table check
├── 0N_snowflake_verify.csv         # Snowflake dynamic table check
├── 0N_get_vs_sql.csv               # Field-level GET vs SQL comparison
├── 0N_sql_vs_snowflake.csv         # Field-level SQL vs Snowflake comparison
├── 0N_domain_4way.csv              # Domain 4-way verification (Domain ↔ API ↔ SQL ↔ Snowflake)
├── 0N_gap_analysis.csv             # Combined gap analysis (includes domain gaps)
├── 0N_gap_analysis_report.md       # Markdown report
└── {Module}_E2E_{env}_{ts}.xlsx    # Excel workbook with all sheets
```

### Excel Workbook Sheets
1. **Summary** — Per-entity POST/GET/SQL status + field match counts
2. **Entity Summary** — Match/Mismatch/NoCol/NoRow per entity
3. **GET Endpoints** — Endpoint status + item counts
4. **SQL Verify** — Table existence + row counts
5. **Snowflake** — Landing + Dynamic table verification
6. **GET vs SQL** — Full field comparison with color coding
7. **Gaps** — Only mismatches and missing columns
8. **SQL vs Snowflake** — Field-level SQL↔Snowflake comparison
9. **Domain 4-Way** — Per-field: Domain_Field | In_GET_API | In_SQL | SQL_Column | In_Snowflake | Snow_Column
   - Color coding: YES=green, NO=red for In_GET_API, In_SQL, In_Snowflake columns
   - Auto-filter enabled on all columns
   - Column widths: Entity=20, Section=20, Domain_Field=50, In_*=12, SQL/Snow_Column=40
10. **Bugs** — Auto-detected discrepancies (POST vs SQL vs GET)

### Excel Styling (MATCH EXISTING)
```python
hf = Font(bold=True, color="FFFFFF", size=11)
hfill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")  # Header
yf = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")     # YES/PASS/FOUND
nf = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")     # NO/FAIL
wf = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")     # WARNING/NO_SQL_COL
```

---

## Dependencies
```
pyodbc
snowflake-connector-python
pandas
openpyxl
requests
```

---

## Quickstart Usage

Minimum input to generate a script:

```
@e2e_module_generator

Generate E2E for Incident Management Module:
- Module: Incident Management Module
- SQL Schema: IncidentManagementModule
- Snowflake Schema: INCIDENT_MANAGEMENT_MODULE
- POST endpoint: /api/v1/incident-management-module/incident-report
- GET endpoint: /api/v1/incident-management-module/incident-report/{key}
- Payload: @IncidentReportJson.txt
- Prerequisites: caseKey, locationKey, staffMemberKey, programKey
- SQL tables: discover from schema
- Snowflake tables: discover from Snowflake
- Domain folder: SnowflakeSilverTable comp/IncidentManagementModule/
- Domain map: discover from domain folder
```

---

## Advanced Usage

```
@e2e_module_generator

Generate E2E for Case Module:
- Module: Case Module
- SQL Schema: CaseModule
- Snowflake Schema: CASE_MODULE
- Entities:
  1. Case (parent)
     - POST: /api/v1/case-module/case
     - GET: /api/v1/case-module/case/{caseKey}
     - Children:
       - GET /api/v1/case-module/case/{key}/assignments
       - GET /api/v1/case-module/case/{key}/programs
       - POST /api/v1/case-module/case/{key}/assignment
  2. CaseNote (child of Case)
     - POST: /api/v1/case-module/case-note
     - GET: /api/v1/case-module/case-note/{caseNoteKey}
- Payload: @CaseJson.txt
- Prerequisites: personKey, locationKey, staffMemberKey, programKey
- SQL tables:
  | Label | Table | Key Column |
  |-------|-------|------------|
  | Case | Case | CaseKey |
  | CaseAssignment | CaseAssignment | CaseKey |
  | CaseProgram | CasePrograms | CaseKey |
- Snowflake tables:
  | Label | Table | Key Column |
  |-------|-------|------------|
  | Case | CASE | CASE_KEY |
  | CaseAssignment | CASE_ASSIGNMENTS | CASE_KEY |
- Domain folder: SnowflakeSilverTable comp/CaseModule/
- Domain map:
  Case_FullAggregate.json:
    root: (Case, Case, CASE, case_key)
    children:
      assignments: (Case_Assign, CaseAssignment, CASE_ASSIGNMENTS)
      programs: (Case_Prog, CasePrograms, CASE_PROGRAMS)
```

---

## What Gets Generated

The script will be a single Python file (`{module}_module_e2e_verify.py`) that:

### CLI Arguments (Domain-related)
```python
p.add_argument('--skip-domain', action='store_true', help='Skip Domain 4-Way verification')
```

### Runtime:

```bash
# Full E2E run (POST + GET + SQL + Snowflake + Reports)
python {module}_module_e2e_verify.py --env F1

# Skip POST, re-verify existing entity
python {module}_module_e2e_verify.py --env F1 --skip-post --{entity}-key <guid>

# Skip SQL/Snowflake (API-only verification)
python {module}_module_e2e_verify.py --env F1 --skip-sql

# Use different user for POST (write permissions)
python {module}_module_e2e_verify.py --env F1 --post-user Admin --post-password Pass123

# Wait for Snowflake replication before checking
python {module}_module_e2e_verify.py --env F1 --wait-snow 15

# Skip Domain 4-Way verification
python {module}_module_e2e_verify.py --env F1 --skip-domain
```

---

## Reference Scripts
- `SnowflakeSilverTable comp/org_module_e2e_verify.py` — **Primary reference for Domain 4-Way** (see [5d] section). Full pattern with Org/Location/Staff, Snowflake 3-way, Domain 4-way, Bug detection
- `SnowflakeSilverTable comp/note_module_e2e_verify.py` — Simpler pattern with multiple note types, CaseNote parent verification, child table merging (no Domain 4-way)
- `SnowflakeSilverTable comp/incident_module_e2e_verify.py` — Incident pattern with IncidentReport + IncidentEvent + IncidentType
- `SnowflakeSilverTable comp/OrganizationModule/` — Example domain JSON folder with `*_FullAggregate.json` files
- `SnowflakeSilverTable comp/env_config.json` — Environment configuration
- `SnowflakeSilverTable comp/E2E_Module_Input_Requirements.md` — Input requirements doc
