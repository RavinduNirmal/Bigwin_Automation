import { mergeTests } from '@playwright/test';
import { test } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryTypeMetadata } from '../../../data/metadata/lottery-type';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import {
  createUniqueLotteryType,
  deleteAndVerify,
  expectLotteryTypeSaved,
  expectLotteryTypeNotInTable,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerLotteryTypeMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

/**
 * Note: BigWin deletes a lottery type as soon as "Delete" is clicked in the row menu -
 * there is no confirmation dialog - and the record is removed permanently.
 */
combinedTest.describe('Lottery Type Delete Functionality', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-DEL-001: Delete a lottery type from the row menu', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-DEL-001', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await deleteAndVerify(lotteryTypePage, lotteryType.code);
    await TestHelper.step(page, 'Deleted', `"${lotteryType.code}" removed from the table`);
    TestHelper.success(`Deleted ${lotteryType.code}`);
  });

  combinedTest('TC-LT-DEL-002: Deleted lottery type stays deleted after reload', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-DEL-002', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await deleteAndVerify(lotteryTypePage, lotteryType.code);
    await lotteryTypePage.reloadPage();
    await expectLotteryTypeNotInTable(lotteryTypePage, lotteryType.code);
    TestHelper.success('Delete persisted after reload');
  });

  combinedTest('TC-LT-DEL-003: Deleting one lottery type leaves the others', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-DEL-003', page);

    const first = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    const second = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await deleteAndVerify(lotteryTypePage, first.code);
    await expectLotteryTypeSaved(lotteryTypePage, second.code, { name: second.name, status: second.status });
    await TestHelper.attachText('Result', `Deleted ${first.code}; ${second.code} untouched`);
    TestHelper.success('Only the chosen record was deleted');
  });

  combinedTest('TC-LT-DEL-004: A deleted Code can be used again', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-DEL-004', page);

    const original = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await deleteAndVerify(lotteryTypePage, original.code);
    const replacement = testLotteryTypeData.withCode(original.code);
    await lotteryTypePage.createLotteryType(replacement);
    await expectLotteryTypeSaved(lotteryTypePage, original.code, { name: replacement.name });
    TestHelper.success(`Code ${original.code} reused`);
  });
});
