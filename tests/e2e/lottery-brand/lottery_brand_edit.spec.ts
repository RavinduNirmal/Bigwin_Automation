import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryBrandMetadata } from '../../../data/metadata/lottery-brand';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import {
  createUniqueBrand,
  createBrandAndOpen,
  reopenBrand,
  expectBrandRow,
  expectBrandListed,
  expectBrandNotListed,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';

registerLotteryBrandMetadata();

const combinedTest = mergeTests(test, brandDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

/**
 * Brand page edit: "Update" switches the view into edit mode (Lottery Code, Lottery Name, Status,
 * descriptions, images, config; Cancel / Save Changes). Not automated from the plan: ED-004
 * (Type/Price not editable - an open product question, no expected behaviour defined).
 */
combinedTest.describe('Lottery Brand Edit', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-ED-001: Brand page shows the read-only view', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-001', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await expect(detail.heading()).toHaveText(`${brand.code} | ${brand.name}`);
    await expect(detail.statusField).toHaveValue('Active');
    await expect(detail.stageField).toHaveValue('Under Review');
    await expect(detail.lotteryTypeField).toHaveValue('Passive');
    await expect(detail.reviewButton).toBeVisible();
    await expect(detail.updateButton).toBeVisible();
    await expect(detail.saveChangesButton, 'View mode is read-only').toBeHidden();
    await expect(detail.operationLogsHeading).toBeVisible();
    TestHelper.success('Read-only brand view verified');
  });

  combinedTest('TC-LB-ED-002: Update switches the page to edit mode', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-002', page);
    await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    for (const field of [detail.codeInput, detail.nameInput, detail.statusSelect, detail.descriptionEnglish, detail.cancelButton, detail.saveChangesButton]) {
      await expect(field).toBeVisible();
    }
    TestHelper.success('Edit mode shown');
  });

  combinedTest('TC-LB-ED-003: Edit mode is pre-filled with saved values', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-003', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData, { descriptionEnglish: 'Saved English text' });
    await detail.enterEditMode();
    await expect(detail.codeInput).toHaveValue(brand.code);
    await expect(detail.nameInput).toHaveValue(brand.name);
    await expect(detail.statusSelect).toContainText('ACTIVE');
    await expect(detail.descriptionEnglish).toHaveValue('Saved English text');
    TestHelper.success('Edit mode pre-filled');
  });

  combinedTest('TC-LB-ED-005: Save Name and Description changes', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-005', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    const newName = testLotteryBrandData.newName();
    await detail.editBrand({ name: newName, descriptionEnglish: 'Updated English' });
    await expect(detail.toast(/updated/i).first(), 'Save should be confirmed by a toast').toBeVisible();
    await expect(detail.heading()).toHaveText(`${brand.code} | ${newName}`);
    await detail.reloadView();
    await expect(detail.heading()).toHaveText(`${brand.code} | ${newName}`);
    await expect(detail.descriptionEnglish).toHaveValue('Updated English');
    TestHelper.success('Name and description saved');
  });

  combinedTest('TC-LB-ED-006: Cancel discards the changes', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-006', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.changeFields({ name: testLotteryBrandData.newName() });
    await detail.cancelEdit();
    await expect(detail.heading()).toHaveText(`${brand.code} | ${brand.name}`);
    await detail.reloadView();
    await expect(detail.heading()).toHaveText(`${brand.code} | ${brand.name}`);
    TestHelper.success('Cancel discarded the change');
  });

  combinedTest('TC-LB-ED-007: Clearing Code or Name shows a required message and does not save', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-007', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.nameInput.fill('');
    expect(await detail.saveChanges(), 'No save request for an empty Name').toBeNull();
    await expect(detail.fieldMessage('Name is required')).toBeVisible();
    await detail.nameInput.fill(brand.name);
    await detail.codeInput.fill('');
    expect(await detail.saveChanges(), 'No save request for an empty Code').toBeNull();
    await expect(detail.fieldMessage('Code is required')).toBeVisible();
    await expect(detail.saveChangesButton, 'Edit mode stays open').toBeVisible();
    TestHelper.success('Required fields enforced on edit');
  });

  combinedTest('TC-LB-ED-008: Name made only of spaces is rejected on edit', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-008', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.nameInput.fill('   ');
    const res = await detail.saveChanges();
    expect(res, `A blank Name must not be saved (server answered ${res?.status()})`).toBeNull();
    await expect(detail.fieldMessage('Name is required')).toBeVisible();
    await reopenBrand(lotteryBrandListPage, detail, brand.code);
    await expect(detail.heading()).toHaveText(`${brand.code} | ${brand.name}`);
    TestHelper.success('Blank name rejected on edit');
  });

  combinedTest('TC-LB-ED-009: Name longer than 255 characters is blocked with a message naming Name', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-009', page);
    await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.nameInput.fill(testLotteryBrandData.nameOfLength(256));
    expect(await detail.saveChanges(), 'No save request for a 256-character Name').toBeNull();
    await expect(detail.fieldMessage('Name must be at most 255 characters'), 'Message should name the "Name" field').toBeVisible();
    TestHelper.success('Over-long name blocked');
  });

  combinedTest('TC-LB-ED-010: Changing Code to an existing Code shows an error', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-010', page);
    const first = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    const second = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.changeFields({ code: first.code });
    await detail.saveChanges();
    await expect(detail.applicationError(), 'The page must not crash').toHaveCount(0);
    await expect(detail.toast('A lottery brand with this code already exists.').first()).toBeVisible();
    await reopenBrand(lotteryBrandListPage, detail, second.code);
    await expect(detail.heading()).toHaveText(`${second.code} | ${second.name}`);
    TestHelper.success('Duplicate code rejected with a message');
  });

  combinedTest('TC-LB-ED-011: Changing Name to an existing Name shows an error', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-011', page);
    const first = await createUniqueBrand(lotteryBrandListPage, addBrandWizardPage, testLotteryBrandData);
    const second = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.enterEditMode();
    await detail.changeFields({ name: first.name });
    await detail.saveChanges();
    await expect(detail.applicationError(), 'The page must not crash').toHaveCount(0);
    await expect(detail.toast('A lottery brand with this name already exists.').first()).toBeVisible();
    await reopenBrand(lotteryBrandListPage, detail, second.code);
    await expect(detail.heading()).toHaveText(`${second.code} | ${second.name}`);
    TestHelper.success('Duplicate name rejected with a message');
  });

  combinedTest('TC-LB-ED-012: HTML in Name is stored and shown as plain text', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-012', page);
    const alerts: string[] = [];
    page.on('dialog', (d) => { alerts.push(d.message()); void d.dismiss(); });
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    const htmlName = testLotteryBrandData.security.htmlName();
    await detail.editBrand({ name: htmlName });
    await expect(detail.heading()).toHaveText(`${brand.code} | ${htmlName}`);
    await expect(detail.renderedMarkupInHeading()).toHaveCount(0);
    expect(alerts).toEqual([]);
    TestHelper.success('HTML name shown literally');
  });

  combinedTest('TC-LB-ED-013: Status can be changed to DISABLED', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-013', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.editBrand({ status: 'DISABLED' });
    await lotteryBrandListPage.open();
    await expectBrandRow(lotteryBrandListPage, brand.code, { status: 'Disable', stage: 'Under Review' });
    TestHelper.success('Status changed to Disable');
  });

  combinedTest('TC-LB-ED-014: Edit persists after reload', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-014', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    const newName = testLotteryBrandData.newName();
    await detail.editBrand({ name: newName, descriptionEnglish: 'Persisted text' });
    await detail.reloadView();
    await expect(detail.heading()).toHaveText(`${brand.code} | ${newName}`);
    await lotteryBrandListPage.open();
    await expectBrandRow(lotteryBrandListPage, brand.code, { name: newName });
    TestHelper.success('Edit persisted');
  });

  combinedTest('TC-LB-ED-015: Edit Code is allowed and the list shows the new Code', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-015', page);
    const brand = await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    const newCode = testLotteryBrandData.newCode();
    await detail.editBrand({ code: newCode });
    await lotteryBrandListPage.open();
    await expectBrandListed(lotteryBrandListPage, newCode);
    await expectBrandNotListed(lotteryBrandListPage, brand.code);
    TestHelper.success(`Code changed ${brand.code} -> ${newCode}`);
  });

  combinedTest('TC-LB-ED-016: Back button returns to the list', async ({ page, lotteryBrandListPage, addBrandWizardPage, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-ED-016', page);
    await createBrandAndOpen(lotteryBrandListPage, addBrandWizardPage, detail, testLotteryBrandData);
    await detail.backLink.click();
    await expect(page).toHaveURL(/\/dashboard\/lottery$/);
    await lotteryBrandListPage.verifyPageLoaded();
    TestHelper.success('Back returned to the list');
  });
});
