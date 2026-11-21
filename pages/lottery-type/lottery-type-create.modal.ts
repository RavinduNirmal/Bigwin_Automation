import { Page, Locator, expect } from '@playwright/test';
import { BaseModal } from '../../components/modal.component';
import { lotteryTypeFormFields } from './lottery-type-form.fields';
import { LotteryTypeData, LotteryTypeStatus } from '../../data/factories/lottery-type-data.factory';

/**
 * "Create Lottery Type" dialog (opened by "Add New Type").
 * Fields: Code *, Type *, Status (ACTIVE | DISABLED, required). Buttons: Cancel, Create.
 * Empty Code/Type are blocked by the browser's native `required` check; once a field has been
 * touched the app shows "Code is required" / "Type is required" / "Status is required".
 * On success the dialog closes and the whole page reloads (no toast).
 * On failure: toast "Failed to create lottery type" and the dialog stays open.
 */
export class LotteryTypeCreateModal extends BaseModal {
  readonly codeInput: Locator;
  readonly typeInput: Locator;
  readonly statusSelect: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly title: Locator;

  /** Every code submitted through a Create/Update dialog in this test - used by afterEach cleanup. */
  static submittedCodes: string[] = [];

  constructor(page: Page) {
    super(page, { name: 'Create Lottery Type' });
    const fields = lotteryTypeFormFields(this.modal);
    this.codeInput = fields.code;
    this.typeInput = fields.type;
    this.statusSelect = fields.status;
    this.createButton = this.modal.getByRole('button', { name: 'Create', exact: true });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel', exact: true });
    this.title = this.modal.getByRole('heading', { name: 'Create Lottery Type' });
  }

  async waitForModal(timeout: number = 10000): Promise<void> {
    await expect(this.title, '"Create Lottery Type" dialog should open').toBeVisible({ timeout });
    this.logger.info('📋 Create lottery type dialog opened');
  }

  /** A validation message inside the dialog, e.g. "Code is required". */
  fieldMessage(text: string | RegExp): Locator {
    return this.modal.getByText(text, { exact: typeof text === 'string' });
  }

  async selectStatus(status: LotteryTypeStatus): Promise<void> {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await expect(this.statusSelect, `Status should show ${status}`).toHaveText(status);
  }

  async fillLotteryTypeData(data: Partial<LotteryTypeData>): Promise<void> {
    if (data.code !== undefined) await this.codeInput.fill(data.code);
    if (data.name !== undefined) await this.typeInput.fill(data.name);
    if (data.status) await this.selectStatus(data.status);
    this.logger.info(`📝 Filled lottery type: ${data.code} / ${data.name} / ${data.status}`);
  }

  async submitCreate(): Promise<void> {
    const code = (await this.codeInput.inputValue().catch(() => '')).trim();
    if (code) LotteryTypeCreateModal.submittedCodes.push(code);
    await this.createButton.click();
    this.logger.info('📤 Create form submitted');
  }

  async createLotteryType(data: LotteryTypeData): Promise<void> {
    await this.fillLotteryTypeData(data);
    await this.submitCreate();
  }

  async cancelCreate(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForClose();
    this.logger.info('❌ Create cancelled');
  }

  async verifyFieldsVisible(): Promise<void> {
    await expect(this.codeInput, 'Code field should be visible').toBeVisible();
    await expect(this.typeInput, 'Type field should be visible').toBeVisible();
    await expect(this.statusSelect, 'Status select should be visible').toBeVisible();
    await expect(this.createButton, '"Create" button should be visible').toBeVisible();
    await expect(this.cancelButton, '"Cancel" button should be visible').toBeVisible();
    this.logger.info('✅ All form fields visible');
  }
}
