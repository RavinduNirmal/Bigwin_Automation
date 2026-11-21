import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import {
  BRAND_STAGE_APPROVED,
  BRAND_STAGE_PENDING_APPROVAL,
  BRAND_STAGE_UNDER_REVIEW,
} from '../../../data/factories/lottery-brand-data.factory';
import {
  createUniqueBrand,
  createBrandAndOpen,
  createApprovedBrand,
  reopenBrand,
  expectBrandPageStage,
  expectBrandListed,
  expectBrandNotListed,
  expectBrandRow,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';

registerAllMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/**
 * Brand maker-checker: Under Review -> Review -> Pending Approval -> Approve -> Approved.
 * Editing an Approved brand sends it back to Under Review; it must be reviewed and approved again.
 * Review/Approve are clicked ONLY on the test's own "AT..." brands, which afterEach deletes.
 * Not automated from the plan: APR-010 (4-eyes rule - product decision) and APR-012 (= TC-LB-CR-002).
 */
combinedTest.describe('Lottery Brand Review & Approval', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-APR-001: New brand starts Under Review and can only be Reviewed', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-001', page);
    await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await expectBrandPageStage(detail, BRAND_STAGE_UNDER_REVIEW);
    TestHelper.success('New brand awaits review');
  });

  combinedTest('TC-LB-APR-002: Review moves the brand to Pending Approval', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-002', page);
    const brand = await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    const urlBefore = page.url();
    await detail.review();
    expect(page.url(), 'Page stays on the same URL').toBe(urlBefore);
    await expectBrandPageStage(detail, BRAND_STAGE_PENDING_APPROVAL);
    await list.open();
    await list.selectTab('Pending Approval');
    await expectBrandListed(list, brand.code);
    await list.clearSearch();
    await list.selectTab('Under Review');
    await expectBrandNotListed(list, brand.code);
    TestHelper.success('Review -> Pending Approval');
  });

  combinedTest('TC-LB-APR-003: Approve moves the brand to Approved', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-003', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.reloadView();
    await expectBrandPageStage(detail, BRAND_STAGE_APPROVED);
    await list.open();
    await list.selectTab('Approved');
    await expectBrandListed(list, brand.code);
    TestHelper.success('Approve -> Approved');
  });

  combinedTest('TC-LB-APR-004: Review and Approve confirm with a success toast', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-004', page);
    await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await detail.review();
    await expect(detail.toast(/reviewed/i).first(), 'Review should be confirmed by a toast').toBeVisible();
    await detail.approve();
    await expect(detail.toast(/approved/i).first(), 'Approve should be confirmed by a toast').toBeVisible();
    TestHelper.success('Review/Approve toasts shown');
  });

  combinedTest('TC-LB-APR-005: Editing an Approved brand sends it back to Under Review', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-005', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.editBrand({ descriptionEnglish: 'Edited after approval' });
    await detail.reloadView();
    await expectBrandPageStage(detail, BRAND_STAGE_UNDER_REVIEW);
    await list.open();
    await expectBrandRow(list, brand.code, { stage: 'Under Review' });
    await list.selectTab('Approved');
    await expectBrandNotListed(list, brand.code);
    TestHelper.success('Edit sent the approved brand back to review');
  });

  combinedTest('TC-LB-APR-006: Changing only the Status of an Approved brand requires re-approval', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-006', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.editBrand({ status: 'DISABLED' });
    await detail.reloadView();
    await expectBrandPageStage(detail, BRAND_STAGE_UNDER_REVIEW);
    await list.open();
    await expectBrandRow(list, brand.code, { status: 'Disable', stage: 'Under Review' });
    TestHelper.success('Status change requires re-approval');
  });

  combinedTest('TC-LB-APR-007: Edited brand must be Reviewed and Approved again', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-007', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    const newName = testLotteryBrandData.newName();
    await detail.editBrand({ name: newName });
    await detail.reloadView();
    await expectBrandPageStage(detail, BRAND_STAGE_UNDER_REVIEW);
    await detail.review();
    await expectBrandPageStage(detail, BRAND_STAGE_PENDING_APPROVAL);
    await detail.approve();
    await expectBrandPageStage(detail, BRAND_STAGE_APPROVED);
    await expect(detail.heading()).toHaveText(`${brand.code} | ${newName}`);
    TestHelper.success('Edited brand re-approved');
  });

  combinedTest('TC-LB-APR-008: Stage field is read-only', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-008', page);
    await createBrandAndOpen(list, wizard, detail, testLotteryBrandData);
    await expect(detail.stageField, 'Stage is read-only in view mode').not.toBeEditable();
    await detail.enterEditMode();
    const editableStage = (await detail.stageField.count()) > 0 && (await detail.stageField.isEditable());
    expect(editableStage, 'Edit mode must not offer an editable Stage').toBe(false);
    TestHelper.success('Stage cannot be edited');
  });

  combinedTest('TC-LB-APR-009: Review and Approve are written to the audit log', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-009', page);
    const brand = await createApprovedBrand(list, wizard, detail, testLotteryBrandData);
    await detail.reloadView();
    const ownRows = detail.operationLogRows().filter({ has: page.getByRole('cell', { name: String(brand.id), exact: true }) });
    await expect(ownRows.filter({ hasText: 'Lottery brand reviewed successfully.' }), 'Review audit entry').toHaveCount(1, { timeout: 15000 });
    await expect(ownRows.filter({ hasText: 'Lottery brand approved successfully.' }), 'Approve audit entry').toHaveCount(1);
    TestHelper.success('Review/Approve audited');
  });

  combinedTest('TC-LB-APR-011: Review and Approve are not offered on Deleted brands', async ({ page, lotteryBrandListPage: list, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-APR-011', page);
    const brand = await createUniqueBrand(list, wizard, testLotteryBrandData);
    await list.deleteBrand(brand.code);
    await list.selectTab('Deleted');
    await expectBrandListed(list, brand.code);
    await expect(list.rowFor(brand.code).getByRole('button'), 'No actions on a deleted brand').toHaveCount(0);
    await expect(list.rowFor(brand.code).getByRole('link'), 'No link to the brand page').toHaveCount(0);
    TestHelper.success('Deleted brand cannot be reviewed/approved');
  });
});
