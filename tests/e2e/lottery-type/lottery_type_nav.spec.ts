import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import { createUniqueLotteryType, cleanupLotteryTypes } from '../../../utils/helpers/lottery-type';

registerAllMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

combinedTest.describe('Lottery Type Navigation & Table Display', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-NAV-001: Navigate to Lottery Type from the sidebar', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-NAV-001', page);

    // the fixture navigated through the real sidebar: Lottery -> Lottery Type
    await expect(page).toHaveURL(/\/dashboard\/lottery\/lottery-type$/);
    await expect(page).toHaveTitle('Lottery: List | BigWin');
    await expect(lotteryTypePage.pageHeading()).toBeVisible();
    await expect(lotteryTypePage.sidebarLotteryTypeLink(), 'Sidebar "Lottery Type" link should be visible').toBeVisible();
    await TestHelper.step(page, 'Lottery Type Page', 'Opened from sidebar Lottery -> Lottery Type');
    TestHelper.success('Sidebar navigation works');
  });

  combinedTest('TC-LT-NAV-002: Table shows Code, Type Description, Status and Stage columns', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-NAV-002', page);

    await expect(lotteryTypePage.dataTable()).toBeVisible();
    for (const column of ['Code', 'Type Description', 'Status', 'Stage'] as const) {
      await expect(lotteryTypePage.columnHeader(column), `"${column}" column should be shown`).toBeVisible();
    }
    await TestHelper.attachText('Columns', (await lotteryTypePage.columnHeaders().allInnerTexts()).map((h) => h.trim()).filter(Boolean).join(', '));
    await AllureHelpers.attachScreenshot(page, 'Table Columns');
    TestHelper.success('All columns present');
  });

  combinedTest('TC-LT-NAV-003: Page shows Add New Type, search, tabs and page info', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-NAV-003', page);

    await expect(lotteryTypePage.addNewTypeButton()).toBeEnabled();
    await expect(lotteryTypePage.searchBox()).toBeEditable();
    for (const tab of ['All', 'Active', 'Deleted'] as const) {
      await expect(lotteryTypePage.tab(tab), `"${tab}" tab should be shown`).toBeVisible();
    }
    await expect(lotteryTypePage.tab('All'), '"All" tab should be selected by default').toHaveAttribute('aria-selected', 'true');
    await expect(lotteryTypePage.pageInfo(), '"Page X of Y" should be shown').toBeVisible();
    TestHelper.success('Page controls present');
  });

  combinedTest('TC-LT-NAV-004: Row actions menu offers Edit, Delete and Logs', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-NAV-004', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await lotteryTypePage.openRowMenu(lotteryType.code);
    for (const item of ['Edit', 'Delete', 'Logs'] as const) {
      await expect(lotteryTypePage.menuItem(item), `"${item}" should be in the row menu`).toBeVisible();
    }
    await TestHelper.step(page, 'Row Menu', `Menu of "${lotteryType.code}": Edit, Delete, Logs`);
    await page.keyboard.press('Escape');
    await expect(lotteryTypePage.rowMenu()).toBeHidden();
    TestHelper.success('Row actions available');
  });

  combinedTest('TC-LT-NAV-005: Row menu "Logs" opens the audit log', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-NAV-005', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await lotteryTypePage.openLogs(lotteryType.code);
    await expect(page, 'Logs should open the audit log page').toHaveURL(/\/dashboard\/audit/, { timeout: 30000 });
    await TestHelper.step(page, 'Audit Log', `Opened from "${lotteryType.code}"`);
    TestHelper.success('Logs opens the audit log');
  });
});
