import { TestMetadataCollection } from '../../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_delete.spec.ts */
const base = { epic: 'Lottery Management', feature: 'Delete Lottery Type', owner: 'QA Team' } as const;

export const LotteryTypeDeleteMetadata: TestMetadataCollection = {
  'TC-LT-DEL-001': {
    ...base, story: 'Delete Lottery Type', severity: 'blocker', tags: ['Smoke', 'Regression'],
    tms: 'TC-LT-DEL-001',
    description: 'Delete a lottery type from the row menu',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Row menu -> Delete'],
    expectedResult: 'Row removed from the table',
  },
  'TC-LT-DEL-002': {
    ...base, story: 'Delete Lottery Type', severity: 'critical', tags: ['Regression'],
    tms: 'TC-LT-DEL-002',
    description: 'A deleted lottery type stays deleted after reload',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Delete', 'Reload the page'],
    expectedResult: 'Row still absent after reload',
  },
  'TC-LT-DEL-003': {
    ...base, story: 'Delete Lottery Type', severity: 'critical', tags: ['Regression'],
    tms: 'TC-LT-DEL-003',
    description: 'Deleting one lottery type leaves the others untouched',
    preconditions: 'Two lottery types created by the test exist',
    steps: ['Delete the first'],
    expectedResult: 'First removed; second still listed with its values',
  },
  'TC-LT-DEL-004': {
    ...base, story: 'Delete Lottery Type', severity: 'normal', tags: ['Regression'],
    tms: 'TC-LT-DEL-004',
    description: 'A deleted lottery type\'s Code can be used again',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Delete it', 'Create a new lottery type with the same Code'],
    expectedResult: 'New lottery type created with the reused Code',
  },
};
