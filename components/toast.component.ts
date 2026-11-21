import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * BigWin toasts come from react-hot-toast and are exposed as role="status" (aria-live), e.g.
 *   "Invalid email or password."            (login, wrong password)
 *   "Failed to create lottery type"         (create rejected)
 *   "Lottery type deleted successfuly"      (sic - the app's spelling)
 * Successful create / update show NO toast - the page simply reloads.
 * `includeHidden: true` because an open MUI dialog marks the rest of the page aria-hidden.
 */
export class ToastComponent {
  private readonly page: Page;
  private readonly logger: Logger;
  private readonly toast: Locator;
  private readonly successToast: Locator;
  private readonly errorToast: Locator;
  private readonly networkErrorToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger();
    this.toast = page.getByRole('status', { includeHidden: true });
    this.successToast = this.toast.filter({ hasText: /success/i });
    this.errorToast = this.toast.filter({ hasText: /error|fail|invalid|already|exist|not found|no user/i });
    this.networkErrorToast = this.toast.filter({ hasText: /Network Error|Connection Error|Failed to fetch|Something went wrong/i });
  }

  getToast(): Locator {
    return this.toast;
  }

  /** Toast whose text matches `text`. */
  withText(text: string | RegExp): Locator {
    return this.toast.filter({ hasText: text });
  }

  async verifySuccessToast(expectedMessage: string | RegExp = /success/i): Promise<void> {
    await expect(this.toast.filter({ hasText: expectedMessage }).first(), `Success toast ${expectedMessage} should be shown`).toBeVisible({ timeout: 10000 });
    this.logger.info(`✅ Success toast: ${expectedMessage}`);
  }

  async verifyErrorToast(expectedMessage?: string | RegExp): Promise<void> {
    const toast = expectedMessage ? this.toast.filter({ hasText: expectedMessage }) : this.errorToast;
    await expect(toast.first(), `Error toast ${expectedMessage ?? ''} should be shown`).toBeVisible({ timeout: 30000 });
    this.logger.info(`❌ Error toast: ${expectedMessage ?? await toast.first().innerText()}`);
  }

  async verifyNetworkErrorToast(): Promise<void> {
    await expect(this.networkErrorToast.first(), 'A network error toast should be shown').toBeVisible({ timeout: 10000 });
    this.logger.info('🌐 Network error toast displayed');
  }

  async getToastMessages(): Promise<string[]> {
    return (await this.toast.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  async waitForToastDisappear(timeout: number = 10000): Promise<void> {
    await expect(this.successToast.or(this.errorToast), 'Toasts should disappear').toHaveCount(0, { timeout });
    this.logger.info('✅ Toast disappeared');
  }
}
