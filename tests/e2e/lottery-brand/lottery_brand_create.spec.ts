import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as brandDataTest } from '../../../fixtures/lottery-brand-data.fixture';
import { test as typeDataTest } from '../../../fixtures/lottery-type-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerAllMetadata } from '../../../data/metadata/index';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { LotteryTypeCreateModal } from '../../../pages/lottery-type/lottery-type-create.modal';
import {
  createUniqueBrand,
  expectBrandListed,
  expectBrandRow,
  submitBrandAndExpectRejected,
  cleanupBrands,
} from '../../../utils/helpers/lottery-brand';
import { createUniqueLotteryType, cleanupLotteryTypes } from '../../../utils/helpers/lottery-type';

registerAllMetadata();

const combinedTest = mergeTests(test, brandDataTest, typeDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 240000 });

/**
 * Add New Brand wizard (Step 1 Details -> 2 Symbol Pack -> 3 Upload ["Add Brand" creates] -> 4 Config).
 * Not automated from the plan: CR-011 (absurd prices on a shared record) and CR-025 (double-click
 * would knowingly create junk brands).
 */
combinedTest.describe('Lottery Brand Create', () => {
  combinedTest.beforeEach(async ({ authenticatedPage, lotteryBrandListPage }) => {
    void authenticatedPage;
    AddBrandWizardPage.submittedCodes.length = 0;
    LotteryTypeCreateModal.submittedCodes.length = 0;
    await lotteryBrandListPage.goto();
  });

  combinedTest.afterEach(async ({ lotteryBrandListPage, lotteryTypePage }) => {
    await cleanupBrands(lotteryBrandListPage, AddBrandWizardPage.submittedCodes);
    AddBrandWizardPage.submittedCodes.length = 0;
    await cleanupLotteryTypes(lotteryTypePage, LotteryTypeCreateModal.submittedCodes);
    LotteryTypeCreateModal.submittedCodes.length = 0;
  });

  combinedTest('TC-LB-CR-001: Add New Brand opens Step 1 Details', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard }) => {
    await TestHelper.initTest('TC-LB-CR-001', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.verifyStep1Loaded();
    await expect(page).toHaveTitle('Lottery Brand | BigWin');
    for (const step of [1, 2, 3, 4] as const) await expect(wizard.stepHeading(step)).toBeVisible();
    for (const field of [wizard.codeInput, wizard.nameInput, wizard.priceInput, wizard.descriptionSinhala, wizard.descriptionEnglish, wizard.descriptionTamil]) {
      await expect(field).toBeVisible();
    }
    await expect(wizard.priceInput, 'Price defaults to 0').toHaveValue('0');
    await expect(wizard.nextButton, 'Next is disabled on an untouched form').toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel' }), 'Step 1 has no Cancel').toHaveCount(0);
    TestHelper.success('Step 1 Details verified');
  });

  combinedTest('TC-LB-CR-002: Select Lottery Type lists only APPROVED lottery types', async ({ page, lotteryTypePage, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryTypeData }) => {
    await TestHelper.initTest('TC-LB-CR-002', page);
    await lotteryTypePage.goto();
    const unapproved = await createUniqueLotteryType(lotteryTypePage, testLotteryTypeData, 'ACTIVE', { verifySaved: true });
    await lotteryBrandListPage.open();
    await lotteryBrandListPage.openAddNewBrand();
    const options = await wizard.lotteryTypeOptions();
    await TestHelper.attachText('Select Lottery Type options', options.join('\n'));
    expect(options, `Lottery type "${unapproved.name}" is still Under Review and must not be offered for new brands`).not.toContain(unapproved.name);
    TestHelper.success('Only approved lottery types offered');
  });

  combinedTest('TC-LB-CR-003: Next stays disabled until required fields are valid', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-003', page);
    await lotteryBrandListPage.openAddNewBrand();
    await expect(wizard.nextButton).toBeDisabled();
    await wizard.fillDetails(testLotteryBrandData.unique());
    await expect(wizard.nextButton, 'Next should be enabled once the form is valid').toBeEnabled();
    TestHelper.success('Next enabled only for a valid form');
  });

  combinedTest('TC-LB-CR-004: Clearing Code shows "Code is required"', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-004', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails({ ...testLotteryBrandData.unique(), code: 'X' });
    await wizard.codeInput.fill('');
    await wizard.codeInput.press('Tab');
    await expect(wizard.fieldMessage('Code is required')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('"Code is required" shown');
  });

  combinedTest('TC-LB-CR-005: Clearing Name shows "Name is required"', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-005', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails({ ...testLotteryBrandData.unique(), name: 'X' });
    await wizard.nameInput.fill('');
    await wizard.nameInput.press('Tab');
    await expect(wizard.fieldMessage('Name is required')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('"Name is required" shown');
  });

  combinedTest('TC-LB-CR-006: Code or Name made only of spaces is rejected', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-006', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails({ ...testLotteryBrandData.unique(), code: '   ' });
    await wizard.codeInput.press('Tab');
    await expect(wizard.fieldMessage('Code is required')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    await wizard.codeInput.fill(testLotteryBrandData.newCode());
    await wizard.nameInput.fill('   ');
    await wizard.nameInput.press('Tab');
    await expect(wizard.fieldMessage('Name is required')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('Blank Code/Name rejected');
  });

  combinedTest('TC-LB-CR-007: Price of 0 is rejected (price must be positive)', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-007', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique({ price: '0' }));
    await wizard.priceInput.press('Tab');
    await expect(wizard.nextButton, 'A ticket price of 0 must not be accepted - Next should stay disabled').toBeDisabled();
    TestHelper.success('Price 0 rejected');
  });

  combinedTest('TC-LB-CR-008: Negative price is rejected', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-008', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique({ price: '-5' }));
    await wizard.priceInput.press('Tab');
    await expect(wizard.fieldMessage('Price cannot be negative')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('Negative price rejected');
  });

  combinedTest('TC-LB-CR-009: Empty price shows "Price must be a number"', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-009', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique());
    await wizard.priceInput.fill('');
    await wizard.priceInput.press('Tab');
    await expect(wizard.fieldMessage('Price must be a number')).toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('Empty price rejected');
  });

  combinedTest('TC-LB-CR-010: Decimal price is accepted and shown', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-010', page);
    const brand = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData, { price: '12.5' });
    await expectBrandRow(lotteryBrandListPage, brand.code, { price: '12.5' });
    TestHelper.success('Decimal price saved');
  });

  combinedTest('TC-LB-CR-012: Price field accepts digits only', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard }) => {
    await TestHelper.initTest('TC-LB-CR-012', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.priceInput.fill('');
    await wizard.priceInput.pressSequentially('abc');
    await expect(wizard.priceInput, 'Letters must not be accepted in Price').toHaveValue('');
    TestHelper.success('Price accepts digits only');
  });

  combinedTest('TC-LB-CR-013: Create a brand end to end', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-013', page);
    const data = testLotteryBrandData.unique();
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(data);
    await wizard.goToUploadStep();
    const res = await wizard.submitAddBrand();
    expect(res.status(), `Create should return 201: ${await res.text().catch(() => '')}`).toBe(201);
    await expect(wizard.toast(/Lottery brand created/i).first(), 'Creation should be confirmed by a toast').toBeVisible();
    await TestHelper.step(page, 'Step 4 Config', 'Brand created; config step shown');
    await wizard.finishWithoutConfig();
    await lotteryBrandListPage.verifyPageLoaded();
    await expectBrandRow(lotteryBrandListPage, data.code, { name: data.name, type: 'Passive', status: 'Active', stage: 'Under Review', price: '25' });
    TestHelper.success(`Brand ${data.code} created end to end`);
  });

  combinedTest('TC-LB-CR-014: Missing images do not show "No image file selected" error toasts', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-014', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique());
    await wizard.goToUploadStep();
    const res = await wizard.submitAddBrand();
    expect(res.status(), 'Brand without images is created').toBe(201);
    await expect(wizard.continueWithoutConfigCheckbox).toBeVisible();
    await expect(wizard.toast('No image file selected'), 'Images are optional, so no "No image file selected" error toasts should appear').toHaveCount(0);
    TestHelper.success('No misleading image toasts');
  });

  combinedTest('TC-LB-CR-015: Duplicate Code is rejected case-insensitively', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-015', page);
    const original = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData);
    await lotteryBrandListPage.openAddNewBrand();
    await submitBrandAndExpectRejected(lotteryBrandListPage, wizard, testLotteryBrandData.unique({ code: original.code.toLowerCase() }), 'A lottery brand with this code already exists.');
    await expectBrandListed(lotteryBrandListPage, original.code);
    TestHelper.success('Duplicate code rejected');
  });

  combinedTest('TC-LB-CR-016: Duplicate Name is rejected', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-016', page);
    const original = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData);
    await lotteryBrandListPage.openAddNewBrand();
    await submitBrandAndExpectRejected(lotteryBrandListPage, wizard, testLotteryBrandData.unique({ name: original.name }), 'A lottery brand with this name already exists.');
    TestHelper.success('Duplicate name rejected');
  });

  combinedTest('TC-LB-CR-017: Name of exactly 255 characters is accepted', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-017', page);
    const name = testLotteryBrandData.nameOfLength(255);
    expect(name.length).toBe(255);
    const brand = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData, { name });
    await expectBrandRow(lotteryBrandListPage, brand.code, { name });
    TestHelper.success('255-character name saved');
  });

  combinedTest('TC-LB-CR-018: Name longer than 255 characters is blocked with a clear message', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-018', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique({ name: testLotteryBrandData.nameOfLength(256) }));
    await wizard.nameInput.press('Tab');
    await expect(wizard.fieldMessage(/at most 255 characters/i), 'A length message should be shown at Step 1').toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('Over-long name blocked');
  });

  combinedTest('TC-LB-CR-019: Code longer than 255 characters is blocked', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-019', page);
    await lotteryBrandListPage.openAddNewBrand();
    const code = testLotteryBrandData.newCode();
    await wizard.fillDetails(testLotteryBrandData.unique({ code: code + 'X'.repeat(256 - code.length) }));
    await wizard.codeInput.press('Tab');
    await expect(wizard.fieldMessage(/at most 255 characters/i), 'A length message should be shown at Step 1').toBeVisible();
    await expect(wizard.nextButton).toBeDisabled();
    TestHelper.success('Over-long code blocked');
  });

  combinedTest('TC-LB-CR-020: Sinhala and Tamil descriptions are stored', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, lotteryBrandDetailPage: detail, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-020', page);
    const { sinhala, tamil } = testLotteryBrandData.unicode;
    const brand = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData, { descriptionSinhala: sinhala, descriptionTamil: tamil, descriptionEnglish: 'English win' });
    await lotteryBrandListPage.openBrand(brand.code, 'View');
    await detail.verifyViewLoaded(brand.code);
    await expect(detail.descriptionSinhala).toHaveValue(sinhala);
    await expect(detail.descriptionTamil).toHaveValue(tamil);
    await expect(detail.descriptionEnglish).toHaveValue('English win');
    TestHelper.success('Unicode descriptions stored');
  });

  combinedTest('TC-LB-CR-021: Special characters and HTML in Name are shown as plain text', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-021', page);
    const alerts: string[] = [];
    page.on('dialog', (d) => { alerts.push(d.message()); void d.dismiss(); });
    const brand = await createUniqueBrand(lotteryBrandListPage, wizard, testLotteryBrandData, { name: testLotteryBrandData.security.htmlName() });
    await expectBrandRow(lotteryBrandListPage, brand.code, { name: brand.name });
    await expect(lotteryBrandListPage.renderedMarkupIn(brand.code), 'HTML must not be rendered').toHaveCount(0);
    expect(alerts, 'No script may run').toEqual([]);
    TestHelper.success('HTML shown literally');
  });

  combinedTest('TC-LB-CR-022: Back in the wizard keeps the entered values', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-022', page);
    const data = testLotteryBrandData.unique();
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(data);
    await wizard.goToUploadStep();
    await wizard.backButton.click();
    await wizard.backButton.click();
    await expect(wizard.codeInput).toHaveValue(data.code);
    await expect(wizard.nameInput).toHaveValue(data.name);
    await expect(wizard.priceInput).toHaveValue(data.price);
    await expect(wizard.lotteryTypeSelect, 'The selected Lottery Type should be kept after Back').toContainText(data.lotteryType);
    TestHelper.success('Values kept after Back');
  });

  combinedTest('TC-LB-CR-023: Step 2 Symbol Pack is optional', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-023', page);
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(testLotteryBrandData.unique());
    await wizard.nextButton.click();
    await expect(page.getByRole('heading', { name: 'Symbol Pack' })).toBeVisible();
    await wizard.nextButton.click();
    await expect(wizard.addBrandButton, 'Step 3 reached without choosing symbols').toBeVisible();
    TestHelper.success('Symbol Pack is optional');
  });

  combinedTest('TC-LB-CR-024: Brand is created at "Add Brand", before Step 4', async ({ page, lotteryBrandListPage, addBrandWizardPage: wizard, testLotteryBrandData }) => {
    await TestHelper.initTest('TC-LB-CR-024', page);
    const data = testLotteryBrandData.unique();
    await lotteryBrandListPage.openAddNewBrand();
    await wizard.fillDetails(data);
    await wizard.goToUploadStep();
    const res = await wizard.submitAddBrand();
    expect(res.status()).toBe(201);
    await lotteryBrandListPage.open();
    await expectBrandRow(lotteryBrandListPage, data.code, { stage: 'Under Review' });
    TestHelper.success('Brand exists even without finishing Step 4');
  });
});
