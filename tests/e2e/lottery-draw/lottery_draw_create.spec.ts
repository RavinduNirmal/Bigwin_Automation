import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB } from '../../../data/factories/lottery-draw-data.factory';
import { createUniqueDraw, expectDrawInTab, waitForTicketsLoaded, cleanupDraws } from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Create Draw (Step 1 Details -> Step 2 Upload). Ticket files come from utils/dbf/ticket-dbf.service.ts.
 * Draws cannot be deleted: every created test draw keeps an "AT..." code and a far-future schedule,
 * and leftovers still Under Review are rejected in afterEach.
 */
combinedTest.describe('Lottery Draw Create', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-CR-001: Create Draw Step 1 shows all fields', async ({ page, lotteryDrawListPage: list, createDrawPage: create }) => {
    await TestHelper.initTest('TC-LD-CR-001', page);
    await list.createDrawButton().click();
    await expect(page).toHaveURL(/\/dashboard\/draw\/create-draw/);
    for (const field of [create.brandSelect, create.drawNumberInput, create.drawCodeInput, create.issueStartInput, create.issueCutoffInput, create.drawDateInput, create.megaPrizeInput, create.nextButton]) {
      await expect(field).toBeVisible();
    }
    await expect(create.issueStartInput).toHaveAttribute('type', 'datetime-local');
    TestHelper.success('Step 1 fields shown');
  });

  combinedTest('TC-LD-CR-002: Empty Step 1 cannot continue', async ({ page, createDrawPage: create }) => {
    await TestHelper.initTest('TC-LD-CR-002', page);
    await create.open();
    let confirmShown = false;
    page.once('dialog', (d) => { confirmShown = true; void d.dismiss(); });
    await create.nextButton.click();
    expect(await create.drawCodeInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing), 'Draw Code is required').toBe(true);
    expect(confirmShown, 'No confirmation for an incomplete form').toBe(false);
    await expect(create.uploadHeading, 'Still on Step 1').toBeHidden();
    TestHelper.success('Empty form blocked');
  });

  combinedTest('TC-LD-CR-003: Next asks for confirmation and opens Step 2', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-003', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();
    expect(create.lastConfirmMessage, 'Confirmation before creating').toMatch(/Are you sure you want to create/i);
    await expect(create.step2Info('Draw Number')).toContainText(draw.drawNumber);
    await expect(create.step2Info('Brand Name')).toContainText(draw.brand);
    await expect(create.md5Input).toBeVisible();
    await expect(create.createDrawButton).toBeVisible();
    TestHelper.success('Step 2 shown for the entered draw');
  });

  combinedTest('TC-LD-CR-004: Create a draw with its ticket DBF and MD5', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-004', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    const row = await list.getDrawData(draw.code);
    await TestHelper.attachText('List row', JSON.stringify(row, null, 2));
    expect(row).toMatchObject({ code: draw.code, lotteryName: draw.brand, drawNumber: draw.drawNumber, status: 'Under Review' });
    await expectDrawInTab(list, draw.code, DRAW_TAB.UNDER_REVIEW);
    TestHelper.success(`Draw ${draw.code} created (id ${draw.drawId})`);
  });

  combinedTest('TC-LD-CR-005: Uploaded tickets are processed', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-005', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await waitForTicketsLoaded(list, draw.code, draw.ticketCount);
    await detail.open(draw.drawId);
    expect(await detail.summaryValue('Total Tickets'), 'Draw page Total Tickets').toBe(String(draw.ticketCount));
    await expect(detail.uploadLogRows().first(), 'Upload log row').toContainText('Completed');
    await list.open();
    const row = await list.getDrawData(draw.code);
    expect({ tickets: row.ticketCount, bought: row.boughtCount, remaining: row.remainingCount }).toEqual({ tickets: '100', bought: '0', remaining: '100' });
    TestHelper.success('100 tickets processed');
  });

  combinedTest('TC-LD-CR-006: Create Draw without a ticket file is blocked', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-006', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();
    await create.md5Input.fill('0123456789abcdef0123456789abcdef');
    CreateDrawPage.submittedCodes.push(draw.code);
    let created = false;
    page.on('response', (r) => { if (/\/api\/draw\/create$/.test(new URL(r.url()).pathname) && r.status() < 400) created = true; });
    await create.createDrawButton.click({ timeout: 5000 }).catch(() => {});
    await expect(create.uploadHeading, 'Should stay on Step 2').toBeVisible();
    expect(created, 'No draw may be created without a ticket file').toBe(false);
    await list.open();
    await list.searchDraws(draw.code);
    await expect(list.rowFor(draw.code)).toHaveCount(0);
    TestHelper.success('No file - no draw');
  });

  combinedTest('TC-LD-CR-007: Create Draw without the MD5 checksum is blocked', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-007', page);
    const draw = testLotteryDrawData.unique();
    const file = testLotteryDrawData.ticketFile(draw);
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();
    await create.attachTicketFile(file.filePath);
    CreateDrawPage.submittedCodes.push(draw.code);
    let created = false;
    page.on('response', (r) => { if (/\/api\/draw\/create$/.test(new URL(r.url()).pathname) && r.status() < 400) created = true; });
    await create.createDrawButton.click({ timeout: 5000 }).catch(() => {});
    await expect(create.uploadHeading, 'Should stay on Step 2').toBeVisible();
    expect(created, 'No draw may be created without the MD5').toBe(false);
    await list.open();
    await list.searchDraws(draw.code);
    await expect(list.rowFor(draw.code)).toHaveCount(0);
    TestHelper.success('No MD5 - no draw');
  });

  combinedTest('TC-LD-CR-008: A wrong MD5 checksum at creation is rejected', async ({ page, lotteryDrawListPage: list, createDrawPage: create, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-008', page);
    const draw = testLotteryDrawData.unique();
    const file = testLotteryDrawData.ticketFile(draw);
    const wrongMd5 = file.md5.replace(/^./, (c) => (c === '0' ? '1' : '0'));
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();
    await create.attachTicketFile(file.filePath);
    await create.md5Input.fill(wrongMd5);
    await create.initiateNowCheckbox.check();
    const { draw: res } = await create.submitCreateDraw(draw.code);
    await TestHelper.attachText('Create response', `${res.status()} ${await res.text().catch(() => '')}`);
    if (res.status() < 400) {
      // the draw record may be created, but its tickets must NOT be accepted with a mismatching checksum
      const drawId = Number((await res.json().catch(() => ({}))).results);
      await page.waitForTimeout(90000); // give the background ticket processing time to (wrongly) load them
      await detail.open(drawId);
      expect(await detail.summaryValue('Total Tickets'), `Tickets must not be loaded when the MD5 (${wrongMd5}) does not match the file (${file.md5})`).toBe('0');
      await expect(detail.uploadLogRows().filter({ hasText: 'Completed' }), 'No completed ticket upload').toHaveCount(0);
    } else {
      await list.open();
      await list.searchDraws(draw.code);
      await expect(list.rowFor(draw.code)).toHaveCount(0);
    }
    TestHelper.success('Wrong MD5 rejected');
  });

  combinedTest('TC-LD-CR-009: A second draw with an existing Draw Code is rejected', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-009', page);
    const first = await createUniqueDraw(create, testLotteryDrawData);
    const second = testLotteryDrawData.unique({ code: first.code });
    const file = testLotteryDrawData.ticketFile(second);
    await create.open();
    await create.fillDetails(second);
    await create.goToUploadStep();
    await create.attachTicketFile(file.filePath);
    await create.md5Input.fill(file.md5);
    const { draw: res } = await create.submitCreateDraw(second.code);
    expect(res.status(), 'Duplicate code must be rejected').toBeGreaterThanOrEqual(400);
    await TestHelper.attachText('Rejected', await res.text().catch(() => ''));
    await list.open();
    await list.searchDraws(first.code);
    await expect(list.rowFor(first.code), 'Only one draw with that code').toHaveCount(1);
    TestHelper.success('Duplicate draw code rejected');
  });

  combinedTest('TC-LD-CR-011: Back from Step 2 keeps the Step 1 values', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-011', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();
    await create.backButton.click();
    await expect(create.brandSelect).toContainText(draw.brand);
    await expect(create.drawNumberInput).toHaveValue(draw.drawNumber);
    await expect(create.drawCodeInput).toHaveValue(draw.code);
    await expect(create.issueStartInput).toHaveValue(draw.issueStart);
    await expect(create.issueCutoffInput).toHaveValue(draw.issueCutoff);
    await expect(create.drawDateInput).toHaveValue(draw.drawDate);
    await expect(create.megaPrizeInput).toHaveValue(draw.megaPrize);
    TestHelper.success('Values kept after Back');
  });
});
