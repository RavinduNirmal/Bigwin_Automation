import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C } from './base';

/** Allure metadata for tests/e2e/lottery-draw/lottery_draw_nav.spec.ts (plan section 1). */
export const LotteryDrawNavMetadata = drawCases('Navigation & Display', {
  'TC-LD-NAV-001': {
    story: 'Sidebar Navigation', severity: 'blocker', tags: ['Smoke', 'Regression', 'Navigation'],
    description: 'The admin reaches the Lottery Draws list from the sidebar',
    preconditions: 'Logged in as admin; on the dashboard',
    steps: ['Expand sidebar "Lottery Draws"', 'Click "Draws"'],
    expectedResult: 'URL ends with /dashboard/draw; title "Draw: List | BigWin"; heading "Lottery Draws" and the draw table are visible',
  },
  'TC-LD-NAV-002': {
    story: 'Table Structure', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'The draw table shows all of its default columns',
    steps: ['Open the Draws list', 'Read the column headers'],
    expectedResult: 'Draw Code, Lottery Name, Draw Number, Status, Type, Start Date, Cut Off Date, Draw Date, Ticket Count, Bought Count, Remaining Count are visible',
  },
  'TC-LD-NAV-003': {
    story: 'Page Controls', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'Toolbar controls and the 11 stage tabs are shown, with All selected',
    steps: ['Open the Draws list', 'Inspect toolbar and tabs'],
    expectedResult: 'Create Draw, Process Logs, an editable "Search..." box; tabs All, Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed, Winning Uploaded, On Hold, Rejected, Deleted; "All" is selected',
  },
  'TC-LD-NAV-004': {
    story: 'Draw View Page', severity: 'critical', tags: ['Regression'],
    description: 'The Draw Code link opens the draw page showing every saved value',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Search the own draw code', 'Click its Draw Code link', 'Compare every field with the created data'],
    expectedResult: 'URL edit-lottery-draw?drawId=<id>; heading "<code> | Mahajana Sampatha"; Lottery Name, Draw Number, Draw Code, Issue Start/Cutoff, Draw Date ("YYYY.MM.DD hh:mm AM/PM") and Mega Prize match',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-005': {
    story: 'Row Actions', severity: 'critical', tags: ['Regression', 'UI'],
    description: 'The row menu of an Under Review draw offers Review Draw but not Approve Draw',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Search the own draw', 'Open its row menu'],
    expectedResult: 'Menu items View, Add Tickets, Quick Settings, Reject Draw, Review Draw, Hold Draw; "Approve Draw" is not offered',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-006': {
    story: 'Row Actions', severity: 'normal', tags: ['Regression', 'UI', 'Approval'],
    description: 'The row menu of a Pending Approval draw offers Reject and Approve Draw but not Review Draw',
    preconditions: P.OWN_PENDING, testData: D.WITH_TICKETS,
    steps: ['Create the own draw and review it (status confirmed on the All and Pending Approval tabs)', 'Open its row menu'],
    expectedResult: 'Menu items View, Add Tickets, Quick Settings, Reject, Approve Draw, Hold Draw; "Review Draw" is not offered',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-007': {
    story: 'Draw View Page', severity: 'normal', tags: ['Regression', 'Navigation'],
    description: 'Row menu "View" and the Draw Code link open the same draw page',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Row menu > View', 'Note URL and heading', 'Go back to the list', 'Click the Draw Code link'],
    expectedResult: 'Both routes open edit-lottery-draw?drawId=<id> with heading "<code> | Mahajana Sampatha"',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-008': {
    story: 'Draw View Page', severity: 'normal', tags: ['Regression', 'Navigation'],
    description: 'The Back link and the browser Back button return to the Draws list',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Open the own draw page', 'Click "Back"', 'Open the draw page again', 'Press the browser Back button'],
    expectedResult: 'Both return to the Lottery Draws list with heading and table visible',
    postconditions: C.REJECTED,
  },
  'TC-LD-NAV-009': {
    story: 'Create Draw Entry', severity: 'normal', tags: ['Regression', 'Navigation'],
    description: 'The Create Draw button opens the Create Draw wizard',
    steps: ['Click "Create Draw"'],
    expectedResult: 'URL /dashboard/draw/create-draw; title "Create Draw | BigWin"; Step 1 "Details" form is shown',
  },
  'TC-LD-NAV-010': {
    story: 'Page Title', severity: 'minor', tags: ['Regression', 'UI'],
    description: 'The draw page has a meaningful BigWin browser title',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Open the own draw page', 'Read the browser tab title'],
    expectedResult: 'Title contains "BigWin" (e.g. "Draw: View | BigWin")',
    actualResult: 'Title is "Foundation: Blank Page | Carpatin" (template leftover)',
    postconditions: C.REJECTED,
  },
});
