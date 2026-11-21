import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';
import { expectLotteryTypeInTable, expectLotteryTypeNotInTable } from './table.helpers';

/**
 * Delete via the row menu and verify the row is gone.
 * (BigWin deletes immediately - there is no confirmation dialog - and then reloads the page.)
 */
export async function deleteAndVerify(lotteryTypePage: LotteryTypePage, code: string): Promise<void> {
  await expectLotteryTypeInTable(lotteryTypePage, code);
  await lotteryTypePage.deleteLotteryType(code);
  await expectLotteryTypeNotInTable(lotteryTypePage, code);
}
