# Technology Stack

## Programming Languages
- **TypeScript 5.9.3**: Primary language for type-safe test development
- **JavaScript (ES2021)**: Target compilation for Node.js runtime
- **Gherkin**: BDD feature file syntax for test scenarios

## Core Frameworks and Libraries

### Testing Frameworks
- **@cucumber/cucumber 12.6.0**: BDD test framework for writing executable specifications
- **@playwright/test 1.58.2**: Modern browser automation framework
- **playwright 1.58.2**: Cross-browser automation library

### Reporting
- **multiple-cucumber-html-reporter 3.10.0**: Generates comprehensive HTML test reports with screenshots and metadata

### Build and Development Tools
- **ts-node 10.9.2**: TypeScript execution environment for Node.js
- **typescript 5.9.9**: TypeScript compiler
- **tsconfig-paths 4.2.0**: Path mapping support for TypeScript imports

### Configuration Management
- **dotenv 17.3.1**: Environment variable management
- **dotenv-cli 11.0.0**: CLI tool for loading environment-specific configurations

### Utilities
- **rimraf 6.1.3**: Cross-platform file deletion utility

## TypeScript Configuration
- **Target**: ES2021
- **Module System**: CommonJS
- **Module Resolution**: Node
- **Strict Mode**: Enabled
- **Path Aliases**: `@src/*` maps to `src/*`

## Development Commands

### Test Execution
```bash
npm test                 # Run all BDD tests with default environment
npm run test:bdd         # Same as npm test
npm run test:qa          # Run tests against QA environment
npm run test:std-f1      # Run tests against STD-F1 environment
npm run test:bdd:smoke   # Run smoke tests only (@smoke tag)
npm run test:bdd:org     # Run organization tests only (@organization tag)
```

### Utility Commands
```bash
npm run clean            # Remove previous test reports
```

## Cucumber Configuration
- **Step Definitions**: Auto-loaded from `src/steps/**/*.ts`
- **Hooks**: Auto-loaded from `src/hooks/**/*.ts`
- **Timeout Config**: Loaded from `src/config/cucumber-timeout.ts`
- **Feature Files**: Located in `features/**/*.feature`
- **Report Format**: JSON output to `reports/cucumber-report.json`
- **Console Output**: Progress bar format

## Environment Files
- `.env.example` - Template for environment variables
- `.env.qa` - QA environment configuration
- `.env.std-f1` - STD-F1 environment configuration

## Browser Support
Playwright supports Chromium, Firefox, and WebKit (Safari) browsers with automatic driver management.
