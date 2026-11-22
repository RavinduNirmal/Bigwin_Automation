import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB, DrawTab } from '../../../data/factories/lottery-draw-data.factory';
import { createDrawWithTickets, waitForTicketsLoaded, waitForDrawStatus, verifyDrawInStageTab } from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);

/**
 * DEMO: one draw through every stage in about 5 minutes. The browser watches the "All" tab with the
 * draw's code in the search box, so the audience sees the Status column of that one row change.
 * Every change is then CONFIRMED on its own stage tab (click the tab, search, assert the draw is
 * listed there with that Status) - any missing/wrong stage fails the test - and the demo goes back to All:
 *   Under Review -> Pending Approval -> Approved -> In Play -> In Play Post Cutoff -> Completed.
 * Light on the backend: for the scheduled stages it waits (no requests) until the scheduled time + 5 s,
 * then searches - retrying every 15 s only if needed.
 * Schedule: ticket sales start 2 min after creation, cutoff at 3 min, draw at 4 min.
 * Run it headed:  npm run test:lottery-draw:demo
 * (Tagged @slow @demo, so normal draw runs skip it. The draw is real and on sale on dev for ~1 minute.)
 */
combinedTest.describe('Lottery Draw Demo', () => {
  combinedTest.describe.configure({ mode: 'default', timeout: 20 * 60 * 1000 });

  combinedTest('TC-LD-DEMO-001: Draw moves through every stage within about 5 minutes', { tag: ['@slow', '@demo'] },
    async ({ authenticatedPage, page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
      void authenticatedPage;
      CreateDrawPage.submittedCodes.length = 0;
      await TestHelper.initTest('TC-LD-DEMO-001', page);
      const confirmed: string[] = [];

      /** Back to the All tab with the draw searched - where the demo watches the status. */
      const watchAllTab = async () => {
        await list.selectTab(DRAW_TAB.ALL);
        await list.searchDraws(created.code);
      };
      /**
       * 1) wait until the All tab shows `status` for the draw (asserted), 2) click `tab` and assert the
       * draw is listed there with that status, 3) return to the All tab (unless it was the last stage).
       */
      const show = async (stage: string, status: RegExp, tabFor: (seen: string) => DrawTab, timeoutMs: number, notBefore?: Date, last = false) => {
        const seen = await waitForDrawStatus(list, created.code, status, timeoutMs, { everyMs: 15000, notBefore });
        await AllureHelpers.attachScreenshot(page, `All tab - Status: ${seen}`);
        const tab = tabFor(seen);
        const row = await verifyDrawInStageTab(list, created.code, tab, new RegExp(`^${seen}$`, 'i'));
        await AllureHelpers.attachScreenshot(page, `${tab} tab - ${created.code} listed`);
        await TestHelper.step(page, stage, `All tab shows "${seen}"; confirmed under the "${tab}" tab (Status "${row.status}")`);
        confirmed.push(tab);
        if (!last) await watchAllTab();
      };
      const fixedTab = (tab: DrawTab) => () => tab;
      const minutesUntil = (local: string) => Math.max(0, (new Date(local).getTime() - Date.now()) / 60000);
      /** Scheduled time + 5 s: when the server is expected to have switched the status. */
      const dueAt = (local: string) => new Date(new Date(local).getTime() + 5000);

      // 1. Create -> Under Review
      const draw = testLotteryDrawData.imminent(2, 3, 4);
      const created = await createDrawWithTickets(createDrawPage, draw, testLotteryDrawData.ticketFile(draw));
      await TestHelper.attachText('Demo draw', `${created.code} (id ${created.drawId})\nstart ${draw.issueStart}\ncutoff ${draw.issueCutoff}\ndraw ${draw.drawDate}`);
      await list.open();
      await watchAllTab();
      await show('Under Review', /^Under Review$/i, fixedTab(DRAW_TAB.UNDER_REVIEW), 30000);

      // 2. Review Draw (once the uploaded tickets are loaded) -> Pending Approval
      await page.waitForTimeout(30000); // tickets take ~30-60 s to load - don't ask before that
      await waitForTicketsLoaded(list, created.code, created.ticketCount, 5 * 60000, [15000]);
      const reviewed = await list.reviewDraw(created.code);
      expect(reviewed.status(), `Review of ${created.code} should succeed: ${await reviewed.text().catch(() => '')}`).toBeLessThan(400);
      await list.open();
      await watchAllTab();
      await show('Pending Approval', /^Pending Approval$/i, fixedTab(DRAW_TAB.PENDING_APPROVAL), 60000);

      // 3. Approve Draw with the upload MD5 -> Approved (goes straight to In Play if the start time already passed)
      const approved = await list.approveDraw(created.code, created.ticketFile.md5);
      expect(approved.status(), `Approve of ${created.code} should succeed: ${await approved.text().catch(() => '')}`).toBeLessThan(400);
      await list.open();
      await watchAllTab();
      await show('Approved', /^(Approved|In Play)$/i, (seen) => (/^In Play$/i.test(seen) ? DRAW_TAB.IN_PLAY : DRAW_TAB.APPROVED), 60000);

      // 4-6. Scheduled stages - watched on the All tab, each confirmed on its own tab
      await show('In Play', /^In Play$/i, fixedTab(DRAW_TAB.IN_PLAY), (minutesUntil(draw.issueStart) + 5) * 60000, dueAt(draw.issueStart));
      await show('In Play Post Cutoff', /cut ?off/i, fixedTab(DRAW_TAB.IN_PLAY_POST_CUTOFF), (minutesUntil(draw.issueCutoff) + 5) * 60000, dueAt(draw.issueCutoff));
      await show('Completed', /^Completed$/i, fixedTab(DRAW_TAB.COMPLETED), (minutesUntil(draw.drawDate) + 5) * 60000, dueAt(draw.drawDate), true);

      // every stage must have been confirmed on its tab, in order
      expect(confirmed.filter((t, i) => confirmed.indexOf(t) === i), 'Draw should be confirmed in every stage tab, in order').toEqual(
        confirmed.includes(DRAW_TAB.APPROVED)
          ? [DRAW_TAB.UNDER_REVIEW, DRAW_TAB.PENDING_APPROVAL, DRAW_TAB.APPROVED, DRAW_TAB.IN_PLAY, DRAW_TAB.IN_PLAY_POST_CUTOFF, DRAW_TAB.COMPLETED]
          : [DRAW_TAB.UNDER_REVIEW, DRAW_TAB.PENDING_APPROVAL, DRAW_TAB.IN_PLAY, DRAW_TAB.IN_PLAY_POST_CUTOFF, DRAW_TAB.COMPLETED]
      );
      TestHelper.success(`${created.code} went through all stages, each confirmed on its tab`);
    });
});
