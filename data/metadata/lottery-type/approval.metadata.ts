import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_STEP } from './base';

/**
 * Metadata for tests/e2e/lottery-type/lottery_type_approval.spec.ts - plain-language, see base.ts.
 * Approval ("maker-checker"): a new or edited lottery type is "Under Review" -> Review -> "Pending Approval"
 * -> Approve -> "Approved". Only Approved types should be offered when a lottery brand is created.
 */
const STAGES = '- Stages: "Under Review" (new / edited) -> Review -> "Pending Approval" -> Approve -> "Approved"';

export const LotteryTypeApprovalMetadata: TestMetadataCollection = ltCases('Lottery Type Approval', {
  'TC-LT-APR-001': {
    story: 'Initial Stage', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'A new lottery type waits for review and cannot be approved straight away\nWhy: a second person must check every new type (review first, then approve).',
    preconditions: LT_PRE.PAGE,
    testData: `- New lottery type: Code "AT<unique number>", Type "Auto Type <unique number>", Status ACTIVE\n${STAGES}`,
    steps: [
      LT_STEP.CREATE,
      LT_STEP.OPEN_EDIT,
      'Look at the Stage and the buttons offered',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- Stage is "Under Review"\n- The button "Review" is offered\n- The button "Approve" is NOT offered',
  },
  'TC-LT-APR-002': {
    story: 'Review', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: '"Review" moves a new lottery type on to "Pending Approval"\nWhy: review is the first of the two checks.',
    preconditions: `${LT_PRE.ONE}\n- Its Stage is "Under Review"`,
    testData: STAGES,
    steps: [
      LT_STEP.OPEN_EDIT,
      'Click "Review"',
      'Open "Edit" on the row again and look at the Stage and the buttons',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- Stage is "Pending Approval"\n- The button "Approve" is now offered\n- "Review" is no longer offered',
  },
  'TC-LT-APR-003': {
    story: 'Approve', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval'],
    description: '"Approve" makes a reviewed lottery type Approved, and it stays Approved\nWhy: only approved lottery types may be used for lottery brands.',
    preconditions: `${LT_PRE.ONE}\n- It has been reviewed (Stage "Pending Approval")`,
    testData: STAGES,
    steps: [
      LT_STEP.OPEN_EDIT,
      'Click "Approve"',
      'Open "Edit" again and look at the Stage and the buttons',
      'Reload the page (F5) and look at the Stage of the row again',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- Stage is "Approved"\n- Neither "Review" nor "Approve" is offered any more\n- After reloading the page the Stage is still "Approved"',
  },
  'TC-LT-APR-004': {
    story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    description: 'A lottery type that is still "Under Review" cannot be chosen for a new lottery brand\nWhy: unchecked lottery types must not be used.',
    preconditions: `${LT_PRE.ONE}\n- Its Stage is "Under Review" (not reviewed, not approved)`,
    testData: '- The Type name of the test\'s lottery type',
    steps: [
      LT_STEP.BRAND_LIST,
      'Look for the test\'s lottery type in the list',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- The "Under Review" lottery type is NOT in the "Select Lottery Type" list',
    actualResult: 'The "Under Review" lottery type IS offered in "Select Lottery Type" - lottery types that are not approved can be used for new brands.',
  },
  'TC-LT-APR-005': {
    story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    description: 'A lottery type that is reviewed but not yet approved cannot be chosen for a new lottery brand\nWhy: both checks must be done before a type is used.',
    preconditions: LT_PRE.ONE,
    testData: '- The Type name of the test\'s lottery type',
    steps: [
      LT_STEP.REVIEW,
      LT_STEP.BRAND_LIST,
      'Look for the test\'s lottery type in the list',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- The "Pending Approval" lottery type is NOT in the "Select Lottery Type" list',
    actualResult: 'The "Pending Approval" lottery type IS offered in "Select Lottery Type" - lottery types that are not approved can be used for new brands.',
  },
  'TC-LT-APR-006': {
    story: 'Ready For Use', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval', 'Integration'],
    description: 'An approved lottery type can be chosen for a new lottery brand\nWhy: approval is what makes a lottery type usable.',
    preconditions: LT_PRE.APPROVED,
    testData: '- The Type name of the test\'s approved lottery type',
    steps: [
      LT_STEP.BRAND_LIST,
      'Look for the test\'s lottery type in the list',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- The approved lottery type IS in the "Select Lottery Type" list',
  },
  'TC-LT-APR-007': {
    story: 'Re-approval After Edit', severity: 'critical', tags: ['Regression', 'Approval'],
    description: 'Changing the Type of an approved lottery type sends it back for review\nWhy: every change must be checked again before it is used.',
    preconditions: LT_PRE.APPROVED,
    testData: '- New Type: "Auto Type <new unique number>"',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Change the Type and click "Update"',
      'Open "Edit" again and look at the Type, the Stage and the buttons',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- The new Type is saved\n- Stage is back to "Under Review"\n- "Review" is offered again',
  },
  'TC-LT-APR-008': {
    story: 'Re-approval After Edit', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Changing only the Status of an approved lottery type also sends it back for review\nWhy: switching a type off or on is a change that must be checked too.',
    preconditions: LT_PRE.APPROVED,
    testData: '- New Status: DISABLED',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Choose Status "DISABLED" and click "Update"',
      'Look at the Status and the Stage of the row',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- Status is "Disable"\n- Stage is back to "Under Review"',
  },
  'TC-LT-APR-009': {
    story: 'Re-approval After Edit', severity: 'critical', tags: ['Regression', 'Approval'],
    description: 'An edited lottery type becomes Approved again only after a new Review and Approve\nWhy: the full two-step check applies to every change.',
    preconditions: LT_PRE.APPROVED,
    testData: `- New Type: "Auto Type <new unique number>"\n${STAGES}`,
    steps: [
      'Change the Type with "Edit" > "Update" (Stage becomes "Under Review")',
      LT_STEP.REVIEW,
      LT_STEP.APPROVE,
      'Look at the Type and the Stage of the row',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- The Stage goes "Under Review" -> "Pending Approval" -> "Approved"\n- The edited Type is kept the whole time',
  },
  'TC-LT-APR-010': {
    story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    description: 'After an approved lottery type is edited, it cannot be used until it is approved again\nWhy: the unchecked new version must not be used for new brands.',
    preconditions: LT_PRE.APPROVED,
    testData: '- New Type: "Auto Type <new unique number>"',
    steps: [
      'Change the Type with "Edit" > "Update" (Stage becomes "Under Review")',
      `${LT_STEP.BRAND_LIST} - look for the edited type`,
      'Review and Approve the lottery type again',
      'Open "Select Lottery Type" again and look for it',
      LT_STEP.CLEANUP,
    ],
    expectedResult: '- While it is "Under Review" the edited type is NOT offered\n- After it is approved again it IS offered',
    actualResult: 'The edited type IS offered while it is "Under Review" - an unchecked version of a lottery type can be used for new brands.',
  },
});
