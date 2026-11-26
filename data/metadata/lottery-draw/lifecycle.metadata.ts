import { drawCases, DRAW_PRECONDITION as P, DRAW_POSTCONDITION as C, DRAW_STEP as S } from './base';

/** Metadata for tests/e2e/lottery-draw/lottery_draw_lifecycle.spec.ts - plain-language, see base.ts. */
export const LotteryDrawLifecycleMetadata = drawCases('Draw Lifecycle', {
  'TC-LD-LC-001': {
    story: 'Scheduled Stages', severity: 'critical', tags: ['Regression', 'Lifecycle', 'Slow'],
    description: 'An approved draw moves through its stages on time by itself\nWhy: sales must open at the start time, stop at the cutoff and close at the draw time automatically.',
    preconditions: `${P.LIST}\n- This draw is used by no other test (it cannot be removed afterwards)`,
    testData: '- A draw starting in 4 minutes, with the cutoff in 9 minutes and the draw in 14 minutes\n- Its own 100-ticket file and MD5 checksum',
    steps: [
      S.CREATE + ' (with the near dates above)',
      S.WAIT_TICKETS, S.REVIEW, S.APPROVE,
      'Wait for the start time, then for the cutoff, then for the draw time',
      'After each moment check the status on the "All" tab and find the draw under the matching tab',
    ],
    expectedResult: '- At the start time: "In Play"\n- At the cutoff: "In Play Post Cutoff"\n- At the draw time: "Completed"\n- Each time the draw is listed under the matching tab',
    postconditions: C.COMPLETED_LEFT,
  },
  'TC-LD-DEMO-001': {
    story: 'Demo - All Stages', severity: 'normal', tags: ['Demo', 'Lifecycle', 'Slow'],
    description: 'Demonstration: one draw goes through every stage in about 5 minutes\nWhy: shows the whole draw life cycle to an audience (run with the browser visible).',
    preconditions: `${P.LIST}\n- The browser is shown on screen for the audience`,
    testData: '- A draw starting in 2 minutes, with the cutoff in 3 minutes and the draw in 4 minutes\n- Its own 100-ticket file and MD5 checksum',
    steps: [
      S.CREATE + ' (with the near dates above)',
      S.WAIT_TICKETS, S.REVIEW, S.APPROVE,
      'Wait for each scheduled stage',
      'After every status change check the status on the "All" tab, click that stage tab and find the draw there',
    ],
    expectedResult: '- The draw shows, in order: Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed\n- Each time it is listed under the matching tab',
    postconditions: C.COMPLETED_LEFT,
  },
  'TC-LD-LC-002': {
    story: 'Past Schedule', severity: 'normal', tags: ['Regression', 'Validation'],
    description: 'A draw with all dates in the past is not accepted\nWhy: a draw that has already happened cannot be sold.',
    preconditions: P.CREATE,
    testData: '- Ticket issue start 2020-01-01 10:00, cutoff 2020-01-02 10:00, draw 2020-01-03 10:00\n- ("Create Draw" is never clicked)',
    steps: [S.FILL_STEP1 + ' - with the past dates', 'Click "Next"'],
    expectedResult: '- A message on the form says the dates must be in the future\n- Step 2 is NOT shown',
    actualResult: 'The dates are accepted: the "Are you sure ..." question appears and Step 2 opens.',
  },
});
