import type { Page } from 'playwright';
import { ConfigParser, ModuleConfig, ModuleDescriptor, FieldDescriptor } from './config-parser';

// Angular Material selectors used for discovery
const SELECTORS = {
  // Tables
  matTable: 'mat-table[role="table"]',
  matHeaderCell: 'mat-header-cell',
  // Form controls
  matFormField: 'mat-form-field',
  matSelect: 'mat-select',
  matCheckbox: 'mat-checkbox',
  matRadio: 'mat-radio-button',
  matSlideToggle: 'mat-slide-toggle',
  matLabel: 'mat-label',
  // Dialogs/Overlays
  matDialog: 'mat-dialog-container',
  cdkOverlayBackdrop: '.cdk-overlay-backdrop',
  // Sidebar navigation
  sidebarNav: 'nav a, mat-list-item, [role="menuitem"], .mat-mdc-list-item, mat-nav-list a, .sidebar a, .sidenav a',
  sidebarContainer: 'nav, mat-sidenav, mat-nav-list, [role="navigation"], .sidebar, .sidenav',
  // Sub-menu items
  subMenuItem: 'a, mat-list-item, [role="menuitem"], .mat-mdc-list-item',
} as const;

// Button text patterns for form triggers
const FORM_TRIGGER_TEXTS = ['Add New', 'Create', 'Add', 'New'] as const;

export class DiscoveryEngine {
  private static readonly MODULE_TIMEOUT_MS = 60_000;

  constructor(
    private page: Page,
    private configParser: ConfigParser
  ) {}

  /**
   * Run full discovery: sidebar enumeration → module scanning → config output.
   */
  async discover(): Promise<ModuleConfig> {
    console.log('[DISCOVERY] Starting module auto-discovery...');

    const sidebarPaths = await this.enumerateSidebar();
    console.log(`[DISCOVERY] Found ${sidebarPaths.length} sidebar navigation paths`);

    const modules: ModuleDescriptor[] = [];

    for (const sidebarPath of sidebarPaths) {
      const pathLabel = sidebarPath.join(' > ');
      console.log(`[DISCOVERY] Scanning module: ${pathLabel}`);
      try {
        const descriptor = await this.scanModule(sidebarPath);
        modules.push(descriptor);
        console.log(`[DISCOVERY] Successfully scanned: ${descriptor.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[DISCOVERY] Failed to scan module at ${pathLabel}: ${message}`);
        // Skip module and continue discovery
      }
    }

    const discoveredConfig: ModuleConfig = {
      version: '1.0.0',
      discoveredAt: new Date().toISOString(),
      modules,
    };

    // Merge with existing config if it exists
    let finalConfig: ModuleConfig;
    try {
      const existingConfig = this.configParser.read();
      finalConfig = this.configParser.merge(existingConfig, discoveredConfig);
      console.log('[DISCOVERY] Merged with existing configuration');
    } catch {
      // No existing config or read error — use discovered config as-is
      finalConfig = discoveredConfig;
    }

    this.configParser.write(finalConfig);
    console.log(`[DISCOVERY] Discovery complete. ${finalConfig.modules.length} modules written to config.`);

    return finalConfig;
  }

  /**
   * Enumerate all sidebar menu items and sub-items.
   * Returns array of navigation paths like [["Administration", "Organizations"], ["People"], ...]
   */
  private async enumerateSidebar(): Promise<string[][]> {
    console.log('[DISCOVERY] Enumerating sidebar navigation...');

    // Wait for sidebar to be visible
    await this.page.waitForSelector(SELECTORS.sidebarContainer, { timeout: 15_000 }).catch(() => {
      console.log('[DISCOVERY] Sidebar container not found with primary selectors, continuing with fallback');
    });

    const paths: string[][] = [];

    // Find all top-level menu items
    const topLevelItems = await this.page.$$(SELECTORS.sidebarNav);
    console.log(`[DISCOVERY] Found ${topLevelItems.length} top-level sidebar items`);

    for (const item of topLevelItems) {
      const itemText = (await item.textContent())?.trim();
      if (!itemText) continue;

      // Check if this item is expandable (has sub-items)
      const isExpandable = await item.evaluate((el) => {
        // Check for common expandable patterns
        const parent = el.closest('mat-expansion-panel, [aria-expanded], .expandable, mat-tree-node');
        const hasChildren = el.querySelector('mat-nav-list, ul, .sub-menu, .submenu');
        return !!(parent || hasChildren);
      });

      if (isExpandable) {
        // Click to expand
        try {
          await item.click();
          await this.page.waitForTimeout(500);

          // Find sub-items within the expanded section
          const subTexts = await item.evaluate((el, subSelector) => {
            const parent = el.closest('mat-expansion-panel, .expandable, li') || el.parentElement;
            if (!parent) return [];
            const subs = parent.querySelectorAll(subSelector);
            return Array.from(subs).map((s) => s.textContent?.trim() || '').filter(Boolean);
          }, SELECTORS.subMenuItem);

          for (const subText of subTexts) {
            if (subText && subText !== itemText) {
              paths.push([itemText, subText]);
            }
          }
        } catch {
          // If expansion fails, treat as a single-level item
          paths.push([itemText]);
        }
      } else {
        paths.push([itemText]);
      }
    }

    // Deduplicate paths
    const seen = new Set<string>();
    const uniquePaths = paths.filter((p) => {
      const key = p.join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[DISCOVERY] Enumerated ${uniquePaths.length} unique navigation paths`);
    return uniquePaths;
  }

  /**
   * Visit a module page and detect Angular Material patterns.
   * Wrapped in a 60-second timeout.
   */
  private async scanModule(sidebarPath: string[]): Promise<ModuleDescriptor> {
    const moduleName = sidebarPath[sidebarPath.length - 1];

    const scanWork = async (): Promise<ModuleDescriptor> => {
      // Dismiss any blocking modals before navigating
      await this.dismissBlockingModals();

      // Click through sidebar path to navigate to the module
      for (const segment of sidebarPath) {
        const link = this.page.locator(`${SELECTORS.sidebarNav}`).filter({ hasText: segment }).first();
        await link.click({ timeout: 10_000 });
        await this.page.waitForTimeout(500);
      }

      // Wait for page to load
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);

      // Detect page patterns
      await this.detectListPage();
      const formTriggerSelector = await this.detectFormTrigger();

      // If there's a form trigger, click it to extract form fields
      let fields: FieldDescriptor[] = [];
      if (formTriggerSelector) {
        try {
          await this.page.click(formTriggerSelector, { timeout: 5_000 });
          await this.page.waitForTimeout(1000);
          fields = await this.extractFormFields();
          // Dismiss the form/modal after extraction
          await this.dismissBlockingModals();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[DISCOVERY] Failed to open form for ${moduleName}: ${message}`);
        }
      }

      return {
        name: moduleName,
        sidebarPath,
        listPageUrl: this.page.url(),
        formTriggerSelector,
        fields,
      };
    };

    // Wrap in timeout
    return Promise.race([
      scanWork(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Module "${moduleName}" discovery timed out after ${DiscoveryEngine.MODULE_TIMEOUT_MS / 1000}s`)),
          DiscoveryEngine.MODULE_TIMEOUT_MS
        )
      ),
    ]);
  }

  /**
   * Detect mat-table and extract column names from mat-header-cell.
   */
  async detectListPage(): Promise<{ hasTable: boolean; columns: string[] }> {
    const table = await this.page.$(SELECTORS.matTable);
    if (!table) {
      // Also try generic table with role
      const genericTable = await this.page.$('table[role="table"]');
      if (!genericTable) {
        return { hasTable: false, columns: [] };
      }
    }

    const headerCells = await this.page.$$(SELECTORS.matHeaderCell);
    const columns: string[] = [];

    for (const cell of headerCells) {
      const text = (await cell.textContent())?.trim();
      if (text) {
        columns.push(text);
      }
    }

    return { hasTable: true, columns };
  }

  /**
   * Find "Add New", "Create", "Add", or equivalent action buttons.
   * Returns the selector string of the first found button, or null.
   */
  async detectFormTrigger(): Promise<string | null> {
    for (const text of FORM_TRIGGER_TEXTS) {
      const selector = `button:has-text("${text}")`;
      const button = await this.page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          console.log(`[DISCOVERY] Found form trigger: ${selector}`);
          return selector;
        }
      }
    }
    return null;
  }

  /**
   * Extract form fields from Angular Material form elements.
   */
  async extractFormFields(): Promise<FieldDescriptor[]> {
    const fields: FieldDescriptor[] = [];

    // Detect mat-form-field elements containing inputs
    const formFields = await this.page.$$(SELECTORS.matFormField);
    for (const formField of formFields) {
      const label = await formField.$eval(SELECTORS.matLabel, (el) => el.textContent?.trim() || '').catch(() => '');

      // Check what type of control is inside
      const hasSelect = await formField.$(SELECTORS.matSelect);
      if (hasSelect) {
        const selector = await this.buildFieldSelector(formField, 'mat-select', label);
        fields.push({
          label,
          type: 'dropdown',
          selector,
          maxlength: null,
          required: await this.isFieldRequired(formField),
        });
        continue;
      }

      const input = await formField.$('input');
      if (input) {
        const maxlengthAttr = await input.getAttribute('maxlength');
        const maxlength = maxlengthAttr ? parseInt(maxlengthAttr, 10) : null;
        const selector = await this.buildFieldSelector(formField, 'input', label);
        fields.push({
          label,
          type: 'text',
          selector,
          maxlength: maxlength !== null && !isNaN(maxlength) ? maxlength : null,
          required: await this.isFieldRequired(formField),
        });
        continue;
      }
    }

    // Detect standalone mat-checkbox elements
    const checkboxes = await this.page.$$(SELECTORS.matCheckbox);
    for (const checkbox of checkboxes) {
      const label = (await checkbox.textContent())?.trim() || '';
      fields.push({
        label,
        type: 'checkbox',
        selector: SELECTORS.matCheckbox,
        maxlength: null,
        required: false,
      });
    }

    // Detect standalone mat-radio-button elements
    const radios = await this.page.$$(SELECTORS.matRadio);
    for (const radio of radios) {
      const label = (await radio.textContent())?.trim() || '';
      fields.push({
        label,
        type: 'radio',
        selector: SELECTORS.matRadio,
        maxlength: null,
        required: false,
      });
    }

    // Detect standalone mat-slide-toggle elements
    const toggles = await this.page.$$(SELECTORS.matSlideToggle);
    for (const toggle of toggles) {
      const label = (await toggle.textContent())?.trim() || '';
      fields.push({
        label,
        type: 'toggle',
        selector: SELECTORS.matSlideToggle,
        maxlength: null,
        required: false,
      });
    }

    console.log(`[DISCOVERY] Extracted ${fields.length} form fields`);
    return fields;
  }

  /**
   * Dismiss blocking modals (unsaved changes dialog, etc.).
   */
  async dismissBlockingModals(): Promise<void> {
    try {
      const dialog = await this.page.$(SELECTORS.matDialog);
      const overlay = await this.page.$(SELECTORS.cdkOverlayBackdrop);

      if (dialog || overlay) {
        console.log('[DISCOVERY] Detected blocking modal, attempting to dismiss...');

        // Try clicking Cancel or Close button
        const dismissSelectors = [
          "button:has-text('Cancel')",
          "button:has-text('Close')",
          "button:has-text('No')",
          "button:has-text('Dismiss')",
        ];

        let dismissed = false;
        for (const selector of dismissSelectors) {
          const btn = await this.page.$(selector);
          if (btn && await btn.isVisible()) {
            await btn.click();
            dismissed = true;
            break;
          }
        }

        // If no dismiss button found, press Escape
        if (!dismissed) {
          await this.page.keyboard.press('Escape');
        }

        // Wait briefly for modal to close
        await this.page.waitForTimeout(500);
        console.log('[DISCOVERY] Modal dismissed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[DISCOVERY] Error dismissing modal: ${message}`);
    }
  }

  /**
   * Build a CSS selector for a field based on its label and type.
   */
  private async buildFieldSelector(
    formField: ReturnType<Page['$']> extends Promise<infer T> ? T : never,
    controlType: string,
    label: string
  ): Promise<string> {
    if (label) {
      return `mat-form-field:has(mat-label:text-is('${label}')) ${controlType}`;
    }
    // Fallback: use the control type directly
    return controlType;
  }

  /**
   * Check if a form field is required.
   */
  private async isFieldRequired(
    formField: ReturnType<Page['$']> extends Promise<infer T> ? T : never
  ): Promise<boolean> {
    if (!formField) return false;

    // Check for required attribute on input/select
    const hasRequiredAttr = await formField.evaluate((el) => {
      const input = el.querySelector('input, select, textarea, mat-select');
      if (!input) return false;
      return input.hasAttribute('required') || input.getAttribute('aria-required') === 'true';
    });

    if (hasRequiredAttr) return true;

    // Check for Angular [required] binding (class-based)
    const hasRequiredClass = await formField.evaluate((el) => {
      return el.classList.contains('mat-form-field-required') ||
        el.querySelector('.mat-mdc-form-field-required-marker') !== null;
    });

    return hasRequiredClass;
  }
}
