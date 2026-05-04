# API E2E Testing - Playwright + TypeScript

POST → GET → SQL Server verification for all API modules.

## Current Modules
- **Organization Module** — Organization, Location, StaffMember aggregates (`org-module-e2e.spec.ts`)
- **Note Module** — 9 note types with child table merging (`note-module-e2e.spec.ts`)
- **Generic Module** — Data-driven E2E for any entity using Excel test data (`generic-module-e2e.spec.ts`)

## Setup

```bash
cd tests/api-e2e-testing
npm install
npx playwright install
```

## Usage

```bash
# Run all modules
npx playwright test

# Run specific module
npx playwright test org-module-e2e
npx playwright test note-module-e2e

# Run generic data-driven module for any entity
ENTITY=Person npx playwright test generic-module-e2e
ENTITY=Guardianship npx playwright test generic-module-e2e
ENTITY=IntakeReferral EXCEL=648001_IntakeReferral.xlsx npx playwright test generic-module-e2e

# Specific environment
ENV_NAME=DevF1 npx playwright test
ENV_NAME=F1 npx playwright test

# Skip POST (use existing data from SQL)
SKIP_POST=true npx playwright test

# Skip SQL verification (API-only)
SKIP_SQL=true npx playwright test
```

## Output

Results saved to `output/<Module>_E2E_<timestamp>/`:
- `00_keys.json` - Entity keys used
- `01-03_*.json` - POST payloads and responses
- `04_*.json` - GET responses per endpoint
- `04_get_summary.csv` - GET endpoint status
- `05_sql_verify.csv` - SQL table verification
- `06_get_vs_sql.csv` - Field-level comparison
- `07_gap_analysis.csv` - Full gap analysis
- `07_gap_analysis_report.md` - Markdown report

## Configuration

Edit `env_config.json` to add/modify environments. Each environment needs:
- `BASE_URL` - API base URL
- `AUTH_ENV` - Cognito environment name
- `AUTH_USERNAME` / `AUTH_PASSWORD` - Credentials
- `SQL_SERVER` / `SQL_DATABASE` - SQL Server connection
