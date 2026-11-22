import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB, DRAW_TAB_STATUS } from '../../../data/factories/lottery-draw-data.factory';
import {
  createDrawWithTickets,
  reviewDrawAndVerify,
  approveDrawAndVerify,
  waitForDrawStatus,
  verifyDrawInStageTab,
} from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);

/**
 * Scheduled stages of an approved draw (the server moves it on its own):
 *   Approved -> In Play (at Ticket Issue Start) -> In Play Post Cutoff (at Cutoff) -> Completed (at Draw Date).
 * Each change is watched on the All tab (no requests until the scheduled time + 5 s, then one search
 * every 30 s) and then confirmed by clicking its stage tab - the draw must be listed there with that Status.
 * Uses a draw whose times are a few minutes away, so this test is SLOW (~15-40 min). Run it on its own:
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
      await reviewDrawAndVerify(list, created.code);                              // All tab + Pending Approval tab
      await approveDrawAndVerify(list, created.code, created.ticketFile.md5);     // All tab + Approved tab
      await TestHelper.attachText('Schedule', `start ${draw.issueStart}\ncutoff ${draw.issueCutoff}\ndraw ${draw.drawDate}`);

      const minutesUntil = (local: string) => Math.max(0, (new Date(local).getTime() - Date.now()) / 60000);
      const dueAt = (local: string) => new Date(new Date(local).getTime() + 5000);
      const grace = 15; // minutes the scheduler may lag behind the scheduled time

      const stage = async (tab: typeof DRAW_TAB.IN_PLAY | typeof DRAW_TAB.IN_PLAY_POST_CUTOFF | typeof DRAW_TAB.COMPLETED, scheduled: string) => {
        await list.selectTab(DRAW_TAB.ALL);
        await list.searchDraws(created.code);
        const seen = await waitForDrawStatus(list, created.code, DRAW_TAB_STATUS[tab], (minutesUntil(scheduled) + grace) * 60000,
          { everyMs: 30000, notBefore: dueAt(scheduled) });
        const row = await verifyDrawInStageTab(list, created.code, tab, DRAW_TAB_STATUS[tab]);
        await AllureHelpers.attachScreenshot(page, `${tab} tab - ${created.code}`);
        await TestHelper.step(page, tab, `All tab shows "${seen}"; listed under the "${tab}" tab (Status "${row.status}")`);
      };

      await stage(DRAW_TAB.IN_PLAY, draw.issueStart);
      await stage(DRAW_TAB.IN_PLAY_POST_CUTOFF, draw.issueCutoff);
      await stage(DRAW_TAB.COMPLETED, draw.drawDate);
      TestHelper.success('Draw moved through all scheduled stages, each confirmed on its tab');
    });
});

combinedTest.describe('Lottery Draw Lifecycle - Past Schedule', () => {
  combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

  combinedTest('TC-LD-LC-002: A draw with start/cutoff in the past is not accepted or goes straight In Play', async ({ authenticatedPage, page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await TestHelper.initTest('TC-LD-LC-002', page);
    await list.goto();

    // 1. Meta: Create Draw open, schedule in the past (Create Draw is never submitted)
    const draw = testLotteryDrawData.unique({ issueStart: '2020-01-01T10:00', issueCutoff: '2020-01-02T10:00', drawDate: '2020-01-03T10:00' });
    await create.open();
    await create.fillDetails(draw);

    // 2. Click Next; a confirm (if any) is dismissed so Step 2 never opens and nothing is created
    const confirm = await create.clickNextAndDismiss();

    await expect(create.fieldError(/must be in the future|cannot be in the past|future date/i),
      'Dates in the past (2020) should be refused with an inline error (the app accepts them and asks for confirmation)').toBeVisible({ timeout: 5000 });
    expect(confirm, 'No create confirmation should be offered for a past schedule').toBeNull();
    await expect(create.uploadHeading, 'Step 2 must not open').toBeHidden();
    TestHelper.success('Past schedule refused');
  });
});
