import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { createUniqueBrand, expectBrandListed, cleanupBrands } from '../../../utils/helpers/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

/** Search box "Search..." (Enter submits). The brand list API honours the query. */
combinedTest.describe('Lottery Brand Search', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-SRCH-001: Search by Code', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-001', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.searchBrands(brand.code);
    await expect(list.dataRows(), 'Exactly one row for a unique code').toHaveCount(1);
    await expect(list.rowFor(brand.code)).toBeVisible();
    await expect(list.pageInfo()).toHaveText(/^Page\s*1\s*of\s*1$/);
    TestHelper.success('Search by code');
  });

  combinedTest('TC-LB-SRCH-002: Search by part of the Brand Name', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-002', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    const part = brand.name.split(' ').pop() as string; // the unique suffix
    await list.searchBrands(part);
    await expect(list.rowFor(brand.code)).toBeVisible();
    await expect(list.dataRows()).toHaveCount(1);
    TestHelper.success('Partial name search');
  });

  combinedTest('TC-LB-SRCH-003: Search is case-insensitive', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-003', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.searchBrands(brand.code.toLowerCase());
    await expect(list.rowFor(brand.code)).toBeVisible();
    TestHelper.success('Case-insensitive search');
  });

  combinedTest('TC-LB-SRCH-004: Search matches the Type name and the Price', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-004', page);
    await list.searchBrands('Passive');
    await expect(list.dataRows().first()).toBeVisible();
    await expect.poll(async () => (await list.columnValues('Type')).every((t) => t === 'Passive'), { message: 'Every row should be of Type Passive' }).toBe(true);
    await list.searchBrands('40');
    await expect(list.dataRows().first()).toBeVisible();
    await expect.poll(async () => (await list.dataRows().allInnerTexts()).every((r) => r.includes('40')), { message: 'Every row should contain 40' }).toBe(true);
    TestHelper.success('Type and price searchable');
  });

  combinedTest('TC-LB-SRCH-005: No match shows no rows', async ({ page, lotteryBrandListPage: list, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-005', page);
    await list.searchBrands(`zzNoMatch${testLotteryBrandData.newCode()}`);
    await expect(list.dataRows()).toHaveCount(0);
    TestHelper.success('No rows for a non-matching term');
  });

  combinedTest('TC-LB-SRCH-006: Clearing the search lists everything again', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-006', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.searchBrands(brand.code);
    await expect(list.dataRows()).toHaveCount(1);
    await list.clearSearch();
    await expect(list.searchBox()).toHaveValue('');
    await expect.poll(() => list.dataRows().count(), { message: 'Full list should be back' }).toBeGreaterThan(1);
    TestHelper.success('Clear restored the list');
  });

  combinedTest('TC-LB-SRCH-007: Search term is not kept after reload', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-007', page);
    await list.searchBrands('Passive');
    await page.reload();
    await list.verifyPageLoaded();
    await expect(list.searchBox()).toHaveValue('');
    TestHelper.success('Search reset after reload');
  });

  combinedTest('TC-LB-SRCH-008: Search applies inside the Deleted tab', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-008', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.deleteBrand(brand.code);
    await list.selectTab('Deleted');
    await expectBrandListed(list, brand.code);
    await expect(list.dataRows()).toHaveCount(1);
    TestHelper.success('Search works in Deleted');
  });

  combinedTest('TC-LB-SRCH-009: "%" is treated as a literal character', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-009', page);
    await list.searchBrands('%');
    await expect(list.dataRows(), 'No brand contains "%", so nothing should match (the wildcard must be escaped)').toHaveCount(0);
    TestHelper.success('"%" not treated as a wildcard');
  });

  combinedTest('TC-LB-SRCH-010: Leading and trailing spaces are trimmed', async ({ page, lotteryBrandListPage: list, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-SRCH-010', page);
    const brand = await createUniqueBrand(list, addBrandWizardPage, testLotteryBrandData);
    await list.searchBrands(`  ${brand.code}  `);
    await expect(list.rowFor(brand.code), 'Surrounding spaces should be ignored').toBeVisible({ timeout: 15000 });
    TestHelper.success('Search term trimmed');
  });

  combinedTest('TC-LB-SRCH-011: Whitespace-only search behaves like an empty search', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-011', page);
    await list.searchBrands('   ');
    await expect.poll(() => list.dataRows().count(), { message: 'A blank search should list brands like an empty search' }).toBeGreaterThan(0);
    TestHelper.success('Blank search lists brands');
  });

  combinedTest('TC-LB-SRCH-012: Special characters and HTML do not break search', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-012', page);
    const alerts: string[] = [];
    page.on('dialog', (d) => { alerts.push(d.message()); void d.dismiss(); });
    for (const term of ['<script>alert(1)</script>', "'"]) {
      await list.searchBrands(term);
      await expect(list.dataRows(), `"${term}" matches nothing`).toHaveCount(0);
      await expect(list.pageHeading()).toBeVisible();
    }
    expect(alerts).toEqual([]);
    TestHelper.success('Special characters handled');
  });

  combinedTest('TC-LB-SRCH-013: Search resets pagination to page 1', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-013', page);
    await list.goToNextPage();
    await expect(list.pageInfo()).toHaveText(/^Page\s*2\s*of/);
    await list.searchBrands('Passive');
    await expect(list.pageInfo()).toHaveText(/^Page\s*1\s*of/);
    TestHelper.success('Search went back to page 1');
  });

  combinedTest('TC-LB-SRCH-014: Search is only sent on Enter', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-SRCH-014', page);
    let listRequests = 0;
    page.on('request', (r) => { if (/\/api\/lottery$/.test(new URL(r.url()).pathname) && r.method() === 'POST') listRequests++; });
    await list.searchBox().pressSequentially('Passive', { delay: 50 });
    await page.waitForTimeout(1500); // give a debounced search time to fire
    expect(listRequests, 'Typing alone should not search').toBe(0);
    await list.searchBox().press('Enter');
    await expect.poll(() => listRequests, { message: 'Enter should search' }).toBeGreaterThan(0);
    TestHelper.success('Search only on Enter');
  });
});
