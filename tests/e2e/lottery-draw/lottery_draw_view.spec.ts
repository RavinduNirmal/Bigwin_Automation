import { mergeTests, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import {
  createUniqueDraw,
  reviewDrawAndVerify,
  waitForTicketsLoaded,
  cleanupDraws,
} from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * A draw's view page (/dashboard/draw/edit-lottery-draw?drawId=): summary cards, stage fields, upload Logs,
 * Winning Numbers and Operation logs. Each test creates its own draw (afterEach rejects it).
 */
combinedTest.describe('Lottery Draw View Page', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-VIEW-001: Summary cards show Bought Ticket Count, Revenue and Total Tickets', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-001', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await waitForTicketsLoaded(list, draw.code, draw.ticketCount);
    await detail.open(draw.drawId);
    await expect.poll(() => detail.summaryValue('Total Tickets'), { message: 'Total Tickets' }).toBe(String(draw.ticketCount));
    expect(await detail.summaryValue('Bought Ticket Count'), 'Nothing bought yet').toBe('0');
    expect(await detail.summaryValue('Revenue'), 'No revenue yet').toBe('LKR 0');
    TestHelper.success('Summary cards');
  });

  combinedTest('TC-LD-VIEW-002: Fields show Approval Stage and Draw Status', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-002', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await detail.open(draw.drawId);
    await expect(detail.approvalStageField).toHaveValue('UNDER REVIEW');
    await expect(detail.drawStatusField).toHaveValue('ACTIVE');
    await reviewDrawAndVerify(list, draw.code);
    await detail.open(draw.drawId);
    await expect(detail.approvalStageField, 'After Review the stage is Pending Approval').toHaveValue('PENDING APPROVAL');
    TestHelper.success('Stage fields');
  });

  combinedTest('TC-LD-VIEW-003: Logs table lists the ticket upload with status and download', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-003', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await detail.open(draw.drawId);
    await expect(detail.uploadLogRows(), 'One upload is logged').toHaveCount(1);
    await expect(detail.uploadLogRows().first(), 'Initiate Now: nothing was scheduled').toContainText('Not Scheduled');
    await waitForTicketsLoaded(list, draw.code, draw.ticketCount);
    await detail.open(draw.drawId);
    await expect(detail.uploadLogRows()).toHaveCount(1);
    await expect(detail.uploadLogRows().first(), 'Upload Status becomes Completed').toContainText('Completed');
    await expect(detail.uploadLogRows().first().getByText('Download'), 'Log file can be downloaded').toBeVisible();
    TestHelper.success('Upload log');
  });

  combinedTest('TC-LD-VIEW-004: Winning Numbers panel says none for a draw without results', async ({ page, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-004', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await detail.open(draw.drawId);
    await expect(detail.noWinningNumbersMessage()).toBeVisible();
    await expect(detail.winningNumbersLabel(), 'Label should be spelled "Winning Numbers:" (app shows "Winnning")').toBeVisible({ timeout: 5000 });
    TestHelper.success('Winning numbers panel');
  });

  combinedTest('TC-LD-VIEW-005: Operation logs show only this draw\'s entries', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-005', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await detail.open(draw.drawId);
    const header = detail.operationLogsTable().getByRole('columnheader', { name: 'Entity Long Id', exact: true });
    const chip = detail.quickToggleChip('Entity Long Id');
    const initiallyVisible = await header.isVisible();
    await chip.click();
    await expect(header, 'Quick toggle flips the column').toBeVisible({ visible: !initiallyVisible });
    await chip.click();
    await expect(header).toBeVisible({ visible: initiallyVisible });
    if (!initiallyVisible) await chip.click();
    await expect(header).toBeVisible();

    const headers = (await detail.operationLogsTable().getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const index = headers.indexOf('Entity Long Id');
    await expect(detail.operationLogsTable().getByRole('row').nth(1), 'Operation logs should have entries').toBeVisible();
    await expect
      .poll(async () => {
        const ids: string[] = [];
        for (const row of await detail.operationLogsTable().getByRole('row').filter({ has: page.getByRole('cell') }).all()) {
          ids.push(((await row.getByRole('cell').allInnerTexts())[index] ?? '').trim());
        }
        return ids.length > 0 && ids.every((id) => id === String(draw.drawId));
      }, { message: `Every log entry should belong to draw id ${draw.drawId}` })
      .toBe(true);
    TestHelper.success('Operation logs scoped');
  });

  combinedTest('TC-LD-VIEW-006: Update is disabled for an Under Review draw', async ({ page, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-006', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await detail.open(draw.drawId);
    await expect(detail.approvalStageField).toHaveValue('UNDER REVIEW');
    await expect(detail.updateButton(), 'Update is disabled while Under Review').toBeDisabled();
    TestHelper.success('Update disabled');
  });

  combinedTest('TC-LD-VIEW-007: Draw page fields cannot be modified without Update', async ({ page, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VIEW-007', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await detail.open(draw.drawId);
    const fields = [detail.lotteryNameField, detail.drawNumberField, detail.drawCodeField, detail.megaPrizeField];
    await expect(detail.drawCodeField).toHaveValue(draw.code);
    for (const field of fields) {
      const before = await field.inputValue();
      await field.click({ force: true });
      await page.keyboard.type('X');
      await expect(field, 'A view-only field must not accept typing').toHaveValue(before);
    }
    TestHelper.success('Fields read-only');
  });
});
