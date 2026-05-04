import type { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export type InteractionType =
  | 'more_options_menu'
  | 'more_options_item'
  | 'edit_form'
  | 'delete_confirmation'
  | 'row_expanded'
  | 'column_options'
  | 'search_filtered'
  | 'pagination_next';

export interface InteractiveElement {
  type: InteractionType;
  selector: string;
  label: string;
}

export interface ExplorerResult {
  discovered: InteractiveElement[];
  exercised: InteractiveElement[];
  skipped: InteractiveElement[];
  screenshotsCaptured: number;
}

// --- PageExplorer ---

export class PageExplorer {
  private static readonly ELEMENT_DEFINITIONS: Array<{
    type: InteractionType;
    selectors: string[];
    label: string;
  }> = [
    {
      type: 'more_options_menu',
      selectors: [
        'mat-row button:has(mat-icon:text-is("more_vert"))',
        'mat-row .mat-mdc-icon-button:has(mat-icon:text-is("more_vert"))',
      ],
      label: 'More Options Menu',
    },
    {
      type: 'edit_form',
      selectors: [
        'button[title="Edit"]',
        'mat-row:first-of-type button[title="Edit"]',
      ],
      label: 'Edit Button',
    },
    {
      type: 'delete_confirmation',
      selectors: [
        'button[title="Delete"]',
        'mat-row:first-of-type button[title="Delete"]',
      ],
      label: 'Delete Button',
    },
    {
      type: 'row_expanded',
      selectors: [
        '[aria-label*="details drawer"]',
        'mat-row:first-of-type button[aria-label*="expand"]',
        'mat-row.element-row:first-of-type',
      ],
      label: 'Row Expand/Collapse',
    },
    {
      type: 'column_options',
      selectors: [
        'button[aria-label*="Sort and Column options"]',
        'button[aria-label*="column options"]',
        'button:has(mat-icon:text-is("tune"))',
      ],
      label: 'Column Options',
    },
    {
      type: 'search_filtered',
      selectors: [
        '#main-content input[type="search"]',
        '#main-content input[placeholder*="Search"]',
      ],
      label: 'Search Input',
    },
    {
      type: 'pagination_next',
      selectors: [
        'button[aria-label="Next page"]',
        'button.mat-mdc-paginator-navigation-next',
      ],
      label: 'Paginator Next',
    },
  ];

  constructor(
    private page: Page,
    private envName: string,
    private screenshotDir: string
  ) {}

  async discoverElements(): Promise<InteractiveElement[]> {
    const discovered: InteractiveElement[] = [];

    for (const def of PageExplorer.ELEMENT_DEFINITIONS) {
      for (const selector of def.selectors) {
        try {
          const el = this.page.locator(selector).first();
          const isVisible = await el.isVisible({ timeout: 2000 });
          if (isVisible) {
            discovered.push({ type: def.type, selector, label: def.label });
            break;
          }
        } catch {
          // try next selector
        }
      }
    }

    return discovered;
  }

  async exerciseAll(moduleName: string): Promise<ExplorerResult> {
    const discovered = await this.discoverElements();
    const exercised: InteractiveElement[] = [];
    const skipped: InteractiveElement[] = [];
    let screenshotsCaptured = 0;

    for (const element of discovered) {
      try {
        const success = await this.exerciseElement(moduleName, element);
        if (success) {
          exercised.push(element);
          screenshotsCaptured++;
        } else {
          skipped.push(element);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[EXPLORER] Failed to exercise "${element.label}" for "${moduleName}": ${message}`);
        skipped.push(element);
        try {
          await this.page.reload({ waitUntil: 'networkidle' });
          console.warn(`[EXPLORER] Reloaded page after failure on "${element.label}"`);
        } catch {
          // ignore
        }
      }
    }

    return { discovered, exercised, skipped, screenshotsCaptured };
  }

  private async exerciseElement(moduleName: string, element: InteractiveElement): Promise<boolean> {
      console.log(`[EXPLORER] Exercising "${element.label}" for "${moduleName}"`);

      switch (element.type) {
        case 'more_options_menu': {
          try {
            const firstRow = this.page.locator('mat-row').first();
            await firstRow.hover({ timeout: 3000 });
            await this.page.waitForTimeout(300);
          } catch {
            // hover may not be needed
          }

          await this.page.locator(element.selector).first().click({ timeout: 5000 });
          // Wait for menu to appear
          try {
            await this.page.waitForSelector('[role="menu"], mat-menu', { state: 'visible', timeout: 5000 });
            await this.page.waitForTimeout(300);
          } catch {
            await this.page.waitForTimeout(600);
          }
          await this.captureScreenshot(moduleName, 'more_options_menu');

          const menuItemCount = await this.exerciseMenuItems(moduleName, element.selector);
          console.log(`[EXPLORER] Exercised ${menuItemCount} menu items for "${moduleName}"`);

          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
          return true;
        }

        case 'edit_form': {
          await this.page.locator(element.selector).first().click({ timeout: 5000 });
          // Wait for dialog to fully render including form fields
          try {
            await this.page.waitForSelector('mat-dialog-container', { state: 'visible', timeout: 10000 });
            // Wait for form fields to populate inside the dialog
            await this.page.waitForSelector('mat-dialog-container mat-form-field, mat-dialog-container input', {
              state: 'visible', timeout: 8000,
            });
            await this.page.waitForTimeout(800);
          } catch {
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(1200);
          }
          await this.captureScreenshot(moduleName, 'edit_form');
          await this.restoreState(element);
          return true;
        }

        case 'delete_confirmation': {
          await this.page.locator(element.selector).first().click({ timeout: 5000 });
          try {
            await this.page.waitForSelector('mat-dialog-container, [role="dialog"]', { state: 'visible', timeout: 5000 });
            await this.page.waitForTimeout(300);
          } catch {
            await this.page.waitForTimeout(600);
          }
          await this.captureScreenshot(moduleName, 'delete_confirmation');
          await this.restoreState(element);
          return true;
        }

        case 'row_expanded': {
          const el = this.page.locator(element.selector).first();
          await el.click({ timeout: 5000 });
          await this.page.waitForTimeout(600);
          await this.captureScreenshot(moduleName, 'row_expanded');
          try {
            await el.click({ timeout: 3000 });
          } catch {
            await this.page.keyboard.press('Escape');
          }
          return true;
        }

        case 'column_options': {
          await this.page.locator(element.selector).first().click({ timeout: 5000 });
          try {
            await this.page.waitForSelector('[role="menu"], .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
            await this.page.waitForTimeout(300);
          } catch {
            await this.page.waitForTimeout(600);
          }
          await this.captureScreenshot(moduleName, 'column_options');
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
          return true;
        }

        case 'search_filtered': {
          const searchInput = this.page.locator(element.selector).first();
          await searchInput.fill('test', { timeout: 5000 });
          await this.page.waitForTimeout(800);
          await this.page.waitForLoadState('networkidle');
          await this.captureScreenshot(moduleName, 'search_filtered');
          await searchInput.fill('');
          await this.page.waitForLoadState('networkidle');
          return true;
        }

        case 'pagination_next': {
          await this.page.locator(element.selector).first().click({ timeout: 5000 });
          await this.page.waitForLoadState('networkidle');
          await this.page.waitForTimeout(800);
          await this.captureScreenshot(moduleName, 'pagination_next');
          try {
            await this.page.locator('button[aria-label="Previous page"]').first().click({ timeout: 3000 });
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(500);
          } catch {
            // previous page may not be available
          }
          return true;
        }

        default:
          return false;
      }
    }


  private async restoreState(element: InteractiveElement): Promise<boolean> {
    try {
      switch (element.type) {
        case 'edit_form':
        case 'delete_confirmation': {
          // Scroll dialog to bottom to reveal Cancel button (dialog taller than viewport)
          try {
            await this.page.evaluate(() => {
              const dialog = document.querySelector('mat-dialog-container, mat-dialog-content, .mat-mdc-dialog-content');
              if (dialog) dialog.scrollTop = dialog.scrollHeight;
            });
            await this.page.waitForTimeout(300);
          } catch { /* ignore */ }

          const cancelBtn = this.page.locator('button:has-text("Cancel")').first();
          try {
            if (await cancelBtn.isVisible({ timeout: 3000 })) {
              await cancelBtn.scrollIntoViewIfNeeded();
              await cancelBtn.click({ force: true });
              await this.page.waitForTimeout(300);
              return true;
            }
          } catch {
            // fall through to Escape
          }
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
          return true;
        }

        case 'column_options':
        case 'more_options_menu': {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
          return true;
        }

        default:
          return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[EXPLORER] restoreState failed for "${element.type}": ${message}`);
      await this.page.reload({ waitUntil: 'networkidle' });
      return false;
    }
  }

  private async exerciseMenuItems(moduleName: string, menuTriggerSelector: string): Promise<number> {
    let itemsExercised = 0;

    try {
      const menuItemSelectors = ['[role="menu"] button', 'mat-menu-item', '[role="menuitem"]'];
      let menuItems: string[] = [];

      for (const sel of menuItemSelectors) {
        const items = await this.page.locator(sel).all();
        if (items.length > 0) {
          for (const item of items) {
            try {
              if (await item.isVisible({ timeout: 1000 })) {
                const text = (await item.textContent())?.trim() || '';
                if (text) menuItems.push(text);
              }
            } catch {
              // skip
            }
          }
          if (menuItems.length > 0) break;
        }
      }

      console.log(`[EXPLORER] Found ${menuItems.length} menu items for "${moduleName}"`);

      for (const itemLabel of menuItems) {
        const safeName = itemLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const stageName = `more_options_${safeName}`;

        try {
          const menuItem = this.page.locator(`[role="menu"] button:has-text("${itemLabel}"), mat-menu-item:has-text("${itemLabel}")`).first();
          await menuItem.click({ timeout: 3000 });
          await this.page.waitForTimeout(500);

          await this.captureScreenshot(moduleName, stageName);
          itemsExercised++;

          // Dismiss: reload the page to guarantee clean state
          // This handles all cases: dialogs, side panels, full-page navigation
          await this.page.reload({ waitUntil: 'networkidle' });
          await this.page.waitForSelector('mat-row', { timeout: 10000 });
          await this.page.waitForTimeout(1000);

          // Re-open menu for next item
          if (menuItems.indexOf(itemLabel) < menuItems.length - 1) {
            try {
              const firstRow = this.page.locator('mat-row').first();
              await firstRow.hover({ timeout: 3000 });
              await this.page.waitForTimeout(500);
            } catch {
              // hover may not be needed
            }
            await this.page.locator(menuTriggerSelector).first().click({ timeout: 5000 });
            await this.page.waitForTimeout(500);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[EXPLORER] Failed to exercise menu item "${itemLabel}": ${message}`);
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[EXPLORER] exerciseMenuItems failed: ${message}`);
    }

    return itemsExercised;
  }

  private async captureScreenshot(moduleName: string, stageName: string): Promise<void> {
    const filename = `${this.envName}_${moduleName}_${stageName}.png`;
    const filePath = path.join(this.screenshotDir, filename);
    fs.mkdirSync(this.screenshotDir, { recursive: true });
    // Ensure consistent viewport + wait for renders
    await this.page.setViewportSize({ width: 1366, height: 768 });
    // Move mouse away to avoid hover states on buttons/controls
    await this.page.mouse.move(0, 0);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(600);
    // Use clip to force exact dimensions — prevents scrollbar width differences
    await this.page.screenshot({
      path: filePath,
      clip: { x: 0, y: 0, width: 1366, height: 768 },
    });
    console.log(`[EXPLORER] Screenshot saved: ${filePath}`);
  }

  buildInteractionStageName(moduleName: string, type: InteractionType): string {
    return `${this.envName}_${moduleName}_${type}.png`;
  }
}
