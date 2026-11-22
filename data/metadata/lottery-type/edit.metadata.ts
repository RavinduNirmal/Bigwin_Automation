import { TestMetadataCollection } from '../../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_edit.spec.ts */
const base = { epic: 'Lottery Management', feature: 'Edit Lottery Type', owner: 'QA Team' } as const;

export const LotteryTypeEditMetadata: TestMetadataCollection = {
  'TC-LT-ED-001': {
    ...base, story: 'Edit Dialog UI', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    tms: 'TC-LT-ED-001',
    description: 'Edit opens "Update Lottery Type" pre-filled with the record\'s values',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Row menu -> Edit', 'Verify Code, Type, Status, Stage (read-only) and buttons'],
    expectedResult: 'Fields show the saved values; Stage "Under Review" is disabled',
  },
  'TC-LT-ED-002': {
    ...base, story: 'Update Lottery Type', severity: 'blocker', tags: ['Smoke', 'Regression'],
    tms: 'TC-LT-ED-002',
    description: 'Update the Type - saved and kept after reload',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Edit', 'Change Type', 'Update', 'Reload'],
    expectedResult: 'Row shows the new Type, also after reload',
  },
  'TC-LT-ED-003': {
    ...base, story: 'Update Lottery Type', severity: 'normal', tags: ['Regression'],
    tms: 'TC-LT-ED-003',
    description: 'Change Status from ACTIVE to DISABLED',
    preconditions: 'An ACTIVE lottery type created by the test exists',
    steps: ['Edit', 'Select DISABLED', 'Update'],
    expectedResult: 'Row shows Status "Disabled"',
  },
  'TC-LT-ED-004': {
    ...base, story: 'Update Lottery Type', severity: 'normal', tags: ['Regression'],
    tms: 'TC-LT-ED-004',
    description: 'Change the Code',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Edit', 'Enter a new unique Code', 'Update'],
    expectedResult: 'Row listed under the new Code; old Code no longer listed',
  },
  'TC-LT-ED-005': {
    ...base, story: 'Edit Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    tms: 'TC-LT-ED-005',
    description: 'Clearing Type shows "Type is required" and nothing changes',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Edit', 'Clear Type', 'Click Update'],
    expectedResult: '"Type is required" shown; record unchanged',
  },
  'TC-LT-ED-006': {
    ...base, story: 'Cancel Edit', severity: 'normal', tags: ['Regression'],
    tms: 'TC-LT-ED-006',
    description: 'Cancel discards the changes',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Edit', 'Change Type and Status', 'Click Cancel'],
    expectedResult: 'Record unchanged',
  },
  'TC-LT-ED-007': {
    ...base, story: 'Edit Validation', severity: 'critical', tags: ['Regression', 'Validation'],
    tms: 'TC-LT-ED-007',
    description: 'Changing the Code to another record\'s Code is rejected',
    preconditions: 'Two lottery types created by the test exist',
    steps: ['Edit the second', 'Set its Code to the first one\'s Code', 'Update'],
    expectedResult: 'Error toast; both records unchanged',
  },
  'TC-LT-ED-008': {
    ...base, story: 'Cancel Edit', severity: 'minor', tags: ['Regression', 'Keyboard'],
    tms: 'TC-LT-ED-008',
    description: 'Escape closes the Update dialog without saving',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Edit', 'Change Type', 'Press Escape'],
    expectedResult: 'Dialog closes; record unchanged',
  },
};
