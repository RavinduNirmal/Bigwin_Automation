import { mergeTests, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage, DrawColumn } from '../../../pages/draw/lottery-draw-list.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import {
  createUniqueDraw,
  expectDrawInTab,
  expectDrawNotInTab,
  cleanupDraws,
  captureListRequest,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Draw list search: the box sends the query to POST /api/draw on Enter and mirrors it in the URL (?query=).
 * Matches code, draw number and brand name. Shared database: only the test's own AT draws and properties
 * that hold for every visible row are asserted.
 */
combinedTest.describe('Lottery Draw Search', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-SRCH-001: Search by Draw Code finds exactly the own draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-SRCH-001', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const body = await captureListRequest(page, () => list.searchDraws(draw.code), (b) => b.query === draw.code);
    expect(body.query, 'The list request must carry the typed code').toBe(draw.code);
    await expect(list.rowFor(draw.code), 'Exactly the own draw should be listed').toHaveCount(1);
    await expect(list.dataRows(), 'Only one row should match a full draw code').toHaveCount(1);
    await expect(page, 'The URL should mirror the query').toHaveURL(new RegExp(`query=${draw.code}`));
    await expect(list.pager(), 'Pager should show a single page').toHaveText(/of\s*1\s*$/);
    TestHelper.success('Search by code');
  });

  combinedTest('TC-LD-SRCH-002: Search by Draw Number finds the draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-SRCH-002', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const body = await captureListRequest(page, () => list.searchDraws(draw.drawNumber), (b) => b.query === draw.drawNumber);
    expect(body.query).toBe(draw.drawNumber);
    await expect(list.rowFor(`AT${draw.drawNumber}`), `Draw number ${draw.drawNumber} should find draw AT${draw.drawNumber}`).toHaveCount(1);
    TestHelper.success('Search by number');
  });

  combinedTest('TC-LD-SRCH-003: Search is case-insensitive and supports partial text', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-SRCH-003', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.searchDraws(draw.code.toLowerCase());
    await expect(list.rowFor(draw.code), 'A lower-case code should still find the draw').toHaveCount(1);
    await list.searchDraws(draw.code.slice(0, 7));
    await expect(list.rowFor(draw.code), 'A code prefix should still list the draw').toHaveCount(1);
    TestHelper.success('Case-insensitive + partial');
  });

  combinedTest('TC-LD-SRCH-004: Search by brand name returns that brand\'s draws', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-SRCH-004', page);
    await list.searchDraws('Mahajana');
    await expect
      .poll(async () => {
        const names = await list.columnValues('Lottery Name');
        return names.length > 0 && names.every((n) => /mahajana/i.test(n));
      }, { message: 'Every visible row should belong to a "Mahajana" brand (and there should be rows)' })
      .toBe(true);
    TestHelper.success('Search by brand');
  });

  combinedTest('TC-LD-SRCH-005: No match shows an empty table and a no-results message', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-SRCH-005', page);
    await list.searchDraws('ZZZNOPE123');
    await expect(list.dataRows(), 'No draw matches the term').toHaveCount(0);
    await expect(list.emptyStateMessage(), 'An empty search should tell the user nothing was found').toBeVisible({ timeout: 5000 });
    TestHelper.success('Empty state message');
  });

  combinedTest('TC-LD-SRCH-006: Clear (X) restores the full list', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-SRCH-006', page);
    await list.searchDraws('AT9');
    await expect(list.searchBox()).toHaveValue('AT9');
    const body = await captureListRequest(page, () => list.clearSearchButton().click(), (b) => b.query === '');
    expect(body.query, 'Clearing must re-request the list with an empty query').toBe('');
    await expect(list.searchBox(), 'The search box should be empty').toHaveValue('');
    await expect(list.dataRows(), 'The full list shows a page of 10 rows again').toHaveCount(10);
    TestHelper.success('Clear search');
  });

  combinedTest('TC-LD-SRCH-007: Search combined with a stage tab only searches that stage', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-SRCH-007', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await expectDrawNotInTab(list, draw.code, DRAW_TAB.REJECTED);
    await expectDrawInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    await expect(page, 'The URL should carry the tab and the query').toHaveURL(new RegExp(`view=underReview.*query=${draw.code}|query=${draw.code}.*view=underReview`));
    TestHelper.success('Search within a tab');
  });

  combinedTest('TC-LD-SRCH-008: Special characters, % and SQL text in search are handled safely', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-SRCH-008', page);
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    const terms = ['<img src=x onerror=alert(1)>', '\' OR 1=1 --', '%'];
    for (const term of terms) {
      await list.searchDraws(term);
      await expect(list.dataRows(), `"${term}" is a literal text and must match no draw (a "%" wildcard matching every draw is a defect)`).toHaveCount(0, { timeout: 10000 });
      expect(dialogs, `Searching "${term}" must not run a script`).toEqual([]);
    }
    TestHelper.success('Search input handled safely');
  });

  combinedTest('TC-LD-SRCH-009: Leading/trailing spaces are trimmed', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-SRCH-009', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.searchDraws(`  ${draw.code}  `);
    await expect(list.rowFor(draw.code), 'Surrounding spaces should be ignored and the draw found').toHaveCount(1, { timeout: 10000 });
    TestHelper.success('Whitespace trimmed');
  });
});
