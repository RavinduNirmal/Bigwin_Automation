import { mergeTests } from '@playwright/test';
import { test } from '../../../fixtures/auth.fixture';
import { test as dataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryTypeMetadata } from '../../../data/metadata/lottery-type';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import {
  STAGE_APPROVED,
  STAGE_PENDING_APPROVAL,
  STAGE_UNDER_REVIEW,
} from '../../../data/factories/lottery-type-data.factory';
import {
  createUniqueLotteryType,
  createApprovedLotteryType,
  expectApprovalStage,
  reviewAndVerify,
  approveAndVerify,
  expectOfferedForUse,
  expectLotteryTypeSaved,
  cleanupLotteryTypes,
} from '../../../utils/helpers/lottery-type';

registerLotteryTypeMetadata();

const combinedTest = mergeTests(test, dataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Maker-checker approval of lottery types:
 *   Create / Edit -> "Under Review" -> Review -> "Pending Approval" -> Approve -> "Approved".
 * A lottery type is only ready for use once Approved, and any edit of an Approved lottery type
 * must be reviewed and approved again. "Ready for use" is checked where lottery types are used:
 * the "Select Lottery Type" dropdown of Lottery Brand > Add New Brand (read-only, never submitted).
 *
 * All review/approve actions run ONLY on the test's own "AT..." records, which afterEach deletes.
 */
combinedTest.describe('Lottery Type Review & Approval', () => {
  combinedTest.beforeEach(() => {
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest.afterEach(async ({ authenticatedPage }) => {
    await cleanupLotteryTypes(authenticatedPage.lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LT-APR-001: New lottery type starts Under Review and can only be Reviewed', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-001', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    await TestHelper.step(page, 'Under Review', `"${lotteryType.code}" offers Review only`);
    TestHelper.success('New lottery type awaits review');
  });

  combinedTest('TC-LT-APR-002: Review moves the lottery type to Pending Approval', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-002', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await reviewAndVerify(lotteryTypePage, lotteryType.code);
    await TestHelper.step(page, 'Pending Approval', `"${lotteryType.code}" reviewed; Approve now offered`);
    TestHelper.success('Review -> Pending Approval');
  });

  combinedTest('TC-LT-APR-003: Approve moves the lottery type to Approved', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-003', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    await lotteryTypePage.reloadPage();
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_APPROVED);
    await TestHelper.step(page, 'Approved', `"${lotteryType.code}" approved and still Approved after reload`);
    TestHelper.success('Approve -> Approved');
  });

  combinedTest('TC-LT-APR-004: Under Review lottery type is not offered for use', async ({ authenticatedPage, lotteryBrandFormPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-004', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    await expectOfferedForUse(lotteryBrandFormPage, lotteryType, false, 'still Under Review (never reviewed or approved)');
    await lotteryTypePage.goto();
    TestHelper.success('Unapproved lottery type not offered for use');
  });

  combinedTest('TC-LT-APR-005: Reviewed but not approved lottery type is not offered for use', async ({ authenticatedPage, lotteryBrandFormPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-005', page);

    const lotteryType = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await reviewAndVerify(lotteryTypePage, lotteryType.code);
    await expectOfferedForUse(lotteryBrandFormPage, lotteryType, false, 'reviewed but still Pending Approval');
    await lotteryTypePage.goto();
    TestHelper.success('Pending Approval lottery type not offered for use');
  });

  combinedTest('TC-LT-APR-006: Approved lottery type is offered for use', async ({ authenticatedPage, lotteryBrandFormPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-006', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    await expectOfferedForUse(lotteryBrandFormPage, lotteryType, true, 'Approved');
    await lotteryTypePage.goto();
    TestHelper.success('Approved lottery type offered for use');
  });

  combinedTest('TC-LT-APR-007: Editing an Approved lottery type sends it back to Under Review', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-007', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    const newName = testLotteryTypeData.newName();
    await lotteryTypePage.editLotteryType(lotteryType.code, { name: newName });
    await expectLotteryTypeSaved(lotteryTypePage, lotteryType.code, { name: newName });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    await TestHelper.step(page, 'Back To Review', `Edited "${lotteryType.code}" is Under Review again`);
    TestHelper.success('Edit of an Approved lottery type requires review again');
  });

  combinedTest('TC-LT-APR-008: Changing only the Status of an Approved lottery type requires re-approval', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-008', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    await lotteryTypePage.editLotteryType(lotteryType.code, { status: 'DISABLED' });
    await expectLotteryTypeSaved(lotteryTypePage, lotteryType.code, { status: 'DISABLED' });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    TestHelper.success('Status change requires re-approval');
  });

  combinedTest('TC-LT-APR-009: Edited lottery type must be Reviewed and Approved again', async ({ authenticatedPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-009', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    const newName = testLotteryTypeData.newName();
    await lotteryTypePage.editLotteryType(lotteryType.code, { name: newName });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    await reviewAndVerify(lotteryTypePage, lotteryType.code);
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_PENDING_APPROVAL);
    await approveAndVerify(lotteryTypePage, lotteryType.code);
    await expectLotteryTypeSaved(lotteryTypePage, lotteryType.code, { name: newName, stage: STAGE_APPROVED });
    await TestHelper.step(page, 'Re-approved', `"${lotteryType.code}" re-approved with Type "${newName}"`);
    TestHelper.success('Edited lottery type re-approved');
  });

  combinedTest('TC-LT-APR-010: Edited lottery type is not offered for use until re-approved', async ({ authenticatedPage, lotteryBrandFormPage, testLotteryTypeData }) => {
    const { lotteryTypePage } = authenticatedPage;
    const page = lotteryTypePage.page;
    await TestHelper.initTest('TC-LT-APR-010', page);

    const lotteryType = await createApprovedLotteryType(lotteryTypePage, testLotteryTypeData);
    const edited = { ...lotteryType, name: testLotteryTypeData.newName() };
    await lotteryTypePage.editLotteryType(lotteryType.code, { name: edited.name });
    await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
    await expectOfferedForUse(lotteryBrandFormPage, edited, false, 'edited after approval and back Under Review');
    await lotteryTypePage.goto();
    await reviewAndVerify(lotteryTypePage, lotteryType.code);
    await approveAndVerify(lotteryTypePage, lotteryType.code);
    await expectOfferedForUse(lotteryBrandFormPage, edited, true, 'Approved (re-approved after the edit)');
    await lotteryTypePage.goto();
    TestHelper.success('Edited lottery type usable only after re-approval');
  });
});
