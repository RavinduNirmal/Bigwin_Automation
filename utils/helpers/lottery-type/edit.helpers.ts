import { expect, Locator } from '@playwright/test';
import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';
import { LotteryTypeEditModal } from '../../../pages/lottery-type/lottery-type-edit.modal';
import { LotteryTypeData, LotteryTypeStatus } from '../../../data/factories/lottery-type-data.factory';
import { AllureHelpers } from '../../allure-helpers';
import { TestHelper } from '../common/test-helper';
import { toastWithText, visibleToastTexts } from '../common/toast.helpers';
import { createUniqueLotteryType, LotteryTypeDataSource } from './create.helpers';
import { expectLotteryTypeSaved } from './table.helpers';

/** Create a fresh lottery type and open its Update dialog. */
export async function createAndOpenEdit(
  lotteryTypePage: LotteryTypePage,
  source: LotteryTypeDataSource,
  status: LotteryTypeStatus = 'ACTIVE'
): Promise<{ lotteryType: LotteryTypeData; editModal: LotteryTypeEditModal }> {
  const lotteryType = await createUniqueLotteryType(lotteryTypePage, source, status, { verifySaved: true });
  const editModal = await lotteryTypePage.openEditModal(lotteryType.code);
  return { lotteryType, editModal };
}

/**
 * Submit the Update dialog and expect it to be saved: the dialog closes, the page reloads and
 * the row for `finalCode` shows the expected values.
 */
export async function expectEditSaved(
  lotteryTypePage: LotteryTypePage,
  editModal: LotteryTypeEditModal,
  finalCode: string,
  expected: Partial<LotteryTypeData> & { stage?: string }
): Promise<void> {
  const page = lotteryTypePage.page;
  const reloaded = page.waitForEvent('load', { timeout: 30000 }).then(() => true, () => false);
  await editModal.submitUpdate();
  if (!(await reloaded)) {
    const toasts = await visibleToastTexts(page);
    const dialogText = (await editModal.getModal().innerText().catch(() => '')).replace(/\s+/g, ' ');
    throw new Error(
      `Update was NOT saved. Dialog ${(await editModal.isVisible()) ? 'stayed open' : 'closed'}; ` +
      `toast: ${toasts.length ? `"${toasts.join('", "')}"` : 'NONE'}; dialog text: "${dialogText.slice(0, 160)}"`
    );
  }
  await lotteryTypePage.verifyPageLoaded();
  await expectLotteryTypeSaved(lotteryTypePage, finalCode, expected);
}

/**
 * The Update dialog must refuse the change on the client: `message` shown, dialog open.
 * After cancelling, the row still shows the original values.
 */
export async function expectEditRejected(
  lotteryTypePage: LotteryTypePage,
  editModal: LotteryTypeEditModal,
  original: LotteryTypeData,
  message: Locator,
  description: string
): Promise<void> {
  await expect(message, `${description} should be shown`).toBeVisible({ timeout: 10000 });
  await expect(editModal.getModal(), 'The dialog should stay open').toBeVisible();
  await editModal.cancelUpdate();
  await lotteryTypePage.reloadPage();
  await expectLotteryTypeSaved(lotteryTypePage, original.code, { name: original.name, status: original.status });
}

/**
 * Submit the Update dialog and expect the SERVER to reject it (error toast, dialog stays open).
 * The original record must be unchanged afterwards.
 */
export async function expectUpdateRejected(
  lotteryTypePage: LotteryTypePage,
  editModal: LotteryTypeEditModal,
  original: LotteryTypeData,
  expectedToast: RegExp,
  description: string
): Promise<void> {
  const page = lotteryTypePage.page;
  const reloaded = page.waitForEvent('load', { timeout: 15000 }).then(() => true, () => false);
  await editModal.submitUpdate();
  const rejected = await toastWithText(page, expectedToast).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  if (!rejected) {
    const saved = await reloaded;
    await AllureHelpers.attachScreenshot(page, `${description} - no error message`);
    const toasts = await visibleToastTexts(page);
    throw new Error(
      saved
        ? `${description} was ACCEPTED: the page reloaded (the change was saved) instead of showing an error`
        : `${description}: the save did not go through, but NO error message was shown to the user ` +
          `(expected a toast matching ${expectedToast}; dialog ${(await editModal.isVisible()) ? 'just stayed open' : 'closed'}; ` +
          `toasts: ${toasts.length ? `"${toasts.join('", "')}"` : 'none'})`
    );
  }
  await TestHelper.attachText('Validation Result', `${description} rejected: "${(await visibleToastTexts(page)).join('", "')}"`);
  if (await editModal.isVisible()) await editModal.cancelUpdate();
  await lotteryTypePage.reloadPage();
  await expectLotteryTypeSaved(lotteryTypePage, original.code, { name: original.name, status: original.status });
}
