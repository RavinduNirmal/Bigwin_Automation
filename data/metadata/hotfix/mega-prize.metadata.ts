import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { drawCases, DrawCase } from '../lottery-draw/base';

/**
 * HOTFIX 2026-11-23 - Create Draw > Step 1 "Mega Prize": cents + copy & paste (TC-HF-MP-*).
 * Business request: the Mega Prize could only take whole numbers; it must also take cents, and support
 * copy & paste because the amount is copied from another place. Spec: tests/hotfix/hotfix.spec.ts.
 * Facts verified on dev 2026-11-23: the box is type="text" inputmode="decimal"; non-digits are dropped,
 * one "." is kept, digits after the 2nd decimal place are cut, the value is sent as a string ("1000000.50").
 */
const PRE = {
  FIELD: 'Logged in as admin; Create Draw page open (Lottery Draws > Draws > Create Draw); clipboard access allowed in the browser',
  CREATE: 'Logged in as admin; Create Draw page open; brand "Mahajana Sampatha" approved and active; clipboard access allowed',
} as const;
const DATA_DRAW = 'A new unique test draw (number 9xxxxxxxxx, code AT<number>, brand Mahajana Sampatha, far-future schedule) with its own new 100-ticket file';
const POST_DRAW = 'The test deletes its own draw (Hold Draw -> Remove Draw)';

const c = (x: Omit<DrawCase, 'tags'> & { tags?: string[] }): DrawCase => ({ ...x, tags: ['Hotfix', 'Mega-Prize', ...(x.tags ?? [])] });

export const HotfixMegaPrizeMetadata: TestMetadataCollection = drawCases('Hotfix - Mega Prize cents & copy-paste', {
  'TC-HF-MP-001': c({
    story: 'Type cents', severity: 'critical',
    description: 'Mega Prize accepts an amount with cents when it is typed',
    preconditions: PRE.FIELD, testData: '"1000000.50", "1000.5", "0.50"',
    steps: ['Click into Mega Prize and type each amount key by key'],
    expectedResult: 'The box keeps each amount exactly as typed: 1000000.50, 1000.5, 0.50',
  }),
  'TC-HF-MP-002': c({
    story: 'Type cents', severity: 'normal',
    description: 'Only two decimal places (cents) can be entered',
    preconditions: PRE.FIELD, testData: '"1000.555"',
    steps: ['Type 1000.555 into Mega Prize'],
    expectedResult: 'The box shows 1000.55 - a third decimal digit is not accepted',
  }),
  'TC-HF-MP-003': c({
    story: 'Type cents', severity: 'normal',
    description: 'Only one decimal point can be entered',
    preconditions: PRE.FIELD, testData: '"1000.50.25"',
    steps: ['Type 1000.50.25 into Mega Prize'],
    expectedResult: 'The box shows 1000.50 - a second "." is not accepted and never more than two decimal places',
  }),
  'TC-HF-MP-004': c({
    story: 'Type cents', severity: 'normal', tags: ['Regression'],
    description: 'Letters, minus and other symbols are still blocked after the hotfix',
    preconditions: PRE.FIELD, testData: '"abc", "12a3", "-5", "1e5"',
    steps: ['Type each value into Mega Prize'],
    expectedResult: 'Only digits are kept: (empty), 123, 5, 15 - the box never holds letters, "-" or "e"',
  }),
  'TC-HF-MP-005': c({
    story: 'Paste', severity: 'critical',
    description: 'Pasting a plain amount with cents keeps it exactly',
    preconditions: PRE.FIELD, testData: 'Clipboard: "1000000.50", "2500.75", "1000000"',
    steps: ['Copy the amount', 'Click into Mega Prize and paste it (Ctrl+V)'],
    expectedResult: 'The box shows exactly the pasted amount: 1000000.50, 2500.75, 1000000',
  }),
  'TC-HF-MP-006': c({
    story: 'Paste', severity: 'critical',
    description: 'Pasting an amount with thousand separators gives the plain number',
    preconditions: PRE.FIELD, testData: 'Clipboard: "1,000,000.50", "25,000"',
    steps: ['Copy the formatted amount (as it appears in a document or e-mail)', 'Paste it into Mega Prize'],
    expectedResult: 'The commas are removed and the amount is kept: 1000000.50, 25000',
  }),
  'TC-HF-MP-007': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting an amount copied from a spreadsheet cell (spaces, tab or line break around it)',
    preconditions: PRE.FIELD, testData: 'Clipboard: " 1000000.50 ", "1000000.50" + line break (Excel cell copy), tab + "2500.75" + tab',
    steps: ['Copy the amount with the extra spaces / tab / line break', 'Paste it into Mega Prize'],
    expectedResult: 'Spaces, tabs and line breaks are removed: 1000000.50, 1000000.50, 2500.75',
  }),
  'TC-HF-MP-008': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting an amount copied together with its currency',
    preconditions: PRE.FIELD, testData: 'Clipboard: "LKR 1,000,000.50", "Rs. 2,500.75"',
    steps: ['Copy the amount with its currency text', 'Paste it into Mega Prize'],
    expectedResult: 'Only the amount is kept: 1000000.50, 2500.75',
  }),
  'TC-HF-MP-009': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting an amount with more than two decimal places keeps only two',
    preconditions: PRE.FIELD, testData: 'Clipboard: "1000000.505"',
    steps: ['Paste 1000000.505 into Mega Prize'],
    expectedResult: 'The box shows 1000000.50 (never more than two decimal places)',
  }),
  'TC-HF-MP-010': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting text that contains no amount leaves Mega Prize empty, and the draw cannot continue',
    preconditions: PRE.FIELD, testData: 'Clipboard: "abc"; other Step 1 fields filled with a unique draw',
    steps: ['Fill the other Step 1 fields', 'Paste "abc" into Mega Prize', 'Click Next'],
    expectedResult: 'Mega Prize stays empty; the page stays on Step 1 (Step 2 does not open)',
  }),
  'TC-HF-MP-011': c({
    story: 'Paste', severity: 'normal',
    description: 'Paste works at the cursor and over a selected value',
    preconditions: PRE.FIELD, testData: '"100" then paste ".25"; "999" selected then paste "2500.75"',
    steps: ['Type 100, put the cursor at the end and paste ".25"', 'Type 999, select it all and paste "2500.75"'],
    expectedResult: 'First the box shows 100.25; then 2500.75 (the selected value is replaced)',
  }),
  'TC-HF-MP-012': c({
    story: 'Copy', severity: 'minor',
    description: 'The Mega Prize amount can be copied out of the field',
    preconditions: PRE.FIELD, testData: '"2500.75"',
    steps: ['Type 2500.75 into Mega Prize', 'Select it all and copy (Ctrl+C)', 'Read the clipboard'],
    expectedResult: 'The clipboard holds 2500.75',
  }),
  'TC-HF-MP-013': c({
    story: 'Validation', severity: 'critical',
    description: 'An amount below 1 but above 0 (cents only) is accepted',
    preconditions: PRE.FIELD, testData: 'Mega Prize "0.01", then "0.50"; other Step 1 fields filled with a unique draw',
    steps: ['Fill Step 1 with the amount', 'Click Next and accept the confirmation'],
    expectedResult: 'No Mega Prize error; Step 2 "Upload Ticket List" opens for both amounts',
  }),
  'TC-HF-MP-014': c({
    story: 'Validation', severity: 'critical',
    description: 'A zero amount written with cents (0.00) is rejected',
    preconditions: PRE.FIELD, testData: 'Mega Prize "0.00"; other Step 1 fields filled with a unique draw',
    steps: ['Fill Step 1 with 0.00', 'Click Next'],
    expectedResult: '"Mega Prize must be greater than 0" is shown and the page stays on Step 1',
  }),
  'TC-HF-MP-015': c({
    story: 'Type cents', severity: 'critical',
    description: 'Typing an amount that starts with the decimal point (.50) must not change it into 50',
    preconditions: PRE.FIELD, testData: '".50" (50 cents)',
    steps: ['Type .50 into Mega Prize'],
    expectedResult: 'The box shows 0.50 (or keeps .50) - it must never become 50 (100 times the amount)',
    actualResult: 'The leading "." is dropped and the box shows 50 - the amount silently becomes 100 times larger (verified 2026-11-23)',
  }),
  'TC-HF-MP-016': c({
    story: 'Paste', severity: 'critical',
    description: 'Pasting an amount that starts with the decimal point (.50) must not change it into 50',
    preconditions: PRE.FIELD, testData: 'Clipboard: ".50"',
    steps: ['Paste .50 into Mega Prize'],
    expectedResult: 'The box shows 0.50 (or .50) - never 50',
    actualResult: 'The box shows 50 - the pasted amount silently becomes 100 times larger (verified 2026-11-23)',
  }),
  'TC-HF-MP-017': c({
    story: 'Paste', severity: 'normal',
    description: 'Pasting an amount with space groups and a comma keeps only the digits (a comma is a thousand separator, never a decimal point)',
    preconditions: PRE.FIELD, testData: 'Clipboard: "1 000 000,50"',
    steps: ['Paste "1 000 000,50" into Mega Prize'],
    expectedResult: 'Spaces and the comma are removed and only the digits are kept: 100000050 (business confirmed 2026-11-23: only "." is a decimal point)',
  }),
  'TC-HF-MP-018': c({
    story: 'Create draw', severity: 'blocker',
    description: 'A draw created with a typed cents Mega Prize saves and shows the cents (also after approval)',
    preconditions: PRE.CREATE, testData: DATA_DRAW + '; Mega Prize typed "2500.05"',
    steps: ['Fill Step 1 and type 2500.05 as Mega Prize', 'Continue to Step 2, upload the ticket file with its checksum, Create Draw',
      'Open the new draw page and read Mega Prize', 'Review and approve the draw, open the draw page again and read Mega Prize'],
    expectedResult: 'The page sends megaPrize "2500.05"; the draw is created; the draw page shows 2500.05 before and after approval',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-019': c({
    story: 'Create draw', severity: 'blocker',
    description: 'A draw created with a PASTED formatted Mega Prize saves the right amount',
    preconditions: PRE.CREATE, testData: DATA_DRAW + '; Mega Prize pasted "LKR 1,000,000.50"',
    steps: ['Fill Step 1 and paste "LKR 1,000,000.50" into Mega Prize', 'Continue to Step 2, upload the ticket file with its checksum, Create Draw',
      'Open the new draw page and read Mega Prize'],
    expectedResult: 'The page sends the amount 1000000.50 (as a number, 1000000.5 - the same amount); the draw is created; the draw page shows 1000000.50',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-020': c({
    story: 'Create draw', severity: 'minor',
    description: 'The draw page shows a cents amount with both decimal places',
    preconditions: PRE.CREATE, testData: DATA_DRAW + '; Mega Prize typed "1000000.50"',
    steps: ['Create the draw with Mega Prize 1000000.50', 'Open the draw page and read Mega Prize'],
    expectedResult: 'The draw page shows 1000000.50 (money is shown with two decimal places, as entered)',
    actualResult: 'The draw page shows 1000000.5 - the trailing zero of the cents is dropped (verified 2026-11-23)',
    postconditions: POST_DRAW,
  }),
  'TC-HF-MP-021': c({
    story: 'Create draw', severity: 'critical', tags: ['Regression'],
    description: 'A whole-number Mega Prize still works after the hotfix',
    preconditions: PRE.CREATE, testData: DATA_DRAW + '; Mega Prize typed "1000000"',
    steps: ['Create the draw with Mega Prize 1000000', 'Open the draw page and read Mega Prize'],
    expectedResult: 'The page sends megaPrize 1000000; the draw is created; the draw page shows 1000000.00 (every amount is shown with two decimal places for consistency)',
    postconditions: POST_DRAW,
  }),
});
