import { expect } from '@playwright/test';
import { LotteryBrandListPage } from '../../../pages/lottery-brand/lottery-brand-list.page';
import { AddBrandWizardPage } from '../../../pages/lottery-brand/add-brand-wizard.page';
import { LotteryBrandDetailPage } from '../../../pages/lottery-brand/lottery-brand-detail.page';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import {
  BRAND_STAGE_APPROVED,
  BRAND_STAGE_PENDING_APPROVAL,
  BRAND_STAGE_UNDER_REVIEW,
  LotteryBrandData,
} from '../../../data/factories/lottery-brand-data.factory';
import { TestHelper } from '../common/test-helper';
import { createUniqueBrand, CreatedBrand, LotteryBrandDataSource } from './create.helpers';

export type BrandStage = typeof BRAND_STAGE_UNDER_REVIEW | typeof BRAND_STAGE_PENDING_APPROVAL | typeof BRAND_STAGE_APPROVED;

const ACTIONS_FOR: Record<BrandStage, { review: boolean; approve: boolean }> = {
  [BRAND_STAGE_UNDER_REVIEW]: { review: true, approve: false },
  [BRAND_STAGE_PENDING_APPROVAL]: { review: false, approve: true },
  [BRAND_STAGE_APPROVED]: { review: false, approve: false },
};

/** On the brand page (view mode): Stage field shows `stage` and only the matching Review/Approve button is offered. */
export async function expectBrandPageStage(detail: LotteryBrandDetailPage, stage: BrandStage): Promise<void> {
  await expect(detail.stageField, 'Brand page Stage').toHaveValue(stage, { timeout: 15000 });
  const actions = ACTIONS_FOR[stage];
  await expect(detail.reviewButton, `"Review" should ${actions.review ? '' : 'NOT '}be offered at "${stage}"`).toHaveCount(actions.review ? 1 : 0);
  await expect(detail.approveButton, `"Approve" should ${actions.approve ? '' : 'NOT '}be offered at "${stage}"`).toHaveCount(actions.approve ? 1 : 0);
  await expect(detail.updateButton, '"Update" is always offered').toBeVisible();
  await TestHelper.attachText('Brand stage', stage);
}

/** Create a brand and open its page (via row menu Edit). Ends on the brand page in view mode. */
export async function createBrandAndOpen(
  listPage: LotteryBrandListPage,
  wizard: AddBrandWizardPage,
  detail: LotteryBrandDetailPage,
  source: LotteryBrandDataSource,
  overrides: Partial<LotteryBrandData> = {}
): Promise<CreatedBrand> {
  const brand = await createUniqueBrand(listPage, wizard, source, overrides);
  await listPage.openBrand(brand.code, 'Edit');
  await detail.verifyViewLoaded(brand.code);
  return brand;
}

/** Create a brand and take it to "Approved" (Review + Approve). Ends on the brand page. */
export async function createApprovedBrand(
  listPage: LotteryBrandListPage,
  wizard: AddBrandWizardPage,
  detail: LotteryBrandDetailPage,
  source: LotteryBrandDataSource
): Promise<CreatedBrand> {
  const brand = await createBrandAndOpen(listPage, wizard, detail, source);
  await expectBrandPageStage(detail, BRAND_STAGE_UNDER_REVIEW);
  await detail.review();
  await expectBrandPageStage(detail, BRAND_STAGE_PENDING_APPROVAL);
  await detail.approve();
  await expectBrandPageStage(detail, BRAND_STAGE_APPROVED);
  return brand;
}

/** Re-open the brand page from the list (fresh load) - use after leaving it. */
export async function reopenBrand(listPage: LotteryBrandListPage, detail: LotteryBrandDetailPage, code: string): Promise<void> {
  await listPage.open();
  await listPage.openBrand(code, 'Edit');
  await detail.verifyViewLoaded(code);
}

/**
 * Whether the brand (by name) is offered in Create Draw > "Lottery Brand". Only Approved + Active
 * brands should be. Read-only: the draw form is never submitted. Leaves the browser on Create Draw.
 */
export async function expectBrandOfferedForDraw(
  createDraw: CreateDrawPage,
  brand: { name: string },
  offered: boolean,
  stageDescription: string
): Promise<void> {
  await createDraw.open();
  const options = await createDraw.brandOptions();
  await TestHelper.attachText('Create Draw "Lottery Brand" options', options.join('\n'));
  expect(
    options.includes(brand.name),
    offered
      ? `An ${stageDescription} brand ("${brand.name}") should be offered in Create Draw > Lottery Brand`
      : `A brand that is ${stageDescription} ("${brand.name}") must NOT be offered in Create Draw > Lottery Brand - it is not approved`
  ).toBe(offered);
}
