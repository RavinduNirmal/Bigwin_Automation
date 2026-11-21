import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import {
  createUniqueDraw,
  reviewDrawAndVerify,
  approveDrawAndVerify,
  expectDrawInTab,
  expectDrawNotInTab,
  cleanupDraws,
} from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Draw maker-checker: Under Review -> "Review Draw" -> Pending Approval -> "Approve Draw" (+ the MD5
 * of the uploaded ticket file) -> Approved. Test draws use far-future schedules, so an approved test
 * draw stays "Approved" and never goes In Play (see lottery_draw_lifecycle.spec.ts for that).
 */
combinedTest.describe('Lottery Draw Review & Approval', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-APR-001: A new draw is Under Review and can only be reviewed', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-001', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await expectDrawInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    const actions = await list.openRowMenu(draw.code);
    expect(actions).toContain('Review Draw');
    expect(actions).not.toContain('Approve Draw');
    await list.closeRowMenu();
    TestHelper.success('Under Review: Review only');
  });

  combinedTest('TC-LD-APR-002: Review Draw moves the draw to Pending Approval', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-002', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await expectDrawNotInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    await list.selectTab(DRAW_TAB.ALL);
    await list.findDraw(draw.code);
    const actions = await list.openRowMenu(draw.code);
    expect(actions).toContain('Approve Draw');
    expect(actions).not.toContain('Review Draw');
    await list.closeRowMenu();
    TestHelper.success('Review -> Pending Approval');
  });

  combinedTest('TC-LD-APR-003: Approve Draw requires the MD5 checksum', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-003', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await list.open();
    await list.openApproveDialog(draw.code);
    await expect(list.approveConfirmButton(), 'Disabled until an MD5 is entered').toBeDisabled();
    await list.approveMd5Input().fill(draw.ticketFile.md5);
    await expect(list.approveConfirmButton()).toBeEnabled();
    await page.keyboard.press('Escape');
    TestHelper.success('MD5 required to approve');
  });

  combinedTest('TC-LD-APR-004: Approving with a wrong MD5 is rejected', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-004', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await list.open();
    const wrongMd5 = draw.ticketFile.md5.replace(/^./, (c) => (c === '0' ? '1' : '0'));
    const res = await list.approveDraw(draw.code, wrongMd5);
    await TestHelper.attachText('Approve response', `${res.status()} ${await res.text().catch(() => '')}`);
    expect(res.status(), 'Approval with a wrong MD5 must be refused').toBeGreaterThanOrEqual(400);
    await list.open();
    await expectDrawInTab(list, draw.code, DRAW_TAB.PENDING_APPROVAL);
    TestHelper.success('Wrong MD5 refused');
  });

  combinedTest('TC-LD-APR-005: Approving with the upload MD5 moves the draw to Approved', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-005', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await approveDrawAndVerify(list, draw.code, draw.ticketFile.md5);
    await expectDrawInTab(list, draw.code, DRAW_TAB.APPROVED);
    TestHelper.success('Approved');
  });

  combinedTest('TC-LD-APR-006: Reject Draw moves an Under Review draw to Rejected', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-006', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const res = await list.rejectDraw(draw.code);
    expect(res, 'Reject should call the server').not.toBeNull();
    expect(res!.status()).toBeLessThan(400);
    await list.open();
    await expectDrawInTab(list, draw.code, DRAW_TAB.REJECTED);
    await expectDrawNotInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('Rejected');
  });
});
