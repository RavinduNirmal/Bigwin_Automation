import { expect, Locator } from '@playwright/test';
import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import { LotteryTypeData, LotteryTypeStatus } from '../../../data/factories/lottery-type-data.factory';
import { Logger } from '../../logger';
import { AllureHelpers } from '../../allure-helpers';
import { TestHelper } from '../common/test-helper';
import { toastWithText, visibleToastTexts } from '../common/toast.helpers';
import { expectLotteryTypeInTable, expectRowCountForCode } from './table.helpers';

const logger = new Logger();

/** Anything that can hand out a fresh unique lottery type (the `testLotteryTypeData` fixture). */
export interface LotteryTypeDataSource {
  unique(status?: LotteryTypeStatus): LotteryTypeData;
}

/** Create a new uniquely-coded lottery type through the UI and return its data. */
export async function createUniqueLotteryType(
  lotteryTypePage: LotteryTypePage,
  source: LotteryTypeDataSource,
  status: LotteryTypeStatus = 'ACTIVE',
  options: { verifySaved?: boolean } = {}
): Promise<LotteryTypeData> {
  const data = source.unique(status);
  await lotteryTypePage.createLotteryType(data);
  if (options.verifySaved) {
    await expectLotteryTypeInTable(lotteryTypePage, data.code);
  }
  logger.info(`✅ Created unique lottery type: ${data.code}`);
  return data;
}

/**
 * Submit the (already filled) Create dialog and expect the SERVER to reject it:
 * an error toast is shown, the dialog stays open and no new row appears.
 * `rowsWithCodeAfter` = how many rows may carry the code afterwards (1 for a duplicate, 0 otherwise).
 */
export async function submitCreateAndExpectRejected(
  lotteryTypePage: LotteryTypePage,
  modal: LotteryTypeCreateModal,
  code: string,
  expectedToast: RegExp,
  description: string,
  rowsWithCodeAfter: number = 0
): Promise<void> {
  const page = lotteryTypePage.page;
  const reloaded = page.waitForEvent('load', { timeout: 15000 }).then(() => true, () => false);
  await modal.submitCreate();
  const rejected = await toastWithText(page, expectedToast).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  if (!rejected) {
    const saved = await reloaded;
    const toasts = await visibleToastTexts(page);
    await AllureHelpers.attachScreenshot(page, `${description} - not rejected`);
    throw new Error(
      `${description} was NOT rejected: expected a toast matching ${expectedToast}. ` +
      `Page ${saved ? 'reloaded (the record was saved)' : 'did not reload'}; toasts: ${toasts.length ? `"${toasts.join('", "')}"` : 'NONE'}`
    );
  }
  await expect(modal.getModal(), 'The dialog should stay open after a rejected save').toBeVisible();
  await TestHelper.attachText('Validation Result', `${description} rejected: "${(await visibleToastTexts(page)).join('", "')}"`);
  await AllureHelpers.attachScreenshot(page, `${description} Rejected`);
  await modal.cancelCreate();
  await lotteryTypePage.reloadPage();
  await expectRowCountForCode(lotteryTypePage, code, rowsWithCodeAfter, `${description}: no extra record should have been saved for "${code}"`);
}

/**
 * The form must refuse to save on the CLIENT side: `message` is shown in the dialog, the dialog
 * stays open, and the record does not exist afterwards.
 */
export async function expectCreateBlocked(
  lotteryTypePage: LotteryTypePage,
  modal: LotteryTypeCreateModal,
  message: Locator,
  code: string,
  description: string
): Promise<void> {
  await expect(message, `${description}: the validation message should be shown`).toBeVisible({ timeout: 10000 });
  await expect(modal.getModal(), `${description}: the dialog should stay open`).toBeVisible();
  await AllureHelpers.attachScreenshot(lotteryTypePage.page, `${description} - blocked`);
  await modal.cancelCreate();
  if (code) {
    await lotteryTypePage.reloadPage();
    await expectRowCountForCode(lotteryTypePage, code, 0, `${description}: "${code.slice(0, 40)}" must not be saved`);
  }
}

/**
 * Submit the Create dialog and expect it to be refused (by the browser's `required` check, by a
 * client message, or by the server). Fails if the page reloads, i.e. the record was saved.
 */
export async function expectCreateNotSaved(
  lotteryTypePage: LotteryTypePage,
  modal: LotteryTypeCreateModal,
  code: string,
  description: string
): Promise<void> {
  const page = lotteryTypePage.page;
  const reloaded = page.waitForEvent('load', { timeout: 10000 }).then(() => true, () => false);
  await modal.submitCreate();
  const saved = await reloaded;
  if (saved) {
    await lotteryTypePage.verifyPageLoaded();
    const row = await lotteryTypePage.getLotteryTypeData(code).catch(() => null);
    throw new Error(
      `${description} was ACCEPTED: the dialog closed and the page reloaded` +
      (row ? `; the table now shows "${row.code}" with Type "${row.name}"` : '')
    );
  }
  await expect(modal.getModal(), `${description}: the dialog should stay open`).toBeVisible();
  await modal.cancelCreate();
}
