import type { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HTML Capture Utility
 * 
 * Captures page HTML for locator analysis when navigating to new screens
 * or when locator information is not available.
 * 
 * Usage:
 *   import { captureHtml, captureElementHtml } from '@src/utils/html-capture';
 *   await captureHtml(page, 'bulk-assignment-page');
 *   await captureElementHtml(page, '.advanced-search-panel', 'advanced-search');
 */

const OUTPUT_DIR = 'reports/html-captures';

/**
 * Ensures the output directory exists
 */
function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Generates a timestamp string for file naming
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Captures the full page HTML
 * 
 * @param page - Playwright Page object
 * @param name - Descriptive name for the capture (e.g., 'bulk-assignment-page')
 * @returns Path to the saved HTML file
 */
export async function captureHtml(page: Page, name: string): Promise<string> {
  ensureOutputDir();
  const timestamp = getTimestamp();
  const filename = `${name}-${timestamp}.html`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const html = await page.content();
  fs.writeFileSync(filepath, html);
  
  console.log(`[HTML_CAPTURE] Full page captured: ${filepath}`);
  return filepath;
}

/**
 * Captures HTML of a specific element/section
 * 
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element to capture
 * @param name - Descriptive name for the capture
 * @returns Path to the saved HTML file, or null if element not found
 */
export async function captureElementHtml(page: Page, selector: string, name: string): Promise<string | null> {
  ensureOutputDir();
  const timestamp = getTimestamp();
  const filename = `${name}-${timestamp}.html`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  try {
    const element = page.locator(selector).first();
    const html = await element.innerHTML();
    
    // Wrap in a basic HTML structure for easier viewing
    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${name} - Element Capture</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .capture-info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="capture-info">
    <strong>Element Capture:</strong> ${name}<br>
    <strong>Selector:</strong> ${selector}<br>
    <strong>Timestamp:</strong> ${timestamp}
  </div>
  <div class="captured-content">
    ${html}
  </div>
</body>
</html>`;
    
    fs.writeFileSync(filepath, wrappedHtml);
    console.log(`[HTML_CAPTURE] Element captured: ${filepath}`);
    return filepath;
  } catch (e) {
    console.log(`[HTML_CAPTURE] Failed to capture element '${selector}': ${e}`);
    return null;
  }
}

/**
 * Captures HTML of multiple elements matching a selector
 * 
 * @param page - Playwright Page object
 * @param selector - CSS selector for elements to capture
 * @param name - Descriptive name for the capture
 * @returns Path to the saved HTML file
 */
export async function captureAllMatchingElements(page: Page, selector: string, name: string): Promise<string> {
  ensureOutputDir();
  const timestamp = getTimestamp();
  const filename = `${name}-${timestamp}.html`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const elements = page.locator(selector);
  const count = await elements.count();
  
  let allHtml = '';
  for (let i = 0; i < count; i++) {
    const html = await elements.nth(i).innerHTML().catch(() => '<!-- Failed to capture -->');
    allHtml += `\n<!-- Element ${i + 1} of ${count} -->\n<div class="element-${i + 1}">\n${html}\n</div>\n`;
  }
  
  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${name} - Multiple Elements Capture</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .capture-info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
    [class^="element-"] { border: 1px solid #ccc; margin: 10px 0; padding: 10px; }
  </style>
</head>
<body>
  <div class="capture-info">
    <strong>Multiple Elements Capture:</strong> ${name}<br>
    <strong>Selector:</strong> ${selector}<br>
    <strong>Count:</strong> ${count} elements<br>
    <strong>Timestamp:</strong> ${timestamp}
  </div>
  <div class="captured-content">
    ${allHtml}
  </div>
</body>
</html>`;
  
  fs.writeFileSync(filepath, wrappedHtml);
  console.log(`[HTML_CAPTURE] ${count} elements captured: ${filepath}`);
  return filepath;
}

/**
 * Captures visible interactive elements (buttons, inputs, selects, links)
 * Useful for discovering available locators on a page
 * 
 * @param page - Playwright Page object
 * @param name - Descriptive name for the capture
 * @returns Path to the saved HTML file
 */
export async function captureInteractiveElements(page: Page, name: string): Promise<string> {
  ensureOutputDir();
  const timestamp = getTimestamp();
  const filename = `${name}-interactive-${timestamp}.html`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Extract interactive elements info using page.evaluate
  const elementsInfo = await page.evaluate(() => {
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      'mat-select',
      'mat-checkbox',
      'mat-radio-button',
      'mat-slide-toggle',
      '[role="button"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[aria-label]',
      '[data-testid]',
      '[formcontrolname]'
    ];
    
    const results: Array<{
      tag: string;
      id: string;
      name: string;
      ariaLabel: string;
      title: string;
      text: string;
      classes: string;
      role: string;
      formControlName: string;
      dataTestId: string;
      outerHtml: string;
    }> = [];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.offsetParent !== null) { // Check if visible
          results.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            name: el.getAttribute('name') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            title: el.getAttribute('title') || '',
            text: (el.textContent || '').trim().slice(0, 100),
            classes: el.className || '',
            role: el.getAttribute('role') || '',
            formControlName: el.getAttribute('formcontrolname') || '',
            dataTestId: el.getAttribute('data-testid') || '',
            outerHtml: el.outerHTML.slice(0, 500)
          });
        }
      });
    });
    
    // Remove duplicates based on outerHtml
    const unique = results.filter((item, index, self) =>
      index === self.findIndex(t => t.outerHtml === item.outerHtml)
    );
    
    return unique;
  });
  
  // Generate HTML report
  let tableRows = elementsInfo.map((el, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code>${el.tag}</code></td>
      <td>${el.id ? `<code>#${el.id}</code>` : '-'}</td>
      <td>${el.ariaLabel ? `<code>[aria-label="${el.ariaLabel}"]</code>` : '-'}</td>
      <td>${el.title || '-'}</td>
      <td>${el.role ? `<code>[role="${el.role}"]</code>` : '-'}</td>
      <td>${el.formControlName ? `<code>[formcontrolname="${el.formControlName}"]</code>` : '-'}</td>
      <td>${el.text || '-'}</td>
      <td><details><summary>View</summary><pre>${el.outerHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></details></td>
    </tr>
  `).join('');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${name} - Interactive Elements</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .capture-info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #4CAF50; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    code { background: #e0e0e0; padding: 2px 4px; border-radius: 3px; }
    pre { white-space: pre-wrap; word-break: break-all; max-width: 400px; font-size: 10px; }
    details summary { cursor: pointer; color: blue; }
  </style>
</head>
<body>
  <div class="capture-info">
    <strong>Interactive Elements Capture:</strong> ${name}<br>
    <strong>Total Elements:</strong> ${elementsInfo.length}<br>
    <strong>Timestamp:</strong> ${timestamp}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Tag</th>
        <th>ID</th>
        <th>Aria-Label</th>
        <th>Title</th>
        <th>Role</th>
        <th>FormControl</th>
        <th>Text</th>
        <th>HTML</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;
  
  fs.writeFileSync(filepath, html);
  console.log(`[HTML_CAPTURE] ${elementsInfo.length} interactive elements captured: ${filepath}`);
  return filepath;
}
