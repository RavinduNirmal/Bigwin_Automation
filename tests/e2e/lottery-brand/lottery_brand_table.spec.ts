import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import {
  createUniqueBrand,
  expectBrandListed,
  expectBrandNotListed,
  sortBrandsAndVerify,
  expectSortReverses,
  expectAllRowsHave,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

/**
 * Sorting, tabs, Status filter and pagination (server-side). Assertions hold no matter which rows
 * other workers add: ordering, stage/status of every visible row, and the test's own brands.
 * Not automated from the plan: TBL-012 (row checkboxes - no expected behaviour defined).
 */
combinedTest.describe('Lottery Brand Table', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-TBL-001: Default order is newest first', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-TBL-001', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.open();
    await expect(list.rowFor(brand.code), 'The newest brand should be on page 1 of the default (newest first) list').toBeVisible({ timeout: 15000 });
    TestHelper.success('Newest brand on page 1');
  });

  combinedTest('TC-LB-TBL-002: Sort by Code in both directions', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-002', page);
    const first = await sortBrandsAndVerify(list, 'Code');
    await sortBrandsAndVerify(list, 'Code', first === 'ascending' ? 'descending' : 'ascending');
    TestHelper.success('Code sorting both ways');
  });

  combinedTest('TC-LB-TBL-003: Sort by Brand Name, Type and Price', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-003', page);
    for (const column of ['Brand Name', 'Type', 'Price'] as const) {
      const first = await sortBrandsAndVerify(list, column);
      await sortBrandsAndVerify(list, column, first === 'ascending' ? 'descending' : 'ascending');
    }
    TestHelper.success('Brand Name, Type and Price sortable');
  });

  combinedTest('TC-LB-TBL-004: Sort by Status', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-004', page);
    // Active and Disable brands both exist, so ascending and descending must start differently
    await expectSortReverses(list, 'Status');
    TestHelper.success('Status sortable');
  });

  combinedTest('TC-LB-TBL-005: Sort by Stage', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-005', page);
    await expectSortReverses(list, 'Stage');
    await sortBrandsAndVerify(list, 'Stage');
    TestHelper.success('Stage sortable');
  });

  combinedTest('TC-LB-TBL-006: Repeated header clicks toggle the direction', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-006', page);
    const d1 = await sortBrandsAndVerify(list, 'Code');
    const d2 = await sortBrandsAndVerify(list, 'Code', d1 === 'ascending' ? 'descending' : 'ascending');
    await sortBrandsAndVerify(list, 'Code', d2 === 'ascending' ? 'descending' : 'ascending');
    const other = await sortBrandsAndVerify(list, 'Brand Name');
    expect(other, 'A different header starts ascending').toBe('ascending');
    TestHelper.success('Sort toggles');
  });

  combinedTest('TC-LB-TBL-007: Tabs filter by stage', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-TBL-007', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.selectTab('Under Review');
    await expectAllRowsHave(list, 'Stage', 'Under Review');
    await expectBrandListed(list, brand.code);
    await list.clearSearch();
    await list.selectTab('Approved');
    await expectAllRowsHave(list, 'Stage', 'Approved');
    await expectBrandNotListed(list, brand.code);
    await list.clearSearch();
    await list.selectTab('Pending Approval');
    await expectAllRowsHave(list, 'Stage', 'Pending Approval');
    await expectBrandNotListed(list, brand.code);
    await list.clearSearch();
    await list.selectTab('All');
    await expectBrandListed(list, brand.code);
    TestHelper.success('Tabs filter by stage');
  });

  combinedTest('TC-LB-TBL-008: Status filter options and effect', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-008', page);
    expect(await list.statusFilterOptions()).toEqual(['All', 'Active', 'Disabled', 'Pending Review']);
    await list.selectStatusFilter('Active');
    await expectAllRowsHave(list, 'Status', 'Active');
    await list.selectStatusFilter('Disabled');
    await expectAllRowsHave(list, 'Status', 'Disable');
    TestHelper.success('Status filter works');
  });

  combinedTest('TC-LB-TBL-009: Status filter "Pending Review" lists brands waiting for review', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-TBL-009', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.selectStatusFilter('Pending Review');
    await expect(list.dataRows().first(), '"Pending Review" should list brands awaiting review (a new brand is Under Review)').toBeVisible({ timeout: 15000 });
    await expectBrandListed(list, brand.code);
    TestHelper.success('"Pending Review" filter meaningful');
  });

  combinedTest('TC-LB-TBL-010: Pagination next and previous', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-010', page);
    const { total } = await list.pageNumbers();
    expect(total, 'Enough brands for at least 2 pages').toBeGreaterThan(1);
    const page1 = await list.columnValues('Code');
    await list.goToNextPage();
    await expect.poll(() => list.pageNumbers(), { message: 'Should be on page 2' }).toEqual({ current: 2, total });
    const page2 = await list.columnValues('Code');
    expect(page2.filter((c) => page1.includes(c)), 'Page 2 shows different brands').toEqual([]);
    await expect(list.previousPageButton()).toBeEnabled();
    await list.goToPreviousPage();
    await expect.poll(() => list.pageNumbers(), { message: 'Should be back on page 1' }).toEqual({ current: 1, total });
    await expect(list.previousPageButton()).toBeDisabled();
    TestHelper.success('Pagination works');
  });

  combinedTest('TC-LB-TBL-011: Tab, Status filter and search combine', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-TBL-011', page);
    await list.selectTab('Approved');
    await list.selectStatusFilter('Active');
    await list.searchBrands('Passive');
    await expectAllRowsHave(list, 'Stage', 'Approved');
    await expectAllRowsHave(list, 'Status', 'Active');
    await expectAllRowsHave(list, 'Type', 'Passive');
    TestHelper.success('Filters combine');
  });
});
