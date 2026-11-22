import { brandCases, BRAND_PRECONDITION as P } from './base';

/** Allure metadata for tests/e2e/lottery-brand/lottery_brand_a11y.spec.ts (from specs/lottery-brand-test-plan.md). */
export const LotteryBrandA11yMetadata = brandCases({
  "TC-LB-A11Y-001": {
    feature: "Accessibility", story: "Keyboard order on the list page", severity: 'normal', tags: ["Regression","A11Y"],
    tms: "TC-LB-A11Y-001",
    description: "Keyboard order on the list page",
    preconditions: P.OWN_BRAND,
    steps: ["Focus 'Add New Brand' and Tab repeatedly"],
    expectedResult: "Order: Add New Brand, the selected tab 'All' (roving tabindex - one tab stop), Search box, clear, Status select, scrollable table region, select-all, sort headers Code, Brand Name, Type, Status, Stage, Price. Tabs ARE reachable here (unlike Lottery Type)",
  },
  "TC-LB-A11Y-002": {
    feature: "Accessibility", story: "'Add New Brand' is a button nested inside a link", severity: 'normal', tags: ["Regression","A11Y","Known-Defect"],
    tms: "TC-LB-A11Y-002",
    description: "'Add New Brand' is a button nested inside a link",
    preconditions: P.OWN_BRAND,
    steps: ["Inspect the DOM / accessibility tree"],
    expectedResult: "A single interactive element. ACTUAL: <a href=/dashboard/lottery/add-lottery-brand><button>Add New Brand</button></a> (invalid nesting; link and button both in the tab order in the snapshot)",
    actualResult: "<a href=/dashboard/lottery/add-lottery-brand><button>Add New Brand</button></a> (invalid nesting; link and button both in the tab order in the snapshot)",
  },
  "TC-LB-A11Y-003": {
    feature: "Accessibility", story: "Wizard keyboard use", severity: 'normal', tags: ["Regression","A11Y"],
    tms: "TC-LB-A11Y-003",
    description: "Wizard keyboard use",
    preconditions: P.OWN_BRAND,
    steps: ["Fill Step 1 with the keyboard and press Enter in Name"],
    expectedResult: "Form submits / advances like Next",
  },
  "TC-LB-PAR-001": {
    feature: "Parallel Safety", story: "Parallel-safe unique data", severity: 'normal', tags: ["Regression","PAR"],
    tms: "TC-LB-PAR-001",
    description: "Parallel-safe unique data",
    preconditions: P.OWN_BRAND,
    steps: ["Generate codes 'ATPLAN' + timestamp + random digits and names 'ATPLAN Brand ' + suffix (both must be unique - duplicate Code AND Name are rejected); never assert on global Total pages/first row; cleanup via a brand cleanup helper that searches the code and uses row menu > Delete (soft delete: records remain in the Deleted tab)"],
    expectedResult: "No collisions between concurrent tests; each test removes only its own brands; run with --workers=1; approved brands exist only for the shortest possible time",
  },
});
