import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import {
  createUniqueBrand,
  createApprovedBrand,
  expectBrandListed,
  expectBrandNotListed,
  expectBrandOfferedForDraw,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

/**
 * Brand delete: row menu -> Delete, no confirmation, SOFT delete (moves to the "Deleted" tab).
 * Not automated from the plan: DEL-005 (reuse of a deleted code - product decision pending),
 * DEL-007 (needs a draw, which tests must not create), DEL-008 (two-session stale delete).
 */
combinedTest.describe('Lottery Brand Delete', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-DEL-001: Delete from the row menu removes the brand from All', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-DEL-001', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.deleteBrand(brand.code);
    await expect(page.getByRole('dialog'), 'Delete runs without a confirmation dialog').toHaveCount(0);
    await expectBrandNotListed(lotteryBrandListPage, brand.code);
    TestHelper.success(`Deleted ${brand.code}`);
  });

  combinedTest('TC-LB-DEL-002: Deleted brand appears in the Deleted tab', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-DEL-002', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.deleteBrand(brand.code);
    await lotteryBrandListPage.selectTab('Deleted');
    await expectBrandListed(lotteryBrandListPage, brand.code);
    TestHelper.success('Soft-deleted brand listed under Deleted');
  });

  combinedTest('TC-LB-DEL-003: Deleted rows are read-only', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-DEL-003', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.deleteBrand(brand.code);
    await lotteryBrandListPage.selectTab('Deleted');
    await expectBrandListed(lotteryBrandListPage, brand.code);
    const row = lotteryBrandListPage.rowFor(brand.code);
    await expect(row.getByRole('link'), 'Deleted rows have no links').toHaveCount(0);
    await expect(row.getByRole('button'), 'Deleted rows have no actions').toHaveCount(0);
    TestHelper.success('Deleted row is read-only');
  });

  combinedTest('TC-LB-DEL-004: Deleted brand stays deleted after reload', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-DEL-004', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.deleteBrand(brand.code);
    await page.reload();
    await lotteryBrandListPage.verifyPageLoaded();
    await expectBrandNotListed(lotteryBrandListPage, brand.code);
    TestHelper.success('Delete persisted');
  });

  combinedTest('TC-LB-DEL-006: Deleting an Approved brand removes it from use', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-DEL-006', page);
    const brand = await createApprovedBrand(lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage, testLotteryBrandData);
    await lotteryBrandListPage.deleteBrand(brand.code);
    await expectBrandNotListed(lotteryBrandListPage, brand.code);
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'deleted');
    TestHelper.success('Deleted approved brand no longer offered');
  });
});
