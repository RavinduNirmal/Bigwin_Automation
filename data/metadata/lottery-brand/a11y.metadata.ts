import { brandCases, BRAND_PRE, BRAND_POST } from './base';

/** Metadata for tests/e2e/lottery-brand/lottery_brand_a11y.spec.ts (+ the parallel-safety rule) - plain-language, see base.ts. */
export const LotteryBrandA11yMetadata = brandCases('Accessibility', {
  'TC-LB-A11Y-001': {
    story: 'Keyboard order on the list page', severity: 'normal', tags: ['Regression', 'A11Y'],
    description: 'The list page can be used with the keyboard in a sensible order\nWhy: some users cannot use a mouse.',
    preconditions: BRAND_PRE.LIST,
    testData: '- None',
    steps: ['Click "Add New Brand" area once to focus it (or Tab to it)', 'Press Tab repeatedly and note what gets focus'],
    expectedResult: '- Focus moves: "Add New Brand", the selected tab, "Search...", the clear button, the Status filter, the table, the select-all box, then the column headings Code, Brand Name, Type, Status, Stage, Price',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-A11Y-002': {
    story: '\'Add New Brand\' is a button nested inside a link', severity: 'normal', tags: ['Regression', 'A11Y'],
    description: '"Add New Brand" is one single control\nWhy: screen readers and keyboard users get confused by a button inside a link.',
    preconditions: BRAND_PRE.LIST,
    testData: '- None',
    steps: ['Inspect "Add New Brand" (browser developer tools / screen reader)'],
    expectedResult: '- It is a single link or a single button',
    actualResult: 'It is a button placed inside a link (both are separate stops for the keyboard / screen reader).',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-A11Y-003': {
    story: 'Wizard keyboard use', severity: 'normal', tags: ['Regression', 'A11Y'],
    description: 'Step 1 of the brand wizard can be completed with the keyboard\nWhy: keyboard users must be able to create brands.',
    preconditions: BRAND_PRE.WIZARD,
    testData: '- Lottery Type "Passive", Code "ATB<number>", Name "AT Brand <number>", Price 25',
    steps: ['Fill Step 1 using only the keyboard', 'Press Enter in the "Name" box'],
    expectedResult: '- Enter moves on like clicking "Next"',
    postconditions: BRAND_POST.NOTHING,
  },
  'TC-LB-PAR-001': {
    feature: 'Parallel Safety', story: 'Parallel-safe unique data', severity: 'normal', tags: ['Regression', 'PAR'],
    description: 'Rule for the whole suite: every test works only on its own, uniquely named brands\nWhy: tests run at the same time on a shared server - they must never disturb each other or real data.',
    preconditions: '- Applies to every Lottery Brand test (this is a design rule, not a separate check)',
    testData: '- Codes "ATB" + time + random digits; Names "AT Brand " + the same number (both must be unique)',
    steps: [
      'Each test creates its own brands with unique Codes and Names',
      'Tests check only their own brands - never "the first row" or total counts',
      'Each test deletes only its own brands at the end',
    ],
    expectedResult: '- Tests never clash with each other\n- Only the tests\' own "ATB..." brands are ever changed or deleted',
    postconditions: '- Deleted test brands stay in the "Deleted" tab (brands cannot be removed for good)',
  },
});
