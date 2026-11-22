import { TestMetadataCollection } from '../../../utils/metadata-manager';

/** Allure metadata for tests/e2e/lottery-type/lottery_type_nav.spec.ts */
const base = { epic: 'Lottery Management', owner: 'QA Team' } as const;

export const LotteryTypeNavigationMetadata: TestMetadataCollection = {
  'TC-LT-NAV-001': {
    ...base, feature: 'Navigation', story: 'Sidebar Navigation', severity: 'critical', tags: ['Smoke', 'Regression', 'Navigation'],
    tms: 'TC-LT-NAV-001',
    description: 'Sidebar "Lottery" -> "Lottery Type" opens the Lottery Type list',
    preconditions: 'User is logged in as admin',
    steps: ['Expand "Lottery" in the sidebar', 'Click "Lottery Type"', 'Verify URL, heading and page title'],
    expectedResult: '/dashboard/lottery/lottery-type with heading "Lottery Type" and title "Lottery: List | BigWin"',
  },
  'TC-LT-NAV-002': {
    ...base, feature: 'Table Display', story: 'Table Structure', severity: 'normal', tags: ['Regression', 'UI'],
    tms: 'TC-LT-NAV-002',
    description: 'Lottery Type table shows the Code, Type Description, Status and Stage columns',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Verify the table and its column headers'],
    expectedResult: 'Columns Code, Type Description, Status, Stage are shown',
  },
  'TC-LT-NAV-003': {
    ...base, feature: 'Table Display', story: 'Page Controls', severity: 'normal', tags: ['Regression', 'UI'],
    tms: 'TC-LT-NAV-003',
    description: 'Page shows Add New Type, the search box, All/Active/Deleted tabs (All selected) and page info',
    preconditions: 'User is on the Lottery Type page',
    steps: ['Verify Add New Type button', 'Verify search box', 'Verify tabs', 'Verify "Page X of Y"'],
    expectedResult: 'All controls visible; "All" tab selected',
  },
  'TC-LT-NAV-004': {
    ...base, feature: 'Table Display', story: 'Row Actions', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    tms: 'TC-LT-NAV-004',
    description: 'Row actions menu offers Edit, Delete and Logs',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Open the actions menu of the test\'s row'],
    expectedResult: 'Menu items Edit, Delete and Logs are shown',
  },
  'TC-LT-NAV-005': {
    ...base, feature: 'Navigation', story: 'Audit Logs', severity: 'minor', tags: ['Regression', 'Navigation'],
    tms: 'TC-LT-NAV-005',
    description: 'Row menu "Logs" opens the audit log for lottery types',
    preconditions: 'A lottery type created by the test exists',
    steps: ['Open the row menu', 'Click Logs'],
    expectedResult: 'The audit log page opens',
  },
};
