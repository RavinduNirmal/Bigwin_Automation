import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryTypeMetadata } from '../../../data/metadata/lottery-type';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import { STAGE_UNDER_REVIEW } from '../../../data/factories/lottery-type-data.factory';
import {
  createUniqueLotteryType,
  createAndOpenEdit,
  expectEditSaved,
  expectEditRejected,
  expectUpdateRejected,
  expectLotteryTypeSaved,
  expectLotteryTypeNotInTable,
  expectPersistsAfterReload,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerLotteryTypeMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 180000 });

combinedTest.describe('Lottery Type Edit Functionality', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-ED-001: Edit dialog is pre-filled with the saved values', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-001', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData);
    await editModal.verifyFieldsVisible();
    await expect(editModal.codeInput).toHaveValue(lotteryType.code);
    await expect(editModal.typeInput).toHaveValue(lotteryType.name);
    await expect(editModal.statusSelect).toHaveText(lotteryType.status);
    await expect(editModal.stageInput).toHaveValue(STAGE_UNDER_REVIEW);
    await expect(editModal.stageInput, 'Stage is read-only').toBeDisabled();
    await TestHelper.step(page, 'Edit Dialog', `Pre-filled with ${lotteryType.code}`);
    await editModal.cancelUpdate();
    TestHelper.success('Edit dialog pre-filled correctly');
  });

  combinedTest('TC-LT-ED-002: Update the Type', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-002', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData);
    const newName = testLotteryTypeData.newName();
    await editModal.changeFields({ name: newName });
    await expectEditSaved(lotteryTypePage, editModal, lotteryType.code, { name: newName, status: lotteryType.status });
    await expectPersistsAfterReload(lotteryTypePage, { code: lotteryType.code, name: newName });
    await TestHelper.attachText('Updated', `${lotteryType.code}: "${lotteryType.name}" -> "${newName}"`);
    TestHelper.success('Type updated');
  });

  combinedTest('TC-LT-ED-003: Change Status from ACTIVE to DISABLED', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-003', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData, 'ACTIVE');
    await editModal.changeFields({ status: 'DISABLED' });
    await expectEditSaved(lotteryTypePage, editModal, lotteryType.code, { name: lotteryType.name, status: 'DISABLED' });
    TestHelper.success('Status changed to Disabled');
  });

  combinedTest('TC-LT-ED-004: Change the Code', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-004', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData);
    const newCode = testLotteryTypeData.newCode();
    await editModal.changeFields({ code: newCode });
    await expectEditSaved(lotteryTypePage, editModal, newCode, { name: lotteryType.name });
    await expectLotteryTypeNotInTable(lotteryTypePage, lotteryType.code);
    await TestHelper.attachText('Code Changed', `${lotteryType.code} -> ${newCode}`);
    TestHelper.success('Code changed');
  });

  combinedTest('TC-LT-ED-005: Clearing Type shows "Type is required"', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-005', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData);
    await editModal.typeInput.fill('');
    await editModal.codeInput.click();
    await editModal.updateButton.click();
    await expectEditRejected(lotteryTypePage, editModal, lotteryType, editModal.fieldMessage('Type is required'), '"Type is required"');
    TestHelper.success('Empty Type rejected; record unchanged');
  });

  combinedTest('TC-LT-ED-006: Cancel discards the changes', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-006', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData, 'ACTIVE');
    await editModal.changeFields({ name: testLotteryTypeData.newName(), status: 'DISABLED' });
    await editModal.cancelUpdate();
    await lotteryTypePage.reloadPage();
    await expectLotteryTypeSaved(lotteryTypePage, lotteryType.code, { name: lotteryType.name, status: 'ACTIVE' });
    TestHelper.success('Cancel kept the original values');
  });

  combinedTest('TC-LT-ED-007: Changing the Code to an existing Code is rejected', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-007', page);

    const first = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    const second = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    const editModal = await lotteryTypePage.openEditModal(second.code);
    await editModal.changeFields({ code: first.code });
    await expectUpdateRejected(
      lotteryTypePage,
      editModal,
      second,
      /fail|error|already|exist|duplicate/i,
      `Changing "${second.code}" to the existing code "${first.code}"`
    );
    await expectLotteryTypeSaved(lotteryTypePage, first.code, { name: first.name });
    TestHelper.success('Duplicate code on update rejected');
  });

  combinedTest('TC-LT-ED-008: Escape closes the Update dialog without saving', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-ED-008', page);

    const { lotteryType, editModal } = await createAndOpenEdit(lotteryTypePage, testLotteryTypeData);
    await editModal.changeFields({ name: testLotteryTypeData.newName() });
    await editModal.closeWithEscape();
    await lotteryTypePage.reloadPage();
    await expectLotteryTypeSaved(lotteryTypePage, lotteryType.code, { name: lotteryType.name });
    TestHelper.success('Escape kept the original values');
  });
});
