import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * Base Modal Component
 * 
 * Industry Best Practices:
 * - Base modal operations
 * - Reusable across modals
 */
export abstract class BaseModal {
  readonly page: Page;
  protected readonly logger: Logger;
  readonly modal: Locator;

  /**
   * @param name the dialog's accessible name (its title), e.g. "Create Lottery Type".
   *   Some BigWin dialogs (e.g. the login "Verify OTP" dialog) have no accessible name -
   *   pass `hasText` instead to identify them by visible text.
   */
  constructor(page: Page, options: { name?: string; hasText?: string } = {}) {
    this.page = page;
    this.logger = new Logger();
    const dialog = options.name ? page.getByRole('dialog', { name: options.name }) : page.getByRole('dialog');
    this.modal = options.hasText ? dialog.filter({ hasText: options.hasText }) : dialog;
  }

  /**
   * Get modal locator
   */
  getModal(): Locator {
    return this.modal;
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal(timeout: number = 5000): Promise<void> {
    await expect(this.modal, 'A dialog should open').toBeVisible({ timeout });
    this.logger.info('✅ Modal visible');
  }

  /**
   * Wait for modal to close
   */
  async waitForClose(timeout: number = 5000): Promise<void> {
    await expect(this.modal, 'The dialog should close').not.toBeVisible({ timeout });
    this.logger.info('✅ Modal closed');
  }

  /**
   * Close modal (ESC key)
   */
  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.waitForClose();
    this.logger.info('✅ Modal closed with Escape key');
  }

  /**
   * Click backdrop to close
   */
  async closeWithBackdrop(): Promise<void> {
    await this.page.mouse.click(10, 10);
    await this.waitForClose();
    this.logger.info('✅ Modal closed with backdrop click');
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible().catch(() => false);
  }

  /**
   * Check if modal is closed
   */
  async isClosed(): Promise<boolean> {
    return !(await this.isVisible());
  }

  /**
   * Take screenshot of modal
   */
  async takeScreenshot(name: string): Promise<void> {
    const screenshot = await this.modal.screenshot();
    // Allure attachment will be handled by fixtures
    this.logger.info(`📸 Modal screenshot: ${name}`);
  }
}