import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB, DEFAULT_DRAW_BRAND } from '../../../data/factories/lottery-draw-data.factory';
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

  combinedTest('TC-LD-CR-012: Create Draw with a duplicate Draw Number is rejected', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-012', page);
    // 1. Meta: own draw X exists
    const first = await createUniqueDraw(create, testLotteryDrawData);

    // 2. Submit a second draw with the same draw number, a different code and schedule
    const second = testLotteryDrawData.unique({ drawNumber: first.drawNumber, code: `${first.code}B` });
    const file = testLotteryDrawData.ticketFile(second);
    await create.open();
    await create.fillDetails(second);
    await create.goToUploadStep();
    await create.attachTicketFile(file.filePath);
    await create.md5Input.fill(file.md5);
    await create.initiateNowCheckbox.check();
    const { draw: res } = await create.submitCreateDraw(second.code);
    await TestHelper.attachText('Create response', `${res.status()} ${await res.text().catch(() => '')}`);
    expect(res.status(), `A second draw with draw number ${first.drawNumber} must be rejected`).toBeGreaterThanOrEqual(400);

    await list.open();
    await list.searchDraws(first.drawNumber);
    await expect(list.dataRows(), `Only one draw may carry draw number ${first.drawNumber}`).toHaveCount(1);
    TestHelper.success('Duplicate draw number rejected');
  });

  combinedTest('TC-LD-CR-013: Same brand cannot have two draws at the same draw time', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-013', page);
    const first = await createUniqueDraw(create, testLotteryDrawData);

    // 2. Submit a new draw (new number/code) with the identical draw date
    const second = testLotteryDrawData.unique({ drawDate: first.drawDate, issueStart: first.issueStart, issueCutoff: first.issueCutoff });
    const file = testLotteryDrawData.ticketFile(second);
    await create.open();
    await create.fillDetails(second);
    await create.goToUploadStep();
    await create.attachTicketFile(file.filePath);
    await create.md5Input.fill(file.md5);
    await create.initiateNowCheckbox.check();
    const { draw: res } = await create.submitCreateDraw(second.code);
    await TestHelper.attachText('Create response', `${res.status()} ${await res.text().catch(() => '')}`);
    expect(res.status(), `Brand "${first.brand}" already has a draw at ${first.drawDate}; a second one must be rejected`).toBeGreaterThanOrEqual(400);

    await list.open();
    await list.searchDraws(second.code);
    await expect(list.rowFor(second.code), 'No second draw may be created').toHaveCount(0);
    TestHelper.success('Same draw time for the same brand rejected');
  });

  combinedTest('TC-LD-CR-014: Lottery Brand list offers only approved, active brands', async ({ page, createDrawPage: create }) => {
    await TestHelper.initTest('TC-LD-CR-014', page);
    const brandsResponse = page.waitForResponse((r) => /\/api\/lottery\/brands\/simple/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 });
    await create.open();

    // 2. Open the Lottery Brand dropdown (brandOptions closes it again with Escape)
    const options = await create.brandOptions();
    await TestHelper.attachText('Brand options', options.join('\n'));
    expect(options, 'Brand dropdown should offer the draw brand').toContain(DEFAULT_DRAW_BRAND);

    const res = await brandsResponse;
    expect(res.request().postDataJSON(), 'Brands must be requested as APPROVED + ACTIVE').toMatchObject({ approvalStatus: 'APPROVED', status: 'ACTIVE' });
    // every option comes from the approved + active response (shape-independent check)
    const body = JSON.stringify(await res.json());
    for (const name of options) expect(body, `Option "${name}" should come from the approved+active response`).toContain(name);
    TestHelper.success(`${options.length} approved + active brands offered`);
  });

  combinedTest('TC-LD-CR-015: Step 2 Schedule Date is required unless Initiate Now is ticked', async ({ page, lotteryDrawListPage: list, createDrawPage: create, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-015', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();

    // 2. Schedule Date is shown and required by default
    await expect(create.scheduleDateInput, 'Schedule Date is shown by default').toBeVisible();
    await expect(create.scheduleDateInput).toHaveAttribute('type', 'datetime-local');
    await expect(create.scheduleDateInput, 'Schedule Date is required').toHaveJSProperty('required', true);

    // tick Initiate Now: Schedule Date is hidden or cleared
    await create.initiateNowCheckbox.check();
    await expect
      .poll(async () => ((await create.scheduleDateInput.isVisible()) ? await create.scheduleDateInput.inputValue() : ''), { message: 'Schedule Date should be cleared/hidden when Initiate Now is ticked' })
      .toBe('');

    // untick: Schedule Date is back
    await create.initiateNowCheckbox.uncheck();
    await expect(create.scheduleDateInput).toBeVisible();

    // Initiate Now draw shows "Not Scheduled" in the draw page Logs table
    await create.backButton.click();
    const created = await createUniqueDraw(create, testLotteryDrawData);
    await detail.open(created.drawId);
    await expect(detail.uploadLogRows().first(), 'Upload log of an Initiate Now draw').toContainText('Not Scheduled');
    await list.open();
    TestHelper.success('Schedule Date vs Initiate Now verified');
  });

  combinedTest('TC-LD-CR-016: Cancel on the create draw confirm keeps the user on Step 1', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-016', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);

    // 2. Click Next and dismiss (Cancel) the confirm
    const confirmMessage = await create.clickNextAndDismiss();
    expect(confirmMessage, 'The create confirmation should be shown').not.toBeNull();
    await expect(create.uploadHeading, 'Cancel must not open Step 2').toBeHidden();
    await expect(create.nextButton, 'Still on Step 1').toBeVisible();
    await expect(create.brandSelect).toContainText(draw.brand);
    await expect(create.drawNumberInput).toHaveValue(draw.drawNumber);
    await expect(create.drawCodeInput).toHaveValue(draw.code);
    await expect(create.issueStartInput).toHaveValue(draw.issueStart);
    await expect(create.issueCutoffInput).toHaveValue(draw.issueCutoff);
    await expect(create.drawDateInput).toHaveValue(draw.drawDate);
    await expect(create.megaPrizeInput).toHaveValue(draw.megaPrize);
    TestHelper.success('Cancel keeps the user on Step 1 with the values');
  });

  combinedTest('TC-LD-CR-017: Confirm and label copy are spelled correctly', async ({ page, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-017', page);
    const draw = testLotteryDrawData.unique();
    await create.open();

    // 2. Brand label: "Lottery Brand *" (app shows "Lottery Brand * *")
    const label = (await create.brandSelect.getAttribute('aria-label')) ?? (await create.brandSelect.innerText()).split('\n')[0];
    await TestHelper.attachText('Brand label', label);
    await expect.soft(create.brandSelect, `Brand label should read "Lottery Brand *" but is "${label}"`).toHaveAccessibleName(/^Lottery Brand \*$/);

    // confirm text: "Are you sure you want to create draw?" (app says "darw")
    await create.fillDetails(draw);
    await create.goToUploadStep();
    await TestHelper.attachText('Confirm text', create.lastConfirmMessage);
    expect.soft(create.lastConfirmMessage, `Confirm should read "Are you sure you want to create draw?" but says "${create.lastConfirmMessage}"`).toBe('Are you sure you want to create draw?');
    TestHelper.success('Copy is spelled correctly');
  });

  combinedTest('TC-LD-CR-018: Browser reload or leaving Step 2 after Next creates nothing', async ({ page, lotteryDrawListPage: list, createDrawPage: create, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-CR-018', page);
    const draw = testLotteryDrawData.unique();
    await create.open();
    await create.fillDetails(draw);
    await create.goToUploadStep();

    // 2. Reload on Step 2 (a leave-page prompt, if any, is accepted), then open the list and search the code
    page.once('dialog', (d) => void d.accept());
    await page.reload();
    await list.open();
    await list.searchDraws(draw.code);
    await expect(list.rowFor(draw.code), 'A draw is only created by "Create Draw"').toHaveCount(0);
    TestHelper.success('Nothing created before Create Draw');
  });
});
