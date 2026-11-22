import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { DRAW_TAB, toDisplay } from '../../../data/factories/lottery-draw-data.factory';
import { createUniqueDraw, reviewDrawAndVerify, cleanupDraws } from '../../../utils/helpers/lottery-draw';

registerAllMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

combinedTest.describe('Lottery Draw Navigation & Display', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await lotteryDrawListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LD-NAV-001: Navigate to Lottery Draws from the sidebar', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-NAV-001', page);
    await expect(page).toHaveURL(/\/dashboard\/draw$/);
    await expect(list.pageHeading()).toBeVisible();
    TestHelper.success('Sidebar navigation to Draws works');
  });

  combinedTest('TC-LD-NAV-002: Draw table shows its columns', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-NAV-002', page);
    for (const column of ['Draw Code', 'Lottery Name', 'Draw Number', 'Status', 'Type', 'Start Date', 'Cut Off Date', 'Draw Date', 'Ticket Count', 'Bought Count', 'Remaining Count'] as const) {
      await expect(list.columnHeader(column), `"${column}" column`).toBeVisible();
    }
    TestHelper.success('All columns present');
  });

  combinedTest('TC-LD-NAV-003: Create Draw, Process Logs, search and the 11 stage tabs are shown', async ({ page, lotteryDrawListPage: list }) => {
    await TestHelper.initTest('TC-LD-NAV-003', page);
    await expect(list.createDrawButton()).toBeVisible();
    await expect(list.processLogsButton()).toBeVisible();
    await expect(list.searchBox()).toBeEditable();
    for (const tab of Object.values(DRAW_TAB)) await expect(list.tab(tab), `"${tab}" tab`).toBeVisible();
    await expect(list.tab(DRAW_TAB.ALL)).toHaveAttribute('aria-selected', 'true');
    TestHelper.success('Page controls present');
  });

  combinedTest('TC-LD-NAV-004: Draw Code link opens the draw page with the saved details', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-004', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.findDraw(draw.code);
    await list.codeLinkFor(draw.code).click();
    await expect(page).toHaveURL(new RegExp(`edit-lottery-draw\\?drawId=${draw.drawId}$`));
    await detail.verifyLoaded(draw.code);
    await expect(detail.heading()).toHaveText(`${draw.code} | ${draw.brand}`);
    await expect(detail.lotteryNameField).toHaveValue(draw.brand);
    await expect(detail.drawNumberField).toHaveValue(draw.drawNumber);
    await expect(detail.drawCodeField).toHaveValue(draw.code);
    await expect(detail.issueStartField).toHaveValue(toDisplay(draw.issueStart));
    await expect(detail.issueCutoffField).toHaveValue(toDisplay(draw.issueCutoff));
    await expect(detail.drawDateField).toHaveValue(toDisplay(draw.drawDate));
    await expect(detail.megaPrizeField).toHaveValue(draw.megaPrize);
    await expect(detail.approvalStageField).toHaveValue(/UNDER REVIEW/i);
    TestHelper.success('Draw page shows the saved details');
  });

  combinedTest('TC-LD-NAV-005: Row menu of an Under Review draw offers Review Draw, not Approve Draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-005', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.findDraw(draw.code);
    const actions = await list.openRowMenu(draw.code);
    await TestHelper.attachText('Row menu', actions.join('\n'));
    expect(actions).toEqual(expect.arrayContaining(['View', 'Add Tickets', 'Quick Settings', 'Reject Draw', 'Review Draw', 'Hold Draw']));
    expect(actions, 'An Under Review draw cannot be approved yet').not.toContain('Approve Draw');
    await list.closeRowMenu();
    TestHelper.success('Row menu verified');
  });

  combinedTest('TC-LD-NAV-006: Row menu of a Pending Approval draw offers Reject and Approve Draw', async ({ page, lotteryDrawListPage: list, createDrawPage, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-006', page);
    // 1. Meta: own draw, reviewed -> Pending Approval
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await reviewDrawAndVerify(list, draw.code);

    // 2. Open the row menu
    await list.open();
    await list.findDraw(draw.code);
    const actions = await list.openRowMenu(draw.code);
    await TestHelper.attachText('Row menu', actions.join('\n'));
    expect(actions).toEqual(expect.arrayContaining(['View', 'Add Tickets', 'Quick Settings', 'Reject', 'Approve Draw', 'Hold Draw']));
    expect(actions, 'A Pending Approval draw has already been reviewed').not.toContain('Review Draw');
    await list.closeRowMenu();

    await list.open();
    await list.rejectDraw(draw.code);
    TestHelper.success('Pending Approval row menu verified');
  });

  combinedTest('TC-LD-NAV-007: View menu item and Draw Code link open the same draw page', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-007', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    const drawUrl = new RegExp(`edit-lottery-draw\\?drawId=${draw.drawId}$`);

    // 2. Row menu > View
    await list.open();
    await list.findDraw(draw.code);
    await list.openRowMenu(draw.code);
    await list.menuAction('View').click();
    await expect(page).toHaveURL(drawUrl);
    await detail.verifyLoaded(draw.code);
    await expect(detail.heading()).toHaveText(`${draw.code} | ${draw.brand}`);

    // go back; click the code link
    await list.open();
    await list.findDraw(draw.code);
    await list.codeLinkFor(draw.code).click();
    await expect(page).toHaveURL(drawUrl);
    await detail.verifyLoaded(draw.code);
    await expect(detail.heading()).toHaveText(`${draw.code} | ${draw.brand}`);
    TestHelper.success('View and the code link land on the same draw page');
  });

  combinedTest('TC-LD-NAV-008: Back link and browser Back return to the list', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-008', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.findDraw(draw.code);

    // 2. Click 'Back'
    await list.codeLinkFor(draw.code).click();
    await detail.verifyLoaded(draw.code);
    await detail.backLink.click();
    await expect(page).toHaveURL(/\/dashboard\/draw(\?.*)?$/);
    await list.verifyPageLoaded();

    // reopen and press browser Back
    await list.findDraw(draw.code);
    await list.codeLinkFor(draw.code).click();
    await detail.verifyLoaded(draw.code);
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/draw(\?.*)?$/);
    await list.verifyPageLoaded();
    TestHelper.success('Back link and browser Back return to the Draws list');
  });

  combinedTest('TC-LD-NAV-009: Create Draw button opens /dashboard/draw/create-draw', async ({ page, lotteryDrawListPage: list, createDrawPage: create }) => {
    await TestHelper.initTest('TC-LD-NAV-009', page);
    await list.createDrawButton().click();
    await expect(page).toHaveURL(/\/dashboard\/draw\/create-draw/);
    await expect(page).toHaveTitle('Create Draw | BigWin');
    await expect(create.heading).toBeVisible();
    await expect(create.stepLabel('Details'), 'Stepper "Step 1 Details"').toBeVisible();
    await expect(create.stepLabel('Upload'), 'Stepper "Step 2 Upload"').toBeVisible();
    await expect(create.nextButton, 'Step 1 form shown').toBeVisible();
    TestHelper.success('Create Draw page opened');
  });

  combinedTest('TC-LD-NAV-010: Opening a draw page title is a meaningful BigWin title', async ({ page, lotteryDrawListPage: list, createDrawPage, lotteryDrawDetailPage: detail, testLotteryDrawData }) => {
    await TestHelper.initTest('TC-LD-NAV-010', page);
    const draw = await createUniqueDraw(createDrawPage, testLotteryDrawData);
    await list.open();
    await list.findDraw(draw.code);
    await list.codeLinkFor(draw.code).click();
    await detail.verifyLoaded(draw.code);
    const title = await page.title();
    await TestHelper.attachText('Document title', title);
    // Expected e.g. "Draw: View | BigWin"; the app shows the template leftover "Foundation: Blank Page | Carpatin"
    await expect(page, `Draw page title should be a BigWin title like "Draw: View | BigWin" but is "${title}"`).toHaveTitle(/\| BigWin$/);
    TestHelper.success('Draw page title is a BigWin title');
  });
});
