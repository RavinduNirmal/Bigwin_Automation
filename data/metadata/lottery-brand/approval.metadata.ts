import { brandCases, BRAND_PRE, BRAND_STEP } from './base';

/**
 * Metadata for tests/e2e/lottery-brand/lottery_brand_approval.spec.ts - plain-language, see base.ts.
 * Approval ("maker-checker"): a new or edited brand is "Under Review" -> Review -> "Pending Approval" -> Approve
 * -> "Approved". Only approved, active brands are offered when a draw is created.
 */
const STAGES = '- Stages: "Under Review" (new / edited) -> Review -> "Pending Approval" -> Approve -> "Approved"';

export const LotteryBrandApprovalMetadata = brandCases('Lottery Brand Approval', {
  'TC-LB-APR-001': {
    story: 'New brand starts Under Review and can only be Reviewed', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'A new brand waits for review and cannot be approved straight away\nWhy: a second check is required before a brand can be used.',
    preconditions: BRAND_PRE.OWN,
    testData: `- The brand created by the test\n${STAGES}`,
    steps: [BRAND_STEP.FIND, 'Read the Stage in the row', BRAND_STEP.OPEN_PAGE, 'Look at the Stage and the buttons on the page'],
    expectedResult: '- The list and the page show Stage "Under Review"\n- The buttons "Review" and "Update" are shown; "Approve" is NOT shown',
  },
  'TC-LB-APR-002': {
    story: 'Review moves the brand to Pending Approval', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: '"Review" moves a new brand on to "Pending Approval"\nWhy: review is the first of the two checks.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: STAGES,
    steps: ['Click "Review"', 'Look at the Stage and the buttons', 'In the list, open the "Pending Approval" tab and then the "Under Review" tab and search the Code'],
    expectedResult: '- Stage becomes "Pending Approval"; the buttons are now "Approve" and "Update"\n- The brand is listed under "Pending Approval" and no longer under "Under Review"',
  },
  'TC-LB-APR-003': {
    story: 'Approve moves the brand to Approved', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: '"Approve" makes a reviewed brand Approved\nWhy: only approved brands can be used for draws.',
    preconditions: `${BRAND_PRE.OWN_PAGE}\n- The brand has been reviewed (Stage "Pending Approval")`,
    testData: STAGES,
    steps: [BRAND_STEP.APPROVE, 'Look at the Stage and the buttons; reload the page and look again', 'In the list open the "Approved" tab and search the Code', BRAND_STEP.CLEANUP],
    expectedResult: '- Stage is "Approved", also after reloading\n- Only "Update" is shown (no "Review", no "Approve")\n- The brand is listed under the "Approved" tab',
  },
  'TC-LB-APR-004': {
    story: 'Review and Approve confirm with a success toast', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Review and Approve each confirm with a success message\nWhy: the admin must know the action worked.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The brand created by the test',
    steps: ['Click "Review" and watch for a message', 'Click "Approve" and watch for a message'],
    expectedResult: '- A success message is shown after each action',
    actualResult: 'No message is shown after Review or after Approve (only the Stage changes).',
  },
  'TC-LB-APR-005': {
    story: 'Editing an Approved brand sends it back to Under Review', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'Changing an approved brand sends it back for review\nWhy: every change must be checked again before it is used.',
    preconditions: `${BRAND_PRE.APPROVED}\n- The brand page is open`,
    testData: '- New English description: "Edited description <number>" (and a new Name)',
    steps: [BRAND_STEP.EDIT_MODE, 'Change the English description and the Name', BRAND_STEP.SAVE, 'Look at the Stage and the buttons; check the "Approved" and "Under Review" tabs in the list'],
    expectedResult: '- Stage is back to "Under Review" and the "Review" button is shown again\n- The brand moved from the "Approved" tab to "Under Review"',
  },
  'TC-LB-APR-006': {
    story: 'Changing only the Status of an Approved brand requires re-approval', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Switching an approved brand off also sends it back for review\nWhy: switching off is a change that must be checked too.',
    preconditions: `${BRAND_PRE.APPROVED}\n- The brand page is open`,
    testData: '- New Status: DISABLED',
    steps: [BRAND_STEP.EDIT_MODE, 'Choose Status "DISABLED"', BRAND_STEP.SAVE, 'Look at the Status and Stage'],
    expectedResult: '- Status "Disable"\n- Stage "Under Review"',
  },
  'TC-LB-APR-007': {
    story: 'Edited brand must be Reviewed and Approved again', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'An edited brand becomes Approved again only after a new Review and Approve\nWhy: the full two-step check applies to every change.',
    preconditions: `${BRAND_PRE.APPROVED}\n- The brand page is open`,
    testData: `- New English description: "Edited description <number>"\n${STAGES}`,
    steps: ['Change the description ("Update" > "Save Changes")', BRAND_STEP.REVIEW, BRAND_STEP.APPROVE, 'Look at the Stage and the description'],
    expectedResult: '- The Stage goes "Under Review" -> "Pending Approval" -> "Approved"\n- The edited description is kept',
  },
  'TC-LB-APR-008': {
    story: 'Stage field is read-only', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'The Stage cannot be typed or chosen by hand\nWhy: only the Review and Approve buttons may move a brand through the approval.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.EDIT_MODE, 'Try to change the Stage'],
    expectedResult: '- The Stage cannot be changed (only "Review" / "Approve" change it)',
  },
  'TC-LB-APR-009': {
    story: 'Review and Approve are written to the audit log', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Review and Approve are recorded in the brand\'s "Operation logs"\nWhy: it must be traceable who approved what and when.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The brand created by the test',
    steps: ['Click "Review", then "Approve"', 'Scroll down to "Operation logs" and read the top rows', BRAND_STEP.CLEANUP],
    expectedResult: '- Two new rows: "Lottery brand reviewed successfully." and "Lottery brand approved successfully."\n'
      + '- Entity Type "Lottery Brand", Entity Long Id = this brand\'s id, Performer Type "Admin User", Http Status "Ok"',
  },
  'TC-LB-APR-010': {
    story: 'The same admin can review and approve own brand (maker-checker separation)', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Whether the same person may both review and approve a brand\nWhy: a "four-eyes" rule normally needs two different people.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- One admin account only',
    steps: ['As the same admin click "Review", then "Approve"'],
    expectedResult: '- To be confirmed by the business: a second admin should be required to approve',
    actualResult: 'The same admin can review AND approve the brand (no four-eyes rule).',
  },
  'TC-LB-APR-011': {
    story: 'Review/Approve are not offered on Deleted brands', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Deleted brands cannot be reviewed or approved\nWhy: a deleted brand must never become usable.',
    preconditions: `${BRAND_PRE.OWN}\n- The brand has been deleted while "Under Review"`,
    testData: '- The deleted brand',
    steps: ['Open the "Deleted" tab and find the brand', 'Look for any action'],
    expectedResult: '- The row offers no actions at all',
  },
  'TC-LB-APR-012': {
    story: 'Brand with an Under Review Lottery Type', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'A brand cannot be built on a lottery type that is not approved\nWhy: unchecked lottery types must not be used.',
    preconditions: BRAND_PRE.WIZARD,
    testData: '- A lottery type whose Stage is "Under Review"',
    steps: ['Open "Select Lottery Type" and choose a lottery type that is not approved (see TC-LB-CR-002)'],
    expectedResult: '- Not possible: unapproved lottery types are not offered',
    actualResult: 'A brand can be created on a lottery type that is not approved.',
  },
});
