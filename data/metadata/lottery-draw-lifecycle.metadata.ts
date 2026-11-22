import { drawCases, DRAW_PRECONDITION as P, DRAW_POSTCONDITION as C } from './lottery-draw-base';

/** Allure metadata for lottery_draw_lifecycle.spec.ts and lottery_draw_demo.spec.ts (plan section 4). */
export const LotteryDrawLifecycleMetadata = drawCases('Draw Lifecycle', {
  'TC-LD-LC-001': {
    story: 'Scheduled Stages', severity: 'critical', tags: ['Regression', 'Lifecycle', 'Slow'],
    description: 'An approved draw goes In Play at its start, In Play Post Cutoff at its cutoff and Completed at its draw time',
    preconditions: 'Logged in as admin; no other step depends on this draw',
    testData: 'testLotteryDrawData.imminent(4, 9, 14): start +4 min, cutoff +9 min, draw +14 min; 100-ticket DBF + MD5',
    steps: ['Create the draw', 'Review (confirmed: All + Pending Approval tabs)', 'Approve with the MD5 (confirmed: All + Approved tabs)',
      'Wait for issue start, cutoff and draw time', 'After each change check the All tab and click that stage tab'],
    expectedResult: 'In Play -> In Play Post Cutoff -> Completed on schedule; each seen on the All tab and confirmed under its stage tab',
    postconditions: C.COMPLETED_LEFT,
  },
  'TC-LD-DEMO-001': {
    story: 'Demo - All Stages', severity: 'normal', tags: ['Demo', 'Lifecycle', 'Slow'],
    description: 'One draw moves Under Review -> Pending Approval -> Approved -> In Play -> In Play Post Cutoff -> Completed within about 5 minutes',
    preconditions: 'Logged in as admin; run headed for the audience',
    testData: 'testLotteryDrawData.imminent(2, 3, 4): start +2 min, cutoff +3 min, draw +4 min; 100-ticket DBF + MD5',
    steps: ['Create a draw', 'Review', 'Approve with the MD5', 'Wait for each scheduled stage',
      'After every status change: check the Status on the All tab, click that stage tab and assert the draw is listed there'],
    expectedResult: 'Each status appears on the All tab and the draw is listed under the matching stage tab, in order, finishing Completed',
    postconditions: C.COMPLETED_LEFT,
  },
  'TC-LD-LC-002': {
    story: 'Past Schedule', severity: 'normal', tags: ['Regression', 'Lifecycle', 'Validation'],
    description: 'A draw scheduled entirely in the past is not accepted',
    preconditions: P.CREATE,
    testData: 'Issue start 2020-01-01 10:00, cutoff 2020-01-02 10:00, draw 2020-01-03 10:00 (Create Draw is never pressed)',
    steps: ['Fill Step 1 with the past dates', 'Click Next'],
    expectedResult: 'An inline error says the dates must be in the future; Step 2 is not shown',
    actualResult: 'Accepted - the confirmation appears and Step 2 opens',
  },
});
