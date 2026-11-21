import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { createUniqueBrand, expectBrandRow, cleanupBrands } from '../../../utils/helpers/lottery-brand';

registerAllMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

combinedTest.describe('Lottery Brand Navigation & Display', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-NAV-001: Navigate to Lottery Brand from the sidebar', async ({ page, lotteryBrandListPage }) => {
    await TestHelper.initTest('TC-LB-NAV-001', page);
    await expect(page).toHaveURL(/\/dashboard\/lottery$/);
    await expect(page).toHaveTitle('Lottery: List | BigWin');
    await expect(lotteryBrandListPage.pageHeading()).toBeVisible();
    await expect(lotteryBrandListPage.sidebarLotteryBrandLink()).toBeVisible();
    TestHelper.success('Sidebar navigation to Lottery Brands works');
  });

  combinedTest('TC-LB-NAV-002: Table shows Code, Brand Name, Type, Status, Stage and Price columns', async ({ page, lotteryBrandListPage }) => {
    await TestHelper.initTest('TC-LB-NAV-002', page);
    for (const column of ['Code', 'Brand Name', 'Type', 'Status', 'Stage', 'Price'] as const) {
      await expect(lotteryBrandListPage.columnHeader(column), `"${column}" column should be shown`).toBeVisible();
      await expect(lotteryBrandListPage.columnHeader(column).getByRole('button', { name: column }), `"${column}" should be sortable`).toBeVisible();
    }
    TestHelper.success('All columns present and sortable');
  });

  combinedTest('TC-LB-NAV-003: Page shows Add New Brand, search, Status filter, five tabs and page info', async ({ page, lotteryBrandListPage }) => {
    await TestHelper.initTest('TC-LB-NAV-003', page);
    await expect(lotteryBrandListPage.addNewBrandButton()).toBeEnabled();
    await expect(lotteryBrandListPage.searchBox()).toBeEditable();
    await expect(lotteryBrandListPage.clearSearchButton()).toBeVisible();
    for (const tab of ['All', 'Under Review', 'Pending Approval', 'Approved', 'Deleted'] as const) {
      await expect(lotteryBrandListPage.tab(tab), `"${tab}" tab`).toBeVisible();
    }
    await expect(lotteryBrandListPage.tab('All'), '"All" should be selected on load').toHaveAttribute('aria-selected', 'true');
    await expect(lotteryBrandListPage.statusFilter()).toContainText('All');
    await expect(lotteryBrandListPage.pageInfo()).toBeVisible();
    await expect(lotteryBrandListPage.previousPageButton(), 'Previous is disabled on page 1').toBeDisabled();
    TestHelper.success('Page controls present');
  });

  combinedTest('TC-LB-NAV-004: Row actions menu offers View, Edit and Delete only', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-NAV-004', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.findBrand(brand.code);
    await lotteryBrandListPage.openRowMenu(brand.code);
    await expect(lotteryBrandListPage.rowMenu().getByRole('menuitem')).toHaveText(['View', 'Edit', 'Delete']);
    await page.keyboard.press('Escape');
    TestHelper.success('Row menu: View, Edit, Delete');
  });

  combinedTest('TC-LB-NAV-005: Row menu closes with Escape', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-NAV-005', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.findBrand(brand.code);
    await lotteryBrandListPage.openRowMenu(brand.code);
    await page.keyboard.press('Escape');
    await expect(lotteryBrandListPage.rowMenu()).toBeHidden();
    await expectBrandRow(lotteryBrandListPage, brand.code, { name: brand.name, stage: 'Under Review' });
    TestHelper.success('Escape closed the menu; record unchanged');
  });

  combinedTest('TC-LB-NAV-006: Code and Brand Name cells link to the brand page', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-NAV-006', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.openBrand(brand.code, 'link');
    await expect(page).toHaveURL(new RegExp(`edit-lottery-brand\\?lotteryId=${brand.id}$`));
    await lotteryBrandDetailPage.verifyViewLoaded(brand.code);
    await expect(lotteryBrandDetailPage.heading()).toHaveText(`${brand.code} | ${brand.name}`);
    await lotteryBrandDetailPage.backLink.click();
    await lotteryBrandListPage.verifyPageLoaded();
    TestHelper.success('Code link opens the brand page; Back returns to the list');
  });

  combinedTest('TC-LB-NAV-007: View and Edit menu items open the same brand page', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-NAV-007', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await lotteryBrandListPage.openBrand(brand.code, 'View');
    const viewUrl = page.url();
    await lotteryBrandDetailPage.verifyViewLoaded(brand.code);
    await expect(lotteryBrandDetailPage.saveChangesButton, 'View opens read-only').toBeHidden();
    await lotteryBrandListPage.open();
    await lotteryBrandListPage.openBrand(brand.code, 'Edit');
    expect(page.url(), 'Edit opens the same page as View').toBe(viewUrl);
    await lotteryBrandDetailPage.verifyViewLoaded(brand.code);
    await expect(lotteryBrandDetailPage.reviewButton).toBeVisible();
    TestHelper.success('View and Edit open the same page');
  });

  combinedTest('TC-LB-NAV-008: Status and Stage labels for a new brand', async ({ page, lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-NAV-008', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    await expectBrandRow(lotteryBrandListPage, brand.code, { name: brand.name, type: 'Passive', status: 'Active', stage: 'Under Review', price: '25' });
    TestHelper.success('New brand row labels verified');
  });

  combinedTest('TC-LB-NAV-009: Opening a brand id that does not exist shows a not-found message', async ({ page, lotteryBrandDetailPage }) => {
    await TestHelper.initTest('TC-LB-NAV-009', page);
    await page.goto('/dashboard/lottery/edit-lottery-brand?lotteryId=99999999');
    const notFound = page.getByText(/not found|does not exist|Nothing here/i);
    await expect(notFound.first().or(lotteryBrandDetailPage.stageField), 'The page should render').toBeVisible({ timeout: 30000 });
    await expect(notFound.first(), 'An unknown brand id should show a "not found" message instead of an empty form').toBeVisible();
    TestHelper.success('Unknown brand id handled');
  });
});
