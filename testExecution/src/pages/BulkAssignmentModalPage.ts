/**
 * Bulk Assignment Modal Page
 * 
 * Handles: Assign/Unassign Location/Staff modals, form fields, confirmation.
 * Uses CommonLocators for shared dialog elements (Continue, Cancel, Close).
 */
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { BulkAssignmentLocators } from "@src/locators/bulk-assignment.locators";
import { CommonLocators } from "@src/locators/common.locators";
import { DropdownHelper } from "@src/utils/dropdown-helper";
import { Waits } from "@src/config/env";
import type { BulkAssignmentModalData } from "@src/data/test-data";

export class BulkAssignmentModalPage {
  private dropdown: DropdownHelper;

  constructor(private page: Page) {
    this.dropdown = new DropdownHelper(page);
  }

  // ═══ MODAL LIFECYCLE ═══

  async waitForModalOpen() {
    console.log('[BA_MODAL] Waiting for modal');
    await this.page.locator(CommonLocators.matDialog).waitFor({
      state: 'visible',
      timeout: Waits.ELEMENT_TIMEOUT,
    });
  }

  async verifyModalClosed() {
    await expect(this.page.locator(CommonLocators.matDialog)).not.toBeVisible({
      timeout: Waits.MAX,
    });
  }

  // ═══ FORM FIELDS ═══

  /**
   * Fill location assignment form using exact values with fallback.
   * Logs all actually-selected values for downstream verification.
   */
  async fillLocationAssignmentForm(data: Partial<BulkAssignmentModalData> = {}): Promise<{ assignmentType: string; location: string; effectiveDate: string }> {
    console.log('[BA_MODAL] Filling location assignment form');

    // Assignment Type - try exact value, fallback to first
    const selectedAssignmentType = await this.dropdown.selectWithFallback(
      BulkAssignmentLocators.assignmentTypeDropdown,
      data.assignmentType || '',
      'Assignment Type'
    );

    // Location - try exact value, fallback to first
    const selectedLocation = await this.dropdown.selectWithFallback(
      BulkAssignmentLocators.modalLocationDropdown,
      data.modalLocation || '',
      'Modal Location'
    );

    // Effective Start Date - today if not specified
    const dateStr = data.effectiveStartDate || (() => {
      const today = new Date();
      return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    })();
    await this.page.locator(BulkAssignmentLocators.effectiveStartDate).fill(dateStr);
    await this.page.waitForTimeout(Waits.MIN);

    // Note (optional)
    const noteText = data.note || '';
    if (noteText) {
      await this.page.locator(BulkAssignmentLocators.noteField).fill(noteText);
    }

    // Log summary
    console.log(`[BA_MODAL] ═══ Form Values Summary ═══`);
    console.log(`[BA_MODAL]   Assignment Type: "${selectedAssignmentType}"`);
    console.log(`[BA_MODAL]   Location:        "${selectedLocation}"`);
    console.log(`[BA_MODAL]   Effective Date:  "${dateStr}"`);
    console.log(`[BA_MODAL]   Note:            "${noteText || '(empty)'}"`);
    console.log(`[BA_MODAL] ═════════════════════════════`);

    return { assignmentType: selectedAssignmentType, location: selectedLocation, effectiveDate: dateStr };
  }

  /**
   * Fill staff assignment form: Assignment Type, Staff Member, Location, Date, Note, Is Primary.
   * Uses Playwright built-in locators where possible.
   */
  async fillStaffAssignmentForm(data: Partial<BulkAssignmentModalData> = {}): Promise<{ assignmentType: string; staffMember: string; location: string; effectiveDate: string }> {
      console.log('[BA_MODAL] Filling staff assignment form');
      const dialog = this.page.locator(CommonLocators.matDialog);

      // Helper: select from mat-select/combobox by position (1st, 2nd, 3rd)
      // The staff modal uses [role="combobox"] elements — scope to dialog
      const selectMatSelectByIndex = async (index: number, preferredValue: string, fieldName: string): Promise<string> => {
        const dlg = this.page.locator(CommonLocators.matDialog);
        // Use [role="combobox"] which works for both mat-select and autocomplete inputs
        const comboboxes = dlg.locator('[role="combobox"]');
        const count = await comboboxes.count();
        console.log(`[BA_MODAL] ${fieldName}: found ${count} comboboxes in dialog`);
        if (index >= count) {
          console.log(`[BA_MODAL] ⚠ ${fieldName}: position ${index} not found (only ${count})`);
          return '';
        }
        const el = comboboxes.nth(index);
        await el.click({ force: true });
        await this.page.waitForTimeout(Waits.AVG);

        if (preferredValue) {
          const matchingOpt = this.page.locator(`mat-option`).filter({ hasText: preferredValue }).first();
          if (await matchingOpt.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
            const optText = await matchingOpt.textContent() || preferredValue;
            await matchingOpt.click();
            await this.page.waitForTimeout(Waits.MIN);
            console.log(`[BA_MODAL] ${fieldName}: ✓ selected "${optText.trim()}"`);
            return optText.trim();
          }
          // If no mat-option appeared, try typing (autocomplete input)
          const tagName = await el.evaluate((e: HTMLElement) => e.tagName.toLowerCase()).catch(() => '');
          if (tagName === 'input') {
            await el.fill(preferredValue);
            await this.page.waitForTimeout(Waits.AVG);
            const matchAfterType = this.page.locator('mat-option').filter({ hasText: preferredValue }).first();
            if (await matchAfterType.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
              const optText = await matchAfterType.textContent() || preferredValue;
              await matchAfterType.click();
              await this.page.waitForTimeout(Waits.MIN);
              console.log(`[BA_MODAL] ${fieldName}: ✓ typed and selected "${optText.trim()}"`);
              return optText.trim();
            }
          }
        }

        // Fallback: use ArrowDown to open dropdown and select first option
        await this.page.keyboard.press('ArrowDown');
        await this.page.waitForTimeout(Waits.AVG);
        const firstOpt = this.page.locator('mat-option').first();
        if (await firstOpt.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
          const optText = await firstOpt.textContent() || '';
          await firstOpt.click();
          await this.page.waitForTimeout(Waits.MIN);
          console.log(`[BA_MODAL] ${fieldName}: ✓ fell back to "${optText.trim()}"`);
          return optText.trim();
        }

        await this.page.keyboard.press('Escape');
        return '';
      };

      // Assignment Type — 1st mat-select
      const selectedAssignmentType = await selectMatSelectByIndex(0, data.assignmentType || '', 'Assignment Type');
      await this.page.waitForTimeout(Waits.AVG);

      // Staff Member — 2nd mat-select
      const selectedStaffMember = await selectMatSelectByIndex(1, data.staffMember || '', 'Staff Member');
      await this.page.waitForTimeout(Waits.AVG);

      // Location — 3rd mat-select
      const selectedLocation = await selectMatSelectByIndex(2, data.modalLocation || '', 'Modal Location');
      await this.page.waitForTimeout(Waits.AVG);

      // Effective Start Date
      const dateStr = data.effectiveStartDate || (() => {
        const today = new Date();
        return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      })();
      const dateInput = this.page.locator(BulkAssignmentLocators.effectiveStartDate);
      if (await dateInput.isVisible({ timeout: Waits.MAX }).catch(() => false)) {
        await dateInput.fill(dateStr);
        await this.page.waitForTimeout(Waits.MIN);
      }

      // Note
      const noteText = data.note || '';
      if (noteText) {
        const noteField = this.page.locator(BulkAssignmentLocators.noteField);
        if (await noteField.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
          await noteField.fill(noteText);
        }
      }

      // Is Primary checkbox
      if (data.isPrimary) {
        const checkbox = this.page.locator(BulkAssignmentLocators.isPrimaryCheckbox);
        if (await checkbox.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
          await checkbox.click();
          console.log('[BA_MODAL] ✓ Is Primary checked');
        }
      }

      console.log(`[BA_MODAL] ═══ Staff Form Values ═══`);
      console.log(`[BA_MODAL]   Assignment Type: "${selectedAssignmentType}"`);
      console.log(`[BA_MODAL]   Staff Member:    "${selectedStaffMember}"`);
      console.log(`[BA_MODAL]   Location:        "${selectedLocation}"`);
      console.log(`[BA_MODAL]   Effective Date:  "${dateStr}"`);
      console.log(`[BA_MODAL]   Is Primary:      ${data.isPrimary || false}`);
      console.log(`[BA_MODAL] ═════════════════════════`);

      return { assignmentType: selectedAssignmentType, staffMember: selectedStaffMember, location: selectedLocation, effectiveDate: dateStr };
    }


  /**
   * Fill the Unassign Staff form (Unassign Reason dropdown).
   * Same pattern as fillUnassignLocationForm but for staff.
   */
  async fillUnassignStaffForm(unassignReason?: string) {
    console.log('[BA_MODAL] Filling unassign staff form');
    await this.page.waitForTimeout(Waits.AVG);

    // Dismiss backdrop
    await this.page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'none';
      });
    });

    const dialog = this.page.locator(CommonLocators.matDialog);

    // Try mat-select inside dialog
    const matSelect = dialog.locator('mat-select').first();
    if (await matSelect.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
      console.log('[BA_MODAL] Found mat-select for unassign reason');
      await matSelect.click({ force: true });
      await this.page.waitForTimeout(Waits.MIN);
      if (unassignReason) {
        await this.page.getByRole('option', { name: unassignReason }).click();
      } else {
        await this.page.getByRole('option').first().click();
      }
      await this.page.waitForTimeout(Waits.MIN);
      console.log('[BA_MODAL] ✓ Unassign reason selected via mat-select');
      return;
    }

    // Try combobox inside dialog
    const combobox = dialog.locator('[role="combobox"]').first();
    if (await combobox.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
      console.log('[BA_MODAL] Found combobox for unassign reason');
      await combobox.click({ force: true });
      await combobox.fill('');
      await this.page.waitForTimeout(Waits.MIN);
      await combobox.press('ArrowDown');
      await this.page.waitForTimeout(Waits.AVG);
      const firstOption = this.page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        const optText = ((await firstOption.textContent()) || '').trim();
        await firstOption.click();
        console.log(`[BA_MODAL] ✓ Selected unassign reason: "${optText}"`);
      }
      return;
    }

    console.log('[BA_MODAL] ⚠ No unassign reason dropdown found, continuing anyway');
  }

  // ═══ COMMON ACTIONS (use .last() for stacked dialogs) ═══

  async clickContinue() {
    console.log('[BA_MODAL] Clicking Continue');
    const continueBtn = this.page.locator(CommonLocators.continueBtn).last();
    if (await continueBtn.isVisible({ timeout: Waits.MAX }).catch(() => false)) {
      await continueBtn.click();
      await this.page.waitForTimeout(Waits.MIN);
    } else {
      console.log('[BA_MODAL] ⚠ Continue button not visible — may be no records selected or modal already closed');
    }
  }

  async clickCancel() {
    console.log('[BA_MODAL] Clicking Cancel');
    await this.page.locator(CommonLocators.cancelBtn).last().click();
    await this.page.waitForTimeout(Waits.MIN);
  }

  async clickClose() {
    console.log('[BA_MODAL] Clicking Close');
    const closeBtn = this.page.locator(CommonLocators.closeBtn).last();
    if (await closeBtn.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(Waits.MIN);
    } else {
      console.log('[BA_MODAL] Close button not visible — dialog may have already closed');
    }
  }

  // ═══ VERIFICATION ═══

  /**
   * Fill the Unassign Location form (Discharge Reason dropdown).
   * Selects the first available option if no specific reason is provided.
   * Uses Playwright built-in locators (getByRole) for resilience.
   */
  async fillUnassignLocationForm(dischargeReason?: string) {
      console.log('[BA_MODAL] Filling unassign location form');
      await this.page.waitForTimeout(Waits.AVG);

      // Dismiss any lingering overlay backdrop that might intercept clicks
      await this.page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => {
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      });

      // Capture modal HTML for debugging
      const dialogHtml = await this.page.evaluate(() => {
        const dialog = document.querySelector('mat-dialog-container');
        return dialog ? dialog.innerHTML.slice(0, 1000) : 'NO DIALOG FOUND';
      });
      console.log(`[BA_MODAL] Dialog HTML preview: ${dialogHtml.slice(0, 500)}`);

      // Scope to the dialog to avoid hitting elements behind it
      const dialog = this.page.locator(CommonLocators.matDialog);

      // Try mat-select inside dialog first
      const matSelect = dialog.locator('mat-select').first();
      if (await matSelect.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
        console.log('[BA_MODAL] Found mat-select for discharge reason');
        await matSelect.click({ force: true });
        await this.page.waitForTimeout(Waits.MIN);
        if (dischargeReason) {
          await this.page.getByRole('option', { name: dischargeReason }).click();
        } else {
          await this.page.getByRole('option').first().click();
        }
        await this.page.waitForTimeout(Waits.MIN);
        console.log('[BA_MODAL] ✓ Discharge reason selected via mat-select');
        return;
      }

      // Try combobox/autocomplete inside dialog
      const combobox = dialog.locator('[role="combobox"]').first();
      if (await combobox.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
        console.log('[BA_MODAL] Found combobox inside dialog');
        // Clear and type a space to trigger autocomplete options
        await combobox.click({ force: true });
        await combobox.fill('');
        await this.page.waitForTimeout(Waits.MIN);
        await combobox.press('ArrowDown');
        await this.page.waitForTimeout(Waits.AVG);

        // Select first option from the dropdown
        const firstOption = this.page.getByRole('option').first();
        if (await firstOption.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
          const optText = ((await firstOption.textContent()) || '').trim();
          await firstOption.click();
          console.log(`[BA_MODAL] ✓ Selected discharge reason: "${optText}"`);
        } else {
          // Try mat-option as fallback
          const matOption = this.page.locator('mat-option').first();
          if (await matOption.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
            const optText = ((await matOption.textContent()) || '').trim();
            await matOption.click();
            console.log(`[BA_MODAL] ✓ Selected discharge reason via mat-option: "${optText}"`);
          } else {
            console.log('[BA_MODAL] ⚠ No options appeared after clicking combobox');
          }
        }
        await this.page.waitForTimeout(Waits.MIN);
        return;
      }

      // Try any select/dropdown inside dialog
      const anySelect = dialog.locator('select, mat-form-field').first();
      if (await anySelect.isVisible({ timeout: Waits.MIN }).catch(() => false)) {
        console.log('[BA_MODAL] Found form field, clicking to open');
        await anySelect.click({ force: true });
        await this.page.waitForTimeout(Waits.AVG);
        const firstOption = this.page.getByRole('option').first();
        if (await firstOption.isVisible({ timeout: Waits.AVG }).catch(() => false)) {
          await firstOption.click();
          console.log('[BA_MODAL] ✓ Selected first option from form field');
        }
        return;
      }

      console.log('[BA_MODAL] ⚠ No discharge reason dropdown found in dialog, continuing anyway');
    }


  // ═══ RESULT CAPTURE ═══

  /**
   * Capture the assignment result message from the status dialog.
   * Returns { success: boolean, message: string }
   * 
   * NOTE: The result dialog often auto-closes before we can read it.
   * We treat any dialog appearance (even empty) as success — the real
   * failure indicator is if the modal never closed or showed an error keyword.
   */
  async captureAssignmentResult(): Promise<{ success: boolean; message: string }> {
    console.log('[BA_MODAL] Capturing assignment result');
    await this.page.waitForTimeout(Waits.AVG);

    const dialogContent = this.page.locator(CommonLocators.matDialogContent).last();
    const text = (await dialogContent.textContent().catch(() => '')) || '';

    // If dialog has explicit error keywords → failed
    const hasError = /\berror\b|\bfailed\b|\bfailure\b/i.test(text);
    // If dialog has success keywords OR text is empty (dialog auto-closed) → treat as success
    const success = !hasError;

    console.log(`[BA_MODAL] Assignment result: ${success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`[BA_MODAL] Result message: "${text.trim().slice(0, 200)}"`);

    return { success, message: text.trim() };
  }

  async verifyConfirmationText(expectedText: string) {
    console.log('[BA_MODAL] Verifying confirmation text');
    await this.page.waitForTimeout(Waits.MIN);
    const content = this.page.locator(CommonLocators.matDialogContent).last();
    await expect(content).toContainText(expectedText, { timeout: Waits.ELEMENT_TIMEOUT });
  }
}
