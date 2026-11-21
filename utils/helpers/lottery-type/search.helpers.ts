import { expect } from '@playwright/test';
import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';

/**
 * Search, then check the result shows every code in `shown` and none of the codes in `hidden`.
 * Only the test's OWN records are asserted on (other workers may add rows at any time).
 */
export async function searchAndVerify(
  lotteryTypePage: LotteryTypePage,
  term: string,
  shown: string[],
  hidden: string[]
): Promise<void> {
  await lotteryTypePage.searchLotteryTypes(term);
  for (const code of shown) {
    await expect(lotteryTypePage.rowFor(code).first(), `Searching "${term}" should show "${code}"`).toBeVisible({ timeout: 15000 });
  }
  for (const code of hidden) {
    await expect(lotteryTypePage.rowFor(code), `Searching "${term}" should NOT show "${code}"`).toHaveCount(0, { timeout: 15000 });
  }
}

/** Every visible data row's text contains `term` (case-insensitive). */
export async function expectAllRowsMatch(lotteryTypePage: LotteryTypePage, term: string): Promise<void> {
  await expect
    .poll(async () => {
      const rows = (await lotteryTypePage.dataRows().allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
      return rows.filter((r) => !r.toLowerCase().includes(term.toLowerCase()));
    }, { message: `Every row shown while searching "${term}" should contain it`, timeout: 15000 })
    .toEqual([]);
}
