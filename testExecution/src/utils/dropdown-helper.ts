/**
 * Dropdown Helper - Common utility for autocomplete/combobox dropdowns
 * 
 * This application uses Angular Material autocomplete inputs that require:
 * 1. Click to focus
 * 2. Type value (with delay for autocomplete to populate)
 * 3. Wait for options to load
 * 4. Select from mat-option list
 * 
 * Used by: Login dropdowns, Advanced Search fields, Modal form fields
 */
import type { Page, Locator } from "playwright";
import { Waits } from "@src/config/env";

export class DropdownHelper {
  constructor(private page: Page) {}

  /**
   * Select a value from an autocomplete dropdown by typing and selecting
   */
  async selectAutocompleteValue(
    locator: Locator | string,
    value: string,
    options: { typeDelay?: number; waitForPopulate?: number; waitAfterEnter?: number } = {}
  ) {
    const { typeDelay = Waits.TYPE_DELAY, waitForPopulate = Waits.AVG, waitAfterEnter = Waits.AVG } = options;
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;

    console.log(`[DROPDOWN] Selecting "${value}"`);
    await element.click({ force: true });
    await this.page.waitForTimeout(Waits.MIN);
    await element.pressSequentially(value, { delay: typeDelay });
    await this.page.waitForTimeout(waitForPopulate);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(Waits.MIN);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(waitAfterEnter);
    console.log(`[DROPDOWN] Selected "${value}"`);
  }

  /**
   * Select the first available option from an autocomplete dropdown
   */
  async selectFirstAutocompleteOption(
    locator: Locator | string,
    options: { waitForPopulate?: number; waitAfterEnter?: number } = {}
  ) {
    const { waitForPopulate = Waits.AVG, waitAfterEnter = Waits.AVG } = options;
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;

    console.log('[DROPDOWN] Selecting first option');
    await element.click({ force: true });
    await this.page.waitForTimeout(Waits.MIN);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(waitForPopulate);

    const matOption = this.page.locator('mat-option').first();
    if (await matOption.isVisible().catch(() => false)) {
      await matOption.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(waitAfterEnter);
    console.log('[DROPDOWN] First option selected');
  }

  /**
   * Select a value from a mat-select dropdown (not autocomplete)
   */
  async selectMatSelectValue(locator: Locator | string, value: string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    console.log(`[DROPDOWN] Selecting mat-select "${value}"`);
    await element.click();
    await this.page.waitForTimeout(Waits.MIN);
    await this.page.locator('mat-option').filter({ hasText: value }).click();
    await this.page.waitForTimeout(Waits.MIN);
  }

  /**
   * Try to select an exact value from autocomplete. If not found, fall back to first option.
   * Always logs the actual value that was selected.
   * 
   * @param locator - The input/combobox locator
   * @param preferredValue - The value to try first
   * @param fieldName - Human-readable field name for logging
   * @returns The actual value that was selected
   */
  async selectWithFallback(
    locator: Locator | string,
    preferredValue: string,
    fieldName: string,
    options: { typeDelay?: number; waitForPopulate?: number; waitAfterEnter?: number } = {}
  ): Promise<string> {
    const { typeDelay = Waits.TYPE_DELAY, waitForPopulate = Waits.AVG, waitAfterEnter = Waits.AVG } = options;
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;

    // Try exact value first
    console.log(`[DROPDOWN] ${fieldName}: trying preferred value "${preferredValue}"`);
    await element.click({ force: true });
    await this.page.waitForTimeout(Waits.MIN);
    await element.fill('');
    await element.pressSequentially(preferredValue, { delay: typeDelay });
    await this.page.waitForTimeout(waitForPopulate);

    // Check if any matching option appeared
    const matchingOption = this.page.locator('mat-option').first();
    if (await matchingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      const optionText = await matchingOption.textContent() || '';
      if (optionText.toLowerCase().includes(preferredValue.toLowerCase())) {
        // Wait for inert attribute to be removed before clicking
        await matchingOption.waitFor({ state: 'visible', timeout: Waits.AVG }).catch(() => {});
        await matchingOption.click({ force: true });
        await this.page.waitForTimeout(waitAfterEnter);
        const selectedValue = await element.inputValue().catch(() => optionText.trim());
        console.log(`[DROPDOWN] ${fieldName}: ✓ selected preferred value "${selectedValue}"`);
        return selectedValue;
      }
    }

    // Fallback: clear and select first option
    console.log(`[DROPDOWN] ${fieldName}: ⚠ preferred value "${preferredValue}" not found, falling back to first option`);
    await element.fill('');
    await this.page.waitForTimeout(Waits.MIN);
    // Use Tab instead of Escape to avoid closing dialogs/steppers
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(Waits.MIN);

    await element.click({ force: true });
    await this.page.waitForTimeout(Waits.MIN);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(waitForPopulate);

    const firstOption = this.page.locator('mat-option').first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click({ force: true });
    } else {
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(waitAfterEnter);

    const selectedValue = await element.inputValue().catch(() => 'unknown');
    console.log(`[DROPDOWN] ${fieldName}: ✓ fell back to "${selectedValue}"`);
    return selectedValue;
  }
}
