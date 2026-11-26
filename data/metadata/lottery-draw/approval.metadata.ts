import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C, DRAW_STEP as S } from './base';

/**
 * Metadata for tests/e2e/lottery-draw/lottery_draw_approval.spec.ts - plain-language, see base.ts.
 * Approval ("maker-checker"): "Under Review" -> Review Draw -> "Pending Approval" -> Approve Draw (needs the ticket
 * file's MD5 checksum) -> "Approved". "Reject Draw" ends an Under Review draw; "Reject" sends a Pending one back.
 */
const CHECK_TAB = (status: string, tab: string) => `Check the status on the "All" tab is "${status}", then click the "${tab}" tab and find the draw there`;

export const LotteryDrawApprovalMetadata = drawCases('Draw Approval', {
  'TC-LD-APR-001': {
    story: 'Initial Stage', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'A new draw waits for review and cannot be approved straight away\nWhy: every draw must be checked by a reviewer first.',
    preconditions: P.LIST,
    testData: D.WITH_TICKETS,
    steps: [S.CREATE, CHECK_TAB('Under Review', 'Under Review'), S.MENU],
    expectedResult: '- Status "Under Review" and listed under the "Under Review" tab\n- The menu offers "Review Draw" but NOT "Approve Draw"',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-002': {
    story: 'Review', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval'],
    description: '"Review Draw" moves the draw on to "Pending Approval"\nWhy: review is the first of the two checks.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.WAIT_TICKETS, S.REVIEW, CHECK_TAB('Pending Approval', 'Pending Approval'), 'Check it is no longer under "Under Review"', S.MENU],
    expectedResult: '- Status "Pending Approval" and listed under that tab (no longer under "Under Review")\n- The menu now offers "Approve Draw" but NOT "Review Draw"',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-003': {
    story: 'Approve', severity: 'critical', tags: ['Regression', 'Approval', 'Validation'],
    description: 'Approving a draw requires the ticket file\'s MD5 checksum\nWhy: the approver confirms the exact ticket file that will be sold.',
    preconditions: P.OWN_PENDING,
    testData: '- The MD5 checksum of the draw\'s ticket file',
    steps: ['Row "..." menu > "Approve Draw"', 'Look at the window and its "Approve Draw" button', 'Type the MD5 checksum and look at the button again', 'Close the window without approving'],
    expectedResult: '- A window "Approve Draw" with the box "Enter MD5 Checksum *" opens\n- Its "Approve Draw" button can only be clicked once a checksum is typed',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-004': {
    story: 'Approve', severity: 'critical', tags: ['Regression', 'Approval', 'Security'],
    description: 'A wrong checksum at approval is refused\nWhy: approval must prove the right ticket file is used.',
    preconditions: P.OWN_PENDING,
    testData: '- The draw\'s MD5 checksum with the FIRST character changed (wrong)',
    steps: ['Row "..." menu > "Approve Draw"', 'Type the wrong checksum and click "Approve Draw"', CHECK_TAB('Pending Approval', 'Pending Approval')],
    expectedResult: '- The approval is refused ("Invalid MD5 checksum")\n- The draw stays "Pending Approval" (All tab and Pending Approval tab)',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-005': {
    story: 'Approve', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval'],
    description: 'Approving with the correct checksum makes the draw Approved\nWhy: only approved draws go on sale at their start time.',
    preconditions: P.OWN_PENDING,
    testData: '- The exact MD5 checksum of the draw\'s ticket file',
    steps: [S.APPROVE, CHECK_TAB('Approved', 'Approved')],
    expectedResult: '- Status "Approved" and listed under the "Approved" tab (its start date is still in the future)\n- No longer under "Pending Approval"',
    postconditions: C.APPROVED_LEFT,
  },
  'TC-LD-APR-006': {
    story: 'Reject', severity: 'critical', tags: ['Regression', 'Approval'],
    description: '"Reject Draw" rejects a draw that is waiting for review\nWhy: a wrong draw must be stopped before it is approved.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: ['Row "..." menu > "Reject Draw"', CHECK_TAB('Rejected', 'Rejected')],
    expectedResult: '- Status "Rejected" and listed under the "Rejected" tab\n- No longer under "Under Review"',
    postconditions: 'The test\'s draw ends "Rejected"',
  },
  'TC-LD-APR-007': {
    story: 'Reject', severity: 'critical', tags: ['Regression', 'Approval'],
    description: '"Reject" on a reviewed draw sends it back to "Under Review"\nWhy: the approver can return a draw for correction.',
    preconditions: P.OWN_PENDING,
    testData: D.WITH_TICKETS,
    steps: ['Row "..." menu > "Reject"', CHECK_TAB('Under Review', 'Under Review'), S.MENU],
    expectedResult: '- No question is asked\n- Status "Under Review" and listed under that tab\n- "Review Draw" is offered again',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-008': {
    story: 'Audit Log', severity: 'minor', tags: ['Regression', 'Approval'],
    description: 'Sending a reviewed draw back is described correctly in the history\nWhy: the history must tell what really happened.',
    preconditions: `${P.OWN_PENDING}\n- It was then sent back with "Reject" (status "Under Review" again)`,
    testData: D.WITH_TICKETS,
    steps: [S.OPEN_PAGE, 'Read the newest rows of "Operation logs"'],
    expectedResult: '- A row describes that the draw was sent back for review (e.g. "Lottery draw sent back for review")',
    actualResult: 'The row reads "Lottery draw rejection is approved successfully for id : <id>" - it sounds as if a rejection was approved.',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-009': {
    story: 'Confirmation', severity: 'minor', tags: ['Regression', 'Approval'],
    description: '"Review Draw" and "Reject Draw" act at once, without an "Are you sure?" question\nWhy: records the current behaviour for the business (a confirmation may be wanted).',
    preconditions: `${P.LIST}\n- The test has created two of its own draws (status "Under Review", tickets loaded)`,
    testData: '- Draw 1 and draw 2 (both created by the test)',
    steps: ['Row "..." menu of draw 1 > "Review Draw"', 'Row "..." menu of draw 2 > "Reject Draw"', 'Watch for any question'],
    expectedResult: '- No question appears; each status changes immediately (to be confirmed by the business)',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-010': {
    story: 'Review', severity: 'critical', tags: ['Regression', 'Approval', 'Validation'],
    description: 'A draw cannot be reviewed until its tickets have loaded\nWhy: a draw without tickets must not move on.',
    preconditions: `${P.LIST}\n- The test created its own draw a moment ago (tickets still loading, Ticket Count 0)`,
    testData: D.WITH_TICKETS,
    steps: ['Immediately: row "..." menu > "Review Draw"', 'Check the status', S.WAIT_TICKETS, 'Row "..." menu > "Review Draw" again'],
    expectedResult: '- The first review is refused ("This draw has no tickets ...") and the status stays "Under Review"\n- After the tickets have loaded the review works ("Pending Approval")',
    postconditions: C.REJECTED,
  },
  'TC-LD-APR-011': {
    story: 'Row Actions', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'An approved draw cannot be reviewed, approved or rejected again\nWhy: approval is final.',
    preconditions: `${P.OWN_PENDING}\n- It has been approved (status "Approved", dates months ahead)`,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, S.MENU],
    expectedResult: '- The menu has no "Review Draw", "Approve Draw", "Reject Draw" or "Reject"',
    postconditions: C.APPROVED_LEFT,
  },
  'TC-LD-APR-012': {
    story: 'Audit Log', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'The draw\'s history records its creation, ticket upload and review\nWhy: every step must be traceable.',
    preconditions: P.OWN_PENDING,
    testData: D.WITH_TICKETS,
    steps: [S.OPEN_PAGE, 'Read the rows of "Operation logs"'],
    expectedResult: '- "Lottery draw created successfully with code: <Draw Code>"\n- "Successfully scheduled new tickets upload for draw id : <id>"\n'
      + '- A row saying the draw "is reviewed and moved to pending approval"',
    postconditions: C.REJECTED,
  },
});
