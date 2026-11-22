import { TestMetadataCollection } from '../../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_table.spec.ts */
const base = { epic: 'Lottery Management', feature: 'Lottery Type Table', owner: 'QA Team' } as const;

export const LotteryTypeTableMetadata: TestMetadataCollection = {
  'TC-LT-TBL-001': {
    ...base, story: 'Sorting', severity: 'normal', tags: ['Regression', 'Sorting'],
    tms: 'TC-LT-TBL-001',
    description: 'Sorting by Code orders the rows, both directions',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Click the Code header', 'Verify order', 'Click again', 'Verify reverse order'],
    expectedResult: 'Rows sorted by Code in the announced direction each time',
    actualResult: 'Sorting does nothing - the list API ignores sortBy / sortDir, the order never changes',
  },
  'TC-LT-TBL-002': {
    ...base, story: 'Sorting', severity: 'normal', tags: ['Regression', 'Sorting'],
    tms: 'TC-LT-TBL-002',
    description: 'Sorting by Type Description orders the rows',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Click the Type Description header'],
    expectedResult: 'Rows sorted by Type Description',
    actualResult: 'Sorting does nothing - the list API ignores sortBy / sortDir, the order never changes',
  },
  'TC-LT-TBL-003': {
    ...base, story: 'Tabs', severity: 'critical', tags: ['Regression', 'Filtering'],
    tms: 'TC-LT-TBL-003',
    description: '"Active" tab shows ACTIVE lottery types and hides DISABLED ones',
    preconditions: 'One ACTIVE and one DISABLED lottery type created by the test exist',
    steps: ['Click the "Active" tab'],
    expectedResult: 'ACTIVE record shown; DISABLED record hidden',
    actualResult: 'The Active / Deleted tabs do nothing - the list API ignores the view, every record stays listed',
  },
  'TC-LT-TBL-004': {
    ...base, story: 'Tabs', severity: 'normal', tags: ['Regression', 'Filtering'],
    tms: 'TC-LT-TBL-004',
    description: '"Deleted" tab does not list lottery types that are not deleted',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Click the "Deleted" tab', 'Click the "All" tab'],
    expectedResult: 'Record hidden under Deleted; listed again under All',
    actualResult: 'The Active / Deleted tabs do nothing - the list API ignores the view, every record stays listed',
  },
  'TC-LT-TBL-005': {
    ...base, story: 'Pagination', severity: 'minor', tags: ['Regression', 'UI'],
    tms: 'TC-LT-TBL-005',
    description: 'Page information "Page X of Y" is shown with X <= Y',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Read the page information under the table'],
    expectedResult: 'Text "Page X of Y" with 1 <= X <= Y',
  },
};
