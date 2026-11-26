import { brandCases, BRAND_PRE, BRAND_STEP } from './base';

/** Metadata for tests/e2e/lottery-brand/lottery_brand_logs.spec.ts - plain-language, see base.ts. */
export const LotteryBrandLogsMetadata = brandCases('Lottery Brand Audit Logs', {
  'TC-LB-LOG-001': {
    story: 'Brand page shows an \'Operation logs\' table', severity: 'normal', tags: ['Regression', 'LOG'],
    description: 'The brand page has an "Operation logs" table (change history)\nWhy: admins must be able to see who did what.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The brand created by the test',
    steps: ['Scroll down to "Operation logs"', 'Look at the column switches and the columns'],
    expectedResult: '- Columns: Log Id, IP Address, Email, Operation Type, Details, Entity Type, Entity Long Id, Performer Type, Http Status, Logged At, View More\n'
      + '- Switches above the table show / hide columns\n- Page information "Page 1 of N" is shown',
  },
  'TC-LB-LOG-002': {
    story: 'Operation logs are limited to the brand being viewed', severity: 'normal', tags: ['Regression', 'LOG'],
    description: 'A brand\'s "Operation logs" show only that brand\'s history\nWhy: mixing in other brands makes the history useless.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The test\'s brand and one older brand',
    steps: ['Read the "Entity Long Id" of the rows in "Operation logs"', 'Open an older brand\'s page and compare'],
    expectedResult: '- Only rows whose Entity Long Id is this brand\'s id are shown',
    actualResult: 'Every brand\'s history is shown (e.g. Entity Long Id 35, 69, 65 on another brand\'s page) - the same list appears on every brand page.',
  },
  'TC-LB-LOG-003': {
    story: 'Review and Approve produce audit entries', severity: 'normal', tags: ['Regression', 'LOG'],
    description: 'Review and Approve each add a row to the history\nWhy: approvals must be traceable.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- The brand created by the test',
    steps: ['Click "Review", then "Approve"', 'Reload the page and read the top rows of "Operation logs"', BRAND_STEP.CLEANUP],
    expectedResult: '- Rows "Lottery brand reviewed successfully." and "Lottery brand approved successfully." for this brand\'s id',
  },
  'TC-LB-LOG-004': {
    story: 'Create, update and delete are audited', severity: 'normal', tags: ['Regression', 'LOG'],
    description: 'Creating, changing and deleting a brand are recorded in the history\nWhy: every change must be traceable.',
    preconditions: BRAND_PRE.LIST,
    testData: '- A new brand created, edited and deleted by the test',
    steps: ['Create a brand, change its description ("Update" > "Save Changes") and delete it', 'Read "Operation logs" / the Audit Logs page'],
    expectedResult: '- One history row each for create, update and delete',
    actualResult: 'Only review / approve rows exist - creating and editing a brand leave no history row (the business must confirm whether they should).',
  },
  'TC-LB-LOG-005': {
    story: 'Brand config changes are audited', severity: 'normal', tags: ['Regression', 'LOG'],
    description: 'Changing a brand setting is recorded in the history\nWhy: setting changes affect sales and must be traceable.',
    preconditions: BRAND_PRE.OWN_PAGE,
    testData: '- New "Lottery Batch Size" value',
    steps: [BRAND_STEP.EDIT_MODE, 'Change "Lottery Batch Size"', BRAND_STEP.SAVE, 'Read "Operation logs"'],
    expectedResult: '- A history row for the setting change is shown',
  },
});
