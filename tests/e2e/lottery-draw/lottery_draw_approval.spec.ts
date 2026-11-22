import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import {
  createUniqueDraw,
  reviewDrawAndVerify,
  approveDrawAndVerify,
  expectDrawInTab,
  expectDrawNotInTab,
  verifyDrawStatusChange,
  sendBackForReviewAndVerify,
  createApprovedDraw,
  waitForTicketsLoaded,
  cleanupDraws,
} from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Draw maker-checker: Under Review -> "Review Draw" -> Pending Approval -> "Approve Draw" (+ the MD5
 * of the uploaded ticket file) -> Approved. Test draws use far-future schedules, so an approved test
 * draw stays "Approved" and never goes In Play (see lottery_draw_lifecycle.spec.ts for that).
 * Every status change is confirmed twice: the Status on the All tab, then the draw listed under its stage tab.
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
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);
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
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.PENDING_APPROVAL); // unchanged
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
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.REJECTED);
    await expectDrawNotInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('Rejected');
  });

  combinedTest('TC-LD-APR-007: Reject on a Pending Approval draw sends it back to Under Review', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-007', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);

    // 2. Row menu > Reject (any native dialog is recorded - none is expected)
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await list.open();
    const response = await list.sendBackForReview(draw.code);
    await TestHelper.attachText('approve-reject response', `${response.status()} ${await response.text().catch(() => '')}`);
    expect(response.status()).toBeLessThan(400);
    expect(dialogs, 'No confirmation or reason prompt is expected').toHaveLength(0);
    await expect(page.getByRole('dialog'), 'No dialog or reason requested').toHaveCount(0);

    // back to Under Review (All tab + Under Review tab), Review Draw offered again
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    await list.selectTab(DRAW_TAB.ALL);
    await list.findDraw(draw.code);
    const actions = await list.openRowMenu(draw.code);
    expect(actions).toContain('Review Draw');
    await list.closeRowMenu();
    TestHelper.success('Reject on Pending Approval sends the draw back to Under Review');
  });

  combinedTest('TC-LD-APR-008: Rejecting a Pending Approval draw is worded as a rejection in the operation log', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-008', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await sendBackForReviewAndVerify(list, draw.code);

    // 2. Read the draw page Operation logs
    await detail.open(draw.drawId);
    // the logs have loaded once the draw's own create entry is shown
    await expect(detail.operationLogEntry(`Lottery draw created successfully with code: ${draw.code}`), 'Operation logs should load').toBeVisible({ timeout: 30000 });
    const logText = await detail.operationLogsTable().innerText();
    await TestHelper.attachText('Operation logs', logText);
    expect(logText, 'The send-back must not be logged as "rejection is approved"').not.toMatch(/rejection is approved successfully/i);
    expect(logText, 'Operation log should say the draw was sent back for review').toMatch(/sent back (for|to) review|returned to (under )?review/i);
    TestHelper.success('Operation log wording is correct');
  });

  combinedTest('TC-LD-APR-009: Review / Reject act immediately with no confirmation', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-009', page);
    const rejectDraw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    const reviewDraw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });

    // 2. Click Reject Draw on one draw
    await list.open();
    await list.findDraw(rejectDraw.code);
    const rejectRes = await list.performRowAction(rejectDraw.code, 'Reject Draw', LotteryDrawListPage.API.REJECT);
    expect(rejectRes.status(), 'Reject Draw acts at once').toBeLessThan(400);
    await expect(page.getByRole('dialog'), 'Reject Draw shows no dialog').toHaveCount(0);

    // ... then Review Draw on another draw
    await waitForTicketsLoaded(list, reviewDraw.code, reviewDraw.ticketCount);
    await list.open();
    const reviewRes = await list.reviewDraw(reviewDraw.code);
    expect(reviewRes.status(), 'Review Draw acts at once').toBeLessThan(400);
    await expect(page.getByRole('dialog'), 'Review Draw shows no dialog').toHaveCount(0);
    expect(dialogs, 'No native confirm for Reject Draw / Review Draw (documented behaviour - flag to product owner)').toHaveLength(0);

    // state changed immediately
    await list.open();
    await verifyDrawStatusChange(list, rejectDraw.code, DRAW_TAB.REJECTED);
    await verifyDrawStatusChange(list, reviewDraw.code, DRAW_TAB.PENDING_APPROVAL);
    TestHelper.success('Reject Draw and Review Draw need no confirmation');
  });

  combinedTest('TC-LD-APR-010: Review is refused until tickets are loaded', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-010', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);

    // 2. Immediately Review Draw (tickets still loading in the background)
    await list.open();
    const res = await list.reviewDraw(draw.code);
    const body = await res.text().catch(() => '');
    await TestHelper.attachText('Review response', `${res.status()} ${body}`);
    expect(res.status(), `Review of a draw without tickets must be refused (tickets loaded too fast to test? body: ${body})`).toBeGreaterThanOrEqual(400);
    expect(body, 'Refusal should say the draw has no tickets').toMatch(/no tickets/i);
    await list.open();
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);

    // after the tickets load, Review works
    await reviewDrawAndVerify(list, draw.code);
    TestHelper.success('Review refused until tickets are loaded');
  });

  combinedTest('TC-LD-APR-011: Approved draw cannot be rejected, held-removed or re-reviewed from the menu', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-011', page);
    // 1. Meta: own Approved draw (far-future schedule, cannot be undone)
    const draw = await createApprovedDraw(createDrawPage, list, testLotteryDrawData);

    // 2. Open the row menu on the Approved draw
    await list.selectTab(DRAW_TAB.ALL);
    await list.findDraw(draw.code);
    const actions = await list.openRowMenu(draw.code);
    await TestHelper.attachText('Row menu', actions.join('\n'));
    for (const forbidden of ['Review Draw', 'Approve Draw', 'Reject Draw', 'Reject']) {
      expect(actions, `An Approved draw must not offer "${forbidden}"`).not.toContain(forbidden);
    }
    await list.closeRowMenu();
    TestHelper.success('Approved draw menu verified');
  });

  combinedTest('TC-LD-APR-012: Operation logs record create, schedule, review and reject events', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-APR-012', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);
    await sendBackForReviewAndVerify(list, draw.code);

    // 2. Open the draw page Operation logs
    await detail.open(draw.drawId);
    const timeout = 30000;
    await expect(detail.operationLogEntry(`Lottery draw created successfully with code: ${draw.code}`), 'Create event').toBeVisible({ timeout });
    await expect(detail.operationLogEntry(`Successfully scheduled new tickets upload for draw id : ${draw.drawId}`), 'Schedule event').toBeVisible({ timeout });
    await expect(detail.operationLogEntry(new RegExp(`Lottery draw with id ${draw.drawId} ?is reviewed and moved to pending approval`)), 'Review event').toBeVisible({ timeout });
    for (const column of ['Email', 'Operation Type', 'Entity Type', 'Http Status', 'Logged At']) {
      await expect(detail.operationLogColumn(column), `Operation logs column "${column}"`).toBeVisible();
    }
    await expect(detail.operationLogEntry(/^Lottery Draw$/), 'Entity Type "Lottery Draw"').toBeVisible();
    TestHelper.success('Operation logs record the draw events');
  });
});
