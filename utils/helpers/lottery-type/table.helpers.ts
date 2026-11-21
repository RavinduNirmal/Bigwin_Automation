import { expect } from '@playwright/test';
import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';
import { LotteryTypeData } from '../../../data/factories/lottery-type-data.factory';

/**
 * Table checks for a test's OWN lottery types (found by their unique Code).
 *
 * The Lottery Type list shows every record on one page (the list API returns all rows), so these
 * helpers look the code up in the unfiltered table instead of going through the search box -
 * search is covered separately by lottery_type_search.spec.ts.
 */
export async function expectLotteryTypeInTable(lotteryTypePage: LotteryTypePage, code: string): Promise<void> {
  await expect(lotteryTypePage.rowFor(code).first(), `Lottery type "${code}" should be in the table`).toBeVisible({ timeout: 15000 });
}

export async function expectLotteryTypeNotInTable(lotteryTypePage: LotteryTypePage, code: string): Promise<void> {
  await expect(lotteryTypePage.rowFor(code), `Lottery type "${code}" should NOT be in the table`).toHaveCount(0, { timeout: 15000 });
}

/** Exactly `expected` rows carry this code (e.g. 1 after a rejected duplicate). */
export async function expectRowCountForCode(lotteryTypePage: LotteryTypePage, code: string, expected: number, message?: string): Promise<void> {
  await expect(lotteryTypePage.rowFor(code), message ?? `There should be exactly ${expected} row(s) with code "${code}"`).toHaveCount(expected, { timeout: 15000 });
}

/** The row for `code` shows the expected values (Status compared by its display label). */
export async function expectLotteryTypeSaved(
  lotteryTypePage: LotteryTypePage,
  code: string,
  expected: Partial<LotteryTypeData> & { stage?: string }
): Promise<void> {
  await lotteryTypePage.verifyLotteryTypeData(code, { code, ...expected });
}

/** Reload the page and check the record is still there with the same values. */
export async function expectPersistsAfterReload(
  lotteryTypePage: LotteryTypePage,
  data: Partial<LotteryTypeData> & { code: string; stage?: string }
): Promise<void> {
  await lotteryTypePage.reloadPage();
  await expectLotteryTypeSaved(lotteryTypePage, data.code, data);
}
