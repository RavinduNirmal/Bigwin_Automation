import { brandCases, BRAND_PRE, BRAND_STEP } from './base';

/**
 * Metadata for tests/e2e/lottery-brand/lottery_brand_use.spec.ts - plain-language, see base.ts.
 * "Ready for use" = the brand is offered in Lottery Draws > Create Draw > "Lottery Brand" (checked by looking only).
 */
export const LotteryBrandUseMetadata = brandCases('Brand Ready For Use', {
  'TC-LB-USE-001': {
    story: 'Create Draw brand dropdown only requests APPROVED + ACTIVE brands', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Create Draw only offers brands that are approved and active\nWhy: draws may only be created for checked, switched-on brands.',
    preconditions: '- Logged in to the BigWin admin portal (dev) as admin',
    testData: '- The brands already in the system',
    steps: [BRAND_STEP.DRAW_LIST, 'Look at the options'],
    expectedResult: '- Only brand NAMES are listed, and only brands that are Approved and Active (about 41 options on dev)',
    postconditions: 'Nothing is changed in the system (no draw is created)',
  },
  'TC-LB-USE-002': {
    story: 'Under Review brand is not offered', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'A brand that is still "Under Review" cannot be used for a draw\nWhy: unchecked brands must not be sold.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The Name of the test\'s brand (Stage "Under Review")',
    steps: [BRAND_STEP.DRAW_LIST, 'Look for the test\'s brand'],
    expectedResult: '- The brand is NOT in the list',
  },
  'TC-LB-USE-003': {
    story: 'Pending Approval brand is not offered', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'A brand that is reviewed but not yet approved cannot be used for a draw\nWhy: both checks must be done first.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The Name of the test\'s brand',
    steps: [`${BRAND_STEP.OPEN_PAGE}; click "Review"`, BRAND_STEP.DRAW_LIST, 'Look for the test\'s brand'],
    expectedResult: '- The brand is NOT in the list',
  },
  'TC-LB-USE-004': {
    story: 'Approved brand is offered', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'An approved brand can be chosen for a new draw\nWhy: approval is what makes a brand usable.',
    preconditions: BRAND_PRE.APPROVED,
    testData: '- The Name of the test\'s approved brand',
    steps: [BRAND_STEP.DRAW_LIST, 'Look for the test\'s brand (do not choose it)', BRAND_STEP.CLEANUP],
    expectedResult: '- The brand IS in the list',
  },
  'TC-LB-USE-005': {
    story: 'Edited Approved brand is not offered until re-approved', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'After an approved brand is edited it cannot be used until it is approved again\nWhy: the unchecked new version must not be sold.',
    preconditions: BRAND_PRE.APPROVED,
    testData: '- New English description: "Edited description <number>"',
    steps: ['Change the brand ("Update" > "Save Changes" - it goes back to "Under Review")', `${BRAND_STEP.DRAW_LIST} - look for the brand`, 'Review and Approve the brand again', 'Open the list again and look for it', BRAND_STEP.CLEANUP],
    expectedResult: '- While "Under Review" / "Pending Approval" the brand is NOT offered\n- Once approved again it IS offered',
  },
  'TC-LB-USE-006': {
    story: 'DISABLED brand is not offered', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'A switched-off brand cannot be used for a draw, even when approved\nWhy: switched-off brands must not be sold.',
    preconditions: BRAND_PRE.APPROVED,
    testData: '- New Status: DISABLED',
    steps: ['Set the brand to Status "DISABLED" and approve it again', BRAND_STEP.DRAW_LIST, 'Look for the brand'],
    expectedResult: '- The brand is NOT in the list',
  },
  'TC-LB-USE-007': {
    story: 'Deleted brand is not offered', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'A deleted brand cannot be used for a draw\nWhy: deleted brands must never be sold.',
    preconditions: BRAND_PRE.APPROVED,
    testData: '- The approved brand created by the test',
    steps: ['Delete the brand (row "..." menu > "Delete")', BRAND_STEP.DRAW_LIST, 'Look for the brand'],
    expectedResult: '- The brand is NOT in the list',
  },
  'TC-LB-USE-008': {
    story: 'Brand whose Lottery Type is later edited, disabled or deleted', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'What happens to an approved brand when its lottery type is changed, switched off or deleted\nWhy: a brand should not stay usable on a type that is no longer valid.',
    preconditions: '- Logged in as admin\n- A lottery type created by the test, and an approved brand built on it (manual test)',
    testData: '- The test\'s own lottery type and brand',
    steps: ['Edit, then switch off, then delete the lottery type', 'After each change check the brand and the Create Draw "Lottery Brand" list'],
    expectedResult: '- To be confirmed by the business: the brand is flagged / blocked, or follows the lottery type - record what happens',
  },
  'TC-LB-USE-009': {
    story: 'Lottery type shown in the list matches the brand\'s type', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'The brand list shows the lottery type the brand was created with\nWhy: admins rely on the Type column.',
    preconditions: BRAND_PRE.LIST,
    testData: '- New brand with Lottery Type "Passive"',
    steps: [BRAND_STEP.CREATE, BRAND_STEP.FIND, 'Read the Type column', BRAND_STEP.CLEANUP],
    expectedResult: '- The Type column shows "Passive"',
  },
});
