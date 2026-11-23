import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import {
  CHECKSUM_MESSAGE,
  createDrawInStage,
  createDrawWithFile,
  createHolderDraw,
  captureTicketUpload,
  deleteDrawAndVerify,
  deleteOwnDraws,
  drawStatus,
  expectChecksumRefused,
  expectUploadAccepted,
  replayTicketUpload,
  responseError,
  reviewAndApprove,
  verifyDrawStatusChange,
  waitForTicketsLoaded,
  waitForUploadLogRow,
} from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 15 * 60 * 1000 });

const SMOKE = { tag: ['@smoke', '@checksum'] };
const SMOKE_SLOW = { tag: ['@smoke', '@checksum', '@slow'] };
const SLOW_TIMEOUT = 45 * 60 * 1000;

/**
 * Global Checksum Validation smoke suite: a ticket file checksum (MD5) may be held by only ONE
 * non-deleted draw; deleting the draw frees it. Every test builds fresh files and its own "AT9..." draws,
 * and afterEach DELETES them (a live draw would keep its checksum).
 */
combinedTest.describe('Global Checksum Validation - Smoke', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await deleteOwnDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-CHK-001: Create a new draw with a brand-new ticket file', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-001', page);
    const draw = data.unique();
    const file = data.ticketFile(draw);
    const created = await createDrawWithFile(createDrawPage, draw, file);
    expect(created.drawResponse.status(), `Draw ${draw.code} should be created`).toBe(201);
    await expectUploadAccepted(created.uploadResponse, 'Ticket upload of a brand-new file');
    await waitForTicketsLoaded(list, draw.code, file.recordCount);
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('New file accepted, draw Under Review with 100 tickets');
  });

  combinedTest('TC-LD-CHK-002: Creating a draw with a file already used by another (not deleted) draw is refused', SMOKE, async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-002', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    const holderId = await createHolderDraw(createDrawPage, list, holder, holderFile);
    const second = data.unique();
    const created = await createDrawWithFile(createDrawPage, second, data.copyOf(holderFile));
    expect(created.uploadError, 'Renamed copy of a used file must be refused').toMatch(CHECKSUM_MESSAGE.OTHER_DRAW(holder.code));
    await detail.open(holderId);
    expect(await detail.summaryValue('Total Tickets'), 'Holder draw must be unchanged').toBe('100');
    TestHelper.success('Copy of a used file refused on create');
  });

  combinedTest('TC-LD-CHK-008: Approve a draw that has a new ticket file', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-008', page);
    const draw = data.unique();
    const file = data.ticketFile(draw);
    await createHolderDraw(createDrawPage, list, draw, file);
    await reviewAndApprove(list, draw.code, file.md5);
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.APPROVED);
    TestHelper.success('Approved with own checksum');
  });

  combinedTest('TC-LD-CHK-009: Approving with the checksum of another draw\'s file is refused', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-009', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const drawA = data.unique();
    await createHolderDraw(createDrawPage, list, drawA, data.ticketFile(drawA));
    await list.open();
    const reviewed = await list.reviewDraw(drawA.code);
    expect(reviewed.status(), `Review of ${drawA.code}`).toBeLessThan(400);
    await list.open();
    const res = await list.approveDraw(drawA.code, holderFile.md5);
    expect(res.status(), 'Approval with another draw\'s checksum must be refused').toBe(400);
    expect(await responseError(res), 'Approval refusal message').toMatch(CHECKSUM_MESSAGE.APPROVE_INVALID);
    await list.open();
    await verifyDrawStatusChange(list, drawA.code, DRAW_TAB.PENDING_APPROVAL);
    TestHelper.success('Foreign checksum refused at approval');
  });

  combinedTest('TC-LD-CHK-012: A refused approval neither takes nor frees any checksum', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-012', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const drawA = data.unique();
    const fileA = data.ticketFile(drawA);
    await createHolderDraw(createDrawPage, list, drawA, fileA);
    await list.open();
    expect((await list.reviewDraw(drawA.code)).status(), 'Review of draw A').toBeLessThan(400);
    await list.open();
    const refused = await list.approveDraw(drawA.code, holderFile.md5);
    expect(refused.status(), 'Approval with the holder checksum must be refused').toBe(400);
    await list.open();
    const third = data.unique();
    const created = await createDrawWithFile(createDrawPage, third, data.copyOf(holderFile));
    await expectChecksumRefused(created.uploadResponse, CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Holder file on a third draw after the failed approval');
    await list.open();
    const approved = await list.approveDraw(drawA.code, fileA.md5);
    expect(approved.status(), `Approval with its own checksum should succeed: ${await responseError(approved)}`).toBeLessThan(400);
    await list.open();
    await verifyDrawStatusChange(list, drawA.code, DRAW_TAB.APPROVED);
    TestHelper.success('Failed approval changed nothing');
  });

  combinedTest('TC-LD-CHK-017: Add a file with the same tickets but changed content (new checksum) to an Under Review draw', SMOKE, async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-017', page);
    const draw = data.unique();
    const file = data.ticketFile(draw);
    const drawId = await createHolderDraw(createDrawPage, list, draw, file);
    const modified = data.modifiedCopyOf(file);
    await list.open();
    const res = await list.addTickets(draw.code, modified.filePath, modified.md5);
    await expectUploadAccepted(res, 'Upload of a changed file with a new checksum');
    await waitForUploadLogRow(detail, drawId, /Error Occurred/);   // duplicate tickets rejected in processing
    expect(await detail.summaryValue('Total Tickets'), 'Duplicate tickets must not be added').toBe('100');
    TestHelper.success('Accepted at upload, duplicates rejected in processing');
  });

  combinedTest('TC-LD-CHK-018: Add a new file (new tickets, new checksum) to an Under Review draw', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-018', page);
    const draw = data.unique();
    await createHolderDraw(createDrawPage, list, draw, data.ticketFile(draw));
    const extra = data.extraTicketFile(draw);
    await list.open();
    const res = await list.addTickets(draw.code, extra.filePath, extra.md5);
    await expectUploadAccepted(res, 'Add Tickets with a new file');
    await waitForTicketsLoaded(list, draw.code, 150);
    TestHelper.success('150 tickets');
  });

  combinedTest('TC-LD-CHK-019: Adding a file already used by another live draw is refused', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-019', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const other = data.unique();
    await createHolderDraw(createDrawPage, list, other, data.ticketFile(other));
    const copy = data.copyOf(holderFile);
    await list.open();
    const res = await list.addTickets(other.code, copy.filePath, copy.md5);
    await expectChecksumRefused(res, CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Add Tickets with the holder\'s file');
    await waitForTicketsLoaded(list, other.code, 100);
    TestHelper.success('Add Tickets refused, draw unchanged');
  });

  combinedTest('TC-LD-CHK-025: THE FIX: a file used only by a deleted draw can be used again', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-025', page);
    const x = data.unique();
    const xFile = data.ticketFile(x);
    await createHolderDraw(createDrawPage, list, x, xFile);
    const y = data.unique();
    await createHolderDraw(createDrawPage, list, y, data.ticketFile(y));
    const copy = data.copyOf(xFile);
    await list.open();
    await expectChecksumRefused(await list.addTickets(y.code, copy.filePath, copy.md5), CHECKSUM_MESSAGE.OTHER_DRAW(x.code), 'Copy on Y while X is live');
    await deleteDrawAndVerify(list, x.code);
    await list.open();
    await expectUploadAccepted(await list.addTickets(y.code, copy.filePath, copy.md5), 'Copy on Y after X was deleted');
    await waitForTicketsLoaded(list, y.code, 200);
    TestHelper.success('File reusable after delete');
  });

  combinedTest('TC-LD-CHK-027: Re-create a deleted draw with exactly the same file, number and code', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-027', page);
    const draw = data.unique();
    const file = data.ticketFile(draw);
    await createHolderDraw(createDrawPage, list, draw, file);
    await deleteDrawAndVerify(list, draw.code);
    const again = await createDrawWithFile(createDrawPage, draw, file);
    expect(again.drawResponse.status(), `Re-creating ${draw.code} with identical data`).toBe(201);
    await expectUploadAccepted(again.uploadResponse, 'Ticket upload of the re-created draw');
    await waitForTicketsLoaded(list, draw.code, file.recordCount);
    await verifyDrawStatusChange(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('Deleted draw re-created');
  });

  combinedTest('TC-LD-CHK-029: A draw that is only On Hold still protects its file', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-029', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    await list.open();
    const held = await list.holdDraw(holder.code);
    expect(held.status(), 'Hold Draw').toBeLessThan(400);
    await verifyDrawStatusChange(list, holder.code, DRAW_TAB.ON_HOLD);
    const other = data.unique();
    const created = await createDrawWithFile(createDrawPage, other, data.copyOf(holderFile));
    await expectChecksumRefused(created.uploadResponse, CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Holder file while the holder is On Hold');
    await list.open();
    const activated = await list.activateDraw(holder.code);
    expect(activated.status(), 'Activate Draw').toBeLessThan(400);
    await verifyDrawStatusChange(list, holder.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success('On Hold keeps the checksum');
  });

  combinedTest('TC-LD-CHK-030: A Rejected (not deleted) draw still protects its file', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-030', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    await list.open();
    const rejected = await list.rejectDraw(holder.code);
    expect(rejected, 'Reject should call the server').not.toBeNull();
    expect(rejected!.status(), 'Reject Draw').toBeLessThan(400);
    await verifyDrawStatusChange(list, holder.code, DRAW_TAB.REJECTED);
    const other = data.unique();
    const created = await createDrawWithFile(createDrawPage, other, data.copyOf(holderFile));
    await expectChecksumRefused(created.uploadResponse, CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Holder file while the holder is Rejected');
    TestHelper.success('Rejected keeps the checksum');
  });

  combinedTest('TC-LD-CHK-033: Deleting a draw with several files frees ALL its files', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-033', page);
    const multi = data.unique();
    const file1 = data.ticketFile(multi);
    await createHolderDraw(createDrawPage, list, multi, file1);
    const extra = data.extraTicketFile(multi);
    await list.open();
    await expectUploadAccepted(await list.addTickets(multi.code, extra.filePath, extra.md5), 'Second file on the multi-file draw');
    await waitForTicketsLoaded(list, multi.code, 150);
    const other = data.unique();
    await createHolderDraw(createDrawPage, list, other, data.ticketFile(other));
    const copy1 = data.copyOf(file1);
    const copyExtra = data.copyOf(extra);
    await list.open();
    await expectChecksumRefused(await list.addTickets(other.code, copy1.filePath, copy1.md5), CHECKSUM_MESSAGE.OTHER_DRAW(multi.code), 'First file while the multi-file draw is live');
    await list.open();
    await expectChecksumRefused(await list.addTickets(other.code, copyExtra.filePath, copyExtra.md5), CHECKSUM_MESSAGE.OTHER_DRAW(multi.code), 'Second file while the multi-file draw is live');
    await deleteDrawAndVerify(list, multi.code);
    await list.open();
    await expectUploadAccepted(await list.addTickets(other.code, copy1.filePath, copy1.md5), 'First file after delete');
    await list.open();
    await expectUploadAccepted(await list.addTickets(other.code, copyExtra.filePath, copyExtra.md5), 'Second file after delete');
    TestHelper.success('Both files freed');
  });

  combinedTest('TC-LD-CHK-034: Deleting an Approved draw frees its files', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-034', page);
    const approved = data.unique();
    const file = data.ticketFile(approved);
    await createHolderDraw(createDrawPage, list, approved, file);
    await reviewAndApprove(list, approved.code, file.md5);
    await verifyDrawStatusChange(list, approved.code, DRAW_TAB.APPROVED);
    const other = data.unique();
    await createHolderDraw(createDrawPage, list, other, data.ticketFile(other));
    await deleteDrawAndVerify(list, approved.code);
    const copy = data.copyOf(file);
    await list.open();
    await expectUploadAccepted(await list.addTickets(other.code, copy.filePath, copy.md5), 'File of the deleted Approved draw');
    TestHelper.success('Approved draw deleted, file reusable');
  });

  combinedTest('TC-LD-CHK-042: Approved draw: adding a file used by another live draw is refused', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-042', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const target = data.unique();
    const targetFile = data.ticketFile(target);
    await createHolderDraw(createDrawPage, list, target, targetFile);
    await reviewAndApprove(list, target.code, targetFile.md5);
    const copy = data.copyOf(holderFile);
    await list.open();
    await expectChecksumRefused(await list.addTickets(target.code, copy.filePath, copy.md5), CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Add Tickets on an Approved draw');
    await verifyDrawStatusChange(list, target.code, DRAW_TAB.APPROVED);
    TestHelper.success('Refused, target still Approved');
  });

  combinedTest('TC-LD-CHK-048: In Play draw: adding a file used by another live draw is refused', SMOKE_SLOW, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    combinedTest.setTimeout(SLOW_TIMEOUT);
    await TestHelper.initTest('TC-LD-CHK-048', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const target = data.imminent(3, 25, 40);
    await createDrawInStage(createDrawPage, list, target, data.ticketFile(target), /^In Play$/);
    const copy = data.copyOf(holderFile);
    await list.open();
    await expectChecksumRefused(await list.addTickets(target.code, copy.filePath, copy.md5), CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Add Tickets on an In Play draw');
    expect(await drawStatus(list, target.code), 'Target should still be In Play').toMatch(/^In Play$/);
    TestHelper.success('Refused on In Play draw');
  });

  combinedTest('TC-LD-CHK-053: Post Cutoff draw: adding a file used by another live draw is refused', SMOKE_SLOW, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    combinedTest.setTimeout(SLOW_TIMEOUT);
    await TestHelper.initTest('TC-LD-CHK-053', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const target = data.imminent(3, 6, 40);
    const stage = await createDrawInStage(createDrawPage, list, target, data.ticketFile(target), /cut ?off/i);
    const copy = data.copyOf(holderFile);
    await list.open();
    await expectChecksumRefused(await list.addTickets(target.code, copy.filePath, copy.md5), CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Add Tickets on a Post Cutoff draw');
    expect(await drawStatus(list, target.code), 'Status must not change after the refused upload').toBe(stage);
    TestHelper.success('Refused on Post Cutoff draw');
  });

  combinedTest('TC-LD-CHK-068: A changed file with its OLD checksum is refused', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-068', page);
    const draw = data.unique();
    const file = data.ticketFile(draw);
    await createHolderDraw(createDrawPage, list, draw, file);
    const modified = data.modifiedCopyOf(file);
    await list.open();
    const res = await list.addTickets(draw.code, modified.filePath, file.md5);
    await expectChecksumRefused(res, CHECKSUM_MESSAGE.MISMATCH, 'Changed file typed with the original checksum');
    TestHelper.success('Old checksum refused');
  });

  combinedTest('TC-LD-CHK-086: Calling the server directly cannot skip the checksum check', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-086', page);
    const captured = captureTicketUpload(page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    const other = data.unique();
    const otherId = await createHolderDraw(createDrawPage, list, other, data.ticketFile(other));
    const direct = await replayTicketUpload(page, await captured, { drawId: otherId });
    expect(direct.status, `Direct API call with the holder's file must be refused (got ${direct.status} "${direct.error}")`).toBe(400);
    expect(direct.error, 'Direct API refusal message').toMatch(CHECKSUM_MESSAGE.OTHER_DRAW(holder.code));
    TestHelper.success('Server enforces the rule');
  });

  combinedTest('TC-LD-CHK-114: A Completed draw does not allow adding tickets and still protects its ticket file', SMOKE_SLOW, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    combinedTest.setTimeout(SLOW_TIMEOUT);
    await TestHelper.initTest('TC-LD-CHK-114', page);
    const completed = data.imminent(3, 5, 7);
    const completedFile = data.ticketFile(completed);
    await createDrawInStage(createDrawPage, list, completed, completedFile, /^Completed$/, 25 * 60000);
    await list.open();
    await list.findDraw(completed.code);
    const actions = await list.openRowMenu(completed.code);
    await list.closeRowMenu();
    expect.soft(actions, `APP DEFECT: a Completed draw must not offer "Add Tickets" (product rule 2026-11-23), but the row menu shows: ${actions.join(', ')}`).not.toContain('Add Tickets');
    const other = data.unique();
    const created = await createDrawWithFile(createDrawPage, other, data.copyOf(completedFile));
    await expectChecksumRefused(created.uploadResponse, CHECKSUM_MESSAGE.OTHER_DRAW(completed.code), 'Completed draw\'s file on another live draw');
    TestHelper.success('Completed draw protects its file');
  });

  combinedTest('TC-LD-CHK-115: A draw waiting for approval still protects its ticket file', SMOKE, async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData: data }) => {
    await TestHelper.initTest('TC-LD-CHK-115', page);
    const holder = data.unique();
    const holderFile = data.ticketFile(holder);
    await createHolderDraw(createDrawPage, list, holder, holderFile);
    await list.open();
    expect((await list.reviewDraw(holder.code)).status(), 'Review of the holder').toBeLessThan(400);
    await verifyDrawStatusChange(list, holder.code, DRAW_TAB.PENDING_APPROVAL);
    const other = data.unique();
    const otherFile = data.ticketFile(other);
    await createHolderDraw(createDrawPage, list, other, otherFile);
    const copy = data.copyOf(holderFile);
    await list.open();
    await expectChecksumRefused(await list.addTickets(other.code, copy.filePath, copy.md5), CHECKSUM_MESSAGE.OTHER_DRAW(holder.code), 'Holder file while the holder is Pending Approval');
    await verifyDrawStatusChange(list, holder.code, DRAW_TAB.PENDING_APPROVAL);
    TestHelper.success('Pending Approval keeps the checksum');
  });
});
