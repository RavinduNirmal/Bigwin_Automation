import { TestMetadataCollection } from '../../../utils/metadata-manager';
import { ltCases, LT_PRE, LT_POST } from './base';

/** Metadata for tests/e2e/lottery-type/lottery_type_nav.spec.ts - plain-language, see base.ts. */
export const LotteryTypeNavigationMetadata: TestMetadataCollection = ltCases('Table Display', {
  'TC-LT-NAV-001': {
    feature: 'Navigation', story: 'Sidebar Navigation', severity: 'critical', tags: ['Smoke', 'Regression', 'Navigation'],
    description: 'The left menu opens the Lottery Type page\nWhy: this is how admins reach the lottery types.',
    preconditions: '- Logged in to the BigWin admin portal (dev) as admin\n- Any page of the portal is open',
    testData: '- None',
    steps: [
      'In the left menu click "Lottery" to open it',
      'Click "Lottery Type"',
      'Look at the page heading, the browser tab title and the address',
    ],
    expectedResult: '- The page heading is "Lottery Type"\n- The browser tab title is "Lottery: List | BigWin"\n- The address ends with /dashboard/lottery/lottery-type',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-NAV-002': {
    story: 'Table Structure', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'The lottery type list shows the right columns\nWhy: admins need Code, Type, Status and Stage at a glance.',
    preconditions: LT_PRE.PAGE,
    testData: '- None',
    steps: [
      'Look at the column headings of the table',
    ],
    expectedResult: '- The columns "Code", "Type Description", "Status" and "Stage" are shown',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-NAV-003': {
    story: 'Page Controls', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'The page shows its controls and starts on the "All" tab\nWhy: admins need to add, search and filter lottery types, and should see all of them first.',
    preconditions: LT_PRE.PAGE,
    testData: '- None',
    steps: [
      'Look for the "Add New Type" button and the "Search..." box',
      'Look at the tabs "All", "Active" and "Deleted" - which one is selected?',
      'Look at the page information under the table',
    ],
    expectedResult: '- "Add New Type" and "Search..." are shown\n- The tabs "All", "Active" and "Deleted" are shown and "All" is selected\n- "Page X of Y" is shown under the table',
    actualResult: 'No tab is selected when the page opens ("All" is not highlighted), although every lottery type is listed.',
    postconditions: LT_POST.NOTHING,
  },
  'TC-LT-NAV-004': {
    story: 'Row Actions', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    description: 'Each row has a menu with Edit, Delete and Logs\nWhy: these are the actions an admin needs for a lottery type.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test',
    steps: [
      'Find the row by its Code and click the "..." actions button at the end of the row',
      'Look at the menu items',
      'Close the menu (Escape)',
    ],
    expectedResult: '- The menu shows "Edit", "Delete" and "Logs"',
  },
  'TC-LT-NAV-005': {
    feature: 'Navigation', story: 'Audit Logs', severity: 'minor', tags: ['Regression', 'Navigation'],
    description: '"Logs" in the row menu shows the change history of lottery types\nWhy: admins must be able to see who changed what.',
    preconditions: LT_PRE.ONE,
    testData: '- The lottery type created by the test',
    steps: [
      'Open the "..." menu of the row and click "Logs"',
      'Look at the page that opens',
    ],
    expectedResult: '- The audit log (change history) page opens',
    actualResult: '"Logs" opens /dashboard/audit-log?drawId=LOTTERY_TYPE, which is a "Nothing here!" (404 - page not found) page.',
  },
});
