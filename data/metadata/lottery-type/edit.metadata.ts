import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_STEP } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_edit.spec.ts - plain-language, see base.ts. */
export const LotteryTypeEditMetadata: TestMetadataCollection = ltCases('Edit Lottery Type', {
  'TC-LT-ED-001': {
    story: 'Edit Dialog UI', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    description: '"Edit" opens the "Update Lottery Type" window filled with the saved values\nWhy: an admin must see the current values before changing them.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test (its Code, Type and Status ACTIVE)',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Look at the boxes, the Stage and the buttons',
    ],
    expectedResult: '- The window is titled "Update Lottery Type"\n- Code, Type and Status show the saved values\n'
      + '- Stage shows "Under Review" and cannot be changed (greyed out)\n- The buttons "Cancel" and "Update" are shown (plus "Review" while it is Under Review)',
  },
  'TC-LT-ED-002': {
    story: 'Update Lottery Type', severity: 'blocker', tags: ['Smoke', 'Regression'],
    description: 'The Type of a lottery type can be changed and the change is kept\nWhy: names must be correctable after creation.',
    preconditions: LT_PRE.ONE,
    testData: '- New Type: "Auto Type <new unique number>"',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Replace the Type with the new Type',
      'Click "Update" and wait for the page to reload',
      'Find the row by its Code; then reload the page (F5) and find it again',
    ],
    expectedResult: '- The row shows the new Type (Code and Status unchanged)\n- After reloading the page the new Type is still shown',
  },
  'TC-LT-ED-003': {
    story: 'Update Lottery Type', severity: 'normal', tags: ['Regression'],
    description: 'A lottery type can be switched off (Status ACTIVE to DISABLED)\nWhy: types that must no longer be used are switched off, not deleted.',
    preconditions: LT_PRE.ONE,
    testData: '- New Status: DISABLED',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Choose Status "DISABLED"',
      'Click "Update" and find the row by its Code',
    ],
    expectedResult: '- The row shows Status "Disable"',
  },
  'TC-LT-ED-004': {
    story: 'Update Lottery Type', severity: 'normal', tags: ['Regression'],
    description: 'The Code of a lottery type can be changed to a new, unused Code\nWhy: a wrongly typed Code must be correctable.',
    preconditions: LT_PRE.ONE,
    testData: '- New Code: "AT<new unique number>"',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Replace the Code with the new Code',
      'Click "Update"',
      'Search the list for the new Code and for the old Code',
    ],
    expectedResult: '- The lottery type is listed under the NEW Code with its Type and Status\n- The OLD Code is no longer listed',
  },
  'TC-LT-ED-005': {
    story: 'Edit Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'The Type cannot be emptied when editing\nWhy: a lottery type without a Type cannot be recognised.',
    preconditions: LT_PRE.ONE,
    testData: '- Type: deleted (left empty)',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Delete the whole Type',
      'Click "Update"',
      'Close the window and look at the row',
    ],
    expectedResult: '- "Type is required" is shown\n- Nothing is saved: the row still shows the old Type',
  },
  'TC-LT-ED-006': {
    story: 'Cancel Edit', severity: 'normal', tags: ['Regression'],
    description: '"Cancel" throws away the changes made in the Update window\nWhy: an admin must be able to back out of an edit.',
    preconditions: LT_PRE.ONE,
    testData: '- Type: "Auto Type <new number>"\n- Status: DISABLED',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Change the Type and choose Status "DISABLED"',
      'Click "Cancel"',
      'Look at the row',
    ],
    expectedResult: '- The window closes\n- The row still shows the OLD Type and Status "Active"',
  },
  'TC-LT-ED-007': {
    story: 'Edit Validation', severity: 'critical', tags: ['Regression', 'Validation'],
    description: 'A Code cannot be changed to a Code another lottery type already uses\nWhy: two lottery types with the same Code would be mixed up.',
    preconditions: LT_PRE.TWO,
    testData: '- Lottery type A and lottery type B (both created by the test)\n- New Code for B: the Code of A',
    steps: [
      'Open "Edit" on lottery type B (row "..." menu > "Edit")',
      'Replace its Code with the Code of lottery type A',
      'Click "Update"',
      'Look at both rows',
    ],
    expectedResult: '- A red error message explains that the Code is already used\n- Nothing changes: A and B keep their own Codes',
    actualResult: 'Nothing is saved (both rows keep their Codes), but NO message is shown - the user is not told why the update did not work.',
  },
  'TC-LT-ED-008': {
    story: 'Cancel Edit', severity: 'minor', tags: ['Regression'],
    description: 'The Escape key closes the Update window without saving\nWhy: keyboard users expect Escape to cancel.',
    preconditions: LT_PRE.ONE,
    testData: '- Type: "Auto Type <new number>"',
    steps: [
      LT_STEP.OPEN_EDIT,
      'Change the Type',
      'Press the Escape key',
      'Look at the row',
    ],
    expectedResult: '- The window closes\n- The row still shows the OLD Type',
  },
});
