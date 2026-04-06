import type { Page, Locator } from "playwright";

/**
 * Dropdown Helper - Common utility for autocomplete/combobox dropdowns
 * 
 * This application uses Angular Material autocomplete inputs that require:
 * 1. Click to focus
 * 2. Type value (with delay for autocomplete to populate)
 * 3. Wait for options to load
 * 4. ArrowDown + Enter to select
 * 
 * Used by: Login dropdowns, Advanced Search fields, Modal form fields
 */
export class DropdownHelper {
  constructor(private page: Page) {}

  /**
   * Select a value from an autocomplete dropdown by typing and selecting
   * @param locator - The input/combobox locator
   * @param value - The value to type and select
   * @param options - Optional configuration
   */
  async selectAutocompleteValue(
    locator: Locator | string,
    value: string,
    options: {
      typeDelay?: number;
      waitForPopulate?: number;
      waitAfterArrowDown?: number;
      waitAfterEnter?: number;
    } = {}
  ) {
    const {
      typeDelay = 150,
      waitForPopulate = 3000,
      waitAfterArrowDown = 1000,
      waitAfterEnter = 2000,
    } = options;

    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    console.log(`[DROPDOWN] Selecting "${value}"`);
    await element.click({ force: true });
    await this.page.waitForTimeout(1000);
    
    // Type the value with delay to allow autocomplete to work
    await element.pressSequentially(value, { delay: typeDelay });
    await this.page.waitForTimeout(waitForPopulate);
    
    // Select with ArrowDown + Enter
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(waitAfterArrowDown);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(waitAfterEnter);
    
    console.log(`[DROPDOWN] Selected "${value}"`);
  }

  /**
   * Select the first available option from an autocomplete dropdown
   * @param locator - The input/combobox locator
   * @param options - Optional configuration
   */
  async selectFirstAutocompleteOption(
    locator: Locator | string,
    options: {
      waitForPopulate?: number;
      waitAfterArrowDown?: number;
      waitAfterEnter?: number;
    } = {}
  ) {
    const {
      waitForPopulate = 2000,
      waitAfterArrowDown = 1000,
      waitAfterEnter = 2000,
    } = options;

    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    console.log(`[DROPDOWN] Selecting first option`);
    await element.click({ force: true });
    await this.page.waitForTimeout(1000);
    
    // Trigger dropdown by pressing ArrowDown
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(waitForPopulate);
    
    // Check if mat-option is visible
    const matOption = this.page.locator('mat-option').first();
    if (await matOption.isVisible().catch(() => false)) {
      await matOption.click();
    } else {
      // Fallback: press Enter to select highlighted option
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(waitAfterEnter);
    
    console.log(`[DROPDOWN] First option selected`);
  }

  /**
   * Select a value from a mat-select dropdown (not autocomplete)
   * @param locator - The mat-select locator
   * @param value - The option text to select
   */
  async selectMatSelectValue(locator: Locator | string, value: string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    console.log(`[DROPDOWN] Selecting mat-select value "${value}"`);
    await element.click();
    await this.page.waitForTimeout(500);
    
    const option = this.page.locator('mat-option').filter({ hasText: value });
    await option.click();
    await this.page.waitForTimeout(500);
    
    console.log(`[DROPDOWN] Selected "${value}"`);
  }

  /**
   * Select the first option from a mat-select dropdown
   * @param locator - The mat-select locator
   */
  async selectFirstMatSelectOption(locator: Locator | string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    console.log(`[DROPDOWN] Selecting first mat-select option`);
    await element.click();
    await this.page.waitForTimeout(500);
    
    const option = this.page.locator('mat-option').first();
    await option.click();
    await this.page.waitForTimeout(500);
    
    console.log(`[DROPDOWN] First option selected`);
  }
}
