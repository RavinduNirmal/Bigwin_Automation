import { expect } from '@playwright/test';
import { LotteryBrandListPage } from '../../../pages/lottery-brand/lottery-brand-list.page';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { LotteryBrandData } from '../../../data/factories/lottery-brand-data.factory';
import { TestHelper } from '../common/test-helper';
import { Logger } from '../../logger';

const logger = new Logger();

/** Anything that hands out a fresh unique brand (the `testLotteryBrandData` fixture). */
export interface LotteryBrandDataSource {
  unique(overrides?: Partial<LotteryBrandData>): LotteryBrandData;
}

export interface CreatedBrand extends LotteryBrandData {
  id: number;
}

/**
 * Create a new unique brand through the real UI: Lottery Brands -> Add New Brand -> wizard -> Finish.
 * Ends on the Lottery Brands list. The brand starts at Stage "Under Review".
 */
export async function createUniqueBrand(
  listPage: LotteryBrandListPage,
  wizard: AddBrandWizardPage,
  source: LotteryBrandDataSource,
  overrides: Partial<LotteryBrandData> = {}
): Promise<CreatedBrand> {
  const data = source.unique(overrides);
  if (!listPage.page.url().endsWith(LotteryBrandListPage.PATH)) await listPage.open();
  await listPage.openAddNewBrand();
  await wizard.verifyStep1Loaded();
  const id = await wizard.createBrand(data);
  await listPage.verifyPageLoaded();
  await TestHelper.attachText(`Created brand ${data.code}`, JSON.stringify({ ...data, id }, null, 2));
  logger.info(`✅ Created unique brand ${data.code} (id ${id})`);
  return { ...data, id };
}

/** Search the code and expect exactly one row for it. */
export async function expectBrandListed(listPage: LotteryBrandListPage, code: string): Promise<void> {
  await listPage.searchBrands(code);
  await expect(listPage.rowFor(code), `Brand "${code}" should be listed exactly once`).toHaveCount(1, { timeout: 15000 });
}

/** Search the code and expect no row for it (in the current tab). */
export async function expectBrandNotListed(listPage: LotteryBrandListPage, code: string): Promise<void> {
  await listPage.searchBrands(code);
  await expect(listPage.rowFor(code), `Brand "${code}" should NOT be listed`).toHaveCount(0, { timeout: 15000 });
}

/** The brand's list row shows the expected values (only the given fields are compared). */
export async function expectBrandRow(
  listPage: LotteryBrandListPage,
  code: string,
  expected: Partial<{ name: string; type: string; status: string; stage: string; price: string }>
): Promise<void> {
  const actual = await listPage.getBrandData(code);
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => actual[key as keyof typeof actual] !== value)
    .map(([key, value]) => `${key}: expected "${value}", list shows "${actual[key as keyof typeof actual]}"`);
  expect(mismatches, `List row of brand "${code}" differs from what was expected`).toEqual([]);
}

/**
 * Fill Step 1 and go through to "Add Brand", expecting the SERVER to reject it with `message`
 * (toast); the wizard stays on Step 3 and nothing new is listed for `code`.
 */
export async function submitBrandAndExpectRejected(
  listPage: LotteryBrandListPage,
  wizard: AddBrandWizardPage,
  data: LotteryBrandData,
  message: string | RegExp,
  rowsWithCodeAfter = 0
): Promise<void> {
  await wizard.fillDetails(data);
  await wizard.goToUploadStep();
  const res = await wizard.submitAddBrand();
  const body = await res.text().catch(() => '');
  expect(res.status(), `Creating "${data.code}" should be rejected; got ${res.status()} ${body}`).toBeGreaterThanOrEqual(400);
  await expect(wizard.toast(message).first(), `Toast ${message} should be shown`).toBeVisible({ timeout: 15000 });
  await expect(wizard.addBrandButton, 'Wizard should stay on Step 3').toBeVisible();
  await TestHelper.attachText('Rejected', `${res.status()} ${body}`);
  await listPage.open();
  await listPage.searchBrands(data.code);
  await expect(listPage.rowFor(data.code), `No extra brand should exist for "${data.code}"`).toHaveCount(rowsWithCodeAfter, { timeout: 15000 });
}
