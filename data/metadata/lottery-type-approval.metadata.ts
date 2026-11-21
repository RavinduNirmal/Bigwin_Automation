import { TestMetadataCollection } from '../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_approval.spec.ts */
const base = { epic: 'Lottery Management', feature: 'Lottery Type Approval', owner: 'QA Team' } as const;

export const LotteryTypeApprovalMetadata: TestMetadataCollection = {
  'TC-LT-APR-001': {
    ...base, story: 'Initial Stage', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    tms: 'TC-LT-APR-001',
    description: 'A new lottery type starts "Under Review" and can only be Reviewed (not Approved)',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Create a lottery type', 'Open Edit'],
    expectedResult: 'Stage "Under Review"; "Review" offered; "Approve" not offered',
  },
  'TC-LT-APR-002': {
    ...base, story: 'Review', severity: 'critical', tags: ['Smoke', 'Regression', 'Approval'],
    tms: 'TC-LT-APR-002',
    description: 'Review moves the lottery type to "Pending Approval"',
    preconditions: 'An "Under Review" lottery type created by the test',
    steps: ['Edit -> Review'],
    expectedResult: 'Stage "Pending Approval"; "Approve" offered; "Review" no longer offered',
  },
  'TC-LT-APR-003': {
    ...base, story: 'Approve', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval'],
    tms: 'TC-LT-APR-003',
    description: 'Approve moves the lottery type to "Approved"; approval survives a reload',
    preconditions: 'A "Pending Approval" lottery type created by the test',
    steps: ['Edit -> Approve', 'Reload'],
    expectedResult: 'Stage "Approved"; neither Review nor Approve offered; still Approved after reload',
  },
  'TC-LT-APR-004': {
    ...base, story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    tms: 'TC-LT-APR-004',
    description: 'An "Under Review" (not approved) lottery type is NOT offered when creating a Lottery Brand',
    preconditions: 'An "Under Review" lottery type created by the test',
    steps: ['Lottery Brand -> Add New Brand', 'Open "Select Lottery Type"'],
    expectedResult: 'The unapproved lottery type is not in the list',
  },
  'TC-LT-APR-005': {
    ...base, story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    tms: 'TC-LT-APR-005',
    description: 'A reviewed but not yet approved ("Pending Approval") lottery type is NOT offered for use',
    preconditions: 'A "Pending Approval" lottery type created by the test',
    steps: ['Review it', 'Lottery Brand -> Add New Brand', 'Open "Select Lottery Type"'],
    expectedResult: 'The lottery type is not in the list',
  },
  'TC-LT-APR-006': {
    ...base, story: 'Ready For Use', severity: 'blocker', tags: ['Smoke', 'Regression', 'Approval', 'Integration'],
    tms: 'TC-LT-APR-006',
    description: 'An Approved lottery type IS offered when creating a Lottery Brand',
    preconditions: 'A lottery type created, reviewed and approved by the test',
    steps: ['Lottery Brand -> Add New Brand', 'Open "Select Lottery Type"'],
    expectedResult: 'The approved lottery type is in the list',
  },
  'TC-LT-APR-007': {
    ...base, story: 'Re-approval After Edit', severity: 'critical', tags: ['Regression', 'Approval'],
    tms: 'TC-LT-APR-007',
    description: 'Editing the Type of an Approved lottery type sends it back to "Under Review"',
    preconditions: 'An Approved lottery type created by the test',
    steps: ['Edit -> change Type -> Update'],
    expectedResult: 'New Type saved; Stage "Under Review"; "Review" offered again',
  },
  'TC-LT-APR-008': {
    ...base, story: 'Re-approval After Edit', severity: 'normal', tags: ['Regression', 'Approval'],
    tms: 'TC-LT-APR-008',
    description: 'Changing only the Status of an Approved lottery type also requires re-approval',
    preconditions: 'An Approved lottery type created by the test',
    steps: ['Edit -> Status DISABLED -> Update'],
    expectedResult: 'Status "Disable"; Stage "Under Review"',
  },
  'TC-LT-APR-009': {
    ...base, story: 'Re-approval After Edit', severity: 'critical', tags: ['Regression', 'Approval'],
    tms: 'TC-LT-APR-009',
    description: 'An edited lottery type must be Reviewed and Approved again to become Approved',
    preconditions: 'An Approved lottery type created by the test, then edited',
    steps: ['Edit an Approved lottery type', 'Review', 'Approve'],
    expectedResult: 'Under Review -> Pending Approval -> Approved, with the edited values kept',
  },
  'TC-LT-APR-010': {
    ...base, story: 'Ready For Use', severity: 'critical', tags: ['Regression', 'Approval', 'Integration'],
    tms: 'TC-LT-APR-010',
    description: 'After editing an Approved lottery type, the edited version is not offered for use until re-approved',
    preconditions: 'An Approved lottery type created by the test',
    steps: ['Edit its Type', 'Check Lottery Brand > Select Lottery Type', 'Review + Approve', 'Check again'],
    expectedResult: 'Not offered while Under Review; offered again once re-approved',
  },
};
