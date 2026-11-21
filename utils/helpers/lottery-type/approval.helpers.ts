import { expect } from '@playwright/test';
import { LotteryTypePage } from '../../../pages/lottery-type/lottery-type.page';
import { LotteryBrandFormPage } from '../../../pages/lottery-brand/lottery-brand-form.page';
import {
  LotteryTypeData,
  STAGE_APPROVED,
  STAGE_PENDING_APPROVAL,
  STAGE_UNDER_REVIEW,
} from '../../../data/factories/lottery-type-data.factory';
import { TestHelper } from '../common/test-helper';
import { createUniqueLotteryType, LotteryTypeDataSource } from './create.helpers';
import { expectLotteryTypeSaved } from './table.helpers';

/**
 * Approval (maker-checker) helpers. Stages: Under Review -> (Review) -> Pending Approval
 * -> (Approve) -> Approved. Only used on the tests' own "AT..." records.
 */
export type ApprovalStage = typeof STAGE_UNDER_REVIEW | typeof STAGE_PENDING_APPROVAL | typeof STAGE_APPROVED;

/** Buttons the Update dialog must offer in each stage. */
const ACTIONS_FOR: Record<ApprovalStage, { review: boolean; approve: boolean }> = {
  [STAGE_UNDER_REVIEW]: { review: true, approve: false },
  [STAGE_PENDING_APPROVAL]: { review: false, approve: true },
  [STAGE_APPROVED]: { review: false, approve: false },
};

/**
 * The record is in `stage`: the table's Stage column, the Update dialog's read-only Stage field and
 * the offered Review / Approve buttons all agree. Leaves the dialog closed.
 */
export async function expectApprovalStage(lotteryTypePage: LotteryTypePage, code: string, stage: ApprovalStage): Promise<void> {
  await expectLotteryTypeSaved(lotteryTypePage, code, { stage });
  const modal = await lotteryTypePage.openEditModal(code);
  await expect(modal.stageInput, `Update dialog Stage for "${code}"`).toHaveValue(stage);
  const actions = ACTIONS_FOR[stage];
  await expect(modal.reviewButton, `"Review" should ${actions.review ? '' : 'NOT '}be offered when the stage is "${stage}"`)
    .toHaveCount(actions.review ? 1 : 0);
  await expect(modal.approveButton, `"Approve" should ${actions.approve ? '' : 'NOT '}be offered when the stage is "${stage}"`)
    .toHaveCount(actions.approve ? 1 : 0);
  await modal.cancelUpdate();
  await TestHelper.attachText(`Stage of ${code}`, stage);
}

/** Review, then check the record moved to "Pending Approval". */
export async function reviewAndVerify(lotteryTypePage: LotteryTypePage, code: string): Promise<void> {
  await lotteryTypePage.reviewLotteryType(code);
  await expectApprovalStage(lotteryTypePage, code, STAGE_PENDING_APPROVAL);
}

/** Approve, then check the record moved to "Approved". */
export async function approveAndVerify(lotteryTypePage: LotteryTypePage, code: string): Promise<void> {
  await lotteryTypePage.approveLotteryType(code);
  await expectApprovalStage(lotteryTypePage, code, STAGE_APPROVED);
}

/** Create a new lottery type and take it all the way to "Approved". */
export async function createApprovedLotteryType(
  lotteryTypePage: LotteryTypePage,
  source: LotteryTypeDataSource
): Promise<LotteryTypeData> {
  const lotteryType = await createUniqueLotteryType(lotteryTypePage, source, 'ACTIVE', { verifySaved: true });
  await expectApprovalStage(lotteryTypePage, lotteryType.code, STAGE_UNDER_REVIEW);
  await reviewAndVerify(lotteryTypePage, lotteryType.code);
  await approveAndVerify(lotteryTypePage, lotteryType.code);
  return lotteryType;
}

/**
 * Whether the lottery type (by its Type name) is offered for use in the Lottery Brand form's
 * "Select Lottery Type" dropdown. Only Approved lottery types should be offered.
 * Navigates away from the Lottery Type page - callers return with lotteryTypePage.goto().
 */
export async function expectOfferedForUse(
  brandForm: LotteryBrandFormPage,
  lotteryType: LotteryTypeData,
  offered: boolean,
  stageDescription: string
): Promise<void> {
  await brandForm.open();
  const options = await brandForm.lotteryTypeOptions();
  await TestHelper.attachText('Lottery Brand "Select Lottery Type" options', options.join('\n'));
  expect(
    options.includes(lotteryType.name),
    offered
      ? `An ${stageDescription} lottery type ("${lotteryType.name}") should be offered in Lottery Brand > Select Lottery Type`
      : `A lottery type that is ${stageDescription} ("${lotteryType.name}") must NOT be offered in Lottery Brand > Select Lottery Type ` +
        '- it is not approved, so it is not ready for use'
  ).toBe(offered);
}
