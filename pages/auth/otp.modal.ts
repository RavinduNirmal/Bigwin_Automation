import { Page, Locator, expect } from '@playwright/test';
import { BaseModal } from '../../components/modal.component';

/**
 * "Verify OTP" dialog shown after a correct email + password.
 * The dialog has NO accessible name (its title is not linked to it), so it is found by its text.
 * Messages: "OTP is required", "OTP must be 6 digits".
 * A valid OTP triggers a native alert "Successfully validated OTP" (a wrong one: "Failed to validate OTP").
 */
export class OtpModal extends BaseModal {
  readonly otpInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly title: Locator;
  /** Text of the last native alert raised by submitOtp(). */
  lastAlertMessage = '';

  constructor(page: Page) {
    super(page, { hasText: 'Verify OTP' });
    this.otpInput = this.modal.getByRole('textbox', { name: 'Enter 6-digit OTP' });
    this.submitButton = this.modal.getByRole('button', { name: 'Submit', exact: true });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel', exact: true });
    this.title = this.modal.getByRole('heading', { name: 'Verify OTP' });
  }

  async waitForModal(timeout: number = 90000): Promise<void> {
    await expect(this.title, '"Verify OTP" dialog should open after valid credentials').toBeVisible({ timeout });
    this.logger.info('📋 OTP dialog opened');
  }

  fieldMessage(text: string): Locator {
    return this.modal.getByText(text, { exact: true });
  }

  async enterOtp(otp: string): Promise<void> {
    await this.otpInput.fill(otp);
  }

  /**
   * Fill the OTP and submit. The app answers with a native alert(); it is accepted here and its
   * text kept in `lastAlertMessage` (Playwright would otherwise dismiss it silently).
   */
  async submitOtp(otp: string): Promise<void> {
    await this.enterOtp(otp);
    this.lastAlertMessage = '';
    const alertShown = this.page.waitForEvent('dialog', { timeout: 60000 }).then(async (dialog) => {
      this.lastAlertMessage = dialog.message();
      await dialog.accept();
    });
    await this.submitButton.click();
    await alertShown;
    this.logger.info(`📤 OTP submitted - app said: "${this.lastAlertMessage}"`);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForClose();
    this.logger.info('❌ OTP dialog cancelled');
  }
}
