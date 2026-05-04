import type { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { ModuleConfig, ModuleDescriptor, FieldDescriptor } from './config-parser';
import { PageExplorer } from './page-explorer';
import { env } from '@src/config/env';

// --- Types ---

export type ScreenshotStage = 'list_page' | 'form_empty' | 'form_validation' | 'form_filled' | 'form_saved';

export interface NavigationLogEntry {
  module: string;
  stage: ScreenshotStage;
  timestamp: string;
  url: string;
  action: string;
}

export interface ScanSummary {
  modulesScanned: number;
  screenshotsCaptured: number;
  modulesSkipped: number;
  totalExecutionTimeMs: number;
}

// --- Submit button selectors ---

const SUBMIT_SELECTORS = [
  'button:has-text("Save")',
  'button:has-text("Submit")',
  'button:has-text("Continue")',
  'button[type="submit"]',
] as const;

// --- VisualScanner ---

export class VisualScanner {
  private static readonly MODULE_TIMEOUT_MS = 180_000;
  private static readonly VIEWPORT = { width: 1366, height: 768 };

  private navigationLog: NavigationLogEntry[] = [];
  private screenshotCount = 0;

  constructor(
    private page: Page,
    private config: ModuleConfig,
    private envName: string
  ) {}

  /**
   * Scan all modules (or a single module if moduleName is specified).
   * Sets viewport, iterates modules, writes navigation log, outputs summary.
   */
  async scan(moduleName?: string): Promise<ScanSummary> {
    await this.page.setViewportSize(VisualScanner.VIEWPORT);

    let modules = this.config.modules;
    if (moduleName) {
      modules = modules.filter((m) => m.name === moduleName);
    }

    let modulesScanned = 0;
    let modulesSkipped = 0;
    const startTime = Date.now();

    for (const mod of modules) {
      try {
        console.log(`[SCANNER] Scanning module: ${mod.name}`);
        const count = await this.scanModule(mod);
        modulesScanned++;
        console.log(`[SCANNER] Module "${mod.name}" complete — ${count} screenshots captured`);
      } catch (error) {
        modulesSkipped++;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[SCANNER] Skipping module "${mod.name}": ${message}`);
      }
    }

    const totalExecutionTimeMs = Date.now() - startTime;

    // Write navigation log
    const logDir = path.resolve(
      process.cwd(),
      `visual-regression/screenshots/${this.envName}`
    );
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `${this.envName}_navigation-log.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.navigationLog, null, 2), 'utf-8');
    console.log(`[SCANNER] Navigation log written to ${logPath}`);

    const summary: ScanSummary = {
      modulesScanned,
      screenshotsCaptured: this.screenshotCount,
      modulesSkipped,
      totalExecutionTimeMs,
    };

    console.log(`[SCANNER] === Scan Summary ===`);
    console.log(`[SCANNER]   Modules scanned:      ${summary.modulesScanned}`);
    console.log(`[SCANNER]   Screenshots captured:  ${summary.screenshotsCaptured}`);
    console.log(`[SCANNER]   Modules skipped:       ${summary.modulesSkipped}`);
    console.log(`[SCANNER]   Total execution time:  ${summary.totalExecutionTimeMs}ms`);

    return summary;
  }

  /**
   * Scan a single module through all 5 stages.
   * Wrapped in a 180-second Promise.race timeout.
   * Returns the number of screenshots captured for this module.
   */
  private async scanModule(module: ModuleDescriptor): Promise<number> {
    const before = this.screenshotCount;

    await Promise.race([
      this.runModuleStages(module),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Module "${module.name}" timed out after 180s`)),
          VisualScanner.MODULE_TIMEOUT_MS
        )
      ),
    ]);

    return this.screenshotCount - before;
  }

  /**
   * Execute all 5 capture stages for a module sequentially,
   * then run PageExplorer for interactive element discovery.
   */
  private async runModuleStages(module: ModuleDescriptor): Promise<void> {
    await this.captureListPage(module);
    const formOpened = await this.captureFormEmpty(module);
    if (formOpened) {
      await this.captureFormValidation(module);
      await this.captureFormFilled(module);
      await this.captureFormSaved(module);
    }

    // Navigate back to list page for PageExplorer
    await this.navigateToListPage(module);

    // Run PageExplorer for interactive element discovery
    const screenshotDir = path.resolve(
      process.cwd(),
      `visual-regression/screenshots/${this.envName}`
    );
    const explorer = new PageExplorer(this.page, this.envName, screenshotDir);
    const explorerResult = await explorer.exerciseAll(module.name);
    this.screenshotCount += explorerResult.screenshotsCaptured;
    console.log(`[SCANNER] PageExplorer for "${module.name}": ${explorerResult.exercised.length} elements exercised, ${explorerResult.skipped.length} skipped`);
  }

  /**
   * Navigate to the module list page without capturing a screenshot.
   * Used to set up a clean state for PageExplorer.
   */
  private async navigateToListPage(module: ModuleDescriptor): Promise<void> {
    if (module.listPageUrl) {
      const url = module.listPageUrl.startsWith('http')
        ? module.listPageUrl
        : `${env.baseUrl.replace(/\/$/, '')}${module.listPageUrl}`;
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);
    }
  }

  /**
   * Discover all Administration module tiles on the landing page.
   * Navigates to Administration via sidebar, waits for article[aria-label] tiles,
   * and returns an array of { name, selector } for each tile.
   * Falls back to modules.json entries on failure.
   */
  async discoverAdministrationTiles(): Promise<Array<{ name: string; selector: string }>> {
    try {
      console.log('[SCANNER] Navigating to Administration page for tile discovery...');

      // Navigate to Administration via sidebar
      const adminSelectors = [
        'span:text-is("Administration")',
        'a:has-text("Administration")',
        'mat-list-item:has-text("Administration")',
        '[role="menuitem"]:has-text("Administration")',
      ];

      let navigated = false;
      for (const sel of adminSelectors) {
        try {
          const el = this.page.locator(sel).first();
          if (await el.isVisible({ timeout: 3000 })) {
            await el.click();
            navigated = true;
            console.log(`[SCANNER] Clicked Administration via: ${sel}`);
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (!navigated) {
        console.warn('[SCANNER] Could not navigate to Administration via sidebar, falling back to modules.json');
        return this.config.modules.map(m => ({ name: m.name, selector: `article[aria-label="${m.name}"]` }));
      }

      // Wait for tile elements to load
      await this.page.waitForSelector('article[aria-label]', { timeout: 15_000 });
      await this.page.waitForLoadState('networkidle');

      // Extract each tile's aria-label as module name
      const tiles = await this.page.locator('article[aria-label]').all();
      const result: Array<{ name: string; selector: string }> = [];

      for (const tile of tiles) {
        const ariaLabel = await tile.getAttribute('aria-label');
        if (ariaLabel) {
          result.push({
            name: ariaLabel,
            selector: `article[aria-label="${ariaLabel}"]`,
          });
        }
      }

      console.log(`[SCANNER] Discovered ${result.length} Administration tiles`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[SCANNER] Tile discovery failed: ${message}. Falling back to modules.json`);
      return this.config.modules.map(m => ({ name: m.name, selector: `article[aria-label="${m.name}"]` }));
    }
  }

  /**
   * Navigate to the module list page and capture a screenshot.
   */
  private async captureListPage(module: ModuleDescriptor): Promise<void> {
      console.log(`[SCANNER] Navigating to list page for "${module.name}"`);

      if (module.listPageUrl) {
        // Direct URL navigation — resolve relative paths against env.baseUrl
        const url = module.listPageUrl.startsWith('http')
          ? module.listPageUrl
          : `${env.baseUrl.replace(/\/$/, '')}${module.listPageUrl}`;
        await this.page.goto(url, { waitUntil: 'networkidle' });
        // Wait for Angular to fully render — mat-row indicates table loaded
        try {
          await this.page.waitForSelector('mat-row', { timeout: 15000 });
        } catch { /* table may not have rows */ }
        await this.page.waitForTimeout(2000);
      } else if (module.sidebarPath.length > 0) {
        // Wait for dashboard to fully load — same as AdministrationPage.clickAdministrationTab()
        await this.page.waitForTimeout(8000);
        // Sidebar-based navigation: click through each path segment
        for (const segment of module.sidebarPath) {
          console.log(`[SCANNER] Clicking sidebar: "${segment}"`);
          // Try selectors in order — use waitFor like AdministrationPage does
          const selectors = [
            `span:text-is("${segment}")`,
            `article[aria-label="${segment}"]`,
            `[aria-label="${segment}"]`,
            `a:has-text("${segment}")`,
            `mat-list-item:has-text("${segment}")`,
            `h2:text-is("${segment}")`,
            `h3:text-is("${segment}")`,
            `[role="menuitem"]:has-text("${segment}")`,
          ];
          let clicked = false;
          for (const sel of selectors) {
            try {
              const el = this.page.locator(sel).first();
              await el.waitFor({ state: 'visible', timeout: 5000 });
              await el.click();
              clicked = true;
              console.log(`[SCANNER] Clicked "${segment}" via ${sel}`);
              // Wait for page/tiles to load after click — same as AdministrationPage
              await this.page.waitForTimeout(8000);
              break;
            } catch {
              // Try next selector
            }
          }
          if (!clicked) {
            console.error(`[SCANNER] Could not find sidebar element: "${segment}"`);
          }
        }
        await this.page.waitForLoadState('networkidle');
      }

      await this.takeScreenshot(module, 'list_page');
      this.logNavigation(module, 'list_page', `Navigated to ${module.name} list page via sidebar: ${module.sidebarPath.join(' > ')}`);
    }


  /**
   * Click the form trigger button and capture the empty form.
   * Returns true if form was opened, false if skipped.
   * Supports comma-separated selectors — tries each one in order.
   */
  private async captureFormEmpty(module: ModuleDescriptor): Promise<boolean> {
    if (!module.formTriggerSelector) {
      console.log(`[SCANNER] No form trigger for "${module.name}", skipping form stages`);
      return false;
    }

    console.log(`[SCANNER] Opening form for "${module.name}"`);
    const selectors = module.formTriggerSelector.split(',').map(s => s.trim());
    let clicked = false;
    for (const sel of selectors) {
      try {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 8000 })) {
          await btn.click();
          clicked = true;
          console.log(`[SCANNER] Clicked form trigger: ${sel}`);
          break;
        }
      } catch {
        // try next selector
      }
    }
    // Broad fallback — any button with "Add" or "New" in text
    if (!clicked) {
      const fallbacks = [
        'button:has-text("Add")',
        'button:has-text("New")',
        'button:has-text("Create")',
        '[aria-label*="Add"]',
        '[aria-label*="New"]',
      ];
      for (const sel of fallbacks) {
        try {
          const btn = this.page.locator(sel).first();
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            clicked = true;
            console.log(`[SCANNER] Clicked fallback form trigger: ${sel}`);
            break;
          }
        } catch {
          // try next
        }
      }
    }
    if (!clicked) {
      console.log(`[SCANNER] No form trigger button found for "${module.name}", skipping form stages`);
      return false;
    }
    await this.page.waitForLoadState('networkidle');
    // Wait for Angular Material dialog to fully render (225ms animation + buffer)
    try {
      await this.page.waitForSelector('mat-dialog-container, mat-dialog-content, cdk-overlay-pane', {
        state: 'visible', timeout: 8000
      });
      await this.page.waitForTimeout(500);
    } catch {
      await this.page.waitForTimeout(800);
    }
    // captureScrolledScreenshots handles DOM snapshot at scroll=0 AND all scroll position screenshots
    await this.captureScrolledScreenshots(module, 'form_empty');
    this.logNavigation(module, 'form_empty', `Clicked form trigger, form loaded`);
    return true;
  }

  /**
   * Submit the empty form to trigger validation errors, then capture.
   * Skips if the module has no formTriggerSelector.
   */
  private async captureFormValidation(module: ModuleDescriptor): Promise<void> {
    if (!module.formTriggerSelector) {
      console.log(`[SCANNER] No form trigger for "${module.name}", skipping form_validation`);
      return;
    }

    console.log(`[SCANNER] Submitting empty form for "${module.name}" to trigger validation`);
    await this.clickSubmitButton();
    // Wait for Angular to render mat-error validation messages
    try {
      await this.page.waitForSelector('mat-error, .mat-mdc-form-field-error', {
        state: 'visible', timeout: 5000
      });
      await this.page.waitForTimeout(500);
    } catch {
      await this.page.waitForTimeout(1000);
    }
    await this.captureScrolledScreenshots(module, 'form_validation');
    this.logNavigation(module, 'form_validation', 'Clicked save/submit without filling fields, captured validation errors');
  }

  /**
   * Fill each form field with edge-case data and capture the filled form.
   * Skips if the module has no formTriggerSelector.
   */
  private async captureFormFilled(module: ModuleDescriptor): Promise<void> {
    if (!module.formTriggerSelector) {
      console.log(`[SCANNER] No form trigger for "${module.name}", skipping form_filled`);
      return;
    }

    console.log(`[SCANNER] Filling form fields for "${module.name}"`);
    for (const field of module.fields) {
      await this.fillField(field);
    }

    await this.captureScrolledScreenshots(module, 'form_filled');
    this.logNavigation(module, 'form_filled', `Filled ${module.fields.length} form fields with edge-case data`);
  }

  /**
   * Submit the filled form and capture the result.
   * Skips if the module has no formTriggerSelector.
   */
  private async captureFormSaved(module: ModuleDescriptor): Promise<void> {
    if (!module.formTriggerSelector) {
      console.log(`[SCANNER] No form trigger for "${module.name}", skipping form_saved`);
      return;
    }

    console.log(`[SCANNER] Submitting filled form for "${module.name}"`);
    await this.clickSubmitButton();
    // Wait for dialog to close, then list to reload
    try {
      await this.page.waitForSelector('mat-dialog-container', { state: 'hidden', timeout: 10000 });
    } catch { /* dialog may not have been open */ }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
    await this.takeScreenshot(module, 'form_saved');
    this.logNavigation(module, 'form_saved', 'Clicked save/submit on filled form, captured result');
  }

  /**
   * Fill a single form field with edge-case data based on its type.
   * Wraps in try/catch — logs and skips on failure.
   */
  private async fillField(field: FieldDescriptor): Promise<void> {
    try {
      // Try each comma-separated selector until one works
      const selectors = field.selector.split(',').map(s => s.trim());

      switch (field.type) {
        case 'text': {
          const length = field.maxlength || 255;
          let filled = false;
          for (const sel of selectors) {
            try {
              const el = this.page.locator(sel).first();
              // Scroll dialog to make field visible
              try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch { /* may not exist */ }
              if (await el.isVisible({ timeout: 5000 })) {
                // Detect input type to fill with appropriate value
                const inputType = await el.getAttribute('type').catch(() => 'text');
                const tagName = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => 'input');
                const isContentEditable = await el.evaluate(e => (e as HTMLElement).isContentEditable).catch(() => false);

                if (isContentEditable) {
                  // CKEditor or contenteditable div — click and type
                  await el.click({ force: true });
                  await this.page.waitForTimeout(300);
                  await this.page.keyboard.type('A'.repeat(Math.min(length, 100)));
                  await this.page.waitForTimeout(500);
                  filled = true;
                  console.log(`[SCANNER] Typed into contenteditable "${field.label}" (${length} chars)`);
                } else {
                  const value = (inputType === 'number')
                    ? '9'.repeat(Math.min(length, 5))
                    : 'A'.repeat(length);
                  await el.fill(value);
                  await this.page.waitForTimeout(500);
                  filled = true;
                  console.log(`[SCANNER] Filled text field "${field.label}" with "${value.substring(0, 20)}..." (${inputType})`);
                }                break;
              }
            } catch { /* try next */ }
          }
          if (!filled) console.log(`[SCANNER] Could not find text field "${field.label}", skipping`);
          break;
        }
        case 'dropdown': {
          // Use DropdownHelper pattern: click → wait → ArrowDown → wait → select first option
          let filled = false;
          for (const sel of selectors) {
            try {
              const el = this.page.locator(sel).first();
              if (await el.isVisible({ timeout: 5000 })) {
                await el.scrollIntoViewIfNeeded();
                await el.click({ force: true });
                await this.page.waitForTimeout(1000);
                // ArrowDown to highlight first option
                await this.page.keyboard.press('ArrowDown');
                await this.page.waitForTimeout(2000);
                // Click the first mat-option
                const matOption = this.page.locator('mat-option').first();
                if (await matOption.isVisible({ timeout: 3000 })) {
                  await matOption.click();
                  await this.page.waitForTimeout(1000);
                  // Ensure dropdown panel is fully closed
                  await this.page.keyboard.press('Escape');
                  await this.page.waitForTimeout(500);
                  filled = true;
                  console.log(`[SCANNER] Selected first option for dropdown "${field.label}"`);
                } else {
                  // Fallback: press Enter
                  await this.page.keyboard.press('Enter');
                  await this.page.waitForTimeout(1000);
                  filled = true;
                  console.log(`[SCANNER] Selected dropdown "${field.label}" via Enter`);
                }
                break;
              }
            } catch { /* try next */ }
          }
          if (!filled) console.log(`[SCANNER] Could not find dropdown "${field.label}", skipping`);
          break;
        }
        case 'checkbox': {
          await this.page.locator(field.selector).first().click({ force: true });
          console.log(`[SCANNER] Toggled checkbox "${field.label}" on`);
          break;
        }
        case 'date': {
          // Fill date fields with today's date in MM/DD/YYYY format
          const today = new Date();
          const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
          let filled = false;
          for (const sel of selectors) {
            try {
              const el = this.page.locator(sel).first();
              try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch { /* may not exist */ }
              if (await el.isVisible({ timeout: 5000 })) {
                await el.click({ force: true });
                await this.page.waitForTimeout(300);
                await el.fill(dateStr);
                await this.page.waitForTimeout(500);
                // Press Escape to close any date picker popup
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(300);
                filled = true;
                console.log(`[SCANNER] Filled date field "${field.label}" with ${dateStr}`);
                break;
              }
            } catch { /* try next */ }
          }
          if (!filled) console.log(`[SCANNER] Could not find date field "${field.label}", skipping`);
          break;
        }
        case 'date-end': {
          // Fill end date with today + 30 days in MM/DD/YYYY format
          const future = new Date();
          future.setDate(future.getDate() + 30);
          const endDateStr = `${String(future.getMonth() + 1).padStart(2, '0')}/${String(future.getDate()).padStart(2, '0')}/${future.getFullYear()}`;
          let filled = false;
          for (const sel of selectors) {
            try {
              const el = this.page.locator(sel).first();
              try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch { /* may not exist */ }
              if (await el.isVisible({ timeout: 5000 })) {
                await el.click({ force: true });
                await this.page.waitForTimeout(300);
                await el.fill(endDateStr);
                await this.page.waitForTimeout(500);
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(300);
                filled = true;
                console.log(`[SCANNER] Filled end date field "${field.label}" with ${endDateStr}`);
                break;
              }
            } catch { /* try next */ }
          }
          if (!filled) console.log(`[SCANNER] Could not find end date field "${field.label}", skipping`);
          break;
        }
        case 'radio': {
          await this.page.locator(field.selector).first().click({ force: true });
          console.log(`[SCANNER] Selected first radio option for "${field.label}"`);
          break;
        }
        case 'toggle': {
          await this.page.locator(field.selector).first().click({ force: true });
          console.log(`[SCANNER] Toggled toggle "${field.label}" on`);
          break;
        }
        default:
          console.log(`[SCANNER] Unknown field type "${field.type}" for "${field.label}", skipping`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SCANNER] Failed to fill field "${field.label}" (${field.type}): ${message}`);
    }
  }

  /**
   * Take a full-page screenshot with the naming convention:
   * {envName}_{module.name}_{stage}.png
   * stored under visual-regression/screenshots/{envName}/
   * Also captures a DOM snapshot of visible controls for semantic diff.
   */
  private async takeScreenshot(module: ModuleDescriptor, stage: ScreenshotStage): Promise<void> {
    const filename = `${this.envName}_${module.name}_${stage}.png`;
    const dir = path.resolve(
      process.cwd(),
      `visual-regression/screenshots/${this.envName}`
    );
    fs.mkdirSync(dir, { recursive: true });

    // Ensure consistent viewport before every screenshot
    await this.page.setViewportSize(VisualScanner.VIEWPORT);
    // Move mouse to top-left and blur focused element to avoid hover/focus states
    await this.page.mouse.move(0, 0);
    await this.page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }).catch(() => {});
    // Wait for any pending renders
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(500);

    const filePath = path.join(dir, filename);
    // Use clip to force exact dimensions — prevents scrollbar width differences
    await this.page.screenshot({
      path: filePath,
      clip: { x: 0, y: 0, width: VisualScanner.VIEWPORT.width, height: VisualScanner.VIEWPORT.height },
    });
    this.screenshotCount++;
    console.log(`[SCANNER] Screenshot saved: ${filePath}`);

    // Capture DOM snapshot AFTER screenshot (dialog still open for form stages)
    // Note: form stages use captureScrolledScreenshots which handles DOM snapshot at scroll=0
    const formStages: ScreenshotStage[] = ['form_empty', 'form_validation', 'form_filled'];
    if (!formStages.includes(stage)) {
      await this.captureDomSnapshot(module, stage, dir);
    }
  }

  /**
   * Capture screenshots at each scroll position of a dialog/scrollable container.
   * If no scrollable dialog is present, captures a single screenshot (normal behaviour).
   * Naming: {env}_{module}_{stage}.png for scroll 0, {env}_{module}_{stage}_scroll1.png for subsequent.
   * Also captures DOM snapshot at scroll position 0 (all fields visible = correct dimensions).
   */
  private async captureScrolledScreenshots(module: ModuleDescriptor, stage: ScreenshotStage): Promise<void> {
    const dir = path.resolve(process.cwd(), `visual-regression/screenshots/${this.envName}`);
    fs.mkdirSync(dir, { recursive: true });

    // Check if a scrollable dialog/container exists
    const scrollInfo = await this.page.evaluate(() => {
      // Try multiple possible scrollable dialog containers
      const selectors = [
        'mat-dialog-content',
        '.mat-mdc-dialog-content',
        '.mat-dialog-content',
        'mat-dialog-container',
        '[mat-dialog-content]',
        '.cdk-overlay-pane .mat-mdc-dialog-surface',
      ];
      for (const sel of selectors) {
        const dialog = document.querySelector(sel) as HTMLElement | null;
        if (dialog && dialog.scrollHeight > dialog.clientHeight + 10) {
          return { hasScroll: true, scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight, selector: sel };
        }
      }
      // Also check if the dialog container itself is scrollable
      const container = document.querySelector('mat-dialog-container') as HTMLElement | null;
      if (container) {
        return { hasScroll: false, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight, selector: 'mat-dialog-container (no scroll)' };
      }
      return { hasScroll: false, scrollHeight: 0, clientHeight: 0, selector: 'none' };
    }).catch(() => ({ hasScroll: false, scrollHeight: 0, clientHeight: 0, selector: 'error' }));

    console.log(`[SCANNER] Scroll check for ${stage}: hasScroll=${scrollInfo.hasScroll}, scrollH=${scrollInfo.scrollHeight}, clientH=${scrollInfo.clientHeight}, sel=${(scrollInfo as any).selector}`);

    // Always capture DOM snapshot first (dialog at top position)
    await this.captureDomSnapshot(module, stage, dir);

    // Always take screenshot at current position (scroll=0)
    await this.page.setViewportSize(VisualScanner.VIEWPORT);
    await this.page.mouse.move(0, 0);
    await this.page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }).catch(() => {});
    await this.page.waitForTimeout(300);

    const filename0 = `${this.envName}_${module.name}_${stage}.png`;
    const filePath0 = path.join(dir, filename0);
    await this.page.screenshot({
      path: filePath0,
      clip: { x: 0, y: 0, width: VisualScanner.VIEWPORT.width, height: VisualScanner.VIEWPORT.height },
    });
    this.screenshotCount++;
    console.log(`[SCANNER] Screenshot saved: ${filePath0}`);
    this.navigationLog.push({ module: module.name, stage, timestamp: new Date().toISOString(), url: this.page.url(), action: `${stage} scroll position 0` });

    // Check if dialog container is taller than viewport — if so, scroll page down to capture rest
    const dialogHeight = await this.page.evaluate(() => {
      const d = document.querySelector('mat-dialog-container') as HTMLElement | null;
      return d ? d.getBoundingClientRect().height : 0;
    }).catch(() => 0);

    if (dialogHeight > VisualScanner.VIEWPORT.height * 0.7) {
      // Dialog takes most of viewport — scroll down to see if there's more content
      await this.page.evaluate(() => window.scrollBy(0, 400));
      await this.page.waitForTimeout(400);

      const filename1 = `${this.envName}_${module.name}_${stage}_scroll1.png`;
      const filePath1 = path.join(dir, filename1);
      await this.page.mouse.move(0, 0);
      await this.page.screenshot({
        path: filePath1,
        clip: { x: 0, y: 0, width: VisualScanner.VIEWPORT.width, height: VisualScanner.VIEWPORT.height },
      });
      this.screenshotCount++;
      console.log(`[SCANNER] Scroll screenshot saved: ${filePath1}`);
      this.navigationLog.push({ module: module.name, stage, timestamp: new Date().toISOString(), url: this.page.url(), action: `${stage} scroll position 1` });

      // Scroll back to top
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(300);
    }

    return;

    // Scroll to top first
    await this.page.evaluate(() => {
      const selectors = ['mat-dialog-content', '.mat-mdc-dialog-content', '.mat-dialog-content', 'mat-dialog-container'];
      for (const sel of selectors) {
        const d = document.querySelector(sel) as HTMLElement | null;
        if (d && d.scrollHeight > d.clientHeight + 10) { d.scrollTop = 0; break; }
      }
    });
    await this.page.waitForTimeout(300);

    // Capture DOM snapshot at scroll=0 (all top fields now have dimensions)
    await this.captureDomSnapshot(module, stage, dir);

    // Capture screenshots at each scroll step
    const stepSize = scrollInfo.clientHeight;
    const totalSteps = Math.ceil(scrollInfo.scrollHeight / stepSize);

    for (let step = 0; step < totalSteps; step++) {
      // Scroll to position
      await this.page.evaluate((scrollTop: number) => {
        const selectors = ['mat-dialog-content', '.mat-mdc-dialog-content', '.mat-dialog-content', 'mat-dialog-container'];
        for (const sel of selectors) {
          const d = document.querySelector(sel) as HTMLElement | null;
          if (d && d.scrollHeight > d.clientHeight + 10) { d.scrollTop = scrollTop; break; }
        }
      }, step * stepSize);
      await this.page.waitForTimeout(300);

      // Build filename: step 0 = normal name, step 1+ = _scroll{step}
      const suffix = step === 0 ? '' : `_scroll${step}`;
      const stageName = `${stage}${suffix}` as ScreenshotStage;

      // Take screenshot using the base takeScreenshot logic (viewport clip, mouse away)
      await this.page.setViewportSize(VisualScanner.VIEWPORT);
      await this.page.mouse.move(0, 0);
      await this.page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }).catch(() => {});
      await this.page.waitForTimeout(300);

      const filename = `${this.envName}_${module.name}_${stageName}.png`;
      const filePath = path.join(dir, filename);
      await this.page.screenshot({
        path: filePath,
        clip: { x: 0, y: 0, width: VisualScanner.VIEWPORT.width, height: VisualScanner.VIEWPORT.height },
      });
      this.screenshotCount++;
      console.log(`[SCANNER] Scroll screenshot saved: ${filePath}`);

      this.navigationLog.push({
        module: module.name,
        stage,
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        action: `Scroll position ${step} of ${totalSteps - 1} for ${stage}`,
      });
    }

    // Scroll back to top after capturing
    await this.page.evaluate(() => {
      const selectors = ['mat-dialog-content', '.mat-mdc-dialog-content', '.mat-dialog-content', 'mat-dialog-container'];
      for (const sel of selectors) {
        const d = document.querySelector(sel) as HTMLElement | null;
        if (d && d.scrollHeight > d.clientHeight + 10) { d.scrollTop = 0; break; }
      }
    });
  }

  /**
   * Capture a rich JSON snapshot of visible Angular Material controls.
   * Uses Playwright locators directly for form fields to handle scrollable dialogs.
   */
  private async captureDomSnapshot(module: ModuleDescriptor, stage: ScreenshotStage, dir: string): Promise<void> {
      try {
        // Scroll dialog to top so fields at top of dialog have rendered dimensions
        await this.page.evaluate(() => {
          const sels = ['mat-dialog-content', '.mat-mdc-dialog-content', '.mat-dialog-content', 'mat-dialog-container'];
          for (const sel of sels) {
            const d = document.querySelector(sel) as HTMLElement | null;
            if (d) { d.scrollTop = 0; break; }
          }
        }).catch(() => {});

        const snapshot = await this.page.evaluate(() => {
          const HEADER_PX = 80;

          function vis(el: HTMLElement): boolean {
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return false;
            return true;
          }

          const inDialog = !!document.querySelector('mat-dialog-container, [role="dialog"]');

          // DEBUG: dump all tag names and text inside dialog to understand structure
          const dialogEl = document.querySelector('mat-dialog-container, [role="dialog"]') as HTMLElement | null;
          const debugDump: string[] = [];
          if (dialogEl) {
            dialogEl.querySelectorAll('*').forEach(el => {
              const htmlEl = el as HTMLElement;
              const tag = htmlEl.tagName.toLowerCase();
              const text = htmlEl.childNodes.length === 1 && htmlEl.childNodes[0].nodeType === 3
                ? htmlEl.textContent?.trim() || ''
                : '';
              const cls = htmlEl.className?.toString().split(' ').slice(0, 2).join('.') || '';
              if (text && text.length < 60 && text.length > 1) {
                debugDump.push(`${tag}.${cls}: "${text}"`);
              }
            });
          }

          // Form fields — read label text and required marker from DOM tree
          // NO size/visibility filter for dialog fields — CDK overlay clips off-screen fields
          // so getBoundingClientRect/offsetWidth/offsetHeight all return 0 for scrolled-out fields
          const formFields: Array<{ label: string; required: boolean; size: { w: number; h: number } }> = [];
          const requiredMarkers: string[] = [];

          // Strategy 1: standard mat-form-field
          document.querySelectorAll('mat-form-field').forEach(el => {
            const htmlEl = el as HTMLElement;
            const s = window.getComputedStyle(htmlEl);
            if (s.display === 'none') return;
            if (!inDialog) {
              const r = htmlEl.getBoundingClientRect();
              if (r.top < HEADER_PX && r.bottom < HEADER_PX) return;
            }
            const labelEl = htmlEl.querySelector('mat-label, label') as HTMLElement | null;
            const label = labelEl?.textContent?.trim() || '';
            if (!label) return;
            const hasMarker = !!(htmlEl.querySelector('.mat-mdc-required-marker, .mat-required-marker'));
            const inputEl = htmlEl.querySelector('input, textarea, mat-select') as HTMLElement | null;
            const isRequired = hasMarker
              || inputEl?.getAttribute('aria-required') === 'true'
              || inputEl?.hasAttribute('required')
              || false;
            const r = htmlEl.getBoundingClientRect();
            const size = { w: Math.round(r.width), h: Math.round(r.height) };
            formFields.push({ label, required: isRequired, size });
            if (isRequired) requiredMarkers.push(label);
          });

          // Strategy 2: mat-select with aria-label (dropdowns not wrapped in mat-form-field)
          document.querySelectorAll('mat-select').forEach(el => {
            const htmlEl = el as HTMLElement;
            const s = window.getComputedStyle(htmlEl);
            if (s.display === 'none') return;
            const ariaLabel = htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('placeholder') || '';
            if (!ariaLabel) return;
            // Skip if already captured via mat-form-field
            if (formFields.find(f => f.label.toLowerCase() === ariaLabel.toLowerCase())) return;
            const r = htmlEl.getBoundingClientRect();
            const size = { w: Math.round(r.width), h: Math.round(r.height) };
            formFields.push({ label: ariaLabel, required: false, size });
          });

          // Strategy 3: labeled inputs not in mat-form-field (e.g. custom Angular components)
          document.querySelectorAll('label').forEach(el => {
            const htmlEl = el as HTMLElement;
            const s = window.getComputedStyle(htmlEl);
            if (s.display === 'none') return;
            if (!inDialog) {
              const r = htmlEl.getBoundingClientRect();
              if (r.top < HEADER_PX && r.bottom < HEADER_PX) return;
            }
            const label = htmlEl.textContent?.trim().replace(/\s+/g, ' ').replace(/\*$/, '').trim() || '';
            if (!label || label.length > 60) return;
            // Skip if already captured
            if (formFields.find(f => f.label.toLowerCase() === label.toLowerCase())) return;
            // Only include if associated with an input
            const forAttr = htmlEl.getAttribute('for');
            const associatedInput = forAttr ? document.getElementById(forAttr) : htmlEl.nextElementSibling as HTMLElement | null;
            if (!associatedInput) return;
            const isRequired = htmlEl.textContent?.includes('*') || false;
            const r = htmlEl.getBoundingClientRect();
            const size = { w: Math.round(r.width), h: Math.round(r.height) };
            formFields.push({ label, required: isRequired, size });
            if (isRequired) requiredMarkers.push(label);
          });

          // Strategy 4: scan inputs with aria-required inside dialog
          // Angular Material's * required marker is a CSS ::after pseudo-element — not a DOM text node
          // So we detect required fields via aria-required attribute on the actual input elements
          if (inDialog) {
            const dialogEl2 = document.querySelector('mat-dialog-container, [role="dialog"]') as HTMLElement | null;
            if (dialogEl2) {
              dialogEl2.querySelectorAll('input, textarea, mat-select, [role="combobox"], [role="listbox"]').forEach(el => {
                const htmlEl = el as HTMLElement;
                const s = window.getComputedStyle(htmlEl);
                if (s.display === 'none') return;
                const isRequired = htmlEl.getAttribute('aria-required') === 'true'
                  || htmlEl.hasAttribute('required')
                  || !!htmlEl.closest('[required]')
                  || !!htmlEl.closest('mat-form-field')?.querySelector('.mat-mdc-required-marker, .mat-required-marker');

                // Find label via aria-labelledby, aria-label, or closest label/mat-label
                let label = htmlEl.getAttribute('aria-label') || '';
                if (!label) {
                  const labelledBy = htmlEl.getAttribute('aria-labelledby');
                  if (labelledBy) {
                    label = document.getElementById(labelledBy)?.textContent?.trim() || '';
                  }
                }
                if (!label) {
                  // Walk up to find a label sibling or parent label
                  let parent = htmlEl.parentElement;
                  for (let i = 0; i < 5 && parent; i++) {
                    const lbl = parent.querySelector('mat-label, label, [class*="label"]') as HTMLElement | null;
                    if (lbl) { label = lbl.textContent?.trim() || ''; break; }
                    parent = parent.parentElement;
                  }
                }
                if (!label || label.length > 60) return;
                label = label.replace(/\s*\*\s*$/, '').trim();
                if (formFields.find(f => f.label.toLowerCase() === label.toLowerCase())) {
                  // Update required status if we now know it's required
                  const existing = formFields.find(f => f.label.toLowerCase() === label.toLowerCase())!;
                  if (isRequired && !existing.required) {
                    existing.required = true;
                    requiredMarkers.push(label);
                  }
                  return;
                }
                const r = htmlEl.getBoundingClientRect();
                const size = { w: Math.round(r.width), h: Math.round(r.height) };
                formFields.push({ label, required: isRequired, size });
                if (isRequired) requiredMarkers.push(label);
              });
            }
          }

          // Columns
          const columns: string[] = [];
          document.querySelectorAll('mat-header-cell, th[mat-header-cell]').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (!vis(htmlEl)) return;
            const t = htmlEl.textContent?.trim().replace(/\s+/g, ' ');
            if (t) columns.push(t);
          });

          // Buttons — deduplicated, skip per-row repeats (>3 occurrences)
          // When dialog is open, scope to dialog only to avoid background page noise
          const buttonScope = inDialog
            ? (document.querySelector('mat-dialog-container, [role="dialog"]') as HTMLElement || document.body)
            : document.body;
          // Header nav container to exclude
          const headerEl = document.querySelector('[aria-label="primary-layout-header-container"], header, nav') as HTMLElement | null;

          const btnCounts = new Map<string, number>();
          buttonScope.querySelectorAll('button, [role="button"]').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (!vis(htmlEl)) return;
            if (headerEl?.contains(htmlEl)) return; // skip header nav buttons
            const lbl = (htmlEl.textContent?.trim().replace(/\s+/g, ' ') || htmlEl.getAttribute('aria-label') || '').substring(0, 60);
            if (lbl) btnCounts.set(lbl, (btnCounts.get(lbl) || 0) + 1);
          });
          const buttons: Array<{ label: string; hasBorder: boolean }> = [];
          buttonScope.querySelectorAll('button, [role="button"]').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (!vis(htmlEl)) return;
            if (headerEl?.contains(htmlEl)) return; // skip header nav buttons
            const lbl = (htmlEl.textContent?.trim().replace(/\s+/g, ' ') || htmlEl.getAttribute('aria-label') || '').substring(0, 60);
            if (!lbl || (btnCounts.get(lbl) || 0) > 3) return;
            if (buttons.find(b => b.label === lbl)) return;
            const cs = window.getComputedStyle(htmlEl);
            const hasBorder = parseFloat(cs.borderWidth || '0') > 0 && cs.borderStyle !== 'none';
            buttons.push({ label: lbl, hasBorder });
          });

          // Dialogs
          const dialogs: string[] = [];
          document.querySelectorAll('mat-dialog-container h2, mat-dialog-container h3, [role="dialog"] h2').forEach(el => {
            const t = el.textContent?.trim();
            if (t) dialogs.push(t);
          });

          // Menu items
          const menuItems: string[] = [];
          document.querySelectorAll('[role="menu"] button, mat-menu-item').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (!vis(htmlEl)) return;
            const t = htmlEl.textContent?.trim().replace(/\s+/g, ' ');
            if (t) menuItems.push(t);
          });

          // Error messages
          const errorMessages: string[] = [];
          document.querySelectorAll('mat-error, .mat-mdc-form-field-error').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (!vis(htmlEl)) return;
            const t = htmlEl.textContent?.trim();
            if (t) errorMessages.push(t);
          });

          // Paginator
          const paginatorEl = document.querySelector('mat-paginator') as HTMLElement | null;
          const paginatorInfo = (paginatorEl && vis(paginatorEl))
            ? paginatorEl.textContent?.trim().replace(/\s+/g, ' ') || ''
            : '';

          return { columns, formFields, requiredMarkers, buttons, dialogs, menuItems, errorMessages, paginatorInfo };
        });

        const snapshotFilename = `${this.envName}_${module.name}_${stage}.dom.json`;
        fs.writeFileSync(path.join(dir, snapshotFilename), JSON.stringify(snapshot, null, 2), 'utf-8');
      } catch (error) {
        console.log(`[SCANNER] DOM snapshot skipped for ${module.name}/${stage}: ${(error as Error).message}`);
      }
    }


  /**
   * Record a navigation log entry.
   */
  private logNavigation(module: ModuleDescriptor, stage: ScreenshotStage, action: string): void {
    this.navigationLog.push({
      module: module.name,
      stage,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      action,
    });
  }

  /**
   * Try to click a submit/save button using known selectors.
   */
  private async clickSubmitButton(): Promise<void> {
    for (const selector of SUBMIT_SELECTORS) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.scrollIntoViewIfNeeded();
          await btn.click({ force: true });
          return;
        }
      } catch {
        // Try next selector
      }
    }
    console.log('[SCANNER] No submit/save button found, skipping submit action');
  }
}
