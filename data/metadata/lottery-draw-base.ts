import { TestMetadata, TestMetadataCollection } from '../../utils/metadata-manager';

/**
 * Shared builder for the Lottery Draw metadata files (lottery-draw-*.metadata.ts), one file per spec:
 * nav, create, approval, lifecycle, search, table, view, actions, validation, security (+ ticket-dbf).
 * Source of truth for the wording: specs/lottery-draw-test-plan.md.
 */
export interface DrawCase {
  story: string;
  severity: TestMetadata['severity'];
  tags: string[];
  /** Objective - what the test proves. */
  description: string;
  preconditions?: string;
  testData?: string;
  steps: string[];
  expectedResult: string;
  /** Known app defect: what the app ACTUALLY does today (the test fails until it is fixed). */
  actualResult?: string;
  postconditions?: string;
}

export const DRAW_PRECONDITION = {
  LIST: 'Logged in as admin (saved session); on Lottery Draws > Draws (/dashboard/draw)',
  CREATE: 'Logged in as admin; Create Draw page open (/dashboard/draw/create-draw)',
  STEP2: 'Logged in as admin; Create Draw Step 1 filled with a unique draw and confirmed - Step 2 "Upload" shown',
  OWN_DRAW: 'Logged in as admin; the test created its own "AT9xxxxxxxxx" draw (Mahajana Sampatha, far-future schedule, 100-ticket DBF) - status Under Review',
  OWN_PENDING: 'Logged in as admin; own "AT9xxxxxxxxx" draw created, tickets loaded and reviewed - status Pending Approval',
  LOGGED_OUT: 'No session (storageState empty) - user is not logged in',
} as const;

export const DRAW_TEST_DATA = {
  UNIQUE: 'testLotteryDrawData.unique(): draw number 9xxxxxxxxx, code AT<number>, brand Mahajana Sampatha, mega prize 1000000, far-future schedule (start < cutoff < draw)',
  WITH_TICKETS: 'testLotteryDrawData.unique() + ticketFile(): 100-ticket DBF from utils/dbf/ticket-dbf.service.ts (barcodes 0<number>001..0<number>100) and its MD5',
  NONE: 'None',
} as const;

export const DRAW_POSTCONDITION = {
  NONE: 'Nothing is created',
  REJECTED: 'afterEach rejects the test\'s own AT draw if it is still Under Review / Pending Approval (draws cannot be deleted)',
  APPROVED_LEFT: 'Own AT draw stays Approved (cannot be rejected or deleted); its far-future schedule keeps it out of play',
  COMPLETED_LEFT: 'Own AT draw ends Completed (cannot be deleted)',
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
      tags: c.actualResult ? [...c.tags, 'Known-Defect'] : c.tags,
      preconditions: c.preconditions ?? DRAW_PRECONDITION.LIST,
      testData: c.testData ?? DRAW_TEST_DATA.NONE,
      postconditions: c.postconditions ?? DRAW_POSTCONDITION.NONE,
    };
  }
  return out;
}
