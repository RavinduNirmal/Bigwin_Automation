import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { drawCases, DrawCase, DRAW_STEP as S } from '../lottery-draw/base';

/**
 * HOTFIX 2026-11-23 - Create Draw > Step 1 "Mega Prize": cents + copy & paste (TC-HF-MP-*).
 * Business request: the Mega Prize could only take whole numbers; it must also take cents, and support copy & paste
 * because the amount is copied from another place. Spec: tests/e2e/hotfixes/2026-11-23_mega_prize.spec.ts.
 * Written for readers who do not know the system (plain steps, exact values, exact expected results).
 * Bugs found while testing the hotfix (BUG_064 / 065 / 066 - ".50" became 50, page showed 1000000.5) were fixed and
 * closed on 2026-11-24. Suite membership is in config/test-suites.json.
 */
const LOGGED_IN = '- Logged in to the BigWin admin portal (dev) as admin';
const PRE = {
  FIELD: `${LOGGED_IN}\n- The Create Draw page is open ("Lottery Draws" > "Draws" > "Create Draw")\n- The browser may use the clipboard (copy & paste allowed)`,
  CREATE: `${LOGGED_IN}\n- The Create Draw page is open\n- Brand "Mahajana Sampatha" is approved and active\n- The browser may use the clipboard (copy & paste allowed)`,
} as const;
const DRAW = '- A new test draw: brand "Mahajana Sampatha", Draw Number "9<9 digits>", Draw Code "AT<draw number>", dates about 3 months ahead, with its own 100-ticket file and MD5 checksum';
const POST_DRAW = 'At the end the test removes its own draw ("Hold Draw", then "Remove Draw")';
const NOTHING = 'Nothing is created (the draw is never saved)';
const BOX = 'Click into the "Mega Prize" box on Step 1';
const PASTE = (v: string) => `Copy the text ${v}, click into "Mega Prize" and paste it (Ctrl+V)`;
const CREATE_WITH = (how: string) => `Fill Step 1 and ${how} > "Next" > accept the question > attach the ticket file, type its MD5 checksum, tick "Initiate Now" > "Create Draw"`;

const c = (x: Omit<DrawCase, 'tags'> & { tags?: string[] }): DrawCase => ({ ...x, tags: ['Hotfix', 'Mega-Prize', ...(x.tags ?? [])] });

export const HotfixMegaPrizeMetadata: TestMetadataCollection = drawCases('Hotfix - Mega Prize cents & copy-paste', {
  'TC-HF-MP-001': c({
    story: 'Type cents', severity: 'critical',
    description: 'A Mega Prize with cents can be typed\nWhy: the business needs exact prize amounts such as 1,000,000.50.',
    preconditions: PRE.FIELD,
    testData: '- Amounts: 1000000.50, 1000.5 and 0.50',
    steps: [BOX, 'Type each amount, key by key (clear the box between amounts)', 'Read what the box shows each time'],
    expectedResult: '- The box keeps each amount exactly as typed: 1000000.50, 1000.5, 0.50',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-002': c({
    story: 'Type cents', severity: 'normal',
    description: 'Only two decimal places (cents) can be entered\nWhy: money has at most 2 decimal places.',
    preconditions: PRE.FIELD,
    testData: '- Typed: 1000.555',
    steps: [BOX, 'Type 1000.555', 'Read the box'],
    expectedResult: '- The box shows 1000.55 (the third decimal digit is not accepted)',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-003': c({
    story: 'Type cents', severity: 'normal',
    description: 'Only one decimal point can be entered\nWhy: an amount with two points is not a number.',
    preconditions: PRE.FIELD,
    testData: '- Typed: 1000.50.25',
    steps: [BOX, 'Type 1000.50.25', 'Read the box'],
    expectedResult: '- The box shows 1000.50 (the second "." is not accepted, never more than 2 decimal places)',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-004': c({
    story: 'Type cents', severity: 'normal', tags: ['Regression'],
    description: 'Letters, minus signs and other symbols are still blocked after the hotfix\nWhy: the hotfix must not open the box to non-numbers.',
    preconditions: PRE.FIELD,
    testData: '- Typed: "abc", "12a3", "-5", "1e5"',
    steps: [BOX, 'Type each value (clear the box between values)', 'Read the box each time'],
    expectedResult: '- Only digits are kept: (empty), 123, 5, 15\n- The box never contains letters, "-" or "e"',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-005': c({
    story: 'Paste', severity: 'critical',
    description: 'A plain amount with cents can be pasted\nWhy: the business copies the amount from another document.',
    preconditions: PRE.FIELD,
    testData: '- Copied texts: "1000000.50", "2500.75", "1000000"',
    steps: [PASTE('of each amount'), 'Read the box each time'],
    expectedResult: '- The box shows exactly the pasted amount: 1000000.50, 2500.75, 1000000',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-006': c({
    story: 'Paste', severity: 'critical',
    description: 'An amount with thousand separators is pasted as a plain number\nWhy: amounts in documents and e-mails are written with commas.',
    preconditions: PRE.FIELD,
    testData: '- Copied texts: "1,000,000.50" and "25,000"',
    steps: [PASTE('of each amount'), 'Read the box each time'],
    expectedResult: '- The commas are removed: 1000000.50 and 25000',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-007': c({
    story: 'Paste', severity: 'normal',
    description: 'An amount copied from a spreadsheet cell is pasted cleanly\nWhy: Excel adds spaces, tabs or line breaks around a copied cell.',
    preconditions: PRE.FIELD,
    testData: '- Copied texts: " 1000000.50 " (spaces), "1000000.50" + line break (Excel cell), tab + "2500.75" + tab',
    steps: [PASTE('of each value'), 'Read the box each time'],
    expectedResult: '- Spaces, tabs and line breaks are removed: 1000000.50, 1000000.50, 2500.75',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-008': c({
    story: 'Paste', severity: 'normal',
    description: 'An amount copied together with its currency is pasted as the number only\nWhy: copied amounts often include "LKR" or "Rs.".',
    preconditions: PRE.FIELD,
    testData: '- Copied texts: "LKR 1,000,000.50" and "Rs. 2,500.75"',
    steps: [PASTE('of each amount'), 'Read the box each time'],
    expectedResult: '- Only the amount is kept: 1000000.50 and 2500.75',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-009': c({
    story: 'Paste', severity: 'normal',
    description: 'A pasted amount with more than two decimal places keeps only two\nWhy: money has at most 2 decimal places.',
    preconditions: PRE.FIELD,
    testData: '- Copied text: "1000000.505"',
    steps: [PASTE('"1000000.505"'), 'Read the box'],
    expectedResult: '- The box shows 1000000.50',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-010': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting text without any amount leaves Mega Prize empty, and the draw cannot go on\nWhy: a wrong paste must not become a prize.',
    preconditions: PRE.FIELD,
    testData: '- Copied text: "abc"\n- The other Step 1 boxes filled with a new test draw',
    steps: ['Fill the other Step 1 boxes', PASTE('"abc"'), 'Click "Next"'],
    expectedResult: '- Mega Prize stays empty\n- The page stays on Step 1 (Step 2 does not open)',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-011': c({
    story: 'Paste', severity: 'normal',
    description: 'Paste works at the cursor and over a selected value\nWhy: users complete or replace amounts by pasting.',
    preconditions: PRE.FIELD,
    testData: '- Case 1: box shows 100, paste ".25" at the end\n- Case 2: box shows 999, select it all and paste "2500.75"',
    steps: ['Type 100, put the cursor at the end and paste ".25"', 'Read the box', 'Type 999, select it all and paste "2500.75"', 'Read the box'],
    expectedResult: '- Case 1: 100.25\n- Case 2: 2500.75 (the selected value is replaced)',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-012': c({
    story: 'Copy', severity: 'minor',
    description: 'The Mega Prize amount can be copied out of the box\nWhy: users copy the amount into other documents.',
    preconditions: PRE.FIELD,
    testData: '- Typed amount: 2500.75',
    steps: ['Type 2500.75 into Mega Prize', 'Select it all and copy it (Ctrl+C)', 'Paste it somewhere else (e.g. Notepad)'],
    expectedResult: '- The copied text is 2500.75',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-013': c({
    story: 'Validation', severity: 'critical',
    description: 'A Mega Prize below 1 but above 0 (cents only) is accepted\nWhy: small prizes in cents must be possible.',
    preconditions: PRE.FIELD,
    testData: '- Mega Prize 0.01, then 0.50\n- The other Step 1 boxes filled with a new test draw',
    steps: ['Fill Step 1 with Mega Prize 0.01', 'Click "Next" and accept the question', 'Go back and repeat with 0.50'],
    expectedResult: '- No Mega Prize error\n- Step 2 "Upload Ticket List" opens for both amounts',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-014': c({
    story: 'Validation', severity: 'critical',
    description: 'A zero amount written with cents (0.00) is refused\nWhy: a prize must be more than nothing.',
    preconditions: PRE.FIELD,
    testData: '- Mega Prize 0.00\n- The other Step 1 boxes filled with a new test draw',
    steps: ['Fill Step 1 with Mega Prize 0.00', 'Click "Next"'],
    expectedResult: '- "Mega Prize must be greater than 0" is shown\n- The page stays on Step 1',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-015': c({
    story: 'Type cents', severity: 'critical',
    description: 'Typing an amount that starts with the decimal point (.50) keeps it as 50 cents\nWhy: ".50" turning into 50 would make the prize 100 times bigger.\nHistory: BUG_064 (".50" became 50) - fixed and closed 2026-11-24.',
    preconditions: PRE.FIELD,
    testData: '- Typed: .50 (50 cents)',
    steps: [BOX, 'Type .50', 'Read the box'],
    expectedResult: '- The box shows 0.50 (or keeps .50) - never 50',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-016': c({
    story: 'Paste', severity: 'critical',
    description: 'Pasting an amount that starts with the decimal point (.50) keeps it as 50 cents\nWhy: ".50" turning into 50 would make the prize 100 times bigger.\nHistory: BUG_065 (pasted ".50" became 50) - fixed and closed 2026-11-24.',
    preconditions: PRE.FIELD,
    testData: '- Copied text: ".50"',
    steps: [PASTE('".50"'), 'Read the box'],
    expectedResult: '- The box shows 0.50 (or .50) - never 50',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-017': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting an amount with space groups and a comma keeps only the digits\nWhy: only "." is a decimal point - a comma is always a thousand separator (confirmed by the business on 2026-11-23).',
    preconditions: PRE.FIELD,
    testData: '- Copied text: "1 000 000,50"',
    steps: [PASTE('"1 000 000,50"'), 'Read the box'],
    expectedResult: '- The spaces and the comma are removed and only the digits are kept: 100000050',
    postconditions: NOTHING,
  }),
  'TC-HF-MP-018': c({
    story: 'Create draw', severity: 'blocker',
    description: 'A draw created with a typed cents Mega Prize saves and shows the cents, also after approval\nWhy: the exact prize must reach the system and stay unchanged through approval.',
    preconditions: PRE.CREATE,
    testData: `${DRAW}\n- Mega Prize typed: 2500.05`,
    steps: [CREATE_WITH('type 2500.05 as Mega Prize'), S.FIND + ', open the draw page and read Mega Prize', S.WAIT_TICKETS, S.REVIEW, S.APPROVE, 'Open the draw page again and read Mega Prize'],
    expectedResult: '- The draw is created with Mega Prize 2500.05\n- The draw page shows 2500.05 before and after approval',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-019': c({
    story: 'Create draw', severity: 'blocker',
    description: 'A draw created with a PASTED formatted Mega Prize saves the right amount\nWhy: the copy & paste flow the business uses must give the correct prize.',
    preconditions: PRE.CREATE,
    testData: `${DRAW}\n- Mega Prize pasted: "LKR 1,000,000.50"`,
    steps: [CREATE_WITH('paste "LKR 1,000,000.50" into Mega Prize'), S.FIND + ', open the draw page and read Mega Prize'],
    expectedResult: '- The amount sent and saved is 1000000.50 (the system may send it as the number 1000000.5 - the same amount)\n- The draw page shows 1000000.50',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-020': c({
    story: 'Create draw', severity: 'minor',
    description: 'The draw page shows a cents amount with both decimal places\nWhy: money is always shown with 2 decimal places.\nHistory: BUG_066 (shown as 1000000.5, also on the user website) - fixed and closed 2026-11-24.',
    preconditions: PRE.CREATE,
    testData: `${DRAW}\n- Mega Prize typed: 1000000.50`,
    steps: [CREATE_WITH('type 1000000.50 as Mega Prize'), S.FIND + ', open the draw page and read Mega Prize'],
    expectedResult: '- The draw page shows 1000000.50',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-021': c({
    story: 'Create draw', severity: 'critical', tags: ['Regression'],
    description: 'A whole-number Mega Prize still works and is shown with .00\nWhy: the hotfix must not break whole amounts; all amounts are shown with 2 decimal places for consistency.',
    preconditions: PRE.CREATE,
    testData: `${DRAW}\n- Mega Prize typed: 1000000`,
    steps: [CREATE_WITH('type 1000000 as Mega Prize'), S.FIND + ', open the draw page and read Mega Prize'],
    expectedResult: '- The draw is created with Mega Prize 1000000\n- The draw page shows 1000000.00',
    postconditions: POST_DRAW,
  }),
});
