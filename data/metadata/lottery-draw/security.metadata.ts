import { drawCases, DRAW_PRECONDITION as P } from './base';

/** Metadata for tests/e2e/lottery-draw/lottery_draw_security.spec.ts - plain-language, see base.ts. */
export const LotteryDrawSecurityMetadata = drawCases('Draw Security', {
  'TC-LD-SEC-001': {
    story: 'Route Protection', severity: 'blocker', tags: ['Regression', 'Security'],
    description: 'Someone who is not logged in cannot open the draw pages\nWhy: draw data must only be visible after logging in.',
    preconditions: P.LOGGED_OUT,
    testData: '- Addresses: <portal>/dashboard/draw and <portal>/dashboard/draw/create-draw',
    steps: ['Without logging in, open the Draws list address', 'Open the Create Draw address'],
    expectedResult: '- Both times the login page is shown instead\n- No draw data is shown',
  },
  'TC-LD-SEC-002': {
    story: 'Route Protection', severity: 'critical', tags: ['Regression', 'Security'],
    description: 'Someone who is not logged in cannot see a draw by opening its page address\nWhy: a shared or remembered link must not reveal draw details.',
    preconditions: P.LOGGED_OUT,
    testData: '- Address of an existing draw page: <portal>/dashboard/draw/edit-lottery-draw?drawId=<id>',
    steps: ['Without logging in, open the draw page address'],
    expectedResult: '- The login page is shown\n- The draw details are never shown',
  },
  'TC-LD-SEC-003': {
    story: 'Unknown Draw', severity: 'normal', tags: ['Regression'],
    description: 'Opening a draw that does not exist shows a clear message\nWhy: a broken link must not show a confusing empty page.',
    testData: '- Address: <portal>/dashboard/draw/edit-lottery-draw?drawId=99999999 (no draw has this id)',
    steps: ['Open the address', 'Look at the page'],
    expectedResult: '- A "draw not found" message is shown, or you are sent back to the list',
    actualResult: 'Neither - the draw page opens with no data and no message.',
  },
  'TC-LD-SEC-004': {
    story: 'XSS', severity: 'critical', tags: ['Regression', 'Security'],
    description: 'Web-page code typed in the search (box or address) never runs\nWhy: a malicious link must not run code in an admin\'s browser.',
    testData: '- Search text: <img src=x onerror=alert(1)>',
    steps: ['Type the text in "Search..." and press Enter', 'Open <portal>/dashboard/draw?query=<the same text>'],
    expectedResult: '- No pop-up appears and no image is inserted\n- No rows are listed',
  },
  'TC-LD-SEC-005': {
    story: 'Role-based Access', severity: 'normal', tags: ['Regression', 'Security'],
    description: 'A user with limited rights cannot review, approve, reject or hold draws\nWhy: approvals must be limited to the right people.',
    preconditions: '- A user account with limited rights (not available on dev yet - test is waiting for this account)',
    steps: ['Log in as the limited user', 'Open the Lottery Draws list and a row "..." menu'],
    expectedResult: '- "Review Draw", "Approve Draw", "Reject" and "Hold Draw" are hidden, or refused when used',
  },
});
