# Azure DevOps Pipelines

This folder contains Azure DevOps pipeline YAML configurations for CI/CD automation.

## Available Pipelines

### azure-pipelines.yml
**Main BDD Test Execution Pipeline**

**Features**:
- Multi-environment support (QA, STD-F1, STD-F2, STD-F3, STD-F4)
- Test suite selection (All, Smoke, Organization)
- Browser selection (Chromium, Firefox, WebKit)
- Automated report generation
- Network share publishing
- Email notifications
- HTML dashboard

**Parameters**:
- `xPath`: Network path for report storage
- `Environment`: Target test environment
- `TestSuite`: Test suite to execute
- `Browser`: Browser for test execution

**Triggers**:
- Push to main/develop branches
- Manual execution with parameters
- Scheduled runs (configure as needed)

## Setup Instructions

### 1. Configure Variable Groups in Azure DevOps

Create variable groups for each environment:

**Variable Group: `test-credentials-qa`**
```
BASE_URL_QA = https://qa.example.com
USERNAME_QA = qa_user
PASSWORD_QA = ********
ORGANIZATION_QA = QA Organization
LOCATION_QA = QA Location
STAFF_MEMBER_QA = QA Staff
```

**Variable Group: `test-credentials-std-f1`**
```
BASE_URL_STD_F1 = https://std-f1.example.com
USERNAME_STD_F1 = std_user
PASSWORD_STD_F1 = ********
ORGANIZATION_STD_F1 = STD Organization
LOCATION_STD_F1 = STD Location
STAFF_MEMBER_STD_F1 = STD Staff
```

### 2. Configure Agent Pool

Update the `pool` section in the YAML:
```yaml
pool: 
  name: 'Your-Agent-Pool-Name'
```

### 3. Configure Email Settings

Update SMTP settings in the email notification step:
```yaml
$smtpServer = "your-smtp-server.com"
$smtpFrom = "qa-automation@yourcompany.com"
$smtpTo = "qa-team@yourcompany.com"
```

### 4. Configure Network Share Path

Update the default `xPath` parameter or provide it during manual execution:
```yaml
- name: xPath
  type: string
  default: '\\your-network-share\path'
```

## Running the Pipeline

### Manual Execution
1. Go to Azure DevOps Pipelines
2. Select the pipeline
3. Click "Run pipeline"
4. Choose parameters:
   - Environment (qa, std-f1, etc.)
   - Test Suite (all, smoke, org)
   - Browser (chromium, firefox, webkit)
   - Network path (optional)
5. Click "Run"

### Automated Execution
Pipeline automatically triggers on:
- Push to main or develop branches
- Pull requests to main or develop

## Pipeline Outputs

### Artifacts Published
1. **Dashboard HTML**: Summary report with test metrics
2. **Katalon Report**: Detailed test execution report
3. **Test Results**: Published to Azure DevOps Test Results
4. **Screenshots**: Captured on test failures
5. **Network Share**: Reports copied to shared location

### Email Notification
Sent on manual execution with:
- Test summary
- Build number and link
- Dashboard attachment

## Troubleshooting

### Pipeline Fails at Node Setup
- Verify Node.js version is available on agent
- Check agent has internet access for npm packages

### Tests Fail to Run
- Verify environment variables are set correctly
- Check agent has Playwright dependencies installed
- Ensure browser binaries are accessible

### Reports Not Published
- Verify network share path is accessible from agent
- Check agent service account has write permissions
- Ensure report directory exists

### Email Not Sent
- Verify SMTP server is accessible from agent
- Check SMTP credentials if required
- Ensure recipient email addresses are valid

## Best Practices

1. **Use Variable Groups**: Store credentials securely
2. **Tag Releases**: Use semantic versioning
3. **Monitor Trends**: Review test results regularly
4. **Archive Reports**: Keep historical data for analysis
5. **Optimize Smoke Tests**: Keep under 5 minutes
6. **Parallel Execution**: Consider splitting large test suites
7. **Fail Fast**: Run smoke tests before full regression

## Support

For issues or questions:
- Check Azure DevOps pipeline logs
- Review test execution reports
- Contact QA Automation Team
