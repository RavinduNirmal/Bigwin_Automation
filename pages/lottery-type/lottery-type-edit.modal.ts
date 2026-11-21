import { Page, Locator, expect } from '@playwright/test';
import { BaseModal } from '../../components/modal.component';
import { lotteryTypeFormFields } from './lottery-type-form.fields';
import { LotteryTypeCreateModal } from './lottery-type-create.modal';
import { LotteryTypeData, LotteryTypeStatus } from '../../data/factories/lottery-type-data.factory';

/**
 * "Update Lottery Type" dialog (row actions menu -> Edit).
 * Fields: Code *, Type *, Status, Stage (read-only, e.g. "Under Review").
 * Buttons: Review (maker-checker workflow - NOT used by the tests), Cancel, Update.
 * On success the dialog closes and the page reloads (no toast).
 */
export class LotteryTypeEditModal extends BaseModal {
  readonly codeInput: Locator;
  readonly typeInput: Locator;
  readonly statusSelect: Locator;
  readonly stageInput: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;
  readonly reviewButton: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    super(page, { name: 'Update Lottery Type' });
    const fields = lotteryTypeFormFields(this.modal);
    this.codeInput = fields.code;
    this.typeInput = fields.type;
    this.statusSelect = fields.status;
    this.stageInput = fields.stage;
    this.updateButton = this.modal.getByRole('button', { name: 'Update', exact: true });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel', exact: true });
    this.reviewButton = this.modal.getByRole('button', { name: 'Review', exact: true });
    this.title = this.modal.getByRole('heading', { name: 'Update Lottery Type' });
  }

  async waitForModal(timeout: number = 10000): Promise<void> {
    await expect(this.title, '"Update Lottery Type" dialog should open').toBeVisible({ timeout });
    this.logger.info('📋 Update lottery type dialog opened');
  }

  fieldMessage(text: string | RegExp): Locator {
    return this.modal.getByText(text, { exact: typeof text === 'string' });
  }

  async getCurrentData(): Promise<{ code: string; name: string; status: string; stage: string }> {
    return {
      code: await this.codeInput.inputValue(),
      name: await this.typeInput.inputValue(),
      status: (await this.statusSelect.innerText()).trim(),
      stage: await this.stageInput.inputValue(),
    };
  }

  async selectStatus(status: LotteryTypeStatus): Promise<void> {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await expect(this.statusSelect, `Status should show ${status}`).toHaveText(status);
  }

  /** Change only the given fields (does not submit). */
  async changeFields(data: Partial<LotteryTypeData>): Promise<void> {
    if (data.code !== undefined) await this.codeInput.fill(data.code);
    if (data.name !== undefined) await this.typeInput.fill(data.name);
    if (data.status) await this.selectStatus(data.status);
    this.logger.info(`📝 Changed lottery type fields: ${JSON.stringify(data)}`);
  }

  async submitUpdate(): Promise<void> {
    const code = (await this.codeInput.inputValue().catch(() => '')).trim();
    if (code) LotteryTypeCreateModal.submittedCodes.push(code);
    await this.updateButton.click();
    this.logger.info('📤 Update form submitted');
  }

  async updateLotteryType(data: Partial<LotteryTypeData>): Promise<void> {
    await this.changeFields(data);
    await this.submitUpdate();
  }

  async cancelUpdate(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForClose();
    this.logger.info('❌ Update cancelled');
  }

  async verifyFieldsVisible(): Promise<void> {
    await expect(this.codeInput, 'Code field should be visible').toBeVisible();
    await expect(this.typeInput, 'Type field should be visible').toBeVisible();
    await expect(this.statusSelect, 'Status select should be visible').toBeVisible();
    await expect(this.stageInput, 'Stage field should be visible').toBeVisible();
    await expect(this.updateButton, '"Update" button should be visible').toBeVisible();
    await expect(this.cancelButton, '"Cancel" button should be visible').toBeVisible();
    this.logger.info('✅ All form fields visible');
  }
}
