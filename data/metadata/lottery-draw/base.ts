import { TestMetadata, TestMetadataCollection } from '../../../utils/metadata-manager';

/**
 * Shared wording + builder for the Lottery Draw metadata files (one per spec: nav, create, approval, lifecycle,
 * search, table, view, actions, validation, security, ticket-dbf, checksum) and the hotfix files.
 * Written for readers who do not know the system: plain steps with the exact screen labels, concrete test data,
 * exact expected messages and the ACTUAL result of known defects. Verified facts: specs/lottery-draw-test-plan.md.
 */
export interface DrawCase {
  story: string;
  severity: TestMetadata['severity'];
  tags: string[];
  /** Objective - what the test proves, then "Why: ..." for the reader. */
  description: string;
  preconditions?: string;
  testData?: string;
  steps: string[];
  expectedResult: string;
  /** Known app defect: what the app ACTUALLY does today (the test fails until it is fixed). */
  actualResult?: string;
  postconditions?: string;
}

const LOGGED_IN = '- Logged in to the BigWin admin portal (dev) as admin';
const ON_LIST = '- The Lottery Draws page is open (left menu "Lottery Draws" > "Draws")';
const OWN = '- The test has created its own draw: brand "Mahajana Sampatha", Draw Number "9<9 digits>", Draw Code "AT<draw number>", '
  + 'Mega Prize 1000000, dates about 3 months ahead, with its own 100-ticket file (status "Under Review")';

/** Plain-language preconditions. */
export const DRAW_PRECONDITION = {
  LIST: [LOGGED_IN, ON_LIST].join('\n'),
  CREATE: [LOGGED_IN, '- The Create Draw page is open ("Lottery Draws" > "Draws" > "Create Draw")'].join('\n'),
  STEP2: [LOGGED_IN, '- Create Draw Step 1 is filled with a new test draw and "Next" was confirmed - Step 2 "Upload Ticket List" is shown'].join('\n'),
  OWN_DRAW: [LOGGED_IN, ON_LIST, OWN].join('\n'),
  OWN_PENDING: [LOGGED_IN, ON_LIST, OWN, '- Its tickets have finished loading and it has been reviewed (status "Pending Approval")'].join('\n'),
  LOGGED_OUT: '- You are NOT logged in (use a private / incognito browser window)',
} as const;

/** Plain-language test data. */
export const DRAW_TEST_DATA = {
  UNIQUE: [
    '- New test draw: brand "Mahajana Sampatha", Draw Number "9<9 digits>" (unique), Draw Code "AT<draw number>", Mega Prize 1000000',
    '- Dates about 3 months ahead: ticket issue start, the cutoff 2 days later, the draw 2 hours after the cutoff',
  ].join('\n'),
  WITH_TICKETS: [
    '- New test draw: brand "Mahajana Sampatha", Draw Number "9<9 digits>", Draw Code "AT<draw number>", Mega Prize 1000000, dates about 3 months ahead',
    '- Its own ticket file "<draw number>.dbf": 100 tickets, barcodes 0<draw number>001 to 0<draw number>100, and the MD5 checksum of that file',
  ].join('\n'),
  NONE: '- None',
} as const;

/** Steps reused across the draw files. */
export const DRAW_STEP = {
  CREATE: 'Create the draw: "Create Draw" > choose Lottery Brand "Mahajana Sampatha", type Draw Number, Draw Code, the three dates and Mega Prize > "Next" > '
    + 'accept the "Are you sure ..." question > "Select File" > choose the ticket file > "Add" > type its MD5 checksum > tick "Initiate Now" > "Create Draw"',
  FIND: 'Type the Draw Code in "Search..." and press Enter to find the row',
  MENU: 'Click the "..." actions button at the end of the draw\'s row',
  WAIT_TICKETS: 'Wait about a minute until the tickets have loaded (Ticket Count in the row shows 100)',
  REVIEW: 'Row "..." menu > "Review Draw" (status becomes "Pending Approval")',
  APPROVE: 'Row "..." menu > "Approve Draw" > type the ticket file\'s MD5 checksum > "Approve Draw" (status becomes "Approved")',
  OPEN_PAGE: 'Click the Draw Code in the row - the draw page opens',
  FILL_STEP1: 'Choose Lottery Brand "Mahajana Sampatha" and type Draw Number, Draw Code, the three dates and Mega Prize',
} as const;

export const DRAW_POSTCONDITION = {
  NONE: 'Nothing is created in the system',
  REJECTED: 'At the end the test rejects its own draw if it is still "Under Review" / "Pending Approval" (only codes starting with "AT" are ever touched)',
  APPROVED_LEFT: 'The test\'s draw stays "Approved" (an approved draw cannot be rejected); its dates are months ahead, so it never goes on sale',
  COMPLETED_LEFT: 'The test\'s draw ends "Completed" (it cannot be removed)',
} as const;

/** Build a collection; adds epic/owner/feature/tms and a "Known-Defect" tag to cases with an actualResult. */
export function drawCases(feature: string, cases: Record<string, DrawCase>): TestMetadataCollection {
  const out: TestMetadataCollection = {};
  for (const [id, c] of Object.entries(cases)) {
    out[id] = {
      epic: 'Lottery Draws',
      owner: 'QA Team',
      feature,
      tms: id,
      ...c,
      tags: c.actualResult && !c.tags.includes('Known-Defect') ? [...c.tags, 'Known-Defect'] : c.tags,
      preconditions: c.preconditions ?? DRAW_PRECONDITION.LIST,
      testData: c.testData ?? DRAW_TEST_DATA.NONE,
      postconditions: c.postconditions ?? DRAW_POSTCONDITION.NONE,
    };
  }
  return out;
}
