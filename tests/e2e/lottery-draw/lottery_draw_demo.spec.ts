import { mergeTests } from '@playwright/test';
import { test } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB, DrawTab } from '../../../data/factories/lottery-draw-data.factory';
import {
  createDrawWithTickets,
  expectDrawInTab,
  reviewDrawAndVerify,
  approveDrawAndVerify,
  waitForDrawInTab,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);

/**
 * DEMO: one draw through every stage in about 5 minutes, showing each stage in its tab:
 *   Under Review -> Pending Approval -> Approved -> In Play -> In Play Post Cutoff -> Completed.
 * Schedule: ticket sales start 2 min after creation, cutoff at 3 min, draw at 4 min.
 * Run it headed to watch:  npm run test:lottery-draw:demo
 * (Tagged @slow @demo, so normal draw runs skip it. The draw is real and on sale on dev for ~1 minute.)
 */
combinedTest.describe('Lottery Draw Demo', () => {
  combinedTest.describe.configure({ mode: 'default', timeout: 20 * 60 * 1000 });

  combinedTest('TC-LD-DEMO-001: Draw moves through every stage within about 5 minutes', { tag: ['@slow', '@demo'] },
    async ({ authenticatedPage, page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
      void authenticatedPage;
      CreateDrawPage.submittedCodes.length = 0;
      await TestHelper.initTest('TC-LD-DEMO-001', page);
      const shot = async (stage: DrawTab) => {
        await AllureHelpers.attachScreenshot(page, `Stage: ${stage}`);
        await TestHelper.step(page, stage, `Draw shown under "${stage}"`);
      };

      // 1. Create -> Under Review
      const draw = testLotteryDrawData.imminent(2, 3, 4);
      const created = await createDrawWithTickets(createDrawPage, draw, testLotteryDrawData.ticketFile(draw));
      await TestHelper.attachText('Demo draw', `${created.code} (id ${created.drawId})\nstart ${draw.issueStart}\ncutoff ${draw.issueCutoff}\ndraw ${draw.drawDate}`);
      await list.open();
      await expectDrawInTab(list, created.code, DRAW_TAB.UNDER_REVIEW);
      await shot(DRAW_TAB.UNDER_REVIEW);

      // 2. Review Draw -> Pending Approval (waits for the uploaded tickets first)
      await reviewDrawAndVerify(list, created.code, created.ticketCount);
      await shot(DRAW_TAB.PENDING_APPROVAL);

      // 3. Approve Draw with the upload MD5 -> Approved (In Play right away if the start time has already passed)
      await approveDrawAndVerify(list, created.code, created.ticketFile.md5);
      if (await list.isListedIn(created.code, DRAW_TAB.APPROVED)) await shot(DRAW_TAB.APPROVED);

      // 4-6. Scheduled stages, checked every 10 s
      const minutesUntil = (local: string) => Math.max(0, (new Date(local).getTime() - Date.now()) / 60000);
      for (const [tab, at] of [
        [DRAW_TAB.IN_PLAY, draw.issueStart],
        [DRAW_TAB.IN_PLAY_POST_CUTOFF, draw.issueCutoff],
        [DRAW_TAB.COMPLETED, draw.drawDate],
      ] as const) {
        await waitForDrawInTab(list, created.code, tab, (minutesUntil(at) + 5) * 60000, 10000);
        await shot(tab);
      }
      TestHelper.success(`${created.code} went through all stages`);
    });
});
