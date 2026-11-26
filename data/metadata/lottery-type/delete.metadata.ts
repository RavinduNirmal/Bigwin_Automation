import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_delete.spec.ts - plain-language, see base.ts. */
const DELETE_STEP = 'Find the row by its Code, click the "..." actions button and choose "Delete" (there is no "Are you sure?" question - it is deleted at once)';

export const LotteryTypeDeleteMetadata: TestMetadataCollection = ltCases('Delete Lottery Type', {
  'TC-LT-DEL-001': {
    story: 'Delete Lottery Type', severity: 'blocker', tags: ['Smoke', 'Regression'],
    description: 'A lottery type can be deleted from its row menu\nWhy: types created by mistake must be removable.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test',
    steps: [
      DELETE_STEP,
      'Wait for the page to reload and search the list for the Code',
    ],
    expectedResult: '- The message "Lottery type deleted successfuly" is shown\n- The row is no longer listed',
    postconditions: 'The test\'s lottery type is deleted',
  },
  'TC-LT-DEL-002': {
    story: 'Delete Lottery Type', severity: 'critical', tags: ['Regression'],
    description: 'A deleted lottery type stays deleted after the page is reloaded\nWhy: a delete must be saved, not only hidden on the screen.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test',
    steps: [
      DELETE_STEP,
      'Reload the page (F5)',
      'Search the list for the Code',
    ],
    expectedResult: '- After the reload the Code is still not listed',
    postconditions: 'The test\'s lottery type is deleted',
  },
  'TC-LT-DEL-003': {
    story: 'Delete Lottery Type', severity: 'critical', tags: ['Regression'],
    description: 'Deleting one lottery type does not touch any other\nWhy: the delete must only affect the chosen row.',
    preconditions: LT_PRE.TWO,
    testData: '- Lottery type A (to delete) and lottery type B (to keep), both created by the test',
    steps: [
      'Delete lottery type A (row "..." menu > "Delete")',
      'Search the list for A\'s Code and for B\'s Code',
    ],
    expectedResult: '- A is no longer listed\n- B is still listed with its own Code, Type and Status',
  },
  'TC-LT-DEL-004': {
    story: 'Delete Lottery Type', severity: 'normal', tags: ['Regression'],
    description: 'The Code of a deleted lottery type can be used again\nWhy: deleting frees the Code, so a corrected type can be created with it.',
    preconditions: LT_PRE.ONE,
    testData: '- The Code of the test\'s lottery type\n- A new Type: "Auto Type <new number>"',
    steps: [
      'Delete the lottery type (row "..." menu > "Delete")',
      'Click "Add New Type" and create a new lottery type with the SAME Code, a new Type and Status ACTIVE',
      'Search the list for the Code',
    ],
    expectedResult: '- The new lottery type is created without an error\n- It is listed with the reused Code and the new Type',
  },
});
