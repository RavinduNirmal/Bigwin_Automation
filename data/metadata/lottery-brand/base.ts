import { TestMetadata, TestMetadataCollection } from '../../../utils/metadata-manager';

/**
 * Shared wording + builder for the Lottery Brand metadata files (one per spec: nav, create, edit, delete, search,
 * table, approval, use, logs, a11y). Written for readers who do not know the system: plain steps with the exact
 * screen labels, concrete test data, exact expected messages and the ACTUAL result of known defects (same standard
 * as the Global Checksum cases). Verified facts: specs/lottery-brand-test-plan.md.
 */
export const BRAND_BASE = { epic: 'Lottery Management', owner: 'QA Team' } as const;

const LOGGED_IN = '- Logged in to the BigWin admin portal (dev) as admin';
const ON_LIST = '- The Lottery Brands page is open (left menu "Lottery" > "Lottery Brand")';
const OWN = '- The test has created its own brand: Lottery Type "Passive", Code "ATB<number>", Name "AT Brand <number>", Price per ticket 25 (Stage "Under Review")';

export const BRAND_PRE = {
  LIST: `${LOGGED_IN}\n${ON_LIST}`,
  WIZARD: `${LOGGED_IN}\n${ON_LIST}\n- "Add New Brand" was clicked - the wizard is on Step 1 "Details"`,
  OWN: `${LOGGED_IN}\n${ON_LIST}\n${OWN}`,
  OWN_PAGE: `${LOGGED_IN}\n${OWN}\n- The brand's page is open (row "..." menu > "Edit")`,
  APPROVED: `${LOGGED_IN}\n${ON_LIST}\n${OWN}\n- The brand has been Reviewed and Approved (Stage "Approved")`,
} as const;

/** Steps reused across the files. */
export const BRAND_STEP = {
  CREATE: 'Create a brand: "Add New Brand" > choose Lottery Type "Passive", type the Code, Name and Price per ticket > "Next" > "Next" (Symbol Pack is optional) > "Add Brand" > tick "Continue without editing brand config" > "Finish"',
  FIND: 'Type the brand Code in "Search..." and press Enter to find its row',
  OPEN_PAGE: 'Open the brand page: row "..." menu > "Edit" (the page opens in read-only view)',
  EDIT_MODE: 'Click "Update" on the brand page - the boxes become editable',
  SAVE: 'Click "Save Changes"',
  REVIEW: 'On the brand page click "Review" (Stage becomes "Pending Approval")',
  APPROVE: 'On the brand page click "Approve" (Stage becomes "Approved")',
  DRAW_LIST: 'Go to "Lottery Draws" > "Draws" > "Create Draw" and open the "Lottery Brand" list (look only - do NOT click "Next" or create a draw)',
  CLEANUP: 'Clean up: delete the brands created by this test (row "..." menu > "Delete")',
} as const;

export const BRAND_POST = {
  SOFT_DELETED: 'The brands created by the test are deleted (brands are never removed for good - they stay in the "Deleted" tab)',
  NOTHING: 'Nothing is changed in the system (no data is saved)',
} as const;

export type BrandCase = Omit<TestMetadata, 'epic' | 'owner' | 'feature' | 'tms'> & { feature?: string };

/**
 * Finish a collection: base fields, tms = id, default feature / postconditions, and a "Known-Defect" tag on cases
 * with an `actualResult` (the test fails until the app is fixed).
 */
export function brandCases(feature: string, cases: Record<string, BrandCase>): TestMetadataCollection {
  const out: TestMetadataCollection = {};
  for (const [id, c] of Object.entries(cases)) {
    out[id] = {
      ...BRAND_BASE,
      feature: c.feature ?? feature,
      tms: id,
      ...c,
      tags: c.actualResult && !c.tags.includes('Known-Defect') ? [...c.tags, 'Known-Defect'] : c.tags,
      postconditions: c.postconditions ?? BRAND_POST.SOFT_DELETED,
    };
  }
  return out;
}
