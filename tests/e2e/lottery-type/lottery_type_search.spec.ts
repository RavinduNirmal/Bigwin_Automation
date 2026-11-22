import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryTypeMetadata } from '../../../data/metadata/lottery-type';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import {
  createUniqueLotteryType,
  searchAndVerify,
  expectLotteryTypeInTable,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerLotteryTypeMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

/**
 * Search box "Search..." - the query is sent when Enter is pressed.
 * Assertions only cover the test's OWN uniquely-coded records.
 */
combinedTest.describe('Lottery Type Search', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-SRCH-001: Search by exact Code', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-SRCH-001', page);

    const first = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    const second = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    await searchAndVerify(lotteryTypePage, first.code, [first.code], [second.code]);
    await TestHelper.step(page, 'Searched', `"${first.code}" shown, "${second.code}" hidden`);
    TestHelper.success('Search by code works');
  });

  combinedTest('TC-LT-SRCH-002: Search by text in the Type', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-SRCH-002', page);

    const { tag, items } = testLotteryTypeData.taggedSet(2);
    for (const item of items) await lotteryTypePage.createLotteryType(item);
    const other = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    await searchAndVerify(lotteryTypePage, tag, items.map((i) => i.code), [other.code]);
    await TestHelper.step(page, 'Searched Tag', `"${tag}" shows ${items.map((i) => i.code).join(', ')}`);
    TestHelper.success('Search by type text works');
  });

  combinedTest('TC-LT-SRCH-003: Search is case-insensitive', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-SRCH-003', page);

    const first = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    const second = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    await searchAndVerify(lotteryTypePage, first.code.toLowerCase(), [first.code], [second.code]);
    TestHelper.success('Lower-case search found the code');
  });

  combinedTest('TC-LT-SRCH-004: A term that matches nothing shows no rows', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-SRCH-004', page);

    const term = `NoMatch${testLotteryTypeData.newCode()}`;
    await lotteryTypePage.searchLotteryTypes(term);
    await expect(lotteryTypePage.dataRows(), `Searching "${term}" should show no rows`).toHaveCount(0, { timeout: 15000 });
    await TestHelper.step(page, 'No Results', `"${term}" matched nothing`);
    TestHelper.success('No rows for a non-matching term');
  });

  combinedTest('TC-LT-SRCH-005: Clearing the search lists everything again', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-SRCH-005', page);

    const first = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    const second = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData);
    await lotteryTypePage.searchLotteryTypes(first.code);
    await lotteryTypePage.clearSearch();
    await expect(lotteryTypePage.searchBox()).toHaveValue('');
    await expectLotteryTypeInTable(lotteryTypePage, first.code);
    await expectLotteryTypeInTable(lotteryTypePage, second.code);
    TestHelper.success('Clearing the search restored the list');
  });
});
