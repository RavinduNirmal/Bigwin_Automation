import { drawCases, DRAW_PRECONDITION as P } from './base';

/** Allure metadata for tests/e2e/lottery-draw/lottery_draw_security.spec.ts (plan section 11). */
export const LotteryDrawSecurityMetadata = drawCases('Draw Security', {
  'TC-LD-SEC-001': {
    story: 'Route Protection', severity: 'blocker', tags: ['Regression', 'Security'],
    description: 'Logged-out users cannot open the Draws list or Create Draw',
    preconditions: P.LOGGED_OUT, testData: '/dashboard/draw, /dashboard/draw/create-draw',
    steps: ['Open /dashboard/draw', 'Open /dashboard/draw/create-draw'],
    expectedResult: 'Redirected to the login page; no draw data is shown',
  },
  'TC-LD-SEC-002': {
    story: 'Route Protection', severity: 'critical', tags: ['Regression', 'Security'],
    description: 'A logged-out user opening a draw page URL sees no draw data',
    preconditions: P.LOGGED_OUT, testData: '/dashboard/draw/edit-lottery-draw?drawId=<an existing draw id>',
    steps: ['Open the draw page URL'],
    expectedResult: 'Login page; the draw details are never rendered',
  },
  'TC-LD-SEC-003': {
    story: 'Unknown Draw', severity: 'normal', tags: ['Regression', 'Security', 'UX'],
    description: 'A non-existent drawId shows a clear not-found state',
    testData: 'drawId=99999999',
    steps: ['Open edit-lottery-draw?drawId=99999999'],
    expectedResult: 'A "not found" message or a redirect to the list',
    actualResult: 'Neither a not-found message nor a redirect - the draw page is shown without data',
  },
  'TC-LD-SEC-004': {
    story: 'XSS', severity: 'critical', tags: ['Regression', 'Security'],
    description: 'HTML in the search text (box or URL) is not rendered or executed',
    testData: '<img src=x onerror=alert(1)>',
    steps: ['Search the value', 'Open /dashboard/draw?query=<value>'],
    expectedResult: 'No alert dialog; no injected <img>; no rows',
  },
  'TC-LD-SEC-005': {
    story: 'Role-based Access', severity: 'normal', tags: ['Regression', 'Security'],
    description: 'A limited-role user cannot review, approve, reject or hold draws',
    preconditions: 'A limited-role account (not available on dev yet)',
    steps: ['Log in as the limited user', 'Open the Draws list and a row menu'],
    expectedResult: 'Maker-checker actions are hidden or refused (403) according to the role',
  },
});
