import { mergeTests } from '@playwright/test';
import { test } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import {
  createDrawWithTickets,
  reviewDrawAndVerify,
  approveDrawAndVerify,
  waitForDrawInTab,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);

/**
 * Scheduled stages of an approved draw (the server moves it on its own):
 *   Approved -> In Play (at Ticket Issue Start) -> In Play Post Cutoff (at Cutoff) -> Completed (at Draw Date).
 * Uses a draw whose times are a few minutes away, so this test is SLOW (~20-40 min). Run it on its own:
 *   npm run test:lottery-draw:lifecycle
 * The draw is real and playable on dev between its start and cutoff (Mahajana Sampatha, "AT..." code).
 */
combinedTest.describe('Lottery Draw Lifecycle', () => {
  combinedTest.describe.configure({ mode: 'default', timeout: 60 * 60 * 1000 });

  combinedTest('TC-LD-LC-001: Approved draw goes In Play, then In Play Post Cutoff, then Completed on schedule', { tag: '@slow' },
    async ({ authenticatedPage, page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
      void authenticatedPage;
      CreateDrawPage.submittedCodes.length = 0;
      await TestHelper.initTest('TC-LD-LC-001', page);
      // start in 4 min (time to create + review + approve), cutoff in 9, draw in 14
      const draw = testLotteryDrawData.imminent(4, 9, 14);
      const created = await createDrawWithTickets(createDrawPage, draw, testLotteryDrawData.ticketFile(draw));
      await reviewDrawAndVerify(list, created.code);
      await approveDrawAndVerify(list, created.code, created.ticketFile.md5);
      await TestHelper.attachText('Schedule', `start ${draw.issueStart}\ncutoff ${draw.issueCutoff}\ndraw ${draw.drawDate}`);

      const minutesUntil = (local: string) => Math.max(0, (new Date(local).getTime() - Date.now()) / 60000);
      const grace = 15; // minutes the scheduler may lag behind the scheduled time
      await waitForDrawInTab(list, created.code, DRAW_TAB.IN_PLAY, (minutesUntil(draw.issueStart) + grace) * 60000);
      await TestHelper.step(page, 'In Play', `${created.code} is In Play`);
      await waitForDrawInTab(list, created.code, DRAW_TAB.IN_PLAY_POST_CUTOFF, (minutesUntil(draw.issueCutoff) + grace) * 60000);
      await TestHelper.step(page, 'In Play Post Cutoff', `${created.code} is past its cutoff`);
      await waitForDrawInTab(list, created.code, DRAW_TAB.COMPLETED, (minutesUntil(draw.drawDate) + grace) * 60000);
      await TestHelper.step(page, 'Completed', `${created.code} is Completed`);
      TestHelper.success('Draw moved through all scheduled stages');
    });
});
