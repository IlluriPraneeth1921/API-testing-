# Test Suites

This folder contains organized test suite definitions for different testing scenarios.

## Available Test Suites

### 1. Smoke Test Suite (`smoke.feature`)
**Purpose**: Quick validation of critical functionality
**Execution Time**: ~5 minutes
**When to Run**: 
- Before every deployment
- On every pull request
- After critical bug fixes

**Scenarios Included**:
- User login
- Dashboard access
- Administration tab access

**Run Command**:
```bash
npm run test:smoke
```

### 2. Regression Test Suite (`regression.feature`)
**Purpose**: Complete test coverage of all features
**Execution Time**: ~30-60 minutes
**When to Run**:
- Nightly builds
- Before major releases
- Weekly scheduled runs

**Scenarios Included**:
- Complete login flow
- Administration sections
- Contact form operations
- Query execution
- Organization management

**Run Command**:
```bash
npm test
```

## Test Suite Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `@smoke` | Critical path tests | Login, Dashboard |
| `@regression` | Full test coverage | All scenarios |
| `@critical` | High priority tests | Core business flows |
| `@login` | Login related tests | Authentication |
| `@administration` | Admin features | Admin panel tests |
| `@organization` | Organization CRUD | Org management |
| `@contact-form` | Contact form tests | Form operations |
| `@queries` | Query execution tests | Query features |

## Creating New Test Suites

1. Create a new `.feature` file in this folder
2. Add appropriate tags
3. Define scenarios
4. Update this README
5. Add npm script in `package.json` if needed

## Best Practices

- Keep smoke tests under 5 minutes
- Tag all scenarios appropriately
- Use descriptive scenario names
- Group related scenarios in same feature file
- Document execution time expectations
