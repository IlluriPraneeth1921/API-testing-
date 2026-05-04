/**
 * Automation Generation Workflow
 * 
 * Interactive step-by-step workflow for generating new screen automation:
 * 
 * Step 1: Scan screen and generate initial locators
 * Step 2: Show duplicates with CommonLocators and ask for approval
 * Step 3: Move approved locators to CommonLocators
 * Step 4: Generate final Page Object
 * Step 5: Generate Feature file and Step definitions
 * Step 6: Run verification
 * 
 * Usage:
 *   npm run generate:automation -- --name "ScreenName" --html "./temp/page.html"
 *   npm run generate:automation -- --name "ScreenName" --url "/path"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { chromium, Browser, Page } from 'playwright';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface ElementInfo {
  tag: string;
  ariaLabel: string | null;
  id: string | null;
  role: string | null;
  type: string | null;
  text: string | null;
  classes: string[];
  matColumn: string | null;
  dataTestId: string | null;
  selector: string;
  stability: 'high' | 'medium' | 'low';
  locatorName: string;
  isCommonDuplicate: boolean;
  commonLocatorName?: string;
}

interface WorkflowState {
  screenName: string;
  pascalCase: string;
  kebabCase: string;
  elements: ElementInfo[];
  commonDuplicates: ElementInfo[];
  screenSpecific: ElementInfo[];
  newCommonLocators: ElementInfo[];
  htmlFile?: string;
  screenPath?: string;
}

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function askYesNo(question: string): Promise<boolean> {
  return new Promise(resolve => {
    rl.question(`${question} (y/n): `, answer => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

function printHeader(text: string) {
  console.log(`\n${colors.blue}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${colors.bold}  ${text}${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(50)}${colors.reset}\n`);
}

function printStep(step: number, total: number, text: string) {
  console.log(`\n${colors.cyan}[Step ${step}/${total}]${colors.reset} ${colors.bold}${text}${colors.reset}\n`);
}

// Format name utilities
function formatName(name: string) {
  const pascalCase = name.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
  const kebabCase = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const camelCase = pascalCase.replace(/^(\w)/, (_, c) => c.toLowerCase());
  return { pascalCase, kebabCase, camelCase };
}

// Load existing CommonLocators
function loadCommonLocators(): Map<string, string> {
  const locators = new Map<string, string>();
  try {
    const commonPath = path.join(__dirname, '..', 'locators', 'common.locators.ts');
    if (fs.existsSync(commonPath)) {
      const content = fs.readFileSync(commonPath, 'utf-8');
      const regex = /(\w+):\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        locators.set(match[2], match[1]); // value -> name
      }
    }
  } catch (e) { /* ignore */ }
  return locators;
}

// Generate selector for element
function generateSelector(el: any): string {
  if (el.ariaLabel) return `[aria-label='${el.ariaLabel}']`;
  if (el.dataTestId) return `[data-testid='${el.dataTestId}']`;
  if (el.id && !el.id.match(/\d{5,}/)) return `#${el.id}`;
  if (el.role) {
    if (el.text && el.text.length < 30) return `[role="${el.role}"]:has-text("${el.text}")`;
    return `[role="${el.role}"]`;
  }
  if (el.matColumn) return `.${el.matColumn}`;
  if (el.text && el.text.length < 30) {
    if (el.tag === 'button') return `button:has-text('${el.text}')`;
    if (el.tag === 'a') return `a:has-text('${el.text}')`;
    return `${el.tag}:text-is('${el.text}')`;
  }
  if (el.tag === 'input' && el.type) return `input[type="${el.type}"]`;
  return el.tag;
}

// Generate locator name
function generateLocatorName(el: any, index: number): string {
  const tag = el.tag.toLowerCase();
  if (el.ariaLabel) {
    return el.ariaLabel.replace(/[^a-zA-Z0-9\s]/g, '').split(' ')
      .map((w: string, i: number) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('').substring(0, 30);
  }
  if (el.id) return el.id.replace(/[-_]/g, '').substring(0, 30);
  if (el.text && el.text.length < 20) {
    const textName = el.text.replace(/[^a-zA-Z0-9\s]/g, '').split(' ')
      .map((w: string, i: number) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    return `${textName}${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
  }
  return `${tag}${index}`;
}

// Get stability rating
function getStability(el: any): 'high' | 'medium' | 'low' {
  if (el.ariaLabel || el.dataTestId || el.id) return 'high';
  if (el.role || el.matColumn) return 'high';
  if (el.text && el.text.length < 30) return 'medium';
  if (el.classes && el.classes.length > 0) return 'medium';
  return 'low';
}

// Scan page for elements
async function scanPage(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const elements: any[] = [];
    const selectors = [
      'button', 'a[href]', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
      '[role="combobox"]', '[role="listbox"]', '[aria-label]',
      'mat-select', 'mat-option', 'mat-checkbox', 'mat-radio-button',
      'mat-table', '[class*="mat-column-"]',
    ];
    const seen = new Set<Element>();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        const classes = Array.from(el.classList);
        elements.push({
          tag: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          id: el.id || null,
          role: el.getAttribute('role'),
          type: el.getAttribute('type'),
          text: el.textContent?.trim().substring(0, 50) || null,
          classes: classes,
          matColumn: classes.find(c => c.startsWith('mat-column-')) || null,
          dataTestId: el.getAttribute('data-testid'),
        });
      });
    });
    return elements;
  });
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW STEPS
// ═══════════════════════════════════════════════════════════════

async function step1_ScanScreen(state: WorkflowState): Promise<void> {
  printStep(1, 6, 'Scanning Screen for Elements');
  
  let browser: Browser | null = null;
  
  try {
    if (state.htmlFile) {
      console.log(`Reading HTML from: ${state.htmlFile}`);
      const html = fs.readFileSync(state.htmlFile, 'utf-8');
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setContent(html);
      const rawElements = await scanPage(page);
      state.elements = processElements(rawElements);
    } else if (state.screenPath) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      const fullUrl = `${baseUrl}${state.screenPath}`;
      console.log(`Opening browser to: ${fullUrl}`);
      console.log(`${colors.yellow}Please login/navigate to the screen, then press Enter...${colors.reset}`);
      
      browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();
      await page.goto(fullUrl);
      await ask('Press Enter when ready to scan...');
      
      const rawElements = await scanPage(page);
      state.elements = processElements(rawElements);
    }
    
    console.log(`\n${colors.green}✓ Found ${state.elements.length} unique elements${colors.reset}`);
    console.log(`  HIGH stability: ${state.elements.filter(e => e.stability === 'high').length}`);
    console.log(`  MEDIUM stability: ${state.elements.filter(e => e.stability === 'medium').length}`);
    console.log(`  LOW stability: ${state.elements.filter(e => e.stability === 'low').length}`);
    
  } finally {
    if (browser) await browser.close();
  }
}

function processElements(rawElements: any[]): ElementInfo[] {
  const commonLocators = loadCommonLocators();
  const seen = new Set<string>();
  
  return rawElements
    .map((el, index) => {
      const selector = generateSelector(el);
      const locatorName = generateLocatorName(el, index);
      const isCommonDuplicate = commonLocators.has(selector);
      
      return {
        ...el,
        selector,
        locatorName,
        stability: getStability(el),
        isCommonDuplicate,
        commonLocatorName: isCommonDuplicate ? commonLocators.get(selector) : undefined,
      } as ElementInfo;
    })
    .filter(el => {
      if (seen.has(el.locatorName)) return false;
      seen.add(el.locatorName);
      return true;
    });
}

async function step2_AnalyzeCommonLocators(state: WorkflowState): Promise<void> {
  printStep(2, 6, 'Analyzing Common vs Screen-Specific Locators');
  
  state.commonDuplicates = state.elements.filter(e => e.isCommonDuplicate);
  state.screenSpecific = state.elements.filter(e => !e.isCommonDuplicate);
  
  console.log(`${colors.green}Already in CommonLocators:${colors.reset} ${state.commonDuplicates.length} elements`);
  if (state.commonDuplicates.length > 0) {
    state.commonDuplicates.forEach(el => {
      console.log(`  ✓ ${el.locatorName} → Use CommonLocators.${el.commonLocatorName}`);
    });
  }
  
  console.log(`\n${colors.cyan}Screen-specific:${colors.reset} ${state.screenSpecific.length} elements`);
  
  // Find candidates for CommonLocators (shared patterns)
  const commonCandidates = state.screenSpecific.filter(el => {
    const selector = el.selector.toLowerCase();
    return (
      selector.includes('mat-table') ||
      selector.includes('mat-option') ||
      selector.includes('mat-select') ||
      selector.includes('continue') ||
      selector.includes('cancel') ||
      selector.includes('save') ||
      selector.includes('submit') ||
      selector.includes('paginator') ||
      selector.includes('first page') ||
      selector.includes('next page')
    );
  });
  
  if (commonCandidates.length > 0) {
    console.log(`\n${colors.yellow}⚠ Found ${commonCandidates.length} elements that might belong in CommonLocators:${colors.reset}`);
    commonCandidates.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.locatorName}: '${el.selector}'`);
    });
    
    const moveToCommon = await askYesNo('\nWould you like to move any of these to CommonLocators?');
    
    if (moveToCommon) {
      console.log('\nEnter the numbers to move (comma-separated), or "all", or "none":');
      const answer = await ask('> ');
      
      if (answer.toLowerCase() === 'all') {
        state.newCommonLocators = commonCandidates;
      } else if (answer.toLowerCase() !== 'none' && answer.length > 0) {
        const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
        state.newCommonLocators = indices
          .filter(i => i >= 0 && i < commonCandidates.length)
          .map(i => commonCandidates[i]);
      }
      
      if (state.newCommonLocators.length > 0) {
        console.log(`\n${colors.green}Will add ${state.newCommonLocators.length} locators to CommonLocators${colors.reset}`);
        // Remove from screen-specific
        const newCommonSelectors = new Set(state.newCommonLocators.map(e => e.selector));
        state.screenSpecific = state.screenSpecific.filter(e => !newCommonSelectors.has(e.selector));
      }
    }
  }
}

async function step3_UpdateCommonLocators(state: WorkflowState): Promise<void> {
  printStep(3, 6, 'Updating CommonLocators (if needed)');
  
  if (state.newCommonLocators.length === 0) {
    console.log('No new locators to add to CommonLocators. Skipping...');
    return;
  }
  
  const commonPath = path.join(__dirname, '..', 'locators', 'common.locators.ts');
  let content = fs.readFileSync(commonPath, 'utf-8');
  
  // Find the position before "} as const;"
  const insertPosition = content.lastIndexOf('} as const;');
  
  if (insertPosition === -1) {
    console.log(`${colors.red}Could not find insertion point in common.locators.ts${colors.reset}`);
    return;
  }
  
  // Generate new locator entries
  let newEntries = `\n  // ═══ Added from ${state.pascalCase} screen ═══\n`;
  state.newCommonLocators.forEach(el => {
    newEntries += `  ${el.locatorName}: '${el.selector}',\n`;
  });
  
  // Insert new entries
  content = content.slice(0, insertPosition) + newEntries + content.slice(insertPosition);
  
  // Show preview
  console.log(`${colors.cyan}Preview of additions to common.locators.ts:${colors.reset}`);
  console.log(newEntries);
  
  const confirm = await askYesNo('Confirm adding these to CommonLocators?');
  
  if (confirm) {
    fs.writeFileSync(commonPath, content);
    console.log(`${colors.green}✓ Updated common.locators.ts${colors.reset}`);
  } else {
    // Add back to screen-specific
    state.screenSpecific.push(...state.newCommonLocators);
    state.newCommonLocators = [];
    console.log('Cancelled. Locators will be added to screen-specific file instead.');
  }
}

async function step4_GenerateLocatorFile(state: WorkflowState): Promise<void> {
  printStep(4, 6, 'Generating Screen-Specific Locator File');
  
  const high = state.screenSpecific.filter(e => e.stability === 'high');
  const medium = state.screenSpecific.filter(e => e.stability === 'medium');
  const low = state.screenSpecific.filter(e => e.stability === 'low');
  
  let content = `/**
 * ${state.pascalCase} Screen Locators
 * Generated by automation workflow
 * 
 * Elements: ${state.screenSpecific.length} screen-specific
 * CommonLocators: ${state.commonDuplicates.length + state.newCommonLocators.length} shared (use from CommonLocators)
 */
export const ${state.pascalCase}Locators = {\n`;

  if (high.length > 0) {
    content += `  // ═══ HIGH STABILITY ═══\n`;
    high.forEach(el => { content += `  ${el.locatorName}: '${el.selector}',\n`; });
    content += '\n';
  }
  if (medium.length > 0) {
    content += `  // ═══ MEDIUM STABILITY ═══\n`;
    medium.forEach(el => { content += `  ${el.locatorName}: '${el.selector}',\n`; });
    content += '\n';
  }
  if (low.length > 0) {
    content += `  // ═══ LOW STABILITY - REVIEW NEEDED ═══\n`;
    low.forEach(el => { content += `  // ${el.locatorName}: '${el.selector}',\n`; });
  }
  
  content += `} as const;\n\nexport type ${state.pascalCase}LocatorKeys = keyof typeof ${state.pascalCase}Locators;\n`;
  
  const locatorPath = path.join(__dirname, '..', 'locators', `${state.kebabCase}.locators.ts`);
  fs.writeFileSync(locatorPath, content);
  console.log(`${colors.green}✓ Generated: ${locatorPath}${colors.reset}`);
}


async function step5_GeneratePageObject(state: WorkflowState): Promise<void> {
  printStep(5, 6, 'Generating Page Object');
  
  // Combine all locators that should be used from CommonLocators
  const commonToUse = [...state.commonDuplicates, ...state.newCommonLocators];
  
  const buttons = state.screenSpecific.filter(e => e.tag === 'button' || e.role === 'button');
  const inputs = state.screenSpecific.filter(e => e.tag === 'input' || e.tag === 'textarea');
  
  let content = `import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { ${state.pascalCase}Locators, CommonLocators } from "@src/locators";

/**
 * ${state.pascalCase} Page Object
 * Generated by automation workflow
 * 
 * Locator Usage:
 * - CommonLocators: ${commonToUse.length} shared elements
 * - ${state.pascalCase}Locators: ${state.screenSpecific.length} screen-specific elements
 */
export class ${state.pascalCase}Page {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = \`reports/\${timestamp}/screenshots\`;
  }

`;

  // Generate click methods for buttons (max 5)
  buttons.slice(0, 5).forEach(btn => {
    const methodName = `click${btn.locatorName.charAt(0).toUpperCase() + btn.locatorName.slice(1)}`;
    content += `  async ${methodName}() {
    console.log('[${state.pascalCase.toUpperCase()}] Clicking ${btn.locatorName}');
    await this.page.locator(${state.pascalCase}Locators.${btn.locatorName}).click();
    await this.page.waitForTimeout(500);
  }

`;
  });

  // Generate fill methods for inputs (max 5)
  inputs.slice(0, 5).forEach(input => {
    const methodName = `fill${input.locatorName.charAt(0).toUpperCase() + input.locatorName.slice(1)}`;
    content += `  async ${methodName}(value: string) {
    console.log(\`[${state.pascalCase.toUpperCase()}] Filling ${input.locatorName}: \${value}\`);
    await this.page.locator(${state.pascalCase}Locators.${input.locatorName}).fill(value);
  }

`;
  });

  // Add common utility methods
  content += `  // ═══ COMMON ACTIONS (using CommonLocators) ═══
  
  async clickContinue() {
    await this.page.locator(CommonLocators.continueBtn).click();
    await this.page.waitForTimeout(500);
  }

  async clickCancel() {
    await this.page.locator(CommonLocators.cancelBtn).click();
  }

  async clickSave() {
    await this.page.locator(CommonLocators.saveBtn).click();
    await this.page.waitForTimeout(500);
  }

  async waitForTableLoad() {
    await this.page.locator(CommonLocators.matTable).waitFor({ state: 'visible' });
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator(CommonLocators.matRow).count();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: \`\${this.screenshotDir}/${state.kebabCase}-\${name}.png\` });
  }
}
`;

  const pagePath = path.join(__dirname, '..', 'pages', `${state.pascalCase}Page.ts`);
  fs.writeFileSync(pagePath, content);
  console.log(`${colors.green}✓ Generated: ${pagePath}${colors.reset}`);
}

async function step6_GenerateFeatureFile(state: WorkflowState): Promise<void> {
  printStep(6, 6, 'Generating Feature File Template');
  
  const content = `@${state.kebabCase}
Feature: ${state.pascalCase}

  Background:
    Given I am logged in
    And I navigate to the ${state.pascalCase} screen

  @smoke
  Scenario: Verify ${state.pascalCase} page loads
    Then I should see the ${state.pascalCase} page
    And all required elements should be visible

  @${state.kebabCase}
  Scenario: Verify ${state.pascalCase} functionality
    # TODO: Add specific test steps
    When I perform an action on ${state.pascalCase}
    Then I should see the expected result
`;

  const featurePath = path.join(__dirname, '..', '..', 'features', `${state.kebabCase}.feature`);
  fs.writeFileSync(featurePath, content);
  console.log(`${colors.green}✓ Generated: ${featurePath}${colors.reset}`);
}

async function step7_UpdateIndexExports(state: WorkflowState): Promise<void> {
  console.log(`\n${colors.cyan}Updating index exports...${colors.reset}`);
  
  // Update locators/index.ts
  const locatorIndexPath = path.join(__dirname, '..', 'locators', 'index.ts');
  let locatorIndex = fs.readFileSync(locatorIndexPath, 'utf-8');
  
  const locatorExport = `export { ${state.pascalCase}Locators } from './${state.kebabCase}.locators';`;
  if (!locatorIndex.includes(locatorExport)) {
    locatorIndex += `\n${locatorExport}\n`;
    fs.writeFileSync(locatorIndexPath, locatorIndex);
    console.log(`${colors.green}✓ Added export to locators/index.ts${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Export already exists in locators/index.ts${colors.reset}`);
  }
  
  // Update pages/index.ts if it exists
  const pageIndexPath = path.join(__dirname, '..', 'pages', 'index.ts');
  if (fs.existsSync(pageIndexPath)) {
    let pageIndex = fs.readFileSync(pageIndexPath, 'utf-8');
    const pageExport = `export { ${state.pascalCase}Page } from './${state.pascalCase}Page';`;
    if (!pageIndex.includes(pageExport)) {
      pageIndex += `\n${pageExport}\n`;
      fs.writeFileSync(pageIndexPath, pageIndex);
      console.log(`${colors.green}✓ Added export to pages/index.ts${colors.reset}`);
    }
  }
}

async function step8_RunVerification(state: WorkflowState): Promise<void> {
  console.log(`\n${colors.cyan}Running verification...${colors.reset}`);
  
  const runVerify = await askYesNo('Run locator verification now?');
  
  if (runVerify) {
    const { execSync } = require('child_process');
    try {
      const output = execSync('npm run verify:locators', { 
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.log(output);
    } catch (error: any) {
      console.log(error.stdout || error.message);
    }
  } else {
    console.log(`${colors.yellow}Skipped. Run manually: npm run verify:locators${colors.reset}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN WORKFLOW
// ═══════════════════════════════════════════════════════════════

async function main() {
  printHeader('AUTOMATION GENERATION WORKFLOW');
  
  // Parse arguments
  const args = process.argv.slice(2);
  let screenName = '';
  let htmlFile: string | undefined;
  let screenPath: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      screenName = args[i + 1];
      i++;
    } else if (args[i] === '--html' && args[i + 1]) {
      htmlFile = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      screenPath = args[i + 1];
      i++;
    }
  }
  
  // Interactive mode if no args
  if (!screenName) {
    screenName = await ask(`${colors.cyan}Enter screen name (e.g., PersonSearch):${colors.reset} `);
  }
  
  if (!htmlFile && !screenPath) {
    console.log('\nHow would you like to scan the screen?');
    console.log('  1. From HTML file');
    console.log('  2. From live URL (browser will open)');
    const choice = await ask('Enter choice (1 or 2): ');
    
    if (choice === '1') {
      htmlFile = await ask('Enter path to HTML file: ');
    } else {
      screenPath = await ask('Enter URL path (e.g., /persons/search): ');
    }
  }
  
  // Format names
  const pascalCase = screenName.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
  const kebabCase = screenName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  
  // Initialize state
  const state: WorkflowState = {
    screenName,
    pascalCase,
    kebabCase,
    elements: [],
    commonDuplicates: [],
    screenSpecific: [],
    newCommonLocators: [],
    htmlFile,
    screenPath,
  };
  
  console.log(`\n${colors.blue}Screen: ${pascalCase}${colors.reset}`);
  console.log(`${colors.blue}Files will be created:${colors.reset}`);
  console.log(`  - src/locators/${kebabCase}.locators.ts`);
  console.log(`  - src/pages/${pascalCase}Page.ts`);
  console.log(`  - features/${kebabCase}.feature`);
  
  const proceed = await askYesNo('\nProceed with generation?');
  if (!proceed) {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  try {
    // Execute workflow steps
    await step1_ScanScreen(state);
    await step2_AnalyzeCommonLocators(state);
    await step3_UpdateCommonLocators(state);
    await step4_GenerateLocatorFile(state);
    await step5_GeneratePageObject(state);
    await step6_GenerateFeatureFile(state);
    await step7_UpdateIndexExports(state);
    await step8_RunVerification(state);
    
    // Summary
    printHeader('GENERATION COMPLETE');
    console.log(`${colors.green}✓ Locator file: src/locators/${kebabCase}.locators.ts${colors.reset}`);
    console.log(`${colors.green}✓ Page object: src/pages/${pascalCase}Page.ts${colors.reset}`);
    console.log(`${colors.green}✓ Feature file: features/${kebabCase}.feature${colors.reset}`);
    
    if (state.newCommonLocators.length > 0) {
      console.log(`${colors.green}✓ Added ${state.newCommonLocators.length} locators to CommonLocators${colors.reset}`);
    }
    
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log('1. Review generated files');
    console.log('2. Add step definitions for the feature file');
    console.log('3. Run: npm run test:smoke');
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error}${colors.reset}`);
  } finally {
    rl.close();
  }
}

main();
