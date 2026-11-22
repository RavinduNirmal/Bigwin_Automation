import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { createBrandAndOpen, createApprovedBrand, cleanupBrands } from '../../../utils/helpers/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * "Operation logs" on a brand's page. Not automated from the plan: LOG-005 (config change audit -
 * changing config on shared data was not exercised).
 */
combinedTest.describe('Lottery Brand Operation Logs', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-LOG-001: Brand page shows an Operation logs table', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-LOG-001', page);
    await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await expect(detail.operationLogsHeading).toBeVisible();
    for (const column of ['Log Id', 'Operation Type', 'Details', 'Entity Type', 'Entity Long Id', 'Http Status', 'Logged At']) {
      await expect(detail.operationLogsTable().getByRole('columnheader', { name: column, exact: true }), `"${column}" column`).toBeVisible();
    }
    TestHelper.success('Operation logs table shown');
  });

  combinedTest('TC-LB-LOG-002: Operation logs are limited to the brand being viewed', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-LOG-002', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.reloadView();
    await expect(detail.operationLogRows().first()).toBeVisible({ timeout: 15000 });
    const headers = (await detail.operationLogsTable().getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const idIndex = headers.indexOf('Entity Long Id');
    const ids: string[] = [];
    for (const row of await detail.operationLogRows().all()) ids.push((await row.getByRole('cell').nth(idIndex).innerText()).trim());
    await TestHelper.attachText('Entity Long Ids shown', ids.join(', '));
    expect(ids.filter((id) => id !== String(brand.id)), `Only entries for brand ${brand.id} should be listed on its page`).toEqual([]);
    TestHelper.success('Logs limited to this brand');
  });

  combinedTest('TC-LB-LOG-003: Review and Approve produce audit entries', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-LOG-003', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.reloadView();
    const own = detail.operationLogRows().filter({ has: page.getByRole('cell', { name: String(brand.id), exact: true }) });
    await expect(own.filter({ hasText: 'Lottery brand reviewed successfully.' })).toHaveCount(1, { timeout: 15000 });
    await expect(own.filter({ hasText: 'Lottery brand approved successfully.' })).toHaveCount(1);
    TestHelper.success('Review/Approve audited');
  });

  combinedTest('TC-LB-LOG-004: Create and update are audited', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-LOG-004', page);
    const brand = await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await detail.editBrand({ descriptionEnglish: 'Audit me' });
    await detail.reloadView();
    const own = detail.operationLogRows().filter({ has: page.getByRole('cell', { name: String(brand.id), exact: true }) });
    await expect(own, `Creating and editing brand ${brand.id} should each leave an audit entry`).toHaveCount(2, { timeout: 15000 });
    TestHelper.success('Create/update audited');
  });
});
