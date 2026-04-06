/**
 * Locator Verification Script
 * 
 * This script verifies:
 * 1. No duplicate locators between common.locators.ts and other locator files
 * 2. Page Objects use centralized locators (not hardcoded selectors)
 * 3. All locator imports are from @src/locators
 * 
 * Run: npx ts-node -r tsconfig-paths/register src/tools/verify-locators.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

interface VerificationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Common selector patterns that should be in CommonLocators
const COMMON_PATTERNS = [
  // Angular Material components
  /mat-table/,
  /mat-row/,
  /mat-cell/,
  /mat-select/,
  /mat-option/,
  /mat-checkbox/,
  /mat-radio/,
  /mat-dialog/,
  /mat-snack/,
  /mat-spinner/,
  /mat-progress/,
  // Common buttons
  /button:has-text\('Continue'\)/,
  /button:has-text\('Cancel'\)/,
  /button:has-text\('Save'\)/,
  /button:has-text\('Submit'\)/,
  // Pagination
  /aria-label.*First page/,
  /aria-label.*Next page/,
  /aria-label.*Previous page/,
  /aria-label.*Last page/,
  // Roles
  /\[role="button"\]/,
  /\[role="dialog"\]/,
  /\[role="grid"\]/,
];

// Hardcoded selector patterns that should use locator files
const HARDCODED_PATTERNS = [
  // Direct selectors in page objects
  /this\.page\.locator\(['"`][^'"`]*['"`]\)/g,
  // Common Angular Material selectors
  /['"`]mat-table/,
  /['"`]mat-row/,
  /['"`]mat-option/,
  /['"`]\[role=/,
  /['"`]\[aria-label=/,
  /['"`]\.mat-/,
  /['"`]button:has-text/,
  /['"`]span:text-is/,
  /['"`]h2:text-is/,
];

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function getLocatorFiles(locatorsDir: string): string[] {
  return fs.readdirSync(locatorsDir)
    .filter(f => f.endsWith('.locators.ts') && f !== 'index.ts')
    .map(f => path.join(locatorsDir, f));
}

function getPageObjectFiles(pagesDir: string): string[] {
  return fs.readdirSync(pagesDir)
    .filter(f => f.endsWith('.ts'))
    .map(f => path.join(pagesDir, f));
}

function extractLocatorValues(content: string): Map<string, string> {
  const locators = new Map<string, string>();
  
  // Match patterns like: key: 'value', or key: "value",
  const regex = /(\w+):\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    locators.set(match[1], match[2]);
  }
  
  return locators;
}

function checkDuplicateLocators(locatorsDir: string): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };
  
  console.log(`\n${colors.blue}═══ Check 1: Duplicate Locators ═══${colors.reset}\n`);
  
  // Read common locators
  const commonPath = path.join(locatorsDir, 'common.locators.ts');
  const commonContent = readFile(commonPath);
  const commonLocators = extractLocatorValues(commonContent);
  
  console.log(`Found ${commonLocators.size} locators in common.locators.ts`);
  
  // Check each other locator file for duplicates
  const otherFiles = getLocatorFiles(locatorsDir).filter(f => !f.includes('common.locators'));
  
  for (const filePath of otherFiles) {
    const fileName = path.basename(filePath);
    const content = readFile(filePath);
    const fileLocators = extractLocatorValues(content);
    
    // Check for duplicate values
    for (const [key, value] of fileLocators) {
      for (const [commonKey, commonValue] of commonLocators) {
        if (value === commonValue) {
          result.warnings.push(
            `${fileName}: "${key}" has same value as CommonLocators.${commonKey}`
          );
        }
      }
    }
    
    // Check for common patterns that should be in CommonLocators
    for (const pattern of COMMON_PATTERNS) {
      if (pattern.test(content)) {
        const matches = content.match(pattern);
        if (matches) {
          result.warnings.push(
            `${fileName}: Contains pattern "${pattern.source}" - consider moving to CommonLocators`
          );
        }
      }
    }
  }
  
  if (result.warnings.length === 0) {
    console.log(`${colors.green}✓ No duplicate locators found${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Found ${result.warnings.length} potential duplicates/issues:${colors.reset}`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  return result;
}

function checkPageObjectsUseLocators(pagesDir: string): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };
  
  console.log(`\n${colors.blue}═══ Check 2: Page Objects Using Centralized Locators ═══${colors.reset}\n`);
  
  const pageFiles = getPageObjectFiles(pagesDir);
  
  for (const filePath of pageFiles) {
    const fileName = path.basename(filePath);
    const content = readFile(filePath);
    const lines = content.split('\n');
    
    // Check if file imports from @src/locators
    const hasLocatorImport = /import.*from\s+['"]@src\/locators['"]/.test(content);
    
    if (!hasLocatorImport) {
      result.errors.push(`${fileName}: Missing import from @src/locators`);
    }
    
    // Check for hardcoded selectors
    let hardcodedCount = 0;
    const hardcodedExamples: string[] = [];
    
    lines.forEach((line, index) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.trim().startsWith('import')) {
        return;
      }
      
      // Check for direct locator usage without using Locators object
      const directLocatorMatch = line.match(/this\.page\.locator\(['"`]([^'"`]+)['"`]\)/);
      if (directLocatorMatch) {
        const selector = directLocatorMatch[1];
        
        // Check if it's using a Locators constant
        const usesLocatorConstant = /Locators\.\w+/.test(line);
        
        if (!usesLocatorConstant) {
          hardcodedCount++;
          if (hardcodedExamples.length < 3) {
            hardcodedExamples.push(`  Line ${index + 1}: ${selector.substring(0, 50)}...`);
          }
        }
      }
    });
    
    if (hardcodedCount > 0) {
      result.warnings.push(
        `${fileName}: Found ${hardcodedCount} hardcoded selectors`
      );
      hardcodedExamples.forEach(ex => result.warnings.push(ex));
    } else {
      console.log(`${colors.green}✓ ${fileName}: All selectors use centralized locators${colors.reset}`);
    }
  }
  
  if (result.errors.length > 0) {
    result.passed = false;
    console.log(`\n${colors.red}✗ Errors found:${colors.reset}`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings:${colors.reset}`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  return result;
}

function checkLocatorCoverage(locatorsDir: string, pagesDir: string): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };
  
  console.log(`\n${colors.blue}═══ Check 3: Locator Usage Coverage ═══${colors.reset}\n`);
  
  // Collect all exported locator names
  const allLocators = new Set<string>();
  const usedLocators = new Set<string>();
  
  const locatorFiles = getLocatorFiles(locatorsDir);
  
  for (const filePath of locatorFiles) {
    const content = readFile(filePath);
    const locators = extractLocatorValues(content);
    
    for (const key of locators.keys()) {
      allLocators.add(key);
    }
  }
  
  // Check which locators are used in page objects
  const pageFiles = getPageObjectFiles(pagesDir);
  
  for (const filePath of pageFiles) {
    const content = readFile(filePath);
    
    // Find all Locators.xxx references
    const locatorRefs = content.match(/\w+Locators\.(\w+)/g) || [];
    
    for (const ref of locatorRefs) {
      const locatorName = ref.split('.')[1];
      usedLocators.add(locatorName);
    }
  }
  
  // Find unused locators
  const unusedLocators = [...allLocators].filter(l => !usedLocators.has(l));
  
  console.log(`Total locators defined: ${allLocators.size}`);
  console.log(`Locators used in Page Objects: ${usedLocators.size}`);
  console.log(`Unused locators: ${unusedLocators.length}`);
  
  if (unusedLocators.length > 0 && unusedLocators.length < 20) {
    console.log(`\n${colors.yellow}Unused locators (may be for future use):${colors.reset}`);
    unusedLocators.forEach(l => console.log(`  - ${l}`));
  }
  
  return result;
}

function generateReport(results: VerificationResult[]): void {
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}         VERIFICATION SUMMARY           ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const allPassed = results.every(r => r.passed);
  
  if (allPassed && totalErrors === 0) {
    console.log(`${colors.green}✓ All checks passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some checks failed${colors.reset}`);
  }
  
  console.log(`\nTotal Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  
  if (totalWarnings > 0) {
    console.log(`\n${colors.yellow}Note: Warnings indicate potential improvements but don't fail the check.${colors.reset}`);
  }
}

// Main execution
function main(): void {
  console.log(`${colors.blue}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   LOCATOR VERIFICATION SCRIPT         ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════╝${colors.reset}`);
  
  const baseDir = path.resolve(__dirname, '..');
  const locatorsDir = path.join(baseDir, 'locators');
  const pagesDir = path.join(baseDir, 'pages');
  
  console.log(`\nLocators directory: ${locatorsDir}`);
  console.log(`Pages directory: ${pagesDir}`);
  
  const results: VerificationResult[] = [];
  
  // Run all checks
  results.push(checkDuplicateLocators(locatorsDir));
  results.push(checkPageObjectsUseLocators(pagesDir));
  results.push(checkLocatorCoverage(locatorsDir, pagesDir));
  
  // Generate summary report
  generateReport(results);
  
  // Exit with error code if any check failed
  const hasErrors = results.some(r => !r.passed);
  process.exit(hasErrors ? 1 : 0);
}

main();
