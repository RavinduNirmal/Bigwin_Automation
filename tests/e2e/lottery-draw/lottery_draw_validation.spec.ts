import * as fs from 'fs';
import { mergeTests, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';
import { LotteryDrawDetailPage } from '../../../pages/draw/lottery-draw-detail.page';
import { LotteryDrawData } from '../../../data/factories/lottery-draw-data.factory';
import { buildDbf, generateTicketRecords, md5Of } from '../../../utils/dbf/ticket-dbf.service';
import {
  cleanupDraws,
  submitDrawWithTicketFile,
  waitForUploadSettled,
} from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/** Step 1 > Next outcome: native confirms shown and whether Step 2 opened. */
/**
 * Create Draw Step 1 / Step 2 validation. Except VAL-015 / 017 / 018, every test stops at Step 1 > Next and
 * never presses "Create Draw". Dates are far-future (2027+) unless the test is about past dates.
 */
combinedTest.describe('Lottery Draw Create Draw Validation', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-VAL-001: Cutoff before Issue Start is rejected inline', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-001', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2027-06-01T10:00', issueCutoff: '2027-05-30T18:00', drawDate: '2027-06-10T20:30' });
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    expect(out.onStep2, 'Must stay on Step 1').toBe(false);
    await expect(create.fieldError('Ticket Issue Cutoff Date & Time must be after Ticket Issue Start Date & Time'), 'Inline cutoff error should be shown').toBeVisible();
    expect(out.confirms, 'Invalid data must be reported BEFORE the "create draw" confirmation is asked').toEqual([]);
    TestHelper.success('Cutoff before start rejected');
  });

  combinedTest('TC-LD-VAL-002: A cutoff equal to the Issue Start is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-002', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2027-06-01T10:00', issueCutoff: '2027-06-01T10:00', drawDate: '2027-06-10T20:30' });
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    expect(out.onStep2, 'A cutoff equal to the Issue Start was accepted - Step 2 opened').toBe(false);
    await expect(create.fieldError('Ticket Issue Cutoff Date & Time must be after Ticket Issue Start Date & Time'), 'Inline cutoff error should be shown').toBeVisible();
    TestHelper.success('Cutoff equal to start rejected');
  });

  combinedTest('TC-LD-VAL-003: A draw date before the cutoff is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-003', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2027-06-01T10:00', issueCutoff: '2027-06-10T18:00', drawDate: '2027-06-10T12:00' });
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    expect(out.onStep2, 'Draw date 12:00 is before the cutoff 18:00 - Step 2 must not open').toBe(false);
    await expect(create.fieldError('Draw Date & Time must be after Ticket Issue Cutoff Date & Time'), 'An inline error that the Draw Date must be after the cutoff should be shown').toBeVisible();
    TestHelper.success('Draw date before cutoff rejected');
  });

  combinedTest('TC-LD-VAL-004: A cutoff equal to the draw date is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-004', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2027-06-01T10:00', issueCutoff: '2027-06-10T18:00', drawDate: '2027-06-10T18:00' });
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    expect(out.onStep2, 'Cutoff equal to the draw date was accepted - Step 2 opened').toBe(false);
    await expect(create.fieldError('Draw Date & Time must be after Ticket Issue Cutoff Date & Time'), 'An inline error should be shown').toBeVisible();
    TestHelper.success('Cutoff equal to draw date rejected');
  });

  combinedTest('TC-LD-VAL-005: Past dates are rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-005', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2020-01-01T10:00', issueCutoff: '2020-01-02T10:00', drawDate: '2020-01-03T10:00' });
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    expect(out.onStep2, 'Draw dates in 2020 were accepted - Step 2 opened').toBe(false);
    await expect(create.fieldError(/past|future|in the past/i), 'An inline error about past dates should be shown').toBeVisible();
    TestHelper.success('Past dates rejected');
  });

  combinedTest('TC-LD-VAL-006: The cutoff error clears once the cutoff is corrected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-006', page);
    const draw = testLotteryDrawData.unique({ issueStart: '2027-06-01T10:00', issueCutoff: '2027-05-30T18:00', drawDate: '2027-06-10T20:30' });
    await create.open();
    await create.fillDetails(draw);
    await create.attemptNext();
    const error = create.fieldError('Ticket Issue Cutoff Date & Time must be after Ticket Issue Start Date & Time');
    await expect(error).toBeVisible();
    await create.issueCutoffInput.fill('2027-06-10T18:00');
    await expect(error, 'The cutoff error should disappear as soon as the cutoff is valid').toBeHidden({ timeout: 3000 });
    TestHelper.success('Cutoff error cleared after correction');
  });

  combinedTest('TC-LD-VAL-007: A Draw Number of 0 or a negative number is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-007', page);
    await create.open();
    await create.fillDetails(testLotteryDrawData.unique());
    for (const value of ['0', '-5']) {
      await create.drawNumberInput.fill(value);
      const out = await create.attemptNext();
      await expect(create.fieldError('Draw Number must be a positive number'), `Draw Number ${value} should show an error`).toBeVisible();
      expect(out.onStep2, `Draw Number ${value}: must stay on Step 1`).toBe(false);
    }
    TestHelper.success('0 and negative Draw Number rejected');
  });

  combinedTest('TC-LD-VAL-008: A decimal Draw Number is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-008', page);
    await create.open();
    await create.fillDetails({ ...testLotteryDrawData.unique(), drawNumber: '1.5' });
    const out = await create.attemptNext();
    await expect(create.fieldError('Draw Number must be an integer'), 'Decimal Draw Number should show an error').toBeVisible();
    expect(out.onStep2, 'Must stay on Step 1').toBe(false);
    TestHelper.success('Decimal Draw Number rejected');
  });

  combinedTest('TC-LD-VAL-009: A 20-digit Draw Number is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-009', page);
    await create.open();
    await create.fillDetails({ ...testLotteryDrawData.unique(), drawNumber: '99999999999999999999' });
    const out = await create.attemptNext();
    expect(out.onStep2, 'A 20-digit Draw Number was accepted - Step 2 shows it').toBe(false);
    TestHelper.success('Very long Draw Number rejected');
  });

  combinedTest('TC-LD-VAL-010: A Mega Prize of 0, negative or empty is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-010', page);
    await create.open();
    await create.fillDetails(testLotteryDrawData.unique());
    for (const value of ['0', '-100', '']) {
      await create.megaPrizeInput.fill(value);
      const out = await create.attemptNext();
      expect(out.onStep2, `Mega Prize "${value}": must stay on Step 1`).toBe(false);
      if (value !== '') {
        await expect(create.fieldError('Mega Prize must be greater than 0'), `Mega Prize "${value}" should show an error`).toBeVisible();
      }
    }
    TestHelper.success('Invalid Mega Prize rejected');
  });

  combinedTest('TC-LD-VAL-011: Mega Prize accepts digits and cents only', async ({ page, createDrawPage: create }) => {
    await TestHelper.initTest('TC-LD-VAL-011', page);
    await create.open();
    await create.megaPrizeInput.clear();
    await create.megaPrizeInput.pressSequentially('abc');
    await expect(create.megaPrizeInput, 'Letters must not be accepted').toHaveValue(/^\d*$/);
    await create.megaPrizeInput.fill('1000');
    await create.megaPrizeInput.pressSequentially('.55');
    // hotfix 2026-11-23: cents are allowed (detailed cases: tests/hotfix/hotfix.spec.ts, TC-HF-MP-*)
    await expect(create.megaPrizeInput, 'Cents should be accepted (Mega Prize hotfix)').toHaveValue('1000.55');
    TestHelper.success('Mega Prize takes digits and cents only');
  });

  combinedTest('TC-LD-VAL-012: A 21-digit Mega Prize is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-012', page);
    await create.open();
    await create.fillDetails({ ...testLotteryDrawData.unique(), megaPrize: '999999999999999999999' });
    const out = await create.attemptNext();
    expect(out.onStep2, 'A 21-digit Mega Prize was accepted - Step 2 opened').toBe(false);
    TestHelper.success('Huge Mega Prize rejected');
  });

  combinedTest('TC-LD-VAL-013: A whitespace-only Draw Code is rejected', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-013', page);
    await create.open();
    await create.fillDetails({ ...testLotteryDrawData.unique(), code: '   ' });
    const out = await create.attemptNext();
    expect(out.onStep2, 'A Draw Code of only spaces was accepted - Step 2 opened').toBe(false);
    TestHelper.success('Whitespace Draw Code rejected');
  });

  combinedTest('TC-LD-VAL-014: The Draw Code has a length limit', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-014', page);
    await create.open();
    await create.fillDetails({ ...testLotteryDrawData.unique(), code: `AT${'9'.repeat(298)}` });
    const limited = (await create.drawCodeInput.inputValue()).length < 300;
    if (!limited) {
      const out = await create.attemptNext();
      expect(out.onStep2, 'A 300-character Draw Code was accepted (no input limit, no length error)').toBe(false);
    }
    TestHelper.success('Draw Code length limited');
  });

  combinedTest('TC-LD-VAL-015: HTML in the Draw Code is rejected or shown as plain text', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage: create, testLotteryDrawData }, testInfo) => {
    await TestHelper.initTest('TC-LD-VAL-015', page);
    const base = testLotteryDrawData.unique();
    const draw = { ...base, code: `AT<b>x</b>${base.drawNumber}` };
    const file = testLotteryDrawData.ticketFile(base); // same draw number; file named after the plain code
    await TestHelper.attachText('Output folder', testInfo.outputPath());
    await create.open();
    await create.fillDetails(draw);
    const out = await create.attemptNext();
    if (!out.onStep2) {
      await TestHelper.attachText('Result', 'HTML code refused on Step 1');
      TestHelper.success('HTML Draw Code refused');
      return;
    }
    await create.attachTicketFile(file.filePath);
    await create.md5Input.fill(file.md5);
    await create.initiateNowCheckbox.check();
    const { draw: res } = await create.submitCreateDraw(draw.code);
    const body = (await res.json().catch(() => ({}))) as { results?: number };
    if (res.status() >= 400) {
      await TestHelper.attachText('Result', `HTML code refused by the server: ${res.status()} ${JSON.stringify(body)}`);
      TestHelper.success('HTML Draw Code refused');
      return;
    }
    await list.open();
    await list.searchDraws(draw.drawNumber);
    await expect(list.rowFor(draw.code), `The code must be listed literally as "${draw.code}" (no HTML rendered)`).toHaveCount(1, { timeout: 30000 });
    await expect(list.renderedMarkupIn(draw.code), 'No <b> element may be rendered in the list').toHaveCount(0);
    await detail.open(Number(body.results));
    await detail.verifyLoaded(draw.code);
    await expect(detail.drawCodeField).toHaveValue(draw.code);
    TestHelper.success('HTML Draw Code shown as plain text');
  });

  combinedTest('TC-LD-VAL-016: A non-DBF file is refused in the Upload Files dialog', async ({ page, createDrawPage: create, testLotteryDrawData }, testInfo) => {
    await TestHelper.initTest('TC-LD-VAL-016', page);
    const notes = testInfo.outputPath('notes.json');
    fs.writeFileSync(notes, JSON.stringify({ not: 'a dbf file' }));
    await create.open();
    await create.fillDetails(testLotteryDrawData.unique());
    await create.goToUploadStep();
    await create.selectFileButton.click();
    await create.chooseUploadFile(notes);
    await create.uploadDialogButton('Add').click();
    await expect(create.dbfOnlyMessage(), 'A message that only .dbf files are allowed should be shown').toBeVisible({ timeout: 5000 });
    await expect(create.attachedFile('notes.json'), 'The .json file must not be attached').toBeHidden();
    TestHelper.success('Non-DBF file refused');
  });

  combinedTest('TC-LD-VAL-017: A corrupt DBF is rejected with a clear result', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage: create, testLotteryDrawData }, testInfo) => {
    await TestHelper.initTest('TC-LD-VAL-017', page);
    const draw = testLotteryDrawData.unique();
    const full = buildDbf(generateTicketRecords({ startId: draw.ticketStartId, totalRecords: 100, prefix: '0', numbersPerRecord: 4 }));
    const truncated = full.subarray(0, 32 + 4 * 32 + 1); // header only, no records
    fs.mkdirSync(testInfo.outputPath('tickets'), { recursive: true });
    const filePath = testInfo.outputPath('tickets', `${draw.code}.DBF`);
    fs.writeFileSync(filePath, truncated);
    const result = await submitDrawWithTicketFile(create, draw, { filePath, md5: md5Of(truncated) });
    await TestHelper.attachText('Create response', `${result.status} ${result.body}`);
    if (result.status >= 400) {
      TestHelper.success('Corrupt DBF refused at creation');
      return;
    }
    const count = await waitForUploadSettled(list, detail, result.drawId, draw.code);
    expect(count, 'A corrupt DBF must not give the draw any tickets').toBe('0');
    await list.open();
    const review = await list.reviewDraw(draw.code);
    expect(review.status(), 'A draw without tickets must not be reviewable').toBeGreaterThanOrEqual(400);
    TestHelper.success('Corrupt DBF gave no tickets');
  });

  combinedTest('TC-LD-VAL-018: DBF barcodes that do not belong to the draw number are rejected', async ({ page, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-VAL-018', page);
    const other = testLotteryDrawData.unique({ drawNumber: `8${Date.now().toString().slice(-9)}` });
    const draw = testLotteryDrawData.unique();
    const foreign = testLotteryDrawData.ticketFile(other); // barcodes of draw number "other"
    const result = await submitDrawWithTicketFile(create, draw, foreign);
    await TestHelper.attachText('Create response', `${result.status} ${result.body}`);
    if (result.status >= 400) {
      TestHelper.success('Mismatched DBF refused at creation');
      return;
    }
    const count = await waitForUploadSettled(list, detail, result.drawId, draw.code);
    expect(count, 'The draw must not receive 100 tickets whose barcodes belong to another draw number').not.toBe('100');
    TestHelper.success('Mismatched DBF not accepted as tickets');
  });
});
