import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_POST } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_search.spec.ts - plain-language, see base.ts. */
const SEARCH_BROKEN = 'Search does nothing: the list does not change and every lottery type stays listed (the search text is not used).';

export const LotteryTypeSearchMetadata: TestMetadataCollection = ltCases('Search Lottery Types', {
  'TC-LT-SRCH-001': {
    story: 'Search by Code', severity: 'critical', tags: ['Smoke', 'Regression', 'Search'],
    description: 'Searching a Code shows only that lottery type\nWhy: admins find a lottery type by its Code.',
    preconditions: LT_PRE.TWO,
    testData: '- Lottery type A and lottery type B (both created by the test)\n- Search text: the full Code of A',
    steps: [
      'Type the Code of A in the "Search..." box and press Enter',
      'Look at the rows',
    ],
    expectedResult: '- A is listed\n- B is NOT listed',
    actualResult: SEARCH_BROKEN,
  },
  'TC-LT-SRCH-002': {
    story: 'Search by Type', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Searching part of a Type name shows every lottery type with that text\nWhy: admins may only remember part of a name.',
    preconditions: `${LT_PRE.PAGE}\n- The test has created two lottery types whose Type contains the same word, and one that does not`,
    testData: '- Type A: "Tag<number> Item 1", Type B: "Tag<number> Item 2" (shared word "Tag<number>")\n- Type C: "Auto Type <number>" (without the word)\n- Search text: "Tag<number>"',
    steps: [
      'Type the shared word in the "Search..." box and press Enter',
      'Look at the rows',
    ],
    expectedResult: '- A and B are listed\n- C is NOT listed',
    actualResult: SEARCH_BROKEN,
  },
  'TC-LT-SRCH-003': {
    story: 'Search by Code', severity: 'minor', tags: ['Regression', 'Search'],
    description: 'Search ignores upper / lower case\nWhy: users should not have to remember how a Code was capitalised.',
    preconditions: LT_PRE.TWO,
    testData: '- Search text: the Code of A in lower case (e.g. "at12345678901")',
    steps: [
      'Type the Code of A in lower case in "Search..." and press Enter',
      'Look at the rows',
    ],
    expectedResult: '- A is listed\n- B is NOT listed',
    actualResult: SEARCH_BROKEN,
  },
  'TC-LT-SRCH-004': {
    story: 'No Results', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Searching text that no lottery type contains shows an empty list\nWhy: the user must see clearly that nothing matched.',
    preconditions: LT_PRE.PAGE,
    testData: '- Search text: "NoMatchAT<unique number>" (matches no lottery type)',
    steps: [
      'Type the search text in "Search..." and press Enter',
      'Look at the rows',
    ],
    expectedResult: '- No rows are listed',
    actualResult: 'Every lottery type is still listed - a search that matches nothing does not empty the list.',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-SRCH-005': {
    story: 'Clear Search', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Clearing the search box shows all lottery types again\nWhy: the user must be able to go back to the full list.',
    preconditions: LT_PRE.TWO,
    testData: '- Search text: the Code of A, then an empty box',
    steps: [
      'Search the Code of A (type it in "Search..." and press Enter)',
      'Delete the text in the search box and press Enter',
      'Look at the rows',
    ],
    expectedResult: '- A and B are both listed again',
  },
});
