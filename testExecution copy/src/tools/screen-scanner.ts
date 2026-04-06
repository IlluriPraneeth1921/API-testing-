/**
 * Screen Scanner - Auto-generate locators and page objects for new screens
 * 
 * Usage:
 *   npm run generate:screen -- --name "PersonSearch" --url "/persons/search"
 *   npm run generate:screen -- --name "Dashboard" --html "./temp/dashboard.html"
 * 
 * This script:
 * 1. Scans the page/HTML for interactive elements
 * 2. Extracts stable selectors (prioritizing aria-label, id, role)
 * 3. Generates locator file and page object template
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, Page } from 'playwright';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
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
}

interface GeneratorConfig {
  screenName: string;
  screenPath?: string;
  htmlFile?: string;
  baseUrl?: string;
}

// Parse command line arguments
function parseArgs(): GeneratorConfig {
  const args = process.argv.slice(2);
  const config: GeneratorConfig = {
    screenName: '',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      config.screenName = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      config.screenPath = args[i + 1];
      i++;
    } else if (args[i] === '--html' && args[i + 1]) {
      config.htmlFile = args[i + 1];
      i++;
    } else if (args[i] === '--base' && args[i + 1]) {
      config.baseUrl = args[i + 1];
      i++;
    }
  }

  if (!config.screenName) {
    console.error(`${colors.red}Error: --name is required${colors.reset}`);
    console.log('\nUsage:');
    console.log('  npm run generate:screen -- --name "ScreenName" --url "/path"');
    console.log('  npm run generate:screen -- --name "ScreenName" --html "./file.html"');
    process.exit(1);
  }

  return config;
}

// Convert screen name to various formats
function formatName(name: string) {
  const pascalCase = name.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
  const kebabCase = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const camelCase = pascalCase.replace(/^(\w)/, (_, c) => c.toLowerCase());
  
  return { pascalCase, kebabCase, camelCase };
}

// Generate a valid locator name from element info
function generateLocatorName(el: ElementInfo, index: number): string {
  const tag = el.tag.toLowerCase();
  
  // Try to create meaningful name from aria-label
  if (el.ariaLabel) {
    return el.ariaLabel
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
      .substring(0, 30);
  }
  
  // Try id
  if (el.id) {
    return el.id.replace(/[-_]/g, '').substring(0, 30);
  }
  
  // Try text content
  if (el.text && el.text.length < 20) {
    const textName = el.text
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    return `${textName}${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
  }
  
  // Fallback to tag + index
  return `${tag}${index}`;
}

// Determine selector stability
function getStability(el: ElementInfo): 'high' | 'medium' | 'low' {
  if (el.ariaLabel || el.dataTestId || el.id) return 'high';
  if (el.role || el.matColumn) return 'high';
  if (el.text && el.text.length < 30) return 'medium';
  if (el.classes.length > 0) return 'medium';
  return 'low';
}

// Generate the best selector for an element
function generateSelector(el: ElementInfo): string {
  // Priority 1: aria-label
  if (el.ariaLabel) {
    return `[aria-label='${el.ariaLabel}']`;
  }
  
  // Priority 2: data-testid
  if (el.dataTestId) {
    return `[data-testid='${el.dataTestId}']`;
  }
  
  // Priority 3: id (if not dynamic)
  if (el.id && !el.id.match(/\d{5,}/)) {
    return `#${el.id}`;
  }
  
  // Priority 4: role + context
  if (el.role) {
    if (el.text && el.text.length < 30) {
      return `[role="${el.role}"]:has-text("${el.text}")`;
    }
    return `[role="${el.role}"]`;
  }
  
  // Priority 5: mat-column class
  if (el.matColumn) {
    return `.${el.matColumn}`;
  }
  
  // Priority 6: text-based
  if (el.text && el.text.length < 30) {
    if (el.tag === 'button') {
      return `button:has-text('${el.text}')`;
    }
    if (el.tag === 'a') {
      return `a:has-text('${el.text}')`;
    }
    return `${el.tag}:text-is('${el.text}')`;
  }
  
  // Priority 7: type attribute for inputs
  if (el.tag === 'input' && el.type) {
    return `input[type="${el.type}"]`;
  }
  
  // Priority 8: CSS classes
  const meaningfulClasses = el.classes.filter(c => 
    !c.match(/^(ng-|cdk-|mat-mdc-)/) && c.length > 3
  );
  if (meaningfulClasses.length > 0) {
    return `.${meaningfulClasses[0]}`;
  }
  
  // Fallback
  return el.tag;
}

// Scan page for interactive elements
async function scanPage(page: Page): Promise<ElementInfo[]> {
  return await page.evaluate(() => {
    const elements: any[] = [];
    const selectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="combobox"]',
      '[role="listbox"]',
      '[aria-label]',
      'mat-select',
      'mat-option',
      'mat-checkbox',
      'mat-radio-button',
      'mat-table',
      '[class*="mat-column-"]',
    ];
    
    const seen = new Set<Element>();
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        
        const classes = Array.from(el.classList);
        const matColumn = classes.find(c => c.startsWith('mat-column-'));
        
        elements.push({
          tag: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          id: el.id || null,
          role: el.getAttribute('role'),
          type: el.getAttribute('type'),
          text: el.textContent?.trim().substring(0, 50) || null,
          classes: classes,
          matColumn: matColumn || null,
          dataTestId: el.getAttribute('data-testid'),
        });
      });
    });
    
    return elements;
  });
}

// Generate locator file content
function generateLocatorFile(screenName: string, elements: ElementInfo[]): string {
  const { pascalCase, kebabCase } = formatName(screenName);
  
  // Load CommonLocators to check for duplicates
  let commonLocatorValues: Set<string> = new Set();
  try {
    const commonPath = path.join(__dirname, '..', 'locators', 'common.locators.ts');
    if (fs.existsSync(commonPath)) {
      const commonContent = fs.readFileSync(commonPath, 'utf-8');
      const matches = commonContent.match(/:\s*['"`]([^'"`]+)['"`]/g) || [];
      matches.forEach(m => {
        const value = m.replace(/:\s*['"`]/, '').replace(/['"`]$/, '');
        commonLocatorValues.add(value);
      });
    }
  } catch (e) {
    // Ignore if can't read common locators
  }
  
  // Separate elements into common duplicates and screen-specific
  const commonDuplicates: ElementInfo[] = [];
  const screenSpecific: ElementInfo[] = [];
  
  elements.forEach(el => {
    if (commonLocatorValues.has(el.selector)) {
      commonDuplicates.push(el);
    } else {
      screenSpecific.push(el);
    }
  });
  
  const highStability = screenSpecific.filter(e => e.stability === 'high');
  const mediumStability = screenSpecific.filter(e => e.stability === 'medium');
  const lowStability = screenSpecific.filter(e => e.stability === 'low');
  
  let content = `/**
 * ${pascalCase} Screen Locators
 * Auto-generated by screen-scanner
 * 
 * Stability Summary:
 * - HIGH: ${highStability.length} elements (aria-label, id, role, data-testid)
 * - MEDIUM: ${mediumStability.length} elements (text-based, CSS classes)
 * - LOW: ${lowStability.length} elements (positional - REVIEW NEEDED)
 * 
 * NOTE: ${commonDuplicates.length} elements already exist in CommonLocators - use those instead!
 */
export const ${pascalCase}Locators = {
`;

  // Show what's already in CommonLocators (as comments)
  if (commonDuplicates.length > 0) {
    content += `  // ═══ USE FROM CommonLocators INSTEAD ═══\n`;
    content += `  // These selectors already exist in CommonLocators - import and use them:\n`;
    content += `  // import { CommonLocators } from "@src/locators";\n`;
    commonDuplicates.forEach(el => {
      content += `  // ${el.locatorName}: '${el.selector}', // → Use CommonLocators\n`;
    });
    content += '\n';
  }

  // High stability (screen-specific)
  if (highStability.length > 0) {
    content += `  // ═══ HIGH STABILITY (Screen-Specific) ═══\n`;
    highStability.forEach(el => {
      content += `  ${el.locatorName}: '${el.selector}',\n`;
    });
    content += '\n';
  }
  
  // Medium stability
  if (mediumStability.length > 0) {
    content += `  // ═══ MEDIUM STABILITY ═══\n`;
    mediumStability.forEach(el => {
      content += `  ${el.locatorName}: '${el.selector}',\n`;
    });
    content += '\n';
  }
  
  // Low stability (commented out)
  if (lowStability.length > 0) {
    content += `  // ═══ LOW STABILITY - REVIEW NEEDED ═══\n`;
    content += `  // TODO: Request data-testid from dev team for these elements\n`;
    lowStability.forEach(el => {
      content += `  // ${el.locatorName}: '${el.selector}',\n`;
    });
  }
  
  content += `} as const;

export type ${pascalCase}LocatorKeys = keyof typeof ${pascalCase}Locators;
`;

  return content;
}

// Generate page object content
function generatePageObject(screenName: string, elements: ElementInfo[]): string {
  const { pascalCase, kebabCase } = formatName(screenName);
  
  const buttons = elements.filter(e => e.tag === 'button' || e.role === 'button');
  const inputs = elements.filter(e => e.tag === 'input' || e.tag === 'textarea');
  const links = elements.filter(e => e.tag === 'a' || e.role === 'link');
  
  let content = `import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { getRunTimestamp } from "@src/utils/timestamp";
import { ${pascalCase}Locators, CommonLocators } from "@src/locators";

/**
 * ${pascalCase} Page Object
 * Auto-generated by screen-scanner
 * 
 * NOTE: This template imports both screen-specific and CommonLocators.
 * Use CommonLocators for shared elements (buttons, tables, pagination).
 * Use ${pascalCase}Locators for screen-specific elements.
 */
export class ${pascalCase}Page {
  private screenshotDir: string;

  constructor(private page: Page) {
    const timestamp = getRunTimestamp();
    this.screenshotDir = \`reports/\${timestamp}/screenshots\`;
  }

`;

  // Generate click methods for buttons
  buttons.slice(0, 5).forEach(btn => {
    const methodName = `click${btn.locatorName.charAt(0).toUpperCase() + btn.locatorName.slice(1)}`;
    content += `  async ${methodName}() {
    console.log('[${pascalCase.toUpperCase()}] Clicking ${btn.locatorName}');
    await this.page.locator(${pascalCase}Locators.${btn.locatorName}).click();
    await this.page.waitForTimeout(1000);
  }

`;
  });

  // Generate fill methods for inputs
  inputs.slice(0, 5).forEach(input => {
    const methodName = `fill${input.locatorName.charAt(0).toUpperCase() + input.locatorName.slice(1)}`;
    content += `  async ${methodName}(value: string) {
    console.log(\`[${pascalCase.toUpperCase()}] Filling ${input.locatorName}: \${value}\`);
    await this.page.locator(${pascalCase}Locators.${input.locatorName}).fill(value);
  }

`;
  });

  // Add screenshot method
  content += `  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: \`\${this.screenshotDir}/${kebabCase}-\${name}.png\` });
  }
}
`;

  return content;
}

// Generate feature file template
function generateFeatureFile(screenName: string): string {
  const { pascalCase, kebabCase } = formatName(screenName);
  
  return `@${kebabCase}
Feature: ${pascalCase}

  Background:
    Given I am logged in

  Scenario: Navigate to ${pascalCase}
    When I navigate to ${pascalCase}
    Then I should see the ${pascalCase} page

  Scenario: Verify ${pascalCase} elements
    Given I am on the ${pascalCase} page
    Then I should see all required elements
`;
}

// Main execution
async function main() {
  console.log(`${colors.blue}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║      SCREEN SCANNER GENERATOR         ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════╝${colors.reset}\n`);

  const config = parseArgs();
  const { pascalCase, kebabCase } = formatName(config.screenName);
  
  console.log(`Screen Name: ${pascalCase}`);
  console.log(`Kebab Case: ${kebabCase}\n`);

  let elements: ElementInfo[] = [];
  let browser: Browser | null = null;

  try {
    if (config.htmlFile) {
      // Read from HTML file
      console.log(`${colors.cyan}Reading HTML from: ${config.htmlFile}${colors.reset}`);
      const html = fs.readFileSync(config.htmlFile, 'utf-8');
      
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setContent(html);
      elements = await scanPage(page);
    } else if (config.screenPath) {
      // Navigate to URL
      const baseUrl = config.baseUrl || process.env.BASE_URL || 'http://localhost:4200';
      const fullUrl = `${baseUrl}${config.screenPath}`;
      
      console.log(`${colors.cyan}Navigating to: ${fullUrl}${colors.reset}`);
      console.log(`${colors.yellow}Note: You may need to handle authentication manually${colors.reset}\n`);
      
      browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();
      await page.goto(fullUrl);
      
      // Wait for user to authenticate if needed
      console.log(`${colors.yellow}Press Enter when the page is ready to scan...${colors.reset}`);
      await new Promise(resolve => process.stdin.once('data', resolve));
      
      elements = await scanPage(page);
    } else {
      console.error(`${colors.red}Error: Either --url or --html is required${colors.reset}`);
      process.exit(1);
    }

    // Process elements
    elements = elements.map((el, index) => ({
      ...el,
      locatorName: generateLocatorName(el as ElementInfo, index),
      selector: generateSelector(el as ElementInfo),
      stability: getStability(el as ElementInfo),
    }));

    // Remove duplicates by locator name
    const seen = new Set<string>();
    elements = elements.filter(el => {
      if (seen.has(el.locatorName)) return false;
      seen.add(el.locatorName);
      return true;
    });

    console.log(`\n${colors.green}Found ${elements.length} unique elements${colors.reset}`);
    console.log(`  - HIGH stability: ${elements.filter(e => e.stability === 'high').length}`);
    console.log(`  - MEDIUM stability: ${elements.filter(e => e.stability === 'medium').length}`);
    console.log(`  - LOW stability: ${elements.filter(e => e.stability === 'low').length}`);

    // Check for CommonLocators duplicates
    let commonLocatorValues: Set<string> = new Set();
    try {
      const commonPath = path.join(__dirname, '..', 'locators', 'common.locators.ts');
      if (fs.existsSync(commonPath)) {
        const commonContent = fs.readFileSync(commonPath, 'utf-8');
        const matches = commonContent.match(/:\s*['"`]([^'"`]+)['"`]/g) || [];
        matches.forEach(m => {
          const value = m.replace(/:\s*['"`]/, '').replace(/['"`]$/, '');
          commonLocatorValues.add(value);
        });
      }
    } catch (e) { /* ignore */ }
    
    const commonDuplicates = elements.filter(e => commonLocatorValues.has(e.selector));
    if (commonDuplicates.length > 0) {
      console.log(`\n${colors.yellow}⚠ ${commonDuplicates.length} elements already in CommonLocators - use those instead!${colors.reset}`);
    }

    // Generate files
    const baseDir = path.resolve(__dirname, '..');
    
    // Locator file
    const locatorPath = path.join(baseDir, 'locators', `${kebabCase}.locators.ts`);
    const locatorContent = generateLocatorFile(config.screenName, elements);
    fs.writeFileSync(locatorPath, locatorContent);
    console.log(`\n${colors.green}✅ Generated: ${locatorPath}${colors.reset}`);

    // Page object
    const pagePath = path.join(baseDir, 'pages', `${pascalCase}Page.ts`);
    const pageContent = generatePageObject(config.screenName, elements);
    fs.writeFileSync(pagePath, pageContent);
    console.log(`${colors.green}✅ Generated: ${pagePath}${colors.reset}`);

    // Feature file
    const featurePath = path.join(baseDir, '..', 'features', `${kebabCase}.feature`);
    const featureContent = generateFeatureFile(config.screenName);
    fs.writeFileSync(featurePath, featureContent);
    console.log(`${colors.green}✅ Generated: ${featurePath}${colors.reset}`);

    console.log(`\n${colors.blue}Next steps:${colors.reset}`);
    console.log(`1. Add export to src/locators/index.ts:`);
    console.log(`   export { ${pascalCase}Locators } from './${kebabCase}.locators';`);
    console.log(`2. Review generated locators for stability`);
    console.log(`3. Run: npm run verify:locators`);

  } catch (error) {
    console.error(`${colors.red}Error: ${error}${colors.reset}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
