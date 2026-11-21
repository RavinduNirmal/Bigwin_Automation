import { expect, Locator, Page } from '@playwright/test';

/**
 * BigWin toasts (react-hot-toast) have role="status".
 * `includeHidden: true` because an open MUI dialog marks the rest of the page aria-hidden.
 */
export const toastWithText = (page: Page, text: string | RegExp): Locator =>
  page.getByRole('status', { includeHidden: true }).filter({ hasText: text });

export const successToast = (page: Page): Locator => toastWithText(page, /success/i);

export const errorToast = (page: Page): Locator =>
  toastWithText(page, /error|fail|invalid|already|exist|not found|no user|something went wrong/i);

/** All toast texts currently shown (for error messages / attachments). */
export async function visibleToastTexts(page: Page): Promise<string[]> {
  return (await page.getByRole('status', { includeHidden: true }).allInnerTexts()).map((t) => t.trim()).filter(Boolean);
}

export async function waitForToastsToClear(page: Page): Promise<void> {
  await expect(successToast(page).or(errorToast(page)), 'Previous toasts should clear first').toHaveCount(0, { timeout: 15000 });
}
