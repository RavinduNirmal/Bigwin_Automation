import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import { writeTicketDbf } from '../../../utils/dbf/ticket-dbf.service';
import {
  createUniqueDraw,
  waitForTicketsLoaded,
  expectDrawNotInTab,
  verifyDrawStatusChange,
  cleanupDraws,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Row actions of the Draws list: Quick Settings, Add Tickets, Hold / Activate / Remove Draw, Process Logs
 * and row scoping. Row actions are only ever used on the test's OWN "AT..." draws (far-future schedule,
 * Under Review); afterEach rejects what is still Under Review.
 */
combinedTest.describe('Lottery Draw Row Actions', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-ACT-001: Quick Settings shows ticket statistics and a disabled Retain input', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-001', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await waitForTicketsLoaded(list, draw.code, 100);
    await list.open();
    await list.findDraw(draw.code);
    await list.openRowMenu(draw.code);
    await list.menuAction('Quick Settings').click();

    const dialog = list.quickSettingsDialog();
    await expect(dialog, '"Quick Settings" dialog should open').toBeVisible();
    await expect(list.quickSettingsButton('Refresh'), 'Statistics should finish loading ("Processing..." -> "Refresh")').toBeVisible({ timeout: 60000 });
    await expect(list.quickSettingsTable().getByRole('cell').first(), 'Statistics should be shown').toBeVisible();
    const stats = await list.quickSettingsStats();
    await TestHelper.attachText('Quick Settings statistics', JSON.stringify(stats, null, 2));
    expect(stats, 'Quick Settings statistics of a fresh 100-ticket draw').toEqual({
      'Total': '100', 'Returnable': '100', 'In Cart (Not Bought)': '0', 'Non Returnable (Wasted)': '0', 'Sold': '0', 'Subscription Ticket': '0',
    });
    await expect(list.quickSettingsRetainInput(), '"Set Retain Ticket Count" input should be disabled').toBeDisabled();
    await expect(list.quickSettingsButton('Update'), '"Update" should be disabled').toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    TestHelper.success('Quick Settings statistics shown, Retain input and Update disabled');
  });

  combinedTest('TC-LD-ACT-002: Quick Settings closes with Escape and changes nothing', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-002', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await waitForTicketsLoaded(list, draw.code, 100);
    await list.open();
    const before = await list.getDrawData(draw.code);
    await list.openRowMenu(draw.code);
    await list.menuAction('Quick Settings').click();
    const dialog = list.quickSettingsDialog();
    await expect(dialog).toBeVisible();
    const writes: string[] = [];
    page.on('request', (r) => {
      if (r.method() !== 'GET' && /\/api\/draw\//.test(r.url())) writes.push(`${r.method()} ${r.url()}`);
    });
    await page.keyboard.press('Escape');
    await expect(dialog, 'Escape should close Quick Settings').toBeHidden();
    await list.open();
    const after = await list.getDrawData(draw.code);
    expect(after, 'The draw row must be unchanged').toEqual(before);
    expect(writes, 'Closing Quick Settings must not send any update request').toEqual([]);
    TestHelper.success('Quick Settings cancelled without changes');
  });

  combinedTest('TC-LD-ACT-003: Add Tickets opens the Upload Files dialog for the draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-003', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.openAddTickets(draw.code);
    const dialog = createDrawPage.uploadDialog();
    await expect(dialog, '"Upload Files" dialog should open').toBeVisible();
    await expect(dialog).toContainText(`Brand: ${draw.brand}`);
    await expect(dialog).toContainText(`Draw: ${draw.drawNumber}`);
    await expect(createDrawPage.browseFilesButton(), '"Browse files" should be offered').toBeVisible();
    await expect(createDrawPage.uploadDialogButton('Cancel')).toBeVisible();
    await expect(createDrawPage.uploadDialogButton('Add')).toBeVisible();
    await createDrawPage.uploadDialogButton('Cancel').click();
    await expect(dialog).toBeHidden();
    TestHelper.success('Add Tickets dialog shows brand and draw');
  });

  combinedTest('TC-LD-ACT-004: Add Tickets without a file reports "No DB files selected." and keeps the dialog open', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-004', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.openAddTickets(draw.code);
    const dialog = createDrawPage.uploadDialog();
    await expect(dialog).toBeVisible();
    await createDrawPage.uploadDialogButton('Add').click();
    await expect(list.toast('No DB files selected.'), 'Toast "No DB files selected." should be shown').toBeVisible();
    // the dialog must STAY open (not just be open at the moment the toast appears)
    const closed = await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false);
    expect(closed, 'The Upload Files dialog should stay open so a file can be chosen').toBe(false);
    await createDrawPage.uploadDialogButton('Cancel').click();
    TestHelper.success('Add without a file reported and dialog kept open');
  });

  combinedTest('TC-LD-ACT-005: Adding a second valid DBF raises Total Tickets', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }, testInfo) => {
    await TestHelper.initTest('TC-LD-ACT-005', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await waitForTicketsLoaded(list, draw.code, 100);
    const second = writeTicketDbf(
      { startId: `${draw.drawNumber}101`, totalRecords: 100, prefix: '0', numbersPerRecord: 4 },
      testInfo.outputPath('tickets-second'),
      `${draw.code}_2`
    );
    await TestHelper.attachText('Second DBF', JSON.stringify(second, null, 2));
    await list.open();
    await list.openAddTickets(draw.code);
    const dialog = createDrawPage.uploadDialog();
    await expect(dialog).toBeVisible();
    await createDrawPage.chooseUploadFile(second.filePath);
    const md5Box = createDrawPage.uploadDialogMd5();
    if ((await md5Box.count()) > 0) await md5Box.fill(second.md5);
    await createDrawPage.uploadDialogButton('Add').click();
    await expect(dialog).toBeHidden({ timeout: 60000 });
    await expect
      .poll(async () => {
        await detail.open(draw.drawId);
        return detail.summaryValue('Total Tickets');
      }, { message: 'Total Tickets should become 200 after the second DBF is processed', timeout: 5 * 60000, intervals: [10000] })
      .toBe('200');
    await expect(detail.uploadLogRows().filter({ hasText: 'Completed' }), 'Both ticket uploads should be listed as Completed').toHaveCount(2);
    TestHelper.success('Second DBF added: 200 tickets');
  });

  combinedTest('TC-LD-ACT-006: Hold Draw puts the draw On Hold and Activate Draw restores it', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-006', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const held = await list.holdDraw(draw.code);
    expect(held.status(), 'Hold Draw should succeed').toBeLessThan(400);
    await expect(list.openDialogs(), 'Hold Draw acts without a confirmation dialog').toHaveCount(0);
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.ON_HOLD);
    const actions = await list.openRowMenu(draw.code);
    expect(actions).toEqual(expect.arrayContaining(['View', 'Edit', 'Add Tickets', 'Quick Settings', 'Activate Draw', 'Remove Draw']));
    await list.closeRowMenu();
    await list.activateDraw(draw.code);
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('Draw held and activated again');
  });

  combinedTest('TC-LD-ACT-007: Remove Draw on an On Hold draw moves it to the Deleted tab', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-007', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const held = await list.holdDraw(draw.code);
    expect(held.status(), 'Hold Draw should succeed').toBeLessThan(400);
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.ON_HOLD);
    const removed = await list.removeDraw(draw.code);
    expect(removed.status(), 'Remove Draw should succeed').toBeLessThan(400);
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.DELETED);
    await expectDrawNotInTab(list, draw.code, DRAW_TAB.ON_HOLD);
    TestHelper.success('Removed draw is listed under Deleted only');
  });

  combinedTest('TC-LD-ACT-008: The Process Logs dialog lists background jobs', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-ACT-008', page);
    await list.openProcessLogs();
    const dialog = list.processLogsDialog();
    await expect(dialog, '"Process Logs" dialog should open').toBeVisible();
    await expect(dialog).toContainText(/\d+ total jobs\s*[-·]\s*Page 1 of \d+/);
    for (const column of ['ID', 'Draw Number', 'Brand Name', 'Progress Label', 'Progress', 'Error', 'Status', 'Requested By', 'Created At', 'Process End At']) {
      await expect(list.processLogsColumn(column), `Process Logs column "${column}" should be shown`).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    TestHelper.success('Process Logs dialog shows the job table');
  });

  combinedTest('TC-LD-ACT-009: Process Logs paging works and the dialog closes with Escape', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-ACT-009', page);
    await list.openProcessLogs();
    const dialog = list.processLogsDialog();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Page 1 of \d+/);
    const pages = Number(/Page 1 of (\d+)/.exec(await dialog.innerText())?.[1] ?? '1');
    if (pages > 1) {
      const firstRow = dialog.getByRole('row').nth(1);
      await expect(firstRow).toBeVisible();
      const before = await firstRow.innerText();
      await list.processLogsNextPage().click();
      await expect(dialog, 'Should be on page 2').toContainText(new RegExp(`Page 2 of ${pages}`));
      await expect(firstRow, 'Page 2 should show other jobs').not.toHaveText(before);
    }
    await page.keyboard.press('Escape');
    await expect(dialog, 'Escape should close Process Logs').toBeHidden();
    TestHelper.success('Process Logs paged and closed with Escape');
  });

  combinedTest('TC-LD-ACT-010: A row action changes only the clicked draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-ACT-010', page);
    const first = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    const second = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const res = await list.rejectDraw(first.code);
    expect(res, 'Reject should call the server').not.toBeNull();
    expect(res!.status()).toBeLessThan(400);
    await list.open();
    await verifyDrawStatusChange(list, first.code, DRAW_TAB.REJECTED);
    await verifyDrawStatusChange(list, second.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('Only the clicked draw was rejected');
  });
});
