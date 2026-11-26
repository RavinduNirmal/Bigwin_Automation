import { brandCases, BRAND_PRE, BRAND_STEP } from './base';

/**
 * Metadata for tests/e2e/lottery-brand/lottery_brand_delete.spec.ts - plain-language, see base.ts.
 * Deleting a brand is a "soft delete": it disappears from the normal list and is kept in the "Deleted" tab.
 */
const DELETE = 'Row "..." menu > "Delete" (there is no "Are you sure?" question - it is deleted at once)';

export const LotteryBrandDeleteMetadata = brandCases('Delete Lottery Brand', {
  'TC-LB-DEL-001': {
    story: 'Delete from the row menu has no confirmation', severity: 'critical', tags: ['Smoke', 'Regression', 'DEL'],
    description: 'A brand can be deleted from its row menu\nWhy: brands created by mistake must be removable.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, DELETE, 'Wait for the page to reload and search the Code again on the "All" tab'],
    expectedResult: '- No confirmation question is asked (if the business wants one, this is a design gap)\n- The page reloads and the brand is no longer listed under "All"',
  },
  'TC-LB-DEL-002': {
    story: 'Delete is a soft delete and the brand appears in the Deleted tab', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'A deleted brand is kept in the "Deleted" tab\nWhy: deleted brands stay visible for history and audit.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, DELETE, 'Click the "Deleted" tab and search the Code'],
    expectedResult: '- The brand is listed under "Deleted" with its old Status and Stage\n- It is no longer listed under "All"',
  },
  'TC-LB-DEL-003': {
    story: 'Deleted rows are read-only', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'Deleted brands cannot be opened or changed\nWhy: a deleted brand must not be edited, reviewed or approved.',
    preconditions: `${BRAND_PRE.OWN}\n- The brand has been deleted`,
    testData: '- The deleted brand',
    steps: ['Open the "Deleted" tab and find the brand', 'Look at the row'],
    expectedResult: '- The row has no "..." actions button\n- The Code and Name are not links (no Restore, no View)',
  },
  'TC-LB-DEL-004': {
    story: 'Deleted record stays deleted after reload', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'A deleted brand stays deleted after the page is reloaded\nWhy: a delete must be saved, not only hidden on the screen.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, DELETE, 'Reload the page (F5) and search the Code on the "All" tab'],
    expectedResult: '- No row is found under "All"',
  },
  'TC-LB-DEL-005': {
    story: 'A deleted Code or Name can be reused', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'Whether the Code and Name of a deleted brand can be used again\nWhy: the business must decide if deleted brands block their Code and Name.',
    preconditions: `${BRAND_PRE.OWN}\n- The brand has been deleted`,
    testData: '- The Code and Name of the deleted brand',
    steps: ['Create a new brand with the SAME Code and Name as the deleted one', 'Note what happens'],
    expectedResult: '- To be confirmed by the business: either the brand is created, or the "already exists" message is shown - record what happens',
  },
  'TC-LB-DEL-006': {
    story: 'Deleting an Approved brand', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'A deleted approved brand can no longer be used for draws\nWhy: deleted brands must not be sold.',
    preconditions: BRAND_PRE.APPROVED,
    testData: '- The approved brand created by the test',
    steps: [BRAND_STEP.FIND, DELETE, BRAND_STEP.DRAW_LIST],
    expectedResult: '- The brand is no longer listed under "All"\n- It is NOT offered in the Create Draw "Lottery Brand" list',
  },
  'TC-LB-DEL-007': {
    story: 'Deleting a brand that is used by a draw is blocked or warned', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'Deleting a brand that already has draws is blocked or warned about\nWhy: draws of a deleted brand would lose their brand.',
    preconditions: `${BRAND_PRE.LIST}\n- A brand that already has at least one draw (manual test - the automation never deletes brands in use)`,
    testData: '- A brand that is used by a draw',
    steps: [BRAND_STEP.FIND, DELETE],
    expectedResult: '- A warning is shown, or the delete is blocked',
  },
  'TC-LB-DEL-008': {
    story: 'Delete a brand already deleted in another session', severity: 'normal', tags: ['Regression', 'DEL'],
    description: 'Deleting a brand that someone else has just deleted gives a clear message\nWhy: two admins may work on the same list at the same time.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test, open in two browser tabs',
    steps: ['Open the Lottery Brands list in two tabs', 'Delete the brand in tab 1', 'In tab 2 (not reloaded) delete the same brand'],
    expectedResult: '- Tab 2 shows a clear "not found" message and does not crash',
  },
});
