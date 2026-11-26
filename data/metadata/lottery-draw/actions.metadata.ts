import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C, DRAW_STEP as S } from './base';

/** Metadata for tests/e2e/lottery-draw/lottery_draw_actions.spec.ts - plain-language, see base.ts. */
export const LotteryDrawActionsMetadata = drawCases('Row Actions', {
  'TC-LD-ACT-001': {
    story: 'Quick Settings', severity: 'normal', tags: ['Regression'],
    description: '"Quick Settings" shows the ticket figures of the draw\nWhy: admins check ticket stock here.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.WAIT_TICKETS, 'Row "..." menu > "Quick Settings"', 'Wait until "Processing..." changes to "Refresh"', 'Read the figures'],
    expectedResult: '- Total 100, Returnable 100, In Cart 0, Non Returnable (Wasted) 0, Sold 0, Subscription Ticket 0\n'
      + '- "Set Retain Ticket Count" and "Update" are greyed out',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-002': {
    story: 'Quick Settings', severity: 'minor', tags: ['Regression'],
    description: 'Escape closes "Quick Settings" without changing anything\nWhy: looking must never change the draw.',
    preconditions: `${P.OWN_DRAW}\n- "Quick Settings" is open for the test's draw`,
    testData: D.WITH_TICKETS,
    steps: ['Press Escape', 'Look at the draw\'s row'],
    expectedResult: '- The window closes\n- Nothing is saved; the row is unchanged',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-003': {
    story: 'Add Tickets', severity: 'normal', tags: ['Regression'],
    description: '"Add Tickets" opens the upload window for that draw\nWhy: extra tickets are added to an existing draw here.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: ['Row "..." menu > "Add Tickets"', 'Read the window'],
    expectedResult: '- A window "Upload Files" shows "Brand: Mahajana Sampatha" and "Draw: <Draw Number>"\n- It has "Browse files", "Cancel" and "Add"',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-004': {
    story: 'Add Tickets', severity: 'minor', tags: ['Regression'],
    description: 'Clicking "Add" without a file shows a message and keeps the window open\nWhy: the user must be able to choose a file and try again.',
    preconditions: `${P.OWN_DRAW}\n- The "Add Tickets" window is open for the test's draw`,
    testData: '- No file chosen',
    steps: ['Click "Add" without choosing a file'],
    expectedResult: '- The message "No DB files selected." is shown\n- The window stays open',
    actualResult: 'The message appears, but the window closes.',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-005': {
    story: 'Add Tickets', severity: 'normal', tags: ['Regression'],
    description: 'Adding a second ticket file raises the draw\'s total tickets\nWhy: extra tickets must become part of the draw.',
    preconditions: P.OWN_DRAW,
    testData: '- A second ticket file continuing the numbers (<draw number>101 to <draw number>200) and its MD5 checksum',
    steps: ['Row "..." menu > "Add Tickets"', 'Choose the second file and click "Add"', 'Wait about a minute', S.OPEN_PAGE + ' and read "Total Tickets" and the "Logs" table'],
    expectedResult: '- Total Tickets 200\n- A second upload row with status "Completed"',
    actualResult: 'The file is only stored - no ticket upload is started: no new "Logs" row, and Total Tickets stays 100.',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-006': {
    story: 'Hold Draw', severity: 'critical', tags: ['Regression'],
    description: '"Hold Draw" pauses a draw and "Activate Draw" resumes it\nWhy: admins must be able to pause a draw when something is wrong.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [
      'Row "..." menu > "Hold Draw"',
      'Check the status on the "All" tab, then find the draw under the "On Hold" tab',
      S.MENU + ' and read the items',
      'Click "Activate Draw"',
      'Check the status on the "All" tab, then find the draw under the "Under Review" tab',
    ],
    expectedResult: '- After "Hold Draw" the draw is listed under "On Hold"\n'
      + '- Its menu shows "View", "Edit", "Add Tickets", "Quick Settings", "Activate Draw", "Remove Draw"\n'
      + '- After "Activate Draw" the status is "Under Review" again and it is listed under "Under Review"',
    postconditions: C.REJECTED,
  },
  'TC-LD-ACT-007': {
    story: 'Hold Draw', severity: 'normal', tags: ['Regression'],
    description: '"Remove Draw" on a held draw moves it to the "Deleted" tab\nWhy: removed draws must stay visible for history.',
    preconditions: `${P.OWN_DRAW}\n- The draw has been put "On Hold"`,
    testData: D.WITH_TICKETS,
    steps: ['Row "..." menu > "Remove Draw"', 'Type the Draw Code in the question and click "Remove Draw"', 'Check the "All" tab, then click the "Deleted" tab and search the Draw Code'],
    expectedResult: '- The draw is listed under "Deleted" and no longer under "On Hold"',
    actualResult: 'The removal works, but the draw disappears from EVERY tab - the "Deleted" tab shows no rows at all.',
    postconditions: 'The test\'s draw is removed',
  },
  'TC-LD-ACT-008': {
    story: 'Process Logs', severity: 'normal', tags: ['Regression'],
    description: '"Process Logs" lists the background jobs (such as ticket uploads)\nWhy: admins check here whether background work finished or failed.',
    steps: ['Click "Process Logs"', 'Read the window'],
    expectedResult: '- A window "Process Logs" shows "<n> total jobs - Page 1 of <m>"\n'
      + '- Columns: ID, Draw Number, Brand Name, Progress Label, Progress, Error, Status, Requested By, Created At, Process End At',
  },
  'TC-LD-ACT-009': {
    story: 'Process Logs', severity: 'minor', tags: ['Regression'],
    description: 'The "Process Logs" window has pages and closes with Escape\nWhy: there are many jobs to look through.',
    preconditions: `${P.LIST}\n- The "Process Logs" window is open`,
    steps: ['Go to page 2', 'Press Escape'],
    expectedResult: '- "Page 2 of <m>" with other rows is shown\n- Escape closes the window',
  },
  'TC-LD-ACT-010': {
    story: 'Row Scoping', severity: 'critical', tags: ['Regression'],
    description: 'An action changes only the draw whose row was used\nWhy: one click must never affect another draw.',
    preconditions: `${P.LIST}\n- The test has created two of its own draws (both "Under Review")`,
    testData: '- Draw 1 and draw 2 (both created by the test)',
    steps: ['Row "..." menu of draw 1 > "Reject Draw"', 'Check both draws on the "All" tab'],
    expectedResult: '- Draw 1 is "Rejected"\n- Draw 2 is still "Under Review"',
    postconditions: C.REJECTED,
  },
});
