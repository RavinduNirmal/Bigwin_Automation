import { TestMetadata, TestMetadataCollection } from '../../../utils/metadata-manager';

/**
 * Shared wording + builder for the Lottery Type metadata files (one per spec).
 * Written for readers who do not know the system: plain steps with the exact screen labels, concrete test data,
 * exact expected messages, and the ACTUAL result of known defects (same standard as the Global Checksum cases).
 */
export const LT_BASE = { epic: 'Lottery Management', owner: 'QA Team' } as const;

const LOGGED_IN = '- Logged in to the BigWin admin portal (dev) as admin';
const ON_PAGE = '- The Lottery Type page is open (left menu "Lottery" > "Lottery Type")';

export const LT_PRE = {
  PAGE: `${LOGGED_IN}\n${ON_PAGE}`,
  DIALOG: `${LOGGED_IN}\n${ON_PAGE}\n- The "Create Lottery Type" window is open ("Add New Type" button)`,
  ONE: `${LOGGED_IN}\n${ON_PAGE}\n- The test has created its own lottery type (Code "AT<number>", Type "Auto Type <number>", Status Active)`,
  TWO: `${LOGGED_IN}\n${ON_PAGE}\n- The test has created two of its own lottery types (Codes "AT<number>")`,
  APPROVED: `${LOGGED_IN}\n${ON_PAGE}\n- The test has created its own lottery type and taken it through Review and Approve (Stage "Approved")`,
} as const;

/** How a lottery type is created by hand - reused in steps. */
export const LT_STEP = {
  CREATE: 'Click "Add New Type", enter the Code and Type, choose the Status, click "Create" (the page reloads and the new row is listed)',
  OPEN_EDIT: 'Find the row by its Code, click the "..." actions button at the end of the row and choose "Edit" - the "Update Lottery Type" window opens',
  REVIEW: 'Open "Edit" on the row and click "Review" (Stage becomes "Pending Approval")',
  APPROVE: 'Open "Edit" on the row and click "Approve" (Stage becomes "Approved")',
  BRAND_LIST: 'Go to "Lottery" > "Lottery Brand", click "Add New Brand" and open the "Select Lottery Type" list (look only - do NOT save a brand)',
  CLEANUP: 'Clean up: delete the lottery types created by this test (row "..." menu > "Delete")',
} as const;

export const LT_POST = {
  DELETED: 'The lottery types created by the test are deleted (only codes starting with "AT" are ever deleted)',
  NOTHING: 'Nothing is changed in the system (no data is created)',
} as const;

export type LtCase = Omit<TestMetadata, 'epic' | 'owner' | 'feature' | 'tms'> & { feature?: string };

/** Finish a collection: base fields, tms = id, default feature / postconditions, "Known-Defect" tag when an actual result is recorded. */
export function ltCases(feature: string, cases: Record<string, LtCase>): TestMetadataCollection {
  const out: TestMetadataCollection = {};
  for (const [id, c] of Object.entries(cases)) {
    out[id] = {
      ...LT_BASE,
      feature: c.feature ?? feature,
      tms: id,
      ...c,
      tags: c.actualResult && !c.tags.includes('Known-Defect') ? [...c.tags, 'Known-Defect'] : c.tags,
      postconditions: c.postconditions ?? LT_POST.DELETED,
    };
  }
  return out;
}
