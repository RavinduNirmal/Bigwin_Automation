import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import { MAX_FIELD_LENGTH, STAGE_UNDER_REVIEW } from '../../../data/factories/lottery-type-data.factory';
import {
  createUniqueLotteryType,
  submitCreateAndExpectRejected,
  expectCreateBlocked,
  expectCreateNotSaved,
  expectLotteryTypeSaved,
  expectLotteryTypeNotInTable,
  expectPersistsAfterReload,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerAllMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

combinedTest.describe('Lottery Type Create Functionality', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-CR-001: Add New Type opens the Create Lottery Type dialog', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-001', page);

    const modal = await lotteryTypePage.openCreateModal();
    await modal.verifyFieldsVisible();
    await expect(modal.codeInput).toHaveValue('');
    await expect(modal.typeInput).toHaveValue('');
    await expect(modal.codeInput).toBeEditable();
    await expect(modal.typeInput).toBeEditable();
    await TestHelper.step(page, 'Create Dialog', 'Code, Type, Status, Cancel, Create shown');
    await modal.cancelCreate();
    TestHelper.success('Create dialog UI verified');
  });

  combinedTest('TC-LT-CR-002: Create an ACTIVE lottery type', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-002', page);

    const data = testLotteryTypeData.unique('ACTIVE');
    await lotteryTypePage.createLotteryType(data);
    await expectLotteryTypeSaved(lotteryTypePage, data.code, { name: data.name, status: 'ACTIVE', stage: STAGE_UNDER_REVIEW });
    await TestHelper.step(page, 'Created', `"${data.code}" listed as Active / ${STAGE_UNDER_REVIEW}`);
    await expectPersistsAfterReload(lotteryTypePage, { ...data, stage: STAGE_UNDER_REVIEW });
    await TestHelper.attachText('Created Lottery Type', JSON.stringify(data, null, 2));
    TestHelper.success(`Created ${data.code}`);
  });

  combinedTest('TC-LT-CR-003: Create a DISABLED lottery type', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-003', page);

    const data = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'DISABLED', { verifySaved: true });
    await expectLotteryTypeSaved(lotteryTypePage, data.code, { name: data.name, status: 'DISABLED' });
    await TestHelper.step(page, 'Created Disabled', `"${data.code}" listed as Disabled`);
    TestHelper.success(`Created disabled ${data.code}`);
  });

  combinedTest('TC-LT-CR-004: Empty form cannot be submitted', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-004', page);

    const modal = await lotteryTypePage.openCreateModal();
    await modal.createButton.click();
    await expect(modal.getModal(), 'Dialog should stay open').toBeVisible();
    expect(await modal.codeInput.evaluate((input: HTMLInputElement) => input.validity.valueMissing), 'Code should be flagged as a missing required value').toBe(true);
    await AllureHelpers.attachScreenshot(page, 'Empty Form Blocked');
    await expectCreateNotSaved(lotteryTypePage, modal, '', 'Submitting the empty form');
    TestHelper.success('Empty form blocked');
  });

  combinedTest('TC-LT-CR-005: Clearing Code shows "Code is required"', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-005', page);

    const modal = await lotteryTypePage.openCreateModal();
    await modal.codeInput.fill('X');
    await modal.codeInput.fill('');
    await modal.typeInput.click();
    await expectCreateBlocked(lotteryTypePage, modal, modal.fieldMessage('Code is required'), '', 'Empty Code');
    TestHelper.success('"Code is required" shown');
  });

  combinedTest('TC-LT-CR-006: Clearing Type shows "Type is required"', async ({ authenticatedPage }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-006', page);

    const modal = await lotteryTypePage.openCreateModal();
    await modal.typeInput.fill('X');
    await modal.typeInput.fill('');
    await modal.codeInput.click();
    await expectCreateBlocked(lotteryTypePage, modal, modal.fieldMessage('Type is required'), '', 'Empty Type');
    TestHelper.success('"Type is required" shown');
  });

  combinedTest('TC-LT-CR-007: Missing Status shows "Status is required"', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-007', page);

    const data = testLotteryTypeData.unique();
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData({ code: data.code, name: data.name });
    await modal.submitCreate();
    await expectCreateBlocked(lotteryTypePage, modal, modal.fieldMessage('Status is required'), data.code, 'Missing Status');
    TestHelper.success('"Status is required" shown, nothing saved');
  });

  combinedTest('TC-LT-CR-008: Duplicate Code is rejected', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-008', page);

    const original = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    const duplicate = testLotteryTypeData.withCode(original.code);
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData(duplicate);
    await submitCreateAndExpectRejected(lotteryTypePage, modal, original.code, /Failed to create lottery type/i, `Duplicate code "${original.code}"`, 1);
    await expectLotteryTypeSaved(lotteryTypePage, original.code, { name: original.name, status: original.status });
    TestHelper.success('Duplicate code rejected');
  });

  combinedTest('TC-LT-CR-009: Type made only of spaces is rejected', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-009', page);

    const data = testLotteryTypeData.invalid.onlySpacesName;
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData(data);
    await expectCreateNotSaved(lotteryTypePage, modal, data.code, 'A Type of only spaces');
    await expectLotteryTypeNotInTable(lotteryTypePage, data.code);
    TestHelper.success('Blank Type rejected');
  });

  combinedTest('TC-LT-CR-010: Code longer than 255 characters is rejected', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-010', page);

    const data = testLotteryTypeData.invalid.exceedMaxLengthCode;
    expect(data.code.length).toBe(MAX_FIELD_LENGTH + 1);
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData(data);
    await modal.submitCreate();
    await expectCreateBlocked(lotteryTypePage, modal, modal.fieldMessage(/at most 255 characters/i), data.code, '256-character Code');
    TestHelper.success('Over-long code rejected');
  });

  combinedTest('TC-LT-CR-011: Type of exactly 255 characters is saved in full', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-011', page);

    const data = testLotteryTypeData.edge.maxLengthName;
    expect(data.name.length).toBe(MAX_FIELD_LENGTH);
    await lotteryTypePage.createLotteryType(data);
    await expectLotteryTypeSaved(lotteryTypePage, data.code, { name: data.name });
    TestHelper.success('255-character Type saved');
  });

  combinedTest('TC-LT-CR-012: Cancel discards the entered data', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-012', page);

    const data = testLotteryTypeData.unique();
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData(data);
    await modal.cancelCreate();
    await expectLotteryTypeNotInTable(lotteryTypePage, data.code);
    const reopened = await lotteryTypePage.openCreateModal();
    await expect(reopened.codeInput, 'Re-opened form should be empty').toHaveValue('');
    await expect(reopened.typeInput, 'Re-opened form should be empty').toHaveValue('');
    await reopened.cancelCreate();
    await lotteryTypePage.reloadPage();
    await expectLotteryTypeNotInTable(lotteryTypePage, data.code);
    TestHelper.success('Cancel discarded the data');
  });

  combinedTest('TC-LT-CR-013: Escape closes the Create dialog without saving', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-013', page);

    const data = testLotteryTypeData.unique();
    const modal = await lotteryTypePage.openCreateModal();
    await modal.fillLotteryTypeData(data);
    await modal.closeWithEscape();
    await lotteryTypePage.reloadPage();
    await expectLotteryTypeNotInTable(lotteryTypePage, data.code);
    TestHelper.success('Escape closed the dialog without saving');
  });

  combinedTest('TC-LT-CR-014: HTML in Type is shown as plain text', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-CR-014', page);

    const alerts: string[] = [];
    page.on('dialog', (dialog) => {
      alerts.push(dialog.message());
      void dialog.dismiss();
    });
    const data = testLotteryTypeData.security.xss;
    await lotteryTypePage.createLotteryType(data);
    await expectLotteryTypeSaved(lotteryTypePage, data.code, { name: data.name });
    await expect(lotteryTypePage.renderedMarkupIn(data.code), 'HTML in the Type must not be rendered').toHaveCount(0);
    expect(alerts, 'No script from the Type may run').toEqual([]);
    await TestHelper.step(page, 'Rendered As Text', `"${data.name}" shown literally`);
    TestHelper.success('HTML stored and displayed as text');
  });
});
