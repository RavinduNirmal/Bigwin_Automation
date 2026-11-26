import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_POST } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_table.spec.ts - plain-language, see base.ts. */
const SORT_BROKEN = 'Sorting does nothing: clicking the column heading does not change the order of the rows.';
const TABS_BROKEN = 'The tabs do nothing: every lottery type stays listed whichever tab is clicked.';

export const LotteryTypeTableMetadata: TestMetadataCollection = ltCases('Lottery Type Table', {
  'TC-LT-TBL-001': {
    story: 'Sorting', severity: 'normal', tags: ['Regression', 'Sorting'],
    description: 'Clicking the "Code" heading sorts the list by Code, both ways\nWhy: admins sort to find lottery types quickly.',
    preconditions: LT_PRE.PAGE,
    testData: '- The lottery types already in the list',
    steps: [
      'Click the "Code" column heading',
      'Check the order of the Codes',
      'Click the "Code" heading again',
      'Check the order again',
    ],
    expectedResult: '- First click: the rows are in A-Z order of Code (the heading arrow shows the direction)\n- Second click: the rows are in Z-A order',
    actualResult: SORT_BROKEN,
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-TBL-002': {
    story: 'Sorting', severity: 'normal', tags: ['Regression', 'Sorting'],
    description: 'Clicking the "Type Description" heading sorts the list by Type\nWhy: admins sort to find lottery types quickly.',
    preconditions: LT_PRE.PAGE,
    testData: '- The lottery types already in the list',
    steps: [
      'Click the "Type Description" column heading',
      'Check the order of the Type Descriptions',
    ],
    expectedResult: '- The rows are in alphabetical order of Type Description',
    actualResult: SORT_BROKEN,
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-TBL-003': {
    story: 'Tabs', severity: 'critical', tags: ['Regression', 'Filtering'],
    description: 'The "Active" tab shows only switched-on lottery types\nWhy: admins need to see which types can be used.',
    preconditions: `${LT_PRE.PAGE}\n- The test has created one ACTIVE and one DISABLED lottery type`,
    testData: '- Lottery type A: Status ACTIVE\n- Lottery type B: Status DISABLED',
    steps: [
      'Click the "Active" tab',
      'Look for A and B',
    ],
    expectedResult: '- A (Active) is listed\n- B (Disable) is NOT listed',
    actualResult: TABS_BROKEN,
  },
  'TC-LT-TBL-004': {
    story: 'Tabs', severity: 'normal', tags: ['Regression', 'Filtering'],
    description: 'The "Deleted" tab does not show lottery types that are not deleted\nWhy: the Deleted tab must only show deleted records.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test (not deleted)',
    steps: [
      'Click the "Deleted" tab and look for the test\'s lottery type',
      'Click the "All" tab and look for it again',
    ],
    expectedResult: '- Under "Deleted" it is NOT listed\n- Under "All" it is listed again',
    actualResult: TABS_BROKEN,
  },
  'TC-LT-TBL-005': {
    story: 'Pagination', severity: 'minor', tags: ['Regression', 'UI'],
    description: 'The page information "Page X of Y" is correct\nWhy: admins need to know where they are in a long list.',
    preconditions: LT_PRE.PAGE,
    testData: '- None',
    steps: [
      'Read the page information under the table',
    ],
    expectedResult: '- It reads "Page X of Y", where X is at least 1 and not bigger than Y',
    postconditions: LT_POST.NOTHING,
  },
});
