import { TestMetadataCollection } from '../../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_search.spec.ts */
const base = { epic: 'Lottery Management', feature: 'Search Lottery Types', owner: 'QA Team' } as const;

export const LotteryTypeSearchMetadata: TestMetadataCollection = {
  'TC-LT-SRCH-001': {
    ...base, story: 'Search by Code', severity: 'critical', tags: ['Smoke', 'Regression', 'Search'],
    tms: 'TC-LT-SRCH-001',
    description: 'Searching an exact Code shows that lottery type and hides the others',
    preconditions: 'Two lottery types created by the test exist',
    steps: ['Type the first record\'s Code in "Search..."', 'Press Enter'],
    expectedResult: 'First record shown; second hidden',
    actualResult: 'Search does nothing - the list API ignores the query, so every lottery type stays listed',
  },
  'TC-LT-SRCH-002': {
    ...base, story: 'Search by Type', severity: 'normal', tags: ['Regression', 'Search'],
    tms: 'TC-LT-SRCH-002',
    description: 'Searching text from the Type shows every matching lottery type',
    preconditions: 'Two tagged and one untagged lottery types created by the test exist',
    steps: ['Search the shared tag', 'Press Enter'],
    expectedResult: 'Both tagged records shown; untagged one hidden',
    actualResult: 'Search does nothing - the list API ignores the query, so every lottery type stays listed',
  },
  'TC-LT-SRCH-003': {
    ...base, story: 'Search by Code', severity: 'minor', tags: ['Regression', 'Search'],
    tms: 'TC-LT-SRCH-003',
    description: 'Search is case-insensitive',
    preconditions: 'Two lottery types created by the test exist',
    steps: ['Search the first Code in lower case'],
    expectedResult: 'First record shown; second hidden',
    actualResult: 'Search does nothing - the list API ignores the query, so every lottery type stays listed',
  },
  'TC-LT-SRCH-004': {
    ...base, story: 'No Results', severity: 'normal', tags: ['Regression', 'Search', 'Negative'],
    tms: 'TC-LT-SRCH-004',
    description: 'A term that matches nothing shows no rows',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Search a random term that no record contains'],
    expectedResult: 'No data rows are shown',
    actualResult: 'Search does nothing - a search that matches nothing still lists every lottery type',
  },
  'TC-LT-SRCH-005': {
    ...base, story: 'Clear Search', severity: 'normal', tags: ['Regression', 'Search'],
    tms: 'TC-LT-SRCH-005',
    description: 'Clearing the search shows all lottery types again',
    preconditions: 'Two lottery types created by the test exist',
    steps: ['Search the first Code', 'Clear the box and press Enter'],
    expectedResult: 'Both records listed again',
  },
};
