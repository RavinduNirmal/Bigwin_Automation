import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_POST } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_create.spec.ts - plain-language, see base.ts. */
export const LotteryTypeCreateMetadata: TestMetadataCollection = ltCases('Create Lottery Type', {
  'TC-LT-CR-001': {
    story: 'Create Dialog UI', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    description: 'The "Add New Type" button opens an empty "Create Lottery Type" window\nWhy: this window is the only way to add a new lottery type.',
    preconditions: LT_PRE.PAGE,
    testData: '- None',
    steps: [
      'Click "Add New Type"',
      'Look at the window that opens: its title, the boxes and the buttons',
      'Click "Cancel"',
    ],
    expectedResult: '- A window titled "Create Lottery Type" opens\n- It has an empty "Code" box, an empty "Type" box and a "Status" list\n'
      + '- It has the buttons "Cancel" and "Create"\n- "Cancel" closes the window',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-002': {
    story: 'Create Valid Lottery Type', severity: 'blocker', tags: ['Smoke', 'Regression'],
    description: 'A new active lottery type can be created and is waiting for review\nWhy: lottery types are needed before any lottery brand can be set up.',
    preconditions: LT_PRE.PAGE,
    testData: '- Code: "AT<unique number>" (e.g. AT12345678901)\n- Type: "Auto Type <unique number>"\n- Status: ACTIVE',
    steps: [
      'Click "Add New Type"',
      'Type the Code and the Type, choose Status "ACTIVE"',
      'Click "Create" and wait for the page to reload',
      'Find the new row by its Code',
      'Reload the page (F5) and find the row again',
    ],
    expectedResult: '- The new row is listed with the entered Code and Type, Status "Active" and Stage "Under Review" (waiting for a reviewer)\n'
      + '- After reloading the page the row is still there with the same values',
  },
  'TC-LT-CR-003': {
    story: 'Create Valid Lottery Type', severity: 'normal', tags: ['Regression'],
    description: 'A lottery type can be created already switched off (Status DISABLED)\nWhy: an admin may prepare a type that must not be used yet.',
    preconditions: LT_PRE.PAGE,
    testData: '- Code: "AT<unique number>"\n- Type: "Auto Type <unique number>"\n- Status: DISABLED',
    steps: [
      'Click "Add New Type"',
      'Type the Code and the Type, choose Status "DISABLED"',
      'Click "Create" and find the new row by its Code',
    ],
    expectedResult: '- The new row shows Status "Disable" (switched off)',
    actualResult: 'The chosen Status is ignored when creating: the row shows Status "Active". (Changing it later with "Edit" does save "Disable".)',
  },
  'TC-LT-CR-004': {
    story: 'Required Fields', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'A lottery type cannot be saved with an empty form\nWhy: every lottery type needs a Code, a Type and a Status.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code, Type, Status: all left empty',
    steps: [
      'Leave every box empty',
      'Click "Create"',
    ],
    expectedResult: '- Nothing is saved (no new row)\n- The "Code" box is marked as required\n- The window stays open',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-005': {
    story: 'Required Fields', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'Emptying the Code box shows a clear "required" message\nWhy: the user must see straight away that the Code cannot be blank.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: type any text, then delete it',
    steps: [
      'Type some text in "Code"',
      'Delete the text again',
      'Click into the next box',
    ],
    expectedResult: '- "Code is required" is shown under the Code box',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-006': {
    story: 'Required Fields', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'Emptying the Type box shows a clear "required" message\nWhy: the user must see straight away that the Type cannot be blank.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Type: type any text, then delete it',
    steps: [
      'Type some text in "Type"',
      'Delete the text again',
      'Click into the next box',
    ],
    expectedResult: '- "Type is required" is shown under the Type box',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-007': {
    story: 'Required Fields', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'A lottery type without a Status is not saved\nWhy: the Status decides whether the type can be used, so it must always be chosen.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: "AT<unique number>"\n- Type: "Auto Type <unique number>"\n- Status: (not chosen)',
    steps: [
      'Type the Code and the Type, do NOT choose a Status',
      'Click "Create"',
    ],
    expectedResult: '- "Status is required" is shown\n- Nothing is saved (the Code is not listed)',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-008': {
    story: 'Duplicate Code', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'Two lottery types cannot have the same Code\nWhy: the Code identifies a lottery type - a duplicate would mix up two types.',
    preconditions: LT_PRE.ONE,
    testData: '- Code: the SAME Code as the lottery type the test already created\n- Type: a different "Auto Type <number>"\n- Status: ACTIVE',
    steps: [
      'Click "Add New Type"',
      'Type the existing Code and a new Type, choose Status "ACTIVE"',
      'Click "Create"',
      'Search the list for the Code',
    ],
    expectedResult: '- A red message "Failed to create lottery type" is shown\n- The window stays open\n- The list still has only ONE row with that Code',
  },
  'TC-LT-CR-009': {
    story: 'Input Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'A Type made only of spaces is not accepted\nWhy: a Type of blanks looks empty in every list and cannot be recognised.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: "ATWS<unique number>"\n- Type: "     " (five spaces)\n- Status: ACTIVE',
    steps: [
      'Type the Code, type only spaces in "Type", choose Status "ACTIVE"',
      'Click "Create"',
    ],
    expectedResult: '- The lottery type is NOT saved (spaces only count as an empty Type) and a "Type is required" style message is shown',
    actualResult: 'The lottery type is saved with an empty-looking Type (only spaces) - it is listed with a blank Type Description.',
  },
  'TC-LT-CR-010': {
    story: 'Input Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'A Code longer than 255 characters is refused\nWhy: the system can only store 255 characters - longer codes must be stopped with a clear message.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: "ATLONG<number>" followed by X\'s - 256 characters in total\n- Type: "Auto Type <unique number>"\n- Status: ACTIVE',
    steps: [
      'Paste the 256-character Code, type the Type, choose Status "ACTIVE"',
      'Click "Create"',
    ],
    expectedResult: '- A message "... must be at most 255 characters" is shown\n- Nothing is saved',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-011': {
    story: 'Input Validation', severity: 'minor', tags: ['Regression'],
    description: 'A Type of exactly 255 characters (the maximum) is saved in full\nWhy: the longest allowed text must not be cut off.',
    preconditions: LT_PRE.PAGE,
    testData: '- Code: "ATMAX<unique number>"\n- Type: a text of exactly 255 characters (a prefix followed by M\'s)\n- Status: ACTIVE',
    steps: [
      'Click "Add New Type", enter the Code and the 255-character Type, choose Status "ACTIVE"',
      'Click "Create" and find the new row by its Code',
      'Compare the Type Description in the row with the text that was entered',
    ],
    expectedResult: '- The row is created\n- Its Type Description is the complete 255-character text (nothing cut off)',
  },
  'TC-LT-CR-012': {
    story: 'Cancel Create', severity: 'normal', tags: ['Regression'],
    description: '"Cancel" throws away what was typed in the Create window\nWhy: a user must be able to change their mind without creating anything.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: "AT<unique number>"\n- Type: "Auto Type <unique number>"\n- Status: ACTIVE',
    steps: [
      'Fill in Code, Type and Status',
      'Click "Cancel"',
      'Search the list for the Code',
      'Click "Add New Type" again and look at the boxes',
    ],
    expectedResult: '- Nothing is saved (the Code is not listed)\n- The window opens empty again (the typed values are gone)',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-013': {
    story: 'Cancel Create', severity: 'minor', tags: ['Regression'],
    description: 'The Escape key closes the Create window without saving\nWhy: keyboard users expect Escape to cancel.',
    preconditions: LT_PRE.DIALOG,
    testData: '- Code: "AT<unique number>"\n- Type: "Auto Type <unique number>"\n- Status: ACTIVE',
    steps: [
      'Fill in Code, Type and Status',
      'Press the Escape key',
      'Search the list for the Code',
    ],
    expectedResult: '- The window closes\n- Nothing is saved (the Code is not listed)',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-CR-014': {
    story: 'Security', severity: 'critical', tags: ['Regression', 'Security'],
    description: 'Web-page code typed into the Type is shown as plain text and never runs\nWhy: someone could try to hide harmful code in a name (cross-site scripting) - it must never run in another admin\'s browser.',
    preconditions: LT_PRE.PAGE,
    testData: '- Code: "ATXSS<unique number>"\n- Type: "<b>Bold</b><img src=x onerror=alert(1)> <number>"\n- Status: ACTIVE',
    steps: [
      'Click "Add New Type", enter the Code and the Type above, choose Status "ACTIVE"',
      'Click "Create" and find the new row by its Code',
      'Look at the Type Description of the row',
    ],
    expectedResult: '- The Type Description shows the text exactly as typed, including "<b>" and "<img ...>"\n'
      + '- Nothing is shown in bold, no image appears and no pop-up message opens',
  },
});
