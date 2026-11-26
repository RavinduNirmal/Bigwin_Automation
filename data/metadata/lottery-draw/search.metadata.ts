import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C } from './base';

/** Metadata for tests/e2e/lottery-draw/lottery_draw_search.spec.ts - plain-language, see base.ts. */
const SEARCH = (text: string) => `Type ${text} in the "Search..." box and press Enter`;

export const LotteryDrawSearchMetadata = drawCases('Draw Search', {
  'TC-LD-SRCH-001': {
    story: 'Search By Code', severity: 'critical', tags: ['Smoke', 'Regression', 'Search'],
    description: 'Searching a full Draw Code finds exactly that draw\nWhy: admins find a draw by its code.',
    preconditions: P.OWN_DRAW,
    testData: `${D.WITH_TICKETS}\n- Search text: the full Draw Code`,
    steps: [SEARCH('the Draw Code'), 'Look at the rows and the browser address'],
    expectedResult: '- Exactly one row is listed - the test\'s draw\n- The address ends with ?query=<Draw Code> (the search can be shared as a link)',
    postconditions: C.REJECTED,
  },
  'TC-LD-SRCH-002': {
    story: 'Search By Number', severity: 'critical', tags: ['Regression', 'Search'],
    description: 'Searching the Draw Number finds the draw\nWhy: the number printed on tickets is often what people quote.',
    preconditions: P.OWN_DRAW,
    testData: `${D.WITH_TICKETS}\n- Search text: the 10-digit Draw Number`,
    steps: [SEARCH('the Draw Number')],
    expectedResult: '- The test\'s draw (code "AT<draw number>") is listed',
    postconditions: C.REJECTED,
  },
  'TC-LD-SRCH-003': {
    story: 'Matching Rules', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Search ignores upper / lower case and finds part of a code\nWhy: users should not need the exact spelling.',
    preconditions: P.OWN_DRAW,
    testData: '- Search 1: the Draw Code in lower case (e.g. "at9123456789")\n- Search 2: the first 7 characters of the Draw Code',
    steps: [SEARCH('the Draw Code in lower case'), SEARCH('the first 7 characters of the Draw Code')],
    expectedResult: '- The test\'s draw is found both times (other draws may also match the short text)',
    postconditions: C.REJECTED,
  },
  'TC-LD-SRCH-004': {
    story: 'Search By Brand', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Searching a brand name lists only that brand\'s draws\nWhy: admins often look at all draws of one brand.',
    testData: '- Search text: "Mahajana"',
    steps: [SEARCH('"Mahajana"'), 'Read the Lottery Name of every row'],
    expectedResult: '- At least one row is listed\n- Every Lottery Name contains "Mahajana"',
  },
  'TC-LD-SRCH-005': {
    story: 'Empty State', severity: 'minor', tags: ['Regression', 'Search'],
    description: 'A search that matches nothing says so clearly\nWhy: an empty table without a message looks like an error.',
    testData: '- Search text: "ZZZNOPE123" (matches nothing)',
    steps: [SEARCH('"ZZZNOPE123"'), 'Look at the table'],
    expectedResult: '- No rows and a "No results" / "No data" message',
    actualResult: 'Only the column headings are shown - no message and no page information.',
  },
  'TC-LD-SRCH-006': {
    story: 'Clear Search', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Clearing the search shows the full list again\nWhy: the user must be able to go back to all draws.',
    testData: '- Search text: any Draw Code, then cleared',
    steps: [SEARCH('a Draw Code'), 'Click the clear (x) button in the search box', 'Look at the list'],
    expectedResult: '- The search box is empty\n- The full list is back (10 rows on the page)',
  },
  'TC-LD-SRCH-007': {
    story: 'Search Within Tab', severity: 'normal', tags: ['Regression', 'Search'],
    description: 'Searching inside a tab only searches draws of that stage\nWhy: tabs and search together narrow the list.',
    preconditions: P.OWN_DRAW,
    testData: '- Search text: the Draw Code of the test\'s draw (status "Under Review")',
    steps: ['Click the "Rejected" tab and search the Draw Code', 'Click the "Under Review" tab and search the Draw Code'],
    expectedResult: '- Under "Rejected" the draw is NOT found\n- Under "Under Review" it IS found',
    postconditions: C.REJECTED,
  },
  'TC-LD-SRCH-008': {
    story: 'Input Safety', severity: 'normal', tags: ['Regression', 'Search', 'Security'],
    description: 'Web-page code, database commands and "%" in the search are harmless\nWhy: search text must never run as code, break the page or match everything.',
    testData: '- Search 1: <img src=x onerror=alert(1)>\n- Search 2: \' OR 1=1 --\n- Search 3: %',
    steps: [SEARCH('each value in turn'), 'Watch for pop-ups or errors and look at the rows'],
    expectedResult: '- No pop-up, no error\n- None of the three values matches any draw ("%" is just a character)',
    actualResult: '"%" works like a "match everything" wildcard - every draw is listed.',
  },
  'TC-LD-SRCH-009': {
    story: 'Whitespace', severity: 'minor', tags: ['Regression', 'Search'],
    description: 'Spaces before or after the search text are ignored\nWhy: copied text often has extra spaces.',
    preconditions: P.OWN_DRAW,
    testData: '- Search text: "  <Draw Code>  " (with spaces around it)',
    steps: [SEARCH('the Draw Code with two spaces before and after it')],
    expectedResult: '- The test\'s draw is found',
    actualResult: 'Nothing is found - the spaces are not removed.',
    postconditions: C.REJECTED,
  },
});
