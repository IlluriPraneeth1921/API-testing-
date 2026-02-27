# Test Suites & Configuration Guide

## 📋 Table of Contents
1. [Test Suites Overview](#test-suites-overview)
2. [Cucumber Tags](#cucumber-tags)
3. [Test Suite Configuration](#test-suite-configuration)
4. [CI/CD YAML Configuration](#cicd-yaml-configuration)
5. [Environment Configuration](#environment-configuration)

---

## Test Suites Overview

**Purpose**: Organize and group tests for different execution scenarios (smoke, regression, feature-specific)

### Available Test Suites

| Suite | Command | Purpose | Tags |
|-------|---------|---------|------|
| **All Tests** | `npm test` | Run complete test suite | All scenarios |
| **Smoke Tests** | `npm run test:smoke` | Quick validation of critical paths | `@smoke` |
| **Organization Tests** | `npm run test:org` | Organization management features | `@organization` |
| **QA Environment** | `npm run test:qa` | Run tests on QA environment | All scenarios |
| **STD-F1 Environment** | `npm run test:std-f1` | Run tests on STD-F1 environment | All scenarios |

---

## Cucumber Tags

**Purpose**: Filter and organize test scenarios for selective execution

### Tag Strategy

```gherkin
@smoke @login
Feature: User Authentication
  
  @smoke @critical
  Scenario: Successful login with valid credentials
    Given I login with username "admin" and password "password"
    Then I should see the dashboard
  
  @regression
  Scenario: Login with invalid credentials
    Given I login with username "invalid" and password "wrong"
    Then I should see error message
```

### Common Tag Patterns

| Tag | Purpose | Example |
|-----|---------|---------|
| `@smoke` | Critical path tests | Login, Dashboard load |
| `@regression` | Full regression suite | All test scenarios |
| `@organization` | Feature-specific tests | Organization CRUD operations |
| `@critical` | High-priority tests | Business-critical flows |
| `@wip` | Work in progress | Tests under development |
| `@skip` | Temporarily disabled | Known issues, flaky tests |

### Running Tests by Tags

```bash
# Single tag
cucumber-js --tags "@smoke"

# Multiple tags (AND)
cucumber-js --tags "@smoke and @login"

# Multiple tags (OR)
cucumber-js --tags "@smoke or @critical"

# Exclude tags
cucumber-js --tags "not @skip"

# Complex expressions
cucumber-js --tags "(@smoke or @critical) and not @wip"
```

---

## Test Suite Configuration

### cucumber.js Configuration

```javascript
module.exports = {
  default: {
    // Load configuration and hooks first
    require: [
      "src/config/cucumber-timeout.ts",
      "src/hooks/**/*.ts",
      "src/steps/**/*.ts"
    ],
    
    // Enable TypeScript support
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    
    // Feature file locations
    paths: ["features/**/*.feature"],
    
    // Report formats
    format: [
      "progress-bar",                           // Console output
      "json:reports/cucumber-report.json"       // JSON for custom reports
    ],
    
    // Disable publish to Cucumber Cloud
    publishQuiet: true
  }
};
```

### Custom Test Suite Profiles

Create multiple profiles for different test suites:

```javascript
module.exports = {
  // Default profile
  default: {
    require: ["src/config/**/*.ts", "src/hooks/**/*.ts", "src/steps/**/*.ts"],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/**/*.feature"],
    format: ["progress-bar", "json:reports/cucumber-report.json"],
    publishQuiet: true
  },
  
  // Smoke test profile
  smoke: {
    require: ["src/config/**/*.ts", "src/hooks/**/*.ts", "src/steps/**/*.ts"],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/**/*.feature"],
    format: ["progress-bar", "json:reports/smoke-report.json"],
    tags: "@smoke",
    publishQuiet: true
  },
  
  // Regression profile
  regression: {
    require: ["src/config/**/*.ts", "src/hooks/**/*.ts", "src/steps/**/*.ts"],
    requireModule: ["ts-node/register", "tsconfig-paths/register"],
    paths: ["features/**/*.feature"],
    format: ["progress-bar", "json:reports/regression-report.json"],
    tags: "not @skip",
    parallel: 2,  // Run 2 scenarios in parallel
    publishQuiet: true
  }
};
```

**Usage**:
```bash
cucumber-js --profile smoke
cucumber-js --profile regression
```

---

## CI/CD YAML Configuration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: BDD Test Automation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Test Environment'
        required: true
        default: 'qa'
        type: choice
        options:
          - qa
          - std-f1
      suite:
        description: 'Test Suite'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - smoke
          - org

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run smoke tests
        if: github.event.inputs.suite == 'smoke' || github.event_name == 'pull_request'
        run: npm run test:smoke
        env:
          BASE_URL: ${{ secrets.QA_BASE_URL }}
          USERNAME: ${{ secrets.QA_USERNAME }}
          PASSWORD: ${{ secrets.QA_PASSWORD }}
      
      - name: Run all tests on QA
        if: github.event.inputs.environment == 'qa' && github.event.inputs.suite == 'all'
        run: npm run test:qa
        env:
          BASE_URL: ${{ secrets.QA_BASE_URL }}
          USERNAME: ${{ secrets.QA_USERNAME }}
          PASSWORD: ${{ secrets.QA_PASSWORD }}
      
      - name: Run all tests on STD-F1
        if: github.event.inputs.environment == 'std-f1' && github.event.inputs.suite == 'all'
        run: npm run test:std-f1
        env:
          BASE_URL: ${{ secrets.STD_F1_BASE_URL }}
          USERNAME: ${{ secrets.STD_F1_USERNAME }}
          PASSWORD: ${{ secrets.STD_F1_PASSWORD }}
      
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports-${{ matrix.node-version }}
          path: reports/
          retention-days: 30
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots-${{ matrix.node-version }}
          path: reports/**/screenshots/
          retention-days: 7
      
      - name: Publish test results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: reports/cucumber-report.json
          check_name: Test Results - Node ${{ matrix.node-version }}
```

### Azure DevOps Pipeline

**File**: `azure-pipelines.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

schedules:
  - cron: "0 2 * * *"
    displayName: Daily 2 AM run
    branches:
      include:
        - main
    always: true

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: test-credentials-qa
  - group: test-credentials-std-f1

stages:
  - stage: Smoke_Tests
    displayName: 'Smoke Tests'
    jobs:
      - job: Smoke
        displayName: 'Run Smoke Tests'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'
          
          - script: npm ci
            displayName: 'Install dependencies'
          
          - script: npx playwright install --with-deps chromium
            displayName: 'Install Playwright browsers'
          
          - script: npm run test:smoke
            displayName: 'Run smoke tests'
            env:
              BASE_URL: $(QA_BASE_URL)
              USERNAME: $(QA_USERNAME)
              PASSWORD: $(QA_PASSWORD)
          
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'reports/cucumber-report.json'
              testRunTitle: 'Smoke Test Results'
          
          - task: PublishBuildArtifacts@1
            condition: always()
            inputs:
              pathToPublish: 'reports'
              artifactName: 'smoke-test-reports'

  - stage: Regression_Tests
    displayName: 'Regression Tests'
    dependsOn: Smoke_Tests
    condition: succeeded()
    jobs:
      - job: QA_Environment
        displayName: 'QA Environment Tests'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          
          - script: npm ci
          
          - script: npx playwright install --with-deps chromium
          
          - script: npm run test:qa
            env:
              BASE_URL: $(QA_BASE_URL)
              USERNAME: $(QA_USERNAME)
              PASSWORD: $(QA_PASSWORD)
          
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'reports/cucumber-report.json'
              testRunTitle: 'QA Regression Results'
          
          - task: PublishBuildArtifacts@1
            condition: always()
            inputs:
              pathToPublish: 'reports'
              artifactName: 'qa-test-reports'
      
      - job: STD_F1_Environment
        displayName: 'STD-F1 Environment Tests'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          
          - script: npm ci
          
          - script: npx playwright install --with-deps chromium
          
          - script: npm run test:std-f1
            env:
              BASE_URL: $(STD_F1_BASE_URL)
              USERNAME: $(STD_F1_USERNAME)
              PASSWORD: $(STD_F1_PASSWORD)
          
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'reports/cucumber-report.json'
              testRunTitle: 'STD-F1 Regression Results'
          
          - task: PublishBuildArtifacts@1
            condition: always()
            inputs:
              pathToPublish: 'reports'
              artifactName: 'std-f1-test-reports'
```

### Jenkins Pipeline

**File**: `Jenkinsfile`

```groovy
pipeline {
    agent any
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['qa', 'std-f1'], description: 'Test Environment')
        choice(name: 'SUITE', choices: ['all', 'smoke', 'org'], description: 'Test Suite')
    }
    
    environment {
        NODE_VERSION = '20.x'
    }
    
    stages {
        stage('Setup') {
            steps {
                nodejs(nodeJSInstallationName: "${NODE_VERSION}") {
                    sh 'npm ci'
                    sh 'npx playwright install --with-deps chromium'
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    def testCommand = ''
                    
                    if (params.SUITE == 'smoke') {
                        testCommand = 'npm run test:smoke'
                    } else if (params.SUITE == 'org') {
                        testCommand = 'npm run test:org'
                    } else if (params.ENVIRONMENT == 'qa') {
                        testCommand = 'npm run test:qa'
                    } else {
                        testCommand = 'npm run test:std-f1'
                    }
                    
                    nodejs(nodeJSInstallationName: "${NODE_VERSION}") {
                        withCredentials([
                            string(credentialsId: "${params.ENVIRONMENT}-base-url", variable: 'BASE_URL'),
                            string(credentialsId: "${params.ENVIRONMENT}-username", variable: 'USERNAME'),
                            string(credentialsId: "${params.ENVIRONMENT}-password", variable: 'PASSWORD')
                        ]) {
                            sh testCommand
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'reports',
                reportFiles: '**/katalon-report.html',
                reportName: 'Test Report',
                keepAll: true
            ])
            
            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        }
        
        failure {
            archiveArtifacts artifacts: 'reports/**/screenshots/**/*', allowEmptyArchive: true
        }
    }
}
```

---

## Environment Configuration

### .env Files Structure

**Purpose**: Manage environment-specific configurations

#### .env.qa
```env
# QA Environment Configuration
BASE_URL=https://qa.example.com
USERNAME=qa_user
PASSWORD=qa_password
ORGANIZATION=QA Organization
LOCATION=QA Location
STAFF_MEMBER=QA Staff

# Browser Configuration
HEADLESS=true
BROWSER=chromium
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080

# Timeouts
DEFAULT_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000
```

#### .env.std-f1
```env
# STD-F1 Environment Configuration
BASE_URL=https://std-f1.example.com
USERNAME=std_user
PASSWORD=std_password
ORGANIZATION=STD Organization
LOCATION=STD Location
STAFF_MEMBER=STD Staff

# Browser Configuration
HEADLESS=true
BROWSER=chromium
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080

# Timeouts
DEFAULT_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000
```

#### .env.example
```env
# Example Environment Configuration
# Copy this file to .env.qa or .env.std-f1 and update values

BASE_URL=https://your-app-url.com
USERNAME=your_username
PASSWORD=your_password
ORGANIZATION=Your Organization
LOCATION=Your Location
STAFF_MEMBER=Your Staff Member

HEADLESS=true
BROWSER=chromium
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080

DEFAULT_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000
```

---

## Summary

### Test Suite Benefits
- ✅ **Organized execution**: Run specific test groups
- ✅ **Faster feedback**: Smoke tests for quick validation
- ✅ **Flexible scheduling**: Different suites for different triggers
- ✅ **Environment isolation**: Separate configs per environment
- ✅ **CI/CD integration**: Automated test execution
- ✅ **Parallel execution**: Run tests concurrently

### Best Practices
1. **Tag consistently**: Use standard tag naming conventions
2. **Keep smoke tests fast**: < 5 minutes execution time
3. **Separate environments**: Never mix QA and production configs
4. **Secure credentials**: Use CI/CD secrets, never commit passwords
5. **Archive reports**: Keep test results for trend analysis
6. **Run smoke on PR**: Quick validation before merge
7. **Schedule regression**: Daily or nightly full test runs
