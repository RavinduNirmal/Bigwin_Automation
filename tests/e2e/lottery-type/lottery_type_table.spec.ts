import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import {
  createUniqueLotteryType,
  sortAndVerify,
  expectLotteryTypeInTable,
  expectLotteryTypeNotInTable,
  expectLotteryTypeSaved,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerAllMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

/**
 * Sorting, tabs and page info. Other workers add/remove rows at any time, so sort checks only
 * assert that the visible rows are ORDERED, and tab checks only look at the test's own records.
 */
combinedTest.describe('Lottery Type Table', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-TBL-001: Sort by Code in both directions', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-TBL-001', page);

    const first = await sortAndVerify(lotteryTypePage, 'Code');
    const second = await sortAndVerify(lotteryTypePage, 'Code', first === 'ascending' ? 'descending' : 'ascending');
    await TestHelper.attachText('Sort Directions', `${first} then ${second}`);
    TestHelper.success('Code sorting works both ways');
  });

  combinedTest('TC-LT-TBL-002: Sort by Type Description', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-TBL-002', page);

    const direction = await sortAndVerify(lotteryTypePage, 'Type Description');
    await TestHelper.attachText('Sort Direction', direction);
    TestHelper.success('Type Description sorting works');
  });

  combinedTest('TC-LT-TBL-003: Active tab hides DISABLED lottery types', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-TBL-003', page);

    const active = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    // Disabled via Edit: creating with DISABLED is a separate known defect (TC-LT-CR-003)
    const disabled = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await lotteryTypePage.editLotteryType(disabled.code, { status: 'DISABLED' });
    await expectLotteryTypeSaved(lotteryTypePage, disabled.code, { status: 'DISABLED' });
    await lotteryTypePage.selectTab('Active');
    await expectLotteryTypeInTable(lotteryTypePage, active.code);
    await expectLotteryTypeNotInTable(lotteryTypePage, disabled.code);
    await TestHelper.step(page, 'Active Tab', `${active.code} shown, ${disabled.code} hidden`);
    TestHelper.success('Active tab filters by status');
  });

  combinedTest('TC-LT-TBL-004: Deleted tab does not list records that are not deleted', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-TBL-004', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await lotteryTypePage.selectTab('Deleted');
    await expectLotteryTypeNotInTable(lotteryTypePage, lotteryType.code);
    await lotteryTypePage.selectTab('All');
    await expectLotteryTypeInTable(lotteryTypePage, lotteryType.code);
    TestHelper.success('Deleted tab excludes live records');
  });

  combinedTest('TC-LT-TBL-005: Page information is shown', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-TBL-005', page);

    await expect(lotteryTypePage.pageInfo()).toBeVisible();
    const [current, total] = ((await lotteryTypePage.pageInfo().innerText()).match(/\d+/g) ?? []).map(Number);
    expect(current, 'Current page should be at least 1').toBeGreaterThanOrEqual(1);
    expect(current, 'Current page should not exceed the page count').toBeLessThanOrEqual(total);
    TestHelper.success(`Page ${current} of ${total}`);
  });
});
