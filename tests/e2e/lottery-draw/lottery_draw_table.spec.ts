import { mergeTests, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage, DrawColumn } from '../../../pages/draw/lottery-draw-list.page';
import { DRAW_TAB, DRAW_TAB_STATUS, DrawTab } from '../../../data/factories/lottery-draw-data.factory';
import {
  createUniqueDraw,
  verifyDrawStatusChange,
  cleanupDraws,
  captureListRequest,
  DrawListRequest,
  parseDrawDate,
  isOrdered,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Draw list tabs, paging, sorting, column toggles. The list API (POST /api/draw {view, page, sortBy, sortDir})
 * is read through page.waitForRequest. Shared database: only properties of the visible rows are asserted
 * (every row in the tab, monotonic order), never counts or the first row.
 */
combinedTest.describe('Lottery Draw Table', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-TBL-001: Each stage tab sends its view and shows only that stage', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-001', page);
    const tabs: Array<[Exclude<DrawTab, 'All'>, string]> = [
      [DRAW_TAB.UNDER_REVIEW, 'underReview'],
      [DRAW_TAB.PENDING_APPROVAL, 'pendingApproval'],
      [DRAW_TAB.APPROVED, 'approved'],
      [DRAW_TAB.REJECTED, 'rejected'],
      [DRAW_TAB.ON_HOLD, 'onHold'],
    ];
    for (const [tab, view] of tabs) {
      const body = await captureListRequest(page, () => list.selectTab(tab), (b) => b.view === view);
      expect(body.view, `Tab "${tab}" must request view=${view}`).toBe(view);
      await expect(list.tab(tab)).toHaveAttribute('aria-selected', 'true');
      await expect(page, `URL should carry view=${view}`).toHaveURL(new RegExp(`view=${view}`));
      await expect
        .poll(async () => (await list.columnValues('Status')).every((s) => DRAW_TAB_STATUS[tab].test(s)), {
          message: `Every Status under "${tab}" should belong to that stage`,
        })
        .toBe(true);
    }
    TestHelper.success('Stage tabs filter');
  });

  combinedTest('TC-LD-TBL-002: In Play, In Play Post Cutoff, Completed, Winning Uploaded and Deleted tabs load', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-002', page);
    const tabs: DrawTab[] = [DRAW_TAB.IN_PLAY, DRAW_TAB.IN_PLAY_POST_CUTOFF, DRAW_TAB.COMPLETED, DRAW_TAB.WINNING_UPLOADED, DRAW_TAB.DELETED];
    for (const tab of tabs) {
      const response = page.waitForResponse((r) => /\/api\/draw$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
      await list.tab(tab).click();
      expect((await response).status(), `Tab "${tab}" list request should succeed`).toBe(200);
      await expect(list.tab(tab)).toHaveAttribute('aria-selected', 'true');
      await expect(list.dataTable(), `Table should render under "${tab}"`).toBeVisible();
      await expect(list.toast(/error|fail/i), `No error toast under "${tab}"`).toHaveCount(0);
    }
    TestHelper.success('Remaining tabs load');
  });

  combinedTest('TC-LD-TBL-003: A new draw appears under Under Review and in no other stage tab', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-TBL-003', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const tabs = Object.values(DRAW_TAB);
    const listed: Record<string, boolean> = {};
    for (const tab of tabs) listed[tab] = await list.isListedIn(draw.code, tab);
    await TestHelper.attachText('Tab membership', JSON.stringify(listed, null, 2));
    for (const tab of tabs) {
      const expected = tab === DRAW_TAB.ALL || tab === DRAW_TAB.UNDER_REVIEW;
      expect(listed[tab], `Draw ${draw.code} ${expected ? 'should' : 'should NOT'} be listed under "${tab}"`).toBe(expected);
    }
    TestHelper.success('Tab membership');
  });

  combinedTest('TC-LD-TBL-004: Default order is newest Draw Date first', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-004', page);
    const body = await captureListRequest(page, () => list.open());
    expect(body.sortBy, 'Default sort column').toBe('endDate');
    expect(body.sortDir, 'Default sort direction').toBe('desc');
    await expect
      .poll(async () => isOrdered((await list.columnValues('Draw Date')).map(parseDrawDate).filter(Number.isFinite), 'desc'), {
        message: 'Draw Dates should be non-increasing (newest first)',
      })
      .toBe(true);
    TestHelper.success('Default order');
  });

  combinedTest('TC-LD-TBL-005: Draw Date header toggles ascending/descending', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-005', page);
    const asc = await captureListRequest(page, () => list.sortButton('Draw Date').click());
    expect(asc.sortBy).toBe('endDate');
    expect(asc.sortDir, 'First click reverses the default order').toBe('asc');
    await expect
      .poll(async () => isOrdered((await list.columnValues('Draw Date')).map(parseDrawDate).filter(Number.isFinite), 'asc'), { message: 'Draw Dates should be non-decreasing' })
      .toBe(true);
    const desc = await captureListRequest(page, () => list.sortButton('Draw Date').click());
    expect(desc.sortDir, 'Second click sorts descending again').toBe('desc');
    await expect
      .poll(async () => isOrdered((await list.columnValues('Draw Date')).map(parseDrawDate).filter(Number.isFinite), 'desc'), { message: 'Draw Dates should be non-increasing' })
      .toBe(true);
    TestHelper.success('Draw Date toggle');
  });

  combinedTest('TC-LD-TBL-006: Draw Code, Status, Start Date and Ticket Count headers sort', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-006', page);
    const columns: Array<[DrawColumn, string]> = [
      ['Draw Code', 'drawCode'],
      ['Status', 'status'],
      ['Start Date', 'startDate'],
      ['Ticket Count', 'ticketCount'],
    ];
    for (const [column, key] of columns) {
      const body = await captureListRequest(page, () => list.sortButton(column).click(), (b) => b.sortBy === key);
      expect(body.sortDir, `${column}: first click sorts ascending`).toBe('asc');
      expect(body.page, `${column}: sorting re-queries page 1`).toBe(0);
      await expect(page, `URL should carry sortBy=${key}`).toHaveURL(new RegExp(`sortBy=${key}`));
      await expect(page).toHaveURL(/sortDir=asc/);
      // Status order follows the server's status codes, not the displayed text - only its request is checked.
      if (column === 'Draw Code') {
        await expect
          .poll(async () => isOrdered((await list.columnValues(column)).map((v) => v.toLowerCase()), 'asc'), { message: 'Draw Codes should ascend' })
          .toBe(true);
      } else if (column === 'Start Date') {
        await expect
          .poll(async () => isOrdered((await list.columnValues(column)).map(parseDrawDate).filter(Number.isFinite), 'asc'), { message: 'Start Dates should ascend' })
          .toBe(true);
      } else if (column === 'Ticket Count') {
        await expect
          .poll(async () => isOrdered((await list.columnValues(column)).map((v) => Number(v.replace(/,/g, ''))).filter(Number.isFinite), 'asc'), { message: 'Ticket Counts should ascend' })
          .toBe(true);
      }
    }
    TestHelper.success('Column sorts');
  });

  combinedTest('TC-LD-TBL-007: Cut Off Date and Remaining Count are not sortable', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-007', page);
    const requests: DrawListRequest[] = [];
    page.on('request', (r) => {
      if (/\/api\/draw$/.test(new URL(r.url()).pathname) && r.method() === 'POST') requests.push((r.postDataJSON() ?? {}) as DrawListRequest);
    });
    for (const column of ['Cut Off Date', 'Remaining Count'] as const) {
      await expect(list.columnHeader(column).getByRole('button'), `${column} has no sort control`).toHaveCount(0);
      await list.columnHeader(column).click();
    }
    // A sortable header afterwards proves any earlier click would already have produced a request.
    await captureListRequest(page, () => list.sortButton('Draw Code').click(), (b) => b.sortBy === 'drawCode');
    expect(requests.map((r) => r.sortBy), 'Only the Draw Code click may have requested the list').toEqual(['drawCode']);
    TestHelper.success('Non-sortable headers');
  });

  combinedTest('TC-LD-TBL-008: Next/previous page buttons and page input navigate', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-008', page);
    await expect(list.dataRows()).toHaveCount(10);
    await expect(list.pageInput()).toHaveValue('1');
    const firstPageRows = await list.dataRows().allInnerTexts();

    const next = await captureListRequest(page, () => list.pagerButtons().last().click());
    expect(next.page, 'Next requests page index 1').toBe(1);
    await expect(list.pageInput()).toHaveValue('2');
    await expect(list.dataRows()).toHaveCount(10);
    await expect.poll(async () => (await list.dataRows().allInnerTexts()).join('|'), { message: 'Page 2 must show different rows than page 1' }).not.toBe(firstPageRows.join('|'));

    const prev = await captureListRequest(page, () => list.pagerButtons().first().click());
    expect(prev.page, 'Previous requests page index 0').toBe(0);
    await expect(list.pageInput()).toHaveValue('1');

    const jump = await captureListRequest(page, async () => {
      await list.pageInput().fill('3');
      await list.pageInput().press('Enter');
    });
    expect(jump.page, 'Typing 3 requests page index 2').toBe(2);
    await expect(list.pageInput()).toHaveValue('3');
    await expect(list.dataRows()).toHaveCount(10);

    const last = await list.totalPages();
    await captureListRequest(page, async () => {
      await list.pageInput().fill(String(last));
      await list.pageInput().press('Enter');
    });
    await expect(list.pageInput()).toHaveValue(String(last));
    await expect(list.pagerButtons().last(), 'Next is disabled on the last page').toBeDisabled();
    TestHelper.success('Paging');
  });

  combinedTest('TC-LD-TBL-009: Out-of-range page numbers are clamped', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-009', page);
    const last = await list.totalPages();
    expect(last, 'The All tab has several pages').toBeGreaterThan(1);
    await captureListRequest(page, async () => {
      await list.pageInput().fill(String(last));
      await list.pageInput().press('Enter');
    });
    await expect(list.pageInput()).toHaveValue(String(last));
    for (const value of ['999', '0', 'abc']) {
      await list.pageInput().fill(value);
      await list.pageInput().press('Enter');
      await expect(list.pageInput(), `Typing "${value}" must leave the last valid page selected`).toHaveValue(String(last));
      await expect(list.dataRows().first(), 'Table still shows rows').toBeVisible();
    }
    TestHelper.success('Page clamping');
  });

  combinedTest('TC-LD-TBL-010: Switching tab resets to page 1', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-010', page);
    await captureListRequest(page, () => list.pagerButtons().last().click(), (b) => b.page === 1);
    await expect(list.pageInput()).toHaveValue('2');
    const body = await captureListRequest(page, () => list.selectTab(DRAW_TAB.REJECTED), (b) => b.view === 'rejected');
    expect(body.page, 'A new tab starts at page index 0').toBe(0);
    await expect(list.pageInput()).toHaveValue('1');
    TestHelper.success('Tab resets paging');
  });

  combinedTest('TC-LD-TBL-011: Quick toggle chips hide and show columns and persist', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-011', page);
    const soldHeader = list.columnHeader('Sold %');
    try {
      await page.evaluate(() => localStorage.removeItem('drawTableVisibleColumns'));
      await page.reload();
      await list.verifyPageLoaded();
      await expect(soldHeader, '"Sold %" is hidden by default').toBeHidden();
      await expect(list.columnHeader('Type')).toBeVisible();

      await list.quickToggleChip('Sold %').click();
      await list.quickToggleChip('Type').click();
      await expect(soldHeader, '"Sold %" column should appear').toBeVisible();
      await expect(list.columnHeader('Type'), '"Type" column should disappear').toBeHidden();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('drawTableVisibleColumns')), { message: 'Choice should be stored in localStorage' })
        .not.toContain('"type"');

      await page.reload();
      await list.verifyPageLoaded();
      await expect(soldHeader, '"Sold %" survives a reload').toBeVisible();
      await expect(list.columnHeader('Type'), '"Type" stays hidden after a reload').toBeHidden();

      for (const fixed of ['Draw Code', 'Lottery Name', 'Status']) {
        await expect(list.quickToggleChip(fixed), `"${fixed}" cannot be toggled`).toHaveCount(0);
      }
    } finally {
      await page.evaluate(() => localStorage.removeItem('drawTableVisibleColumns'));
    }
    TestHelper.success('Quick toggles');
  });

  combinedTest('TC-LD-TBL-012: Opening the list does not issue per-row error requests', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-TBL-012', page);
    const failed: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    // legacy draws (brand id 2) are the oldest: sort by Draw Date ascending
    const ticketUploads = page.waitForResponse((r) => /ticket-upload\/draw\//.test(r.url()));
    await page.goto('/dashboard/draw?sortBy=endDate&sortDir=asc');
    await list.verifyPageLoaded();
    await ticketUploads;
    await expect(list.dataRows().first()).toBeVisible();
    // the oldest draws must really be on screen (Draw Date ascending), otherwise the check proves nothing
    const dates = (await list.columnValues('Draw Date')).map(parseDrawDate).filter(Number.isFinite);
    await TestHelper.attachText('Draw Dates on screen', JSON.stringify(dates.map((d) => new Date(d).toISOString())));
    expect(isOrdered(dates, 'asc'), 'The list should show the oldest draws first (sortBy=endDate&sortDir=asc)').toBe(true);
    // let the per-row brand / ticket-upload requests finish
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await TestHelper.attachText('Failed requests', failed.join('\n') || 'none');
    expect(failed, 'Opening the Draws list must not trigger failing requests').toEqual([]);
    TestHelper.success('No failing requests');
  });

  combinedTest('TC-LD-TBL-013: Status column shows On Hold Under Review for a held draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-TBL-013', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const held = await list.holdDraw(draw.code);
    expect(held.status(), 'Hold Draw should succeed').toBeLessThan(400);
    try {
      await list.open();
      const row = await verifyDrawStatusChange(list, draw.code, DRAW_TAB.ON_HOLD, /^On Hold\s*Under Review$/i);
      expect(row.status).toMatch(/^On Hold\s*Under Review$/i);
      await list.selectTab(DRAW_TAB.ALL);
      await list.findDraw(draw.code);
      expect((await list.readDrawRow(draw.code)).status, 'All tab shows the combined status').toMatch(/^On Hold\s*Under Review$/i);
    } finally {
      await list.open();
      await list.selectTab(DRAW_TAB.ON_HOLD);
      await list.activateDraw(draw.code);
    }
    TestHelper.success('Held status text');
  });
});
