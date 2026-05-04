# Katalon to Playwright Migration

## Introduction

This project migrates the Carity application's existing Katalon/Groovy test automation
suite to Playwright/TypeScript with Cucumber BDD. The Carity platform is a healthcare
case management system used across multiple US states (ME, MN, MO, Standard, TX, WI).

The migration targets the **Standard WebApp Regression** suite first, starting with
the Bulk Assignments module.

---

## Repository Structure

```
katalon-to-playwright/
├── katalon_testExecution_17thApril/    ← Original Katalon source (reference only)
│   └── katalon-up/FEIAutomation/
│       ├── Scripts/WebApp/Carity/      ← Groovy test scripts
│       ├── Keywords/com/WebApp/        ← Custom keyword classes
│       ├── Object Repository/          ← Parameterized XPath test objects
│       └── Profiles/                   ← Environment configs (80+ profiles)
│
└── katalon-to-playwright/
    └── testExecution/             ← Playwright framework (active development)
        ├── features/                   ← Cucumber feature files
        ├── src/                        ← TypeScript source
        │   ├── config/env.ts           ← Environment config & Waits
        │   ├── locators/               ← Centralized locator registry
        │   ├── pages/                  ← Page Object Model
        │   ├── steps/                  ← Cucumber step definitions
        │   └── data/                   ← Per-TC test data
        ├── KATALON_MIGRATION_GUIDE.md  ← Migration process & mapping tables
        ├── RULES.md                    ← Coding standards
        ├── AUTOMATION_PROMPT.md        ← Prompt template for new TCs
        └── VERIFICATION_CHECKLIST.md  ← Post-migration quality checklist
```

---

## Migration Status

| Module | TCs Migrated | Status |
|---|---|---|
| Bulk Assignments | 10 | ✅ Complete |
| Queries | 0 | 🔜 Next |
| Person | 0 | Planned |
| Location Module | 0 | Planned |
| Organization | 0 | Planned |
| Staff Module | 0 | Planned |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
cd "katalon-to-playwright/testExecution"

# Install dependencies
npm install

# Run smoke test
npm run test:smoke

# Run Bulk Assignments
npx cucumber-js --tags @bulk-assignment

# Run specific TC
npx cucumber-js --tags @TC556255

# TypeScript compile check
npx tsc --noEmit
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your environment values:

```env
BASE_URL=https://your-carity-env.com/
APP_USERNAME=your.username
PASSWORD=YourPassword
ORGANIZATION=Quantum Services
LOCATION=Quantum Services Medical Equipment
STAFF_MEMBER=Self
```

---

## How to Migrate a New Module

1. Read `KATALON_MIGRATION_GUIDE.md` — full process, mapping tables, rules
2. Copy the prompt from Section 6 of that guide
3. Fill in the module name and TC list
4. Paste into Amazon Q chat
5. Run the verification checklist after

---

## Key Documents

| Document | Location | Purpose |
|---|---|---|
| Migration Guide | `testExecution/KATALON_MIGRATION_GUIDE.md` | Full migration process, mapping tables, rules, prompt |
| Coding Rules | `testExecution/RULES.md` | All framework coding standards |
| Automation Prompt | `testExecution/AUTOMATION_PROMPT.md` | Prompt template for new TCs |
| Verification Checklist | `testExecution/VERIFICATION_CHECKLIST.md` | Post-migration quality checks |

