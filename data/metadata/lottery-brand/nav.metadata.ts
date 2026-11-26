import { brandCases, BRAND_PRE, BRAND_STEP, BRAND_POST } from './base';

/** Metadata for tests/e2e/lottery-brand/lottery_brand_nav.spec.ts - plain-language, see base.ts. */
export const LotteryBrandNavMetadata = brandCases('Navigation', {
  'TC-LB-NAV-001': {
    story: 'Navigate to Lottery Brand from the sidebar', severity: 'critical', tags: ['Smoke', 'Regression', 'NAV'],
    description: 'The left menu opens the Lottery Brands page\nWhy: this is how admins reach the lottery brands.',
    preconditions: '- Logged in to the BigWin admin portal (dev) as admin\n- Any page of the portal is open',
    testData: '- None',
    steps: [
      'In the left menu click "Lottery" to open it',
      'Click "Lottery Brand"',
      'Look at the page heading, the browser tab title and the address',
    ],
    expectedResult: '- The heading "Lottery Brands" is shown\n- The browser tab title is "Lottery: List | BigWin"\n- The address ends with /dashboard/lottery',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-NAV-002': {
    story: 'Table shows Code, Brand Name, Type, Status, Stage and Price columns', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'The brand list shows the right columns\nWhy: admins need these details of every brand at a glance.',
    preconditions: BRAND_PRE.LIST,
    testData: '- None',
    steps: ['Look at the column headings of the table'],
    expectedResult: '- The columns "Code", "Brand Name", "Type", "Status", "Stage" and "Price" are shown (each can be clicked to sort)\n'
      + '- There is a tick-box column at the start and an actions column at the end',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-NAV-003': {
    story: 'Page shows Add New Brand, search, Status filter, five tabs and page info', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'The page shows all its controls and starts on the "All" tab\nWhy: admins need to add, search and filter brands.',
    preconditions: BRAND_PRE.LIST,
    testData: '- None',
    steps: [
      'Look for the "Add New Brand" button, the "Search..." box (with its clear button) and the "Status" filter',
      'Look at the tabs and which one is selected',
      'Look at the page information under the table',
    ],
    expectedResult: '- "Add New Brand", "Search..." and the "Status" filter (showing "All") are shown\n'
      + '- The tabs "All", "Under Review", "Pending Approval", "Approved" and "Deleted" are shown, "All" is selected\n'
      + '- "Page X of Y" is shown and "Previous" cannot be clicked on page 1',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-NAV-004': {
    story: 'Row actions menu offers View, Edit and Delete only', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'The row menu of a brand offers View, Edit and Delete\nWhy: these are the actions available for a brand.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, 'Click the "..." actions button at the end of the row', 'Look at the menu items'],
    expectedResult: '- The menu shows exactly "View", "Edit" and "Delete" (there is no "Logs" item)',
  },
  'TC-LB-NAV-005': {
    story: 'Row menu closes with Escape', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'The Escape key closes the row menu without doing anything\nWhy: a user must be able to close a menu opened by mistake.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, 'Open the row "..." menu', 'Press the Escape key', 'Look at the row'],
    expectedResult: '- The menu closes\n- The brand is unchanged',
  },
  'TC-LB-NAV-006': {
    story: 'Code and Brand Name cells link to the brand page', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'Clicking a brand\'s Code opens its page, and "Back" returns to the list\nWhy: the quickest way to look at a brand.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, 'Click the brand Code in the row', 'Look at the page heading', 'Click "Back" (or the browser Back button)'],
    expectedResult: '- The brand page opens with the heading "<Code> | <Name>"\n- "Back" returns to the Lottery Brands list',
  },
  'TC-LB-NAV-007': {
    story: 'View and Edit menu items open the same brand page', severity: 'normal', tags: ['Regression', 'NAV'],
    description: '"View" and "Edit" in the row menu both open the brand page in read-only view\nWhy: changes are only made after clicking "Update" on that page.',
    preconditions: BRAND_PRE.OWN,
    testData: '- The brand created by the test',
    steps: [BRAND_STEP.FIND, 'Row "..." menu > "View" and look at the page', 'Go back, then row "..." menu > "Edit" and look at the page'],
    expectedResult: '- Both open the same brand page with a "View" tab\n- The details are read-only; the buttons "Review" (while Under Review) and "Update" are shown',
  },
  'TC-LB-NAV-008': {
    story: 'Status and Stage labels for a new brand', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'A new brand is listed with the right Type, Status, Stage and Price\nWhy: the list must show the true state of each brand.',
    preconditions: BRAND_PRE.LIST,
    testData: '- New brand: Lottery Type "Passive", Code "ATB<number>", Name "AT Brand <number>", Price 25',
    steps: [BRAND_STEP.CREATE, BRAND_STEP.FIND, 'Read the row', BRAND_STEP.CLEANUP],
    expectedResult: '- Type "Passive", Status "Active", Stage "Under Review", Price 25',
  },
  'TC-LB-NAV-009': {
    story: 'Opening a brand id that does not exist', severity: 'normal', tags: ['Regression', 'NAV'],
    description: 'Opening the page of a brand that does not exist shows a clear message\nWhy: a broken or old link must not show a confusing empty page.',
    preconditions: '- Logged in to the BigWin admin portal (dev) as admin',
    testData: '- Address: <portal>/dashboard/lottery/edit-lottery-brand?lotteryId=99999 (no brand has id 99999)',
    steps: ['Type the address in the browser and open it', 'Look at the page'],
    expectedResult: '- A clear "brand not found" message is shown, or you are sent back to the list',
    actualResult: 'An empty brand page is shown (no heading, empty boxes, blank settings) with no message at all - the user cannot tell what went wrong.',
    postconditions: BRAND_POST.NOTHING,
  },
});
