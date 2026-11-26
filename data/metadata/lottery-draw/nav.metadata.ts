import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C, DRAW_STEP as S } from './base';

/** Metadata for tests/e2e/lottery-draw/lottery_draw_nav.spec.ts - plain-language, see base.ts. */
export const LotteryDrawNavMetadata = drawCases('Navigation & Display', {
  'TC-LD-NAV-001': {
    story: 'Sidebar Navigation', severity: 'blocker', tags: ['Smoke', 'Regression', 'Navigation'],
    description: 'The left menu opens the Lottery Draws page\nWhy: this is how admins reach the draws.',
    preconditions: '- Logged in to the BigWin admin portal (dev) as admin\n- The dashboard (Home) is open',
    steps: ['In the left menu click "Lottery Draws" to open it', 'Click "Draws"', 'Look at the heading, the browser tab title and the address'],
    expectedResult: '- The heading "Lottery Draws" and the draw table are shown\n- The browser tab title is "Draw: List | BigWin"\n- The address ends with /dashboard/draw',
  },
  'TC-LD-NAV-002': {
    story: 'Table Structure', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'The draw list shows all its standard columns\nWhy: admins need these details of every draw at a glance.',
    steps: ['Look at the column headings of the table'],
    expectedResult: '- The columns "Draw Code", "Lottery Name", "Draw Number", "Status", "Type", "Start Date", "Cut Off Date", "Draw Date", '
      + '"Ticket Count", "Bought Count" and "Remaining Count" are shown',
  },
  'TC-LD-NAV-003': {
    story: 'Page Controls', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'The page shows its buttons and the 11 status tabs, starting on "All"\nWhy: admins use the tabs to find draws in each stage.',
    steps: ['Look for "Create Draw", "Process Logs" and the "Search..." box', 'Look at the tabs and which one is selected'],
    expectedResult: '- "Create Draw", "Process Logs" and a "Search..." box are shown\n'
      + '- Tabs: All, Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed, Winning Uploaded, On Hold, Rejected, Deleted\n- "All" is selected',
  },
  'TC-LD-NAV-004': {
    story: 'Draw View Page', severity: 'critical', tags: ['Regression'],
    description: 'The draw page shows every value that was saved for the draw\nWhy: admins check a draw on this page before approving it.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, S.OPEN_PAGE, 'Compare every value on the page with the values used to create the draw'],
    expectedResult: '- The heading is "<Draw Code> | Mahajana Sampatha"\n'
      + '- Lottery Name, Draw Number, Draw Code, Ticket Issue Start, Cutoff, Draw Date (shown as YYYY.MM.DD hh:mm AM/PM) and Mega Prize match what was entered',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-005': {
    story: 'Row Actions', severity: 'critical', tags: ['Regression', 'UI'],
    description: 'A draw waiting for review offers "Review Draw" but not "Approve Draw"\nWhy: a draw must be reviewed before it can be approved.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, S.MENU, 'Look at the menu items'],
    expectedResult: '- The menu shows "View", "Add Tickets", "Quick Settings", "Reject Draw", "Review Draw" and "Hold Draw"\n- "Approve Draw" is NOT offered',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-006': {
    story: 'Row Actions', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'A reviewed draw offers "Approve Draw" and "Reject" but not "Review Draw"\nWhy: after review, the next step is approval (or sending it back).',
    preconditions: P.OWN_PENDING,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, 'Check the status is "Pending Approval" (on the "All" tab and the "Pending Approval" tab)', S.MENU, 'Look at the menu items'],
    expectedResult: '- The menu shows "View", "Add Tickets", "Quick Settings", "Reject", "Approve Draw" and "Hold Draw"\n- "Review Draw" is NOT offered',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-007': {
    story: 'Draw View Page', severity: 'normal', tags: ['Regression'],
    description: '"View" in the row menu and the Draw Code link open the same draw page\nWhy: both ways must lead to the same information.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, 'Row "..." menu > "View"; note the page heading', 'Go back to the list', S.OPEN_PAGE],
    expectedResult: '- Both open the same draw page with the heading "<Draw Code> | Mahajana Sampatha"',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-008': {
    story: 'Draw View Page', severity: 'normal', tags: ['Regression'],
    description: '"Back" and the browser Back button return to the draw list\nWhy: easy way back after looking at a draw.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, S.OPEN_PAGE, 'Click "Back" on the page', 'Open the draw page again and press the browser Back button'],
    expectedResult: '- Both return to the Lottery Draws list (heading and table shown)',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-009': {
    story: 'Create Draw Entry', severity: 'normal', tags: ['Regression'],
    description: '"Create Draw" opens the draw creation form\nWhy: this is how new draws are created.',
    steps: ['Click "Create Draw"', 'Look at the page'],
    expectedResult: '- The browser tab title is "Create Draw | BigWin"\n- Step 1 "Details" of the form is shown',
  },
  'TC-LD-NAV-010': {
    story: 'Page Title', severity: 'minor', tags: ['Regression'],
    description: 'The draw page has a proper BigWin browser tab title\nWhy: users with many tabs open need to recognise the page.',
    preconditions: P.OWN_DRAW,
    testData: D.WITH_TICKETS,
    steps: [S.FIND, S.OPEN_PAGE, 'Read the browser tab title'],
    expectedResult: '- The title contains "BigWin" (e.g. "Draw: View | BigWin")',
    actualResult: 'The title is "Foundation: Blank Page | Carpatin" - text left over from a page template.',
    postconditions: C.REJECTED,
  },
});
