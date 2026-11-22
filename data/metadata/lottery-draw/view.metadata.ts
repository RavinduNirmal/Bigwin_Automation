import { drawCases, DRAW_PRECONDITION as P, DRAW_TEST_DATA as D, DRAW_POSTCONDITION as C } from './base';

/** Allure metadata for tests/e2e/lottery-draw/lottery_draw_view.spec.ts (plan section 8). */
export const LotteryDrawViewMetadata = drawCases('Draw View Page', {
  'TC-LD-VIEW-001': {
    story: 'Summary Cards', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'Summary cards show Bought Ticket Count, Revenue and Total Tickets',
    preconditions: P.OWN_DRAW + '; tickets loaded', testData: D.WITH_TICKETS,
    steps: ['Open the draw page', 'Read the three summary cards'],
    expectedResult: 'Bought Ticket Count 0, Revenue "LKR 0", Total Tickets 100',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-002': {
    story: 'Stage Fields', severity: 'normal', tags: ['Regression', 'Approval'],
    description: 'Approval Stage and Draw Status reflect the stage, also after Review',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Open the draw page', 'Read Approval Stage and Draw Status', 'Review the draw', 'Re-open the draw page'],
    expectedResult: 'UNDER REVIEW / ACTIVE first; Approval Stage PENDING APPROVAL after Review',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-003': {
    story: 'Upload Log', severity: 'normal', tags: ['Regression'],
    description: 'The Logs table lists the ticket upload with its status and a download',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS + ' (Initiate Now ticked)',
    steps: ['Open the draw page after the tickets load', 'Read the Logs table'],
    expectedResult: 'One upload row with Upload Status "Completed" and a Download control',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-004': {
    story: 'Winning Numbers', severity: 'minor', tags: ['Regression', 'UI'],
    description: 'The Winning Numbers panel is correctly labelled and says none for a draw without results',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Open the draw page', 'Read the Winning Numbers panel'],
    expectedResult: 'Label "Winning Numbers:" with "No winning numbers available."',
    actualResult: 'Label is misspelled "Winnning Numbers:"',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-005': {
    story: 'Operation Logs', severity: 'normal', tags: ['Regression', 'Audit'],
    description: 'Operation logs on the draw page show only this draw\'s entries',
    preconditions: P.OWN_PENDING, testData: D.WITH_TICKETS,
    steps: ['Open the draw page', 'Read the Operation logs entries'],
    expectedResult: 'Every entry belongs to this draw (its id / code)',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-006': {
    story: 'Edit Gating', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'Update is disabled for an Under Review draw',
    preconditions: P.OWN_DRAW, testData: D.WITH_TICKETS,
    steps: ['Open the draw page', 'Inspect the Update button'],
    expectedResult: 'Update is disabled (documented behaviour; a tooltip explaining why would help users)',
    postconditions: C.REJECTED,
  },
  'TC-LD-VIEW-007': {
    story: 'Read-only View', severity: 'normal', tags: ['Regression', 'UI'],
    description: 'Draw page fields cannot be changed without Update',
    preconditions: P.OWN_DRAW, testData: 'Type "X" into Mega Prize and Draw Code (never saved)',
    steps: ['Open the draw page', 'Try typing into the fields'],
    expectedResult: 'Values do not change - the fields are read-only',
    postconditions: C.REJECTED,
  },
});
