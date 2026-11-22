import { brandCases, BRAND_PRECONDITION as P } from './base';

/** Allure metadata for tests/e2e/lottery-brand/lottery_brand_logs.spec.ts (from specs/lottery-brand-test-plan.md). */
export const LotteryBrandLogsMetadata = brandCases({
  "TC-LB-LOG-001": {
    feature: "Lottery Brand Audit Logs", story: "Brand page shows an 'Operation logs' table", severity: 'normal', tags: ["Regression","LOG"],
    tms: "TC-LB-LOG-001",
    description: "Brand page shows an 'Operation logs' table",
    preconditions: P.OWN_BRAND,
    steps: ["Open own brand page and scroll to 'Operation logs'"],
    expectedResult: "Quick toggles (Log Id, IP Address, Email, NIC, Operation Type, Details, Entity Type, Entity Long Id, Entity UUID Id, Performer Type, Performer User Id, Http Status, Logged At, View More); columns Log Id, IP Address, Email, Operation Type, Details, Entity Type, Entity Long Id, Performer Type, Http Status, Logged At, View More; 'Page 1 of 7'. The row menu has no 'Logs' item",
  },
  "TC-LB-LOG-002": {
    feature: "Lottery Brand Audit Logs", story: "Operation logs are limited to the brand being viewed", severity: 'normal', tags: ["Regression","LOG","Known-Defect"],
    tms: "TC-LB-LOG-002",
    description: "Operation logs are limited to the brand being viewed",
    preconditions: P.OWN_BRAND,
    steps: ["Open a brand page (new ATPLAN brand, and an old brand)"],
    expectedResult: "Only entries whose Entity Long Id equals this brand's id. ACTUAL: every Lottery Brand entry is shown (e.g. Entity Long Id 35, 69, 65 on the page of brand 70/2); the same list appears on every brand",
    actualResult: "every Lottery Brand entry is shown (e.g. Entity Long Id 35, 69, 65 on the page of brand 70/2); the same list appears on every brand",
  },
  "TC-LB-LOG-003": {
    feature: "Lottery Brand Audit Logs", story: "Review and Approve produce audit entries", severity: 'normal', tags: ["Regression","LOG"],
    tms: "TC-LB-LOG-003",
    description: "Review and Approve produce audit entries",
    preconditions: P.OWN_BRAND,
    steps: ["Review and Approve own brand; reload; read the top rows"],
    expectedResult: "'Lottery brand reviewed successfully.' and 'Lottery brand approved successfully.' for Entity Long Id = own id",
  },
  "TC-LB-LOG-004": {
    feature: "Lottery Brand Audit Logs", story: "Create, update and delete are audited", severity: 'normal', tags: ["Regression","LOG","Known-Defect"],
    tms: "TC-LB-LOG-004",
    description: "Create, update and delete are audited",
    preconditions: P.OWN_BRAND,
    steps: ["Create, edit (Save Changes) and delete own brand; read Operation logs / Audit Logs (/dashboard/audit)"],
    expectedResult: "Entries for create, update and delete. ACTUAL: after create + edit only the two review/approve entries (ids 3399, 3400) exist; product to confirm whether create/update/delete should be audited",
    actualResult: "after create + edit only the two review/approve entries (ids 3399, 3400) exist; product to confirm whether create/update/delete should be audited",
  },
  "TC-LB-LOG-005": {
    feature: "Lottery Brand Audit Logs", story: "Brand config changes are audited", severity: 'normal', tags: ["Regression","LOG"],
    tms: "TC-LB-LOG-005",
    description: "Brand config changes are audited",
    preconditions: P.OWN_BRAND,
    steps: ["Change Lottery Batch Size on own brand"],
    expectedResult: "Audit entry exists",
  },
});
