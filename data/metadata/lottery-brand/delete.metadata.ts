import { brandCases, BRAND_PRECONDITION as P } from './base';

/** Allure metadata for tests/e2e/lottery-brand/lottery_brand_delete.spec.ts (from specs/lottery-brand-test-plan.md). */
export const LotteryBrandDeleteMetadata = brandCases({
  "TC-LB-DEL-001": {
    feature: "Delete Lottery Brand", story: "Delete from the row menu has no confirmation", severity: 'critical', tags: ["Smoke","Regression","DEL"],
    tms: "TC-LB-DEL-001",
    description: "Delete from the row menu has no confirmation",
    preconditions: P.OWN_BRAND,
    steps: ["Search own code, row menu > Delete"],
    expectedResult: "No confirmation dialog; DELETE /api/lottery/delete/{id} sent; page reloads; the row is gone from All; no visible toast. If product wants a confirmation this is a design gap",
  },
  "TC-LB-DEL-002": {
    feature: "Delete Lottery Brand", story: "Delete is a soft delete and the brand appears in the Deleted tab", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-002",
    description: "Delete is a soft delete and the brand appears in the Deleted tab",
    preconditions: P.OWN_BRAND,
    steps: ["Delete own brand, open the 'Deleted' tab (view=deleted)"],
    expectedResult: "Row listed with its old Status/Stage; it is no longer in All. NOTE cleanup cannot hard-delete: ATPLAN brands stay in the Deleted tab forever",
  },
  "TC-LB-DEL-003": {
    feature: "Delete Lottery Brand", story: "Deleted rows are read-only", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-003",
    description: "Deleted rows are read-only",
    preconditions: P.OWN_BRAND,
    steps: ["Open the Deleted tab and inspect a row"],
    expectedResult: "No row-actions button and no Code/Name links (no Restore, no View)",
  },
  "TC-LB-DEL-004": {
    feature: "Delete Lottery Brand", story: "Deleted record stays deleted after reload", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-004",
    description: "Deleted record stays deleted after reload",
    preconditions: P.OWN_BRAND,
    steps: ["Delete then reload and search the code"],
    expectedResult: "Zero rows in All",
  },
  "TC-LB-DEL-005": {
    feature: "Delete Lottery Brand", story: "A deleted Code or Name can be reused", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-005",
    description: "A deleted Code or Name can be reused",
    preconditions: P.OWN_BRAND,
    steps: ["Delete then recreate with the same Code and Name"],
    expectedResult: "Product decision needed: either creation succeeds or the duplicate message is shown; record the actual behaviour",
  },
  "TC-LB-DEL-006": {
    feature: "Delete Lottery Brand", story: "Deleting an Approved brand", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-006",
    description: "Deleting an Approved brand",
    preconditions: P.OWN_BRAND,
    steps: ["Approve own brand, then delete it"],
    expectedResult: "Removed from All and from the Create Draw brand dropdown",
  },
  "TC-LB-DEL-007": {
    feature: "Delete Lottery Brand", story: "Deleting a brand that is used by a draw is blocked or warned", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-007",
    description: "Deleting a brand that is used by a draw is blocked or warned",
    preconditions: P.OWN_BRAND,
    steps: ["Delete a brand referenced by a draw"],
    expectedResult: "Warning or block",
  },
  "TC-LB-DEL-008": {
    feature: "Delete Lottery Brand", story: "Delete a brand already deleted in another session", severity: 'normal', tags: ["Regression","DEL"],
    tms: "TC-LB-DEL-008",
    description: "Delete a brand already deleted in another session",
    preconditions: P.OWN_BRAND,
    steps: ["Open two pages, delete in page 1, delete the same row in stale page 2"],
    expectedResult: "Clear 'not found' toast, no crash",
  },
});
