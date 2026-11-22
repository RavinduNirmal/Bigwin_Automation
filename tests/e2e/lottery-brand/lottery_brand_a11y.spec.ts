import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

/**
 * Keyboard / accessibility of the Lottery Brands list. Not automated from the plan: A11Y-003
 * (wizard keyboard flow - not explored) and PAR-001 (a framework guideline, not app behaviour).
 */
combinedTest.describe('Lottery Brand Accessibility', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    await lotteryBrandListPage.goto();
  });

  combinedTest('TC-LB-A11Y-001: Keyboard order on the list page', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-A11Y-001', page);
    // start in the Search box: Shift+Tab must land on the selected tab (the tabs are in the tab order)
    await list.searchBox().focus();
    await page.keyboard.press('Shift+Tab');
    await expect(list.tab('All'), 'The selected tab "All" should be reachable with the keyboard').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(list.searchBox(), 'then the Search box').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(list.clearSearchButton(), 'then "clear"').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(list.statusFilter(), 'then the Status filter').toBeFocused();
    TestHelper.success('Tabs, search and Status filter reachable by keyboard in order');
  });

  combinedTest('TC-LB-A11Y-002: "Add New Brand" is a single interactive element', async ({ page, lotteryBrandListPage: list }) => {
    await TestHelper.initTest('TC-LB-A11Y-002', page);
    await expect(list.addNewBrandButton()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add New Brand' }), '"Add New Brand" should be one control, not a button nested in a link').toHaveCount(0);
    TestHelper.success('Single control');
  });
});
