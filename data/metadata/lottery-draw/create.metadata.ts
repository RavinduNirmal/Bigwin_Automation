import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C, DRAW_STEP as S } from './base';

/**
 * Metadata for tests/e2e/lottery-draw/lottery_draw_create.spec.ts - plain-language, see base.ts.
 * Create Draw: Step 1 "Details" (brand, number, code, dates, Mega Prize) -> "Next" asks "Are you sure ..." ->
 * Step 2 "Upload Ticket List" (ticket file + its MD5 checksum) -> "Create Draw".
 */
const NEXT = 'Click "Next" and accept the "Are you sure you want to create ..." question';
const STEP2_FILE = 'On Step 2: "Select File" > choose the ticket file > "Add"';

export const LotteryDrawCreateMetadata = drawCases('Create Draw', {
  'TC-LD-CR-001': {
    story: 'Create Draw UI', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    description: 'Step 1 of Create Draw shows every box a draw needs\nWhy: all draw details are entered here.',
    preconditions: P.LIST,
    steps: ['Click "Create Draw"', 'Look at the boxes on Step 1 "Details" and their starting values'],
    expectedResult: '- Boxes: "Lottery Brand", "Draw Number" (starts at 0), "Draw Code", "Ticket Issue Start Date & Time", "Ticket Issue Cutoff Date & Time", '
      + '"Draw Date & Time" (date pickers) and "Mega Prize" (starts at 0)\n- A "Next" button',
  },
  'TC-LD-CR-002': {
    story: 'Required Fields', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'An empty Step 1 cannot go on\nWhy: a draw needs all its details.',
    preconditions: P.CREATE,
    testData: '- Every box left empty',
    steps: ['Click "Next" without entering anything'],
    expectedResult: '- The browser marks the first empty required box ("Please fill out this field.")\n- No "Are you sure ..." question; Step 2 is NOT shown',
  },
  'TC-LD-CR-003': {
    story: 'Step 2 Upload', severity: 'critical', tags: ['Regression'],
    description: '"Next" asks for confirmation and opens Step 2 for the entered draw\nWhy: the admin must confirm the details before uploading tickets.',
    preconditions: P.CREATE,
    testData: D.UNIQUE,
    steps: [S.FILL_STEP1, 'Click "Next"', 'Read the question, accept it and look at Step 2'],
    expectedResult: '- The question "Are you sure you want to create ..." is asked\n'
      + '- Step 2 shows "Draw Number: <number>" and "Brand Name: Mahajana Sampatha", the "Enter MD5 Checksum" box and "Create Draw"',
  },
  'TC-LD-CR-004': {
    story: 'Create Valid Draw', severity: 'blocker', tags: ['Smoke', 'Regression'],
    description: 'A new draw can be created with its ticket file\nWhy: creating a draw with tickets is the core job of the back office.',
    preconditions: P.LIST,
    testData: D.WITH_TICKETS,
    steps: [
      'Click "Create Draw"', S.FILL_STEP1, NEXT, STEP2_FILE,
      'Type the file\'s MD5 checksum in "Enter MD5 Checksum" and tick "Initiate Now"', 'Click "Create Draw"',
      `${S.FIND} on the "All" tab, then click the "Under Review" tab and find it again`,
    ],
    expectedResult: '- You are taken back to the Lottery Draws list\n'
      + '- The row shows the Draw Code, "Mahajana Sampatha", the Draw Number and Status "Under Review"\n- The draw is listed under the "Under Review" tab',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-005': {
    story: 'Ticket Upload', severity: 'critical', tags: ['Regression'],
    description: 'The tickets of a new draw are loaded in the background\nWhy: tickets must be available before the draw can be reviewed and sold.',
    preconditions: P.LIST,
    testData: D.WITH_TICKETS,
    steps: [S.CREATE, S.WAIT_TICKETS, S.OPEN_PAGE + ' and read "Total Tickets" and the "Logs" table', 'Back on the list, read Ticket / Bought / Remaining Count'],
    expectedResult: '- The draw page shows Total Tickets 100 and an upload row with status "Completed"\n- The list row shows Ticket Count 100, Bought Count 0, Remaining Count 100',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-006': {
    story: 'Upload Validation', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'A draw cannot be created without a ticket file\nWhy: a draw without tickets cannot be sold.',
    preconditions: P.STEP2,
    testData: '- An MD5 checksum is typed, but NO file is chosen',
    steps: ['Type an MD5 checksum', 'Click "Create Draw"', 'Search the list for the Draw Code'],
    expectedResult: '- The page stays on Step 2\n- No draw is created',
  },
  'TC-LD-CR-007': {
    story: 'Upload Validation', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'A draw cannot be created without the file\'s MD5 checksum\nWhy: the checksum proves the uploaded file is the right, untouched file.',
    preconditions: P.STEP2,
    testData: '- The ticket file is chosen, the MD5 box is left empty',
    steps: [STEP2_FILE, 'Leave "Enter MD5 Checksum" empty', 'Click "Create Draw"'],
    expectedResult: '- The page stays on Step 2\n- No draw is created',
  },
  'TC-LD-CR-008': {
    story: 'Upload Validation', severity: 'critical', tags: ['Regression', 'Validation', 'Security'],
    description: 'A wrong MD5 checksum is refused when creating a draw\nWhy: a file that does not match its checksum may be damaged or swapped.',
    preconditions: P.STEP2,
    testData: '- The real ticket file\n- Its MD5 checksum with the FIRST character changed (wrong checksum)',
    steps: [STEP2_FILE, 'Type the wrong MD5 checksum and tick "Initiate Now"', 'Click "Create Draw"', 'Look for the draw and its tickets'],
    expectedResult: '- The draw is not created, OR it is created with 0 tickets and no completed upload (the file is refused)',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-009': {
    story: 'Duplicate Draw', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'Two draws cannot have the same Draw Code\nWhy: the Draw Code identifies a draw.',
    preconditions: P.OWN_DRAW,
    testData: '- Second draw: a new Draw Number but the SAME Draw Code as the first',
    steps: [S.CREATE + ' (the first draw)', 'Create a second draw with a new Draw Number and the same Draw Code', 'Search the list for the Draw Code'],
    expectedResult: '- The second draw is refused\n- Only ONE draw with that Draw Code exists',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-011': {
    story: 'Step 2 Upload', severity: 'normal', tags: ['Regression'],
    description: '"Back" from Step 2 keeps everything entered on Step 1\nWhy: an admin going back to check must not have to start again.',
    preconditions: P.CREATE,
    testData: D.UNIQUE,
    steps: [S.FILL_STEP1, NEXT, 'On Step 2 click "Back"', 'Look at every Step 1 box'],
    expectedResult: '- All Step 1 values are still filled, including the Lottery Brand',
    actualResult: 'The Lottery Brand box is emptied (the other values are kept).',
  },
  'TC-LD-CR-012': {
    story: 'Duplicate Draw', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'The same brand cannot have two draws with the same Draw Number\nWhy: the Draw Number identifies the draw on the tickets.',
    preconditions: P.OWN_DRAW,
    testData: '- Second draw: the SAME Draw Number, a different Draw Code and different dates',
    steps: [S.CREATE + ' (the first draw)', 'Create a second draw with the same Draw Number', 'Search the list for the Draw Number'],
    expectedResult: '- The second draw is refused with a clear message\n- There is no second row with that Draw Number',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-013': {
    story: 'Duplicate Draw', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'The same brand cannot have two draws at exactly the same draw time\nWhy: two draws of one brand at the same moment would confuse players and results.',
    preconditions: P.OWN_DRAW,
    testData: '- Second draw: new Draw Number and Draw Code, the SAME draw date and time as the first',
    steps: [S.CREATE + ' (the first draw)', 'Create a second draw for the same brand with the same Draw Date & Time'],
    expectedResult: '- The second draw is refused with a message; it is not created',
    actualResult: 'The second draw is created - the same brand gets two draws at the same draw time.',
    postconditions: C.REJECTED,
  },
  'TC-LD-CR-014': {
    story: 'Brand Selection', severity: 'normal', tags: ['Regression'],
    description: 'The Lottery Brand list offers only approved, active brands\nWhy: draws may only be created for checked, switched-on brands.',
    preconditions: P.CREATE,
    steps: ['Open the "Lottery Brand" list', 'Compare it with the approved and active brands on the Lottery Brand page', 'Press Escape'],
    expectedResult: '- "Mahajana Sampatha" is offered, and only approved + active brands are listed\n- Escape closes the list',
  },
  'TC-LD-CR-015': {
    story: 'Step 2 Upload', severity: 'normal', tags: ['Regression'],
    description: 'A schedule date for the ticket upload is required unless "Initiate Now" is ticked\nWhy: the system must know when to load the tickets.',
    preconditions: P.STEP2,
    testData: '- The ticket file and its MD5 checksum',
    steps: ['Look at "Schedule Date"', 'Tick "Initiate Now" and look again', 'Untick "Initiate Now" and look again'],
    expectedResult: '- "Schedule Date *" is required while "Initiate Now" is NOT ticked\n- It is not needed when "Initiate Now" is ticked',
  },
  'TC-LD-CR-016': {
    story: 'Create Confirmation', severity: 'normal', tags: ['Regression'],
    description: 'Answering "Cancel" to the confirmation question keeps you on Step 1\nWhy: the admin must be able to stop and correct the details.',
    preconditions: P.CREATE,
    testData: D.UNIQUE,
    steps: [S.FILL_STEP1, 'Click "Next"', 'Click "Cancel" on the "Are you sure ..." question'],
    expectedResult: '- You stay on Step 1 with all values kept\n- Step 2 is NOT shown',
    actualResult: 'Step 2 opens anyway - the "Cancel" answer is ignored.',
  },
  'TC-LD-CR-017': {
    story: 'Copy Text', severity: 'minor', tags: ['Regression'],
    description: 'The Create Draw texts are spelled correctly\nWhy: typing mistakes look unprofessional.',
    preconditions: P.CREATE,
    testData: D.UNIQUE,
    steps: ['Read the "Lottery Brand" label', S.FILL_STEP1 + ' and click "Next"', 'Read the question text'],
    expectedResult: '- The label reads "Lottery Brand *"\n- The question reads "Are you sure you want to create draw?"',
    actualResult: 'The label reads "Lottery Brand * *" (two stars) and the question says "darw" instead of "draw".',
  },
  'TC-LD-CR-018': {
    story: 'Create Draw Flow', severity: 'normal', tags: ['Regression'],
    description: 'Leaving Step 2 without clicking "Create Draw" creates nothing\nWhy: a draw must only be created on purpose.',
    preconditions: P.CREATE,
    testData: D.UNIQUE,
    steps: [S.FILL_STEP1, NEXT, 'Reload the page, then go back to the Lottery Draws list', 'Search for the Draw Code'],
    expectedResult: '- No draw with that code exists',
  },
});
