import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import {
  createUniqueBrand,
  createBrandAndOpen,
  createApprovedBrand,
  reopenBrand,
  expectBrandOfferedForDraw,
  expectBrandRow,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';

registerAllMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * "Ready for use": a brand may only be offered in Create Draw > "Lottery Brand" once it is Approved
 * (and Active). Create Draw is opened READ-ONLY - no draw is ever created.
 * Not automated from the plan: USE-008 (would require editing a shared, approved lottery type).
 */
combinedTest.describe('Lottery Brand Ready For Use (Create Draw)', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-USE-001: Create Draw brand dropdown requests only APPROVED and ACTIVE brands', async ({ page, createDrawPage }) => {
    await TestHelper.initTest('TC-LB-USE-001', page);
    const request = page.waitForRequest((r) => /\/api\/lottery\/brands\/simple/.test(r.url()), { timeout: 30000 });
    await createDrawPage.open();
    const body = (await request).postDataJSON() as { approvalStatus?: string; status?: string };
    expect(body, 'The brand list for draws must be limited to approved, active brands').toMatchObject({ approvalStatus: 'APPROVED', status: 'ACTIVE' });
    expect((await createDrawPage.brandOptions()).length).toBeGreaterThan(0);
    TestHelper.success('Draw brand list limited to approved + active');
  });

  combinedTest('TC-LB-USE-002: Under Review brand is not offered', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-002', page);
    const brand = await createUniqueBrand(list, wizard, testLotteryBrandData);
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'Under Review');
    TestHelper.success('Under Review brand not offered');
  });

  combinedTest('TC-LB-USE-003: Pending Approval brand is not offered', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-003', page);
    const brand = await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await detail.review();
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'Pending Approval');
    TestHelper.success('Pending Approval brand not offered');
  });

  combinedTest('TC-LB-USE-004: Approved brand is offered', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-004', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await expectBrandOfferedForDraw(createDrawPage, brand, true, 'Approved');
    TestHelper.success('Approved brand offered');
  });

  combinedTest('TC-LB-USE-005: Edited Approved brand is not offered until re-approved', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-005', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.editBrand({ descriptionEnglish: 'Edited after approval' });
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'edited after approval (back Under Review)');
    await reopenBrand(list, detail, brand.code);
    await detail.review();
    await detail.approve();
    await expectBrandOfferedForDraw(createDrawPage, brand, true, 'Approved (re-approved after the edit)');
    TestHelper.success('Edited brand usable only after re-approval');
  });

  combinedTest('TC-LB-USE-006: DISABLED brand is not offered even when approved', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-006', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.editBrand({ status: 'DISABLED' });
    await detail.reloadView();
    await detail.review();
    await detail.approve();
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'Approved but DISABLED');
    TestHelper.success('Disabled brand not offered');
  });

  combinedTest('TC-LB-USE-007: Deleted brand is not offered', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, createDrawPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-007', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await list.open();
    await list.deleteBrand(brand.code);
    await expectBrandOfferedForDraw(createDrawPage, brand, false, 'deleted');
    TestHelper.success('Deleted brand not offered');
  });

  combinedTest('TC-LB-USE-009: Lottery type shown in the list matches the brand\'s type', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-USE-009', page);
    const brand = await createUniqueBrand(list, wizard, testLotteryBrandData);
    await expectBrandRow(list, brand.code, { type: brand.lotteryType });
    TestHelper.success('Type column matches');
  });
});
